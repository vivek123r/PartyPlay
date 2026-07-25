import { useSettingsStore } from '@platform/stores/settingsStore';
import { audioService } from '@services/audio/audioServiceInstance';

/** Bridges the platform settings store to the singleton AudioService. Mount once for the app's lifetime. */
export function initAudioBridge(): () => void {
  const initial = useSettingsStore.getState();
  audioService.setMasterVolume(initial.masterVolume);
  audioService.setMuted(initial.isMuted);

  return useSettingsStore.subscribe((state) => {
    audioService.setMasterVolume(state.masterVolume);
    audioService.setMuted(state.isMuted);
  });
}
