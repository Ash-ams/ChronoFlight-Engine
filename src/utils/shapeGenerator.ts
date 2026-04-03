// Generates the initial wind tunnel positions and the airplane targets
import * as THREE from 'three';

export const PARTICLE_COUNT = 5000;

export function generateInitialPositions() {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    const colorCyan = new THREE.Color('#00f0ff');
    const colorSilver = new THREE.Color('#e2e8f0');

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Spread them across a wide field for the wind tunnel
        positions[i * 3 + 0] = (Math.random() - 0.5) * 40; // x
        positions[i * 3 + 1] = (Math.random() - 0.5) * 20; // y
        positions[i * 3 + 2] = (Math.random() - 0.5) * 40; // z

        // Mix silver and cyan
        const mixColor = Math.random() > 0.5 ? colorCyan : colorSilver;
        colors[i * 3 + 0] = mixColor.r;
        colors[i * 3 + 1] = mixColor.g;
        colors[i * 3 + 2] = mixColor.b;
    }
    return { positions, colors };
}

export function generateAirplaneTargetPositions() {
    const positions = new Float32Array(PARTICLE_COUNT * 3);

    // Distribute 5000 points around an airplane silhouette.
    // We'll divide the 5000 points into groups:
    // 3000 for Fuselage
    // 1000 for left wing
    // 1000 for right wing
    // 500 for tail (we'll just balance the numbers: 2500 fuselage, 1000 left wing, 1000 right wing, 250 vertical tail, 250 horizontal tail = 5000)

    const fuselageP = 2500;
    const wingLP = 1000;
    const wingRP = 1000;
    const tailVP = 250;
    const tailHP = 250;

    let offset = 0;

    // 1. Fuselage
    for (let i = 0; i < fuselageP; i++) {
        const t = Math.random(); // length from -10 to 10
        const x = (t - 0.5) * 20;
        const r = Math.sin(t * Math.PI) * 1.5; // Tapered ends
        const theta = Math.random() * Math.PI * 2;
        const y = r * Math.cos(theta);
        const z = r * Math.sin(theta);

        positions[offset++] = x;
        positions[offset++] = y;
        positions[offset++] = z;
    }

    // 2. Left Wing (swept back)
    for (let i = 0; i < wingLP; i++) {
        const u = Math.random(); // root to tip
        const v = Math.random(); // leading to trailing
        const xBase = 0; // Center of mass
        const sweep = -2;
        const z = u * 8; // length of wing
        const x = xBase - sweep * u - v * 3; // swept back, width 3
        const y = (Math.random() - 0.5) * 0.2; // slight thickness

        positions[offset++] = x;
        positions[offset++] = y;
        positions[offset++] = z + 1.5; // Offset from fuselage
    }

    // 3. Right Wing
    for (let i = 0; i < wingRP; i++) {
        const u = Math.random();
        const v = Math.random();
        const xBase = 0;
        const sweep = -2;
        const z = -u * 8;
        const x = xBase - sweep * u - v * 3;
        const y = (Math.random() - 0.5) * 0.2;

        positions[offset++] = x;
        positions[offset++] = y;
        positions[offset++] = z - 1.5;
    }

    // 4. Vertical Tail
    for (let i = 0; i < tailVP; i++) {
        const u = Math.random(); // h
        const v = Math.random(); // w
        const z = (Math.random() - 0.5) * 0.2;
        const y = u * 4;
        const xFront = -8; // Back of plane (negative X)
        const x = xFront - u * 2 - v * 2;

        positions[offset++] = x;
        positions[offset++] = y + 0.5; // On top of fuselage
        positions[offset++] = z;
    }

    // 5. Horizontal Tail
    for (let i = 0; i < tailHP; i++) {
        const u = Math.random(); // root to tip
        const v = Math.random(); // leading to trailing
        const side = Math.random() > 0.5 ? 1 : -1;
        const z = u * 3 * side;
        const y = 0.5 + (Math.random() - 0.5) * 0.2;
        const xFront = -8;
        const x = xFront - u * 0.5 - v * 1.5;

        positions[offset++] = x;
        positions[offset++] = y;
        positions[offset++] = z + (1 * side);
    }

    // Add random turbulence coordinate so they aren't completely stagnant on snap

    return positions;
}

export function generateCompassPositions() {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    let offset = 0;

    // Concentric Rings
    const rings = [6, 10, 14];
    const pointsPerRing = [800, 1200, 1500];

    for (let rIdx = 0; rIdx < rings.length; rIdx++) {
        const radius = rings[rIdx];
        const ptCount = pointsPerRing[rIdx];
        for (let i = 0; i < ptCount; i++) {
            const theta = (i / ptCount) * Math.PI * 2;
            positions[offset++] = Math.cos(theta) * radius;
            positions[offset++] = Math.sin(theta) * radius;
            positions[offset++] = (Math.random() - 0.5) * 0.5; // slight Z depth
        }
    }

    // Tick marks on the outer ring
    const numTicks = 36;
    const tickLength = 2;
    const ticksStart = 14;
    const pointsPerTick = Math.floor((PARTICLE_COUNT - 3500) / numTicks); // roughly 41

    for (let t = 0; t < numTicks; t++) {
        const theta = (t / numTicks) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        for (let p = 0; p < pointsPerTick; p++) {
            const l = ticksStart + (p / pointsPerTick) * tickLength;
            positions[offset++] = cosT * l;
            positions[offset++] = sinT * l;
            positions[offset++] = 0;
        }
    }

    // Fill remaining points at center
    while (offset < PARTICLE_COUNT * 3) {
        positions[offset++] = (Math.random() - 0.5);
        positions[offset++] = (Math.random() - 0.5);
        positions[offset++] = (Math.random() - 0.5);
    }

    return positions;
}

export function generateRadarPositions() {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    let offset = 0;

    // Radar Grid (Concentric lines + Radial lines)
    const rings = 8;
    const pointsPerRing = 300; // 2400 points
    const maxRadius = 15;

    for (let r = 1; r <= rings; r++) {
        const radius = (r / rings) * maxRadius;
        for (let p = 0; p < pointsPerRing; p++) {
            const theta = (p / pointsPerRing) * Math.PI * 2;
            positions[offset++] = Math.cos(theta) * radius;
            positions[offset++] = Math.sin(theta) * radius;
            positions[offset++] = 0;
        }
    }

    // Radial Sweeps
    const sweeps = 12;
    const pointsPerSweep = Math.floor((PARTICLE_COUNT - (rings * pointsPerRing)) / sweeps); // ~216 points

    for (let s = 0; s < sweeps; s++) {
        const theta = (s / sweeps) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        for (let p = 0; p < pointsPerSweep; p++) {
            const r = (p / pointsPerSweep) * maxRadius;
            positions[offset++] = cosT * r;
            positions[offset++] = sinT * r;
            positions[offset++] = 0;
        }
    }

    // Any left overs
    while (offset < PARTICLE_COUNT * 3) {
        positions[offset++] = 0;
        positions[offset++] = 0;
        positions[offset++] = 0;
    }

    return positions;
}
