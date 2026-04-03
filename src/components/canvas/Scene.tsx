'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import ParticleSystem from './ParticleSystem';
import { Suspense } from 'react';

export default function Scene() {
    return (
        <div className="absolute inset-0 w-full h-full z-0">
            <Canvas
                camera={{ position: [0, 5, 25], fov: 45 }}
                dpr={[1, 2]} // Support high-dpi
                gl={{ antialias: true, alpha: true }}
            >
                <color attach="background" args={['#030712']} />

                {/* Lights */}
                <ambientLight intensity={0.2} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#00f0ff" />
                <pointLight position={[-10, -10, -10]} intensity={1} color="#e2e8f0" />
                <directionalLight position={[0, -5, 10]} intensity={0.5} />

                {/* Particles */}
                <Suspense fallback={null}>
                    <ParticleSystem />
                </Suspense>

                {/* Controls - primarily for debugging but locked for production if wanted */}
                <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />

            </Canvas>
        </div>
    );
}
