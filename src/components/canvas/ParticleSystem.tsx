'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import gsap from 'gsap';
import { PARTICLE_COUNT, generateInitialPositions, generateAirplaneTargetPositions, generateCompassPositions, generateRadarPositions } from '@/utils/shapeGenerator';
import { HandStore, InteractionMode } from '@/store/HandStore';

export default function ParticleSystem() {
    const pointsRef = useRef<THREE.Points>(null);
    const materialRef = useRef<THREE.PointsMaterial>(null);
    const noise3D = useMemo(() => createNoise3D(), []);

    const { initialPositions, colors, airplanePositions, compassPositions, radarPositions } = useMemo(() => {
        const { positions: init, colors: col } = generateInitialPositions();
        return {
            initialPositions: init,
            colors: col,
            airplanePositions: generateAirplaneTargetPositions(),
            compassPositions: generateCompassPositions(),
            radarPositions: generateRadarPositions()
        };
    }, []);

    const activePositions = useMemo(() => new Float32Array(initialPositions), [initialPositions]);
    const startPositions = useMemo(() => new Float32Array(initialPositions), [initialPositions]);

    // Track the morph state outside React render
    const animState = useRef({
        progress: 1,
    });

    const modeRef = useRef<InteractionMode>(HandStore.mode);

    // Track the explode state locally so the explosion anim is one-shot
    const isExplodingRef = useRef(false);

    useEffect(() => {
        let modeInterval = setInterval(() => {
            // ── Explode trigger ──────────────────────────────────────────
            if (HandStore.mode === 'explode' && !isExplodingRef.current) {
                isExplodingRef.current = true;
                modeRef.current = 'explode';

                if (!pointsRef.current) {
                    console.error('[ParticleSystem] pointsRef.current is NULL — cannot explode!');
                    return;
                }

                const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;

                // Pre-compute radial explosion targets
                // Camera at z=25, fov=45 → visible area ~±12 units at z=0
                // Keep explosion within visible range so user actually sees the burst
                const targetExplode = new Float32Array(positions.length);
                for (let i = 0; i < positions.length; i += 3) {
                    const cx = positions[i];
                    const cy = positions[i + 1];
                    const cz = positions[i + 2];

                    // Moderate radial burst that stays partially in view
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(Math.random() * 2 - 1);
                    const r = 15 + Math.random() * 30;

                    targetExplode[i]     = cx + r * Math.sin(phi) * Math.cos(theta);
                    targetExplode[i + 1] = cy + r * Math.sin(phi) * Math.sin(theta);
                    targetExplode[i + 2] = cz + r * Math.cos(phi) + 5 + Math.random() * 10; // slight Z bias toward camera
                }

                const snapshotPositions = new Float32Array(positions);

                // GSAP morph: blast particles outward over 1.4s
                // power2.out gives a visible initial burst that decelerates gracefully
                const explodeAnim = { progress: 0 };
                gsap.to(explodeAnim, {
                    progress: 1,
                    duration: 1.4,
                    ease: 'power2.out',
                    onUpdate: () => {
                        if (!pointsRef.current) return;
                        const p = explodeAnim.progress;
                        for (let i = 0; i < positions.length; i++) {
                            positions[i] = snapshotPositions[i] * (1 - p) + targetExplode[i] * p;
                        }
                        pointsRef.current.geometry.attributes.position.needsUpdate = true;
                    },
                });

                // Opacity: stay bright for 0.4s, then fade to 0 over 1.0s
                if (materialRef.current) {
                    // First: brief size increase for dramatic "flash" effect
                    gsap.to(materialRef.current, {
                        size: 0.35,
                        duration: 0.15,
                        ease: 'power2.out',
                    });
                    // Then: fade out opacity (delayed so the burst is visible first)
                    gsap.to(materialRef.current, {
                        opacity: 0,
                        size: 0.05,
                        duration: 1.0,
                        delay: 0.4,
                        ease: 'power2.in',
                    });
                }

                return; // Don't process normal mode logic this tick
            }

            // Already exploding → skip everything
            if (isExplodingRef.current) return;

            // ── Normal mode switching ────────────────────────────────────
            const newMode = HandStore.mode;
            if (newMode !== modeRef.current) {
                modeRef.current = newMode;

                // On transition, lock current positions into startPositions
                for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
                    startPositions[i] = activePositions[i];
                }

                animState.current.progress = 0;
                gsap.to(animState.current, {
                    progress: 1,
                    duration: 1.5,
                    ease: "power2.inOut",
                });
            }
        }, 50);

        return () => clearInterval(modeInterval);
    }, [activePositions, startPositions]);

    useFrame((state) => {
        // CRITICAL: Skip ALL per-frame logic (hand tracking, repulsion, morphing) while exploding
        if (!pointsRef.current || isExplodingRef.current) return;

        const geometry = pointsRef.current.geometry;
        const positionsAttr = geometry.attributes.position;
        const posArray = positionsAttr.array as Float32Array;

        const time = state.clock.elapsedTime;
        const { x: handX, y: handY, z: handZ } = HandStore.position;
        const currentMode = modeRef.current;

        const p = animState.current.progress;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const idx = i * 3;

            // 1. Calculate Idle Wind Tunnel "Dynamic" target
            const nX = noise3D(initialPositions[idx] * 0.05, initialPositions[idx + 1] * 0.05, time * 0.2);
            const nY = noise3D(initialPositions[idx + 1] * 0.05, initialPositions[idx + 2] * 0.05, time * 0.2);
            const nZ = noise3D(initialPositions[idx + 2] * 0.05, initialPositions[idx] * 0.05, time * 0.2);

            let idleX = initialPositions[idx] + nX * 3;
            let idleY = initialPositions[idx + 1] + nY * 3;
            let idleZ = initialPositions[idx + 2] + nZ * 3;

            // Apply Repulsion natively to the idle target
            if (currentMode === 'idle') {
                const dx = idleX - handX;
                const dy = idleY - handY;
                const dz = idleZ - handZ;
                const distSq = dx * dx + dy * dy + dz * dz;

                if (distSq < 150) {
                    const dist = Math.sqrt(distSq);
                    const force = (150 - distSq) / 150;
                    const pushBase = force * 6;
                    idleX += (dx / dist) * pushBase;
                    idleY += (dy / dist) * pushBase;
                    idleZ += (dz / dist) * pushBase;
                }
            }

            // 2. Identify the true target based on Mode
            let targetX = idleX;
            let targetY = idleY;
            let targetZ = idleZ;

            if (currentMode === 'airplane') {
                targetX = airplanePositions[idx] + Math.sin(time * 2 + i) * 0.1;
                targetY = airplanePositions[idx + 1] + Math.cos(time * 2 + i) * 0.1;
                targetZ = airplanePositions[idx + 2] + Math.sin(time * 2.5 + i) * 0.1;
            } else if (currentMode === 'compass') {
                targetX = compassPositions[idx] + Math.sin(time + i) * 0.05;
                targetY = compassPositions[idx + 1] + Math.cos(time + i) * 0.05;
                targetZ = compassPositions[idx + 2] + (Math.sin(time * 2) * 0.1);
            } else if (currentMode === 'radar') {
                targetX = radarPositions[idx];
                targetY = radarPositions[idx + 1];
                targetZ = radarPositions[idx + 2] + Math.sin(time * 3 + targetX) * 0.2;
            }

            // 3. Morph from stored start via progress `p` to `target`
            posArray[idx] = startPositions[idx] * (1 - p) + targetX * p;
            posArray[idx + 1] = startPositions[idx + 1] * (1 - p) + targetY * p;
            posArray[idx + 2] = startPositions[idx + 2] * (1 - p) + targetZ * p;
        }

        // Spin speed based on mode
        let rotSpeed = 0;
        if (currentMode === 'airplane') rotSpeed = 0.5;
        else if (currentMode === 'compass') rotSpeed = 0.2;
        // Radar shouldn't spin much to act like a static HUD, just barely
        else if (currentMode === 'radar') rotSpeed = -0.05;

        // Scale rotation influence by progress if morphing OUT of idle
        const effectiveRot = rotSpeed * p + 0.05 * (1 - p);
        pointsRef.current.rotation.y += state.clock.getDelta() * effectiveRot;

        positionsAttr.needsUpdate = true;
    });

    return (
        <points ref={pointsRef} frustumCulled={false}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[activePositions, 3]}
                    usage={THREE.DynamicDrawUsage}
                />
                <bufferAttribute
                    attach="attributes-color"
                    args={[colors, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                ref={materialRef}
                size={0.15}
                vertexColors
                transparent
                opacity={0.8}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    );
}
