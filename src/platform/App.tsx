import React, { useEffect } from 'react';
import { usePlatformStore } from './stores/platformStore';
import { initRouterSync } from './services/routerSync';
import { initAudioBridge } from './services/audioBridge';
import { audioService } from '@services/audio/audioServiceInstance';
import { LoadingScreen } from './screens/LoadingScreen';
import { MainMenu } from './screens/MainMenu';
import { GameBrowser } from './screens/GameBrowser';
import { PlayerSetup } from './screens/PlayerSetup';
import { GamePlay } from './screens/GamePlay';
import { GameResults } from './screens/GameResults';
import { Settings } from './screens/Settings';
import { CrashScreen } from './screens/CrashScreen';
import { RemoteControllerScreen } from './screens/RemoteControllerScreen';
import { RunAndGunTitleScreen } from './screens/run-and-gun/RunAndGunTitleScreen';
import { RunAndGunCharacterSelect } from './screens/run-and-gun/RunAndGunCharacterSelect';
import { RunAndGunPlayerSetup } from './screens/run-and-gun/RunAndGunPlayerSetup';
import { RunAndGunControlsScreen } from './screens/run-and-gun/RunAndGunControlsScreen';
import { RunAndGunSettingsScreen } from './screens/run-and-gun/RunAndGunSettingsScreen';

export const App: React.FC = () => {
  const currentScreen = usePlatformStore((s) => s.currentScreen);

  useEffect(() => {
    const cleanup = initRouterSync();
    return cleanup;
  }, []);

  useEffect(() => {
    return initAudioBridge();
  }, []);

  useEffect(() => {
    const unlock = () => { void audioService.unlockAutoplay(); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  switch (currentScreen) {
    case 'loading':
      return <LoadingScreen />;
    case 'menu':
      return <MainMenu />;
    case 'browser':
      return <GameBrowser />;
    case 'setup':
      return <PlayerSetup />;
    case 'play':
      return <GamePlay />;
    case 'results':
      return <GameResults />;
    case 'settings':
      return <Settings />;
    case 'remote':
      return <RemoteControllerScreen />;
    case 'crash':
      return <CrashScreen />;
    case 'run-and-gun-title':
      return <RunAndGunTitleScreen />;
    case 'run-and-gun-character':
      return <RunAndGunCharacterSelect />;
    case 'run-and-gun-setup':
      return <RunAndGunPlayerSetup />;
    case 'run-and-gun-controls':
      return <RunAndGunControlsScreen />;
    case 'run-and-gun-settings':
      return <RunAndGunSettingsScreen />;
    default:
      return <MainMenu />;
  }
};

export default App;
