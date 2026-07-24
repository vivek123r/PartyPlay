import { create } from 'zustand';

interface SettingsStoreState {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  isMuted: boolean;

  setMasterVolume: (vol: number) => void;
  setMuted: (muted: boolean) => void;
}

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  masterVolume: 0.8,
  sfxVolume: 1.0,
  musicVolume: 0.6,
  isMuted: false,

  setMasterVolume: (masterVolume) => set({ masterVolume }),
  setMuted: (isMuted) => set({ isMuted }),
}));
