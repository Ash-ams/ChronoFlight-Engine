export type InteractionMode = 'idle' | 'airplane' | 'compass' | 'radar' | 'explode';

export interface AppState {
    interactionMode: InteractionMode;
    handPosition: { x: number; y: number; z: number };
    setInteractionMode: (mode: InteractionMode) => void;
    setHandPosition: (x: number, y: number, z: number) => void;
}

// simple localized event bus for high-frequency position updates avoiding context renders
type Listener = (pos: { x: number, y: number, z: number }) => void;
const listeners = new Set<Listener>();

export const HandStore = {
    position: { x: 0, y: 0, z: 0 },
    mode: 'idle' as InteractionMode,
    setMode: (mode: InteractionMode) => {
        HandStore.mode = mode;
    },
    setPosition: (x: number, y: number, z: number) => {
        HandStore.position = { x, y, z };
        listeners.forEach((l) => l(HandStore.position));
    },
    subscribe: (listener: Listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
};
