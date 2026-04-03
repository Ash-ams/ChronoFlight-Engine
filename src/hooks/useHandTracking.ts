'use client';

import { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { HandStore, InteractionMode } from '@/store/HandStore';

export function useHandTracking() {
    const [hasWebcam, setHasWebcam] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const handLandmarkerRef = useRef<HandLandmarker | null>(null);

    useEffect(() => {
        let active = true;

        async function initializeTracking() {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );

                const landmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 1,
                });

                if (!active) return;
                handLandmarkerRef.current = landmarker;

                // Try getting webcam
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    if (videoRef.current && active) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.play();
                        setHasWebcam(true);
                    }
                } catch (e) {
                    console.warn("Webcam access denied or unavailable. Falling back to mouse tracking.", e);
                    setHasWebcam(false);
                }
            } catch (e) {
                console.error("Failed to initialize MediaPipe", e);
                setHasWebcam(false);
            } finally {
                if (active) setIsInitializing(false);
            }
        }

        initializeTracking();

        return () => {
            active = false;
            if (handLandmarkerRef.current) handLandmarkerRef.current.close();
            if (videoRef.current && videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    // Tracking loop
    useEffect(() => {
        if (!hasWebcam || !videoRef.current || !handLandmarkerRef.current) return;

        let requestId: number;
        let lastVideoTime = -1;

        let currentGesture: InteractionMode = 'idle';
        let gestureStartTime = performance.now();

        function renderLoop() {
            if (!videoRef.current || !handLandmarkerRef.current) return;

            const video = videoRef.current;
            const startTime = performance.now();

            if (video.currentTime !== lastVideoTime && video.readyState >= 2) {
                lastVideoTime = video.currentTime;
                const results = handLandmarkerRef.current.detectForVideo(video, startTime);

                let detectedGesture: InteractionMode = 'idle';

                if (results.landmarks && results.landmarks.length > 0) {
                    const landmarks = results.landmarks[0];
                    const wrist = landmarks[0];
                    const thumbTip = landmarks[4];
                    const indexBase = landmarks[5];
                    const indexTip = landmarks[8];
                    const midBase = landmarks[9];
                    const midTip = landmarks[12];
                    const ringTip = landmarks[16];
                    const pinkyTip = landmarks[20];

                    // Distances
                    const distWristToMidTip = Math.hypot(midTip.x - wrist.x, midTip.y - wrist.y);
                    const distWristToMidBase = Math.hypot(midBase.x - wrist.x, midBase.y - wrist.y);
                    const distWristToIndexTip = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y);
                    const distWristToIndexBase = Math.hypot(indexBase.x - wrist.x, indexBase.y - wrist.y);
                    const distWristToRingTip = Math.hypot(ringTip.x - wrist.x, ringTip.y - wrist.y);
                    const distWristToPinkyTip = Math.hypot(pinkyTip.x - wrist.x, pinkyTip.y - wrist.y);

                    const distThumbToIndex = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);

                    // Heuristics
                    const isIndexExtended = distWristToIndexTip > distWristToIndexBase * 1.5;
                    const isMidExtended = distWristToMidTip > distWristToMidBase * 1.5;
                    const isRingExtended = distWristToRingTip > distWristToMidBase * 1.5;
                    const isPinkyExtended = distWristToPinkyTip > distWristToMidBase * 1.5;

                    const isPinch = distThumbToIndex < 0.05 && !isMidExtended;
                    const isPeace = isIndexExtended && isMidExtended && !isRingExtended && !isPinkyExtended;
                    const isFist = !isIndexExtended && !isMidExtended && !isRingExtended && !isPinkyExtended;

                    if (isPinch) {
                        detectedGesture = 'radar';
                    } else if (isPeace) {
                        detectedGesture = 'compass';
                    } else if (isFist) {
                        detectedGesture = 'airplane';
                    } else {
                        detectedGesture = 'idle';
                    }

                    HandStore.setPosition(-(indexTip.x - 0.5) * 40, -(indexTip.y - 0.5) * 20, 0);
                } else {
                    detectedGesture = 'idle';
                }

                // Debounce logic — never override 'explode'
                if (HandStore.mode === 'explode') {
                    // Explosion in progress — skip all gesture processing
                } else if (detectedGesture !== currentGesture) {
                    currentGesture = detectedGesture;
                    gestureStartTime = performance.now();
                } else {
                    if (performance.now() - gestureStartTime >= 400) {
                        if (HandStore.mode !== currentGesture) {
                            HandStore.setMode(currentGesture);
                        }
                    }
                }
            }

            requestId = requestAnimationFrame(renderLoop);
        }
        renderLoop();

        return () => cancelAnimationFrame(requestId);
    }, [hasWebcam]);

    // Mouse position: always on after init (supplements webcam when no hand is in frame)
    useEffect(() => {
        if (isInitializing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 40;
            const y = -(e.clientY / window.innerHeight - 0.5) * 20;
            HandStore.setPosition(x, y, 0);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isInitializing]);

    // Mouse-only: click to cycle modes when webcam is not driving gestures
    useEffect(() => {
        if (hasWebcam || isInitializing) return;

        const handleMouseDown = (e: MouseEvent) => {
            if (HandStore.mode === 'explode') return;
            if ((e.target as HTMLElement)?.closest('button')) return;
            const modes: InteractionMode[] = ['idle', 'airplane', 'compass', 'radar'];
            const nextModeIdx = (modes.indexOf(HandStore.mode) + 1) % modes.length;
            HandStore.setMode(modes[nextModeIdx]);
        };
        const handleMouseUp = () => { };
        const handleMouseLeave = () => { if (HandStore.mode !== 'explode') HandStore.setMode('idle'); };

        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [hasWebcam, isInitializing]);

    return { hasWebcam, isInitializing, videoRef };
}
