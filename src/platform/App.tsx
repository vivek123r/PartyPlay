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
    default:
      return <MainMenu />;
  }
};

export default App;
