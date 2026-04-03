'use client';

import { useHandTracking } from '@/hooks/useHandTracking';
import Scene from '@/components/canvas/Scene';
import { Hand, MousePointer2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { HandStore } from '@/store/HandStore';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { hasWebcam, isInitializing, videoRef } = useHandTracking();
  const [mode, setMode] = useState(HandStore.mode);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setMode(HandStore.mode);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleInitialize = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    HandStore.setMode('explode');

    // Re-assert explode mode after a tick in case any event handler races
    requestAnimationFrame(() => {
      if (HandStore.mode !== 'explode') {
        console.warn('[EXPLODE] Mode was overridden to', HandStore.mode, '— re-setting to explode');
        HandStore.setMode('explode');
      }
    });
    
    // Navigate after explosion + overlay fade completes
    setTimeout(() => {
      router.push('/dashboard');
    }, 1800);
  };

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#030712] font-sans text-white">
      {/* 3D Canvas Layer */}
      <Scene />

      {/* Hidden Video element for MediaPipe processing */}
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        autoPlay
        playsInline
      />

      {/* Cinematic HUD Branding (Top Left) — fades out during transition */}
      <div className={`absolute top-8 left-8 z-20 flex flex-col items-start select-none pointer-events-none transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0 overflow-hidden">
             <Image src="/logo.png" width={64} height={64} alt="Logo" className="object-contain w-full h-full drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
          </div>
          <div className="flex items-baseline leading-none">
            <h1 className="font-black text-6xl md:text-7xl tracking-tighter text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
              CHRONO
            </h1>
            <h1 className="font-black text-6xl md:text-7xl tracking-tighter text-white">
              FLIGHT
            </h1>
          </div>
        </div>
        <p className="mt-3 text-slate-400 tracking-widest text-sm uppercase pl-[5rem]">
          SYSTEM v1.0 // PREDICTIVE AVIATION TELEMETRY
        </p>
      </div>

      {/* Tracking Status Indicator (Top Right) — fades out during transition */}
      <div className={`absolute top-8 right-8 z-20 flex items-center gap-3 bg-white/5 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.4)] pointer-events-auto transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        <div className={`w-2.5 h-2.5 rounded-full ${isInitializing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,1)]'}`} />
        <span className="text-xs font-semibold tracking-widest text-white/90 uppercase">
          HAND TRACKING: {isInitializing ? 'INITIALIZING' : hasWebcam ? 'ACTIVE' : 'INACTIVE'}
        </span>
        {hasWebcam ? <Hand size={16} className="text-cyan-400" /> : <MousePointer2 size={16} className="text-cyan-400" />}
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none flex flex-col justify-end items-center p-8 z-10 h-full">

        {/* Dynamic State Indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-opacity duration-1000 z-0">
          {!isInitializing && !isTransitioning && (
            <div className="text-center">
              {mode === 'idle' && (
                <div className="animate-pulse opacity-80">
                  <p className="text-cyan-300 font-light tracking-widest text-lg drop-shadow-[0_0_10px_#00f0ff]">
                    {hasWebcam ? 'System Idle: Waiting for Gesture' : 'Move Mouse: Air Flow'}
                  </p>
                  <p className="text-white/50 font-light text-sm mt-2">
                    {hasWebcam ? 'Fist | Peace Sign | Pinch' : 'Click to cycle shapes'}
                  </p>
                </div>
              )}
              {mode === 'airplane' && (
                <div className="animate-fade-in drop-shadow-[0_0_20px_#fff]">
                  <p className="text-white font-bold tracking-widest text-3xl uppercase">Aero Formation</p>
                </div>
              )}
              {mode === 'compass' && (
                <div className="animate-fade-in drop-shadow-[0_0_20px_#00f0ff]">
                  <p className="text-cyan-300 font-bold tracking-widest text-3xl uppercase">Navigational Compass</p>
                </div>
              )}
              {mode === 'radar' && (
                <div className="animate-fade-in drop-shadow-[0_0_20px_#e2e8f0]">
                  <p className="text-silver-300 font-bold tracking-widest text-3xl uppercase text-slate-200">Tactical HUD</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button — onMouseDown stops propagation so window mousedown won't cycle modes */}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleInitialize}
          disabled={isTransitioning}
          className={`pointer-events-auto mb-8 px-10 py-4 group relative overflow-hidden rounded-md border border-cyan-400/50 bg-cyan-900/20 backdrop-blur-sm transition-all duration-300 hover:bg-cyan-900/40 hover:border-cyan-300 hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] ${isTransitioning ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100'}`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/10 to-cyan-400/0 -translate-x-full group-hover:animate-shimmer" />
          <span className="relative text-cyan-200 font-mono font-bold tracking-[0.2em] text-sm group-hover:text-cyan-50">
            INITIALIZE SQL ENGINE
          </span>
        </button>

      </div>

      {/* Cinematic Fade Overlay — delays 0.8s then fades to black over 0.6s so explosion is visible */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isTransitioning ? 1 : 0 }}
        transition={{ duration: 0.6, delay: isTransitioning ? 0.8 : 0, ease: "easeIn" }}
        className="fixed inset-0 z-50 bg-[#030712] pointer-events-none"
      />
    </main>
  );
}
