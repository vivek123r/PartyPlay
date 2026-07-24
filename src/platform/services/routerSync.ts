import { usePlatformStore } from '@platform/stores/platformStore';
import { GameRegistry } from '@runtime/GameRegistry';

let isUpdatingFromHash = false;
let isUpdatingFromStore = false;

export function initRouterSync(): () => void {
  const syncStoreFromHash = () => {
    if (isUpdatingFromStore) return;
    isUpdatingFromHash = true;

    try {
      const hash = window.location.hash || '#/';
      const store = usePlatformStore.getState();

      // Don't override 'loading' screen on cold start if on root hash
      if (store.currentScreen === 'loading' && (hash === '#/' || hash === '#/menu')) {
        return;
      }

      if (hash === '#/' || hash === '#/menu') {
        if (store.currentScreen !== 'menu') store.setScreen('menu');
      } else if (hash === '#/browser') {
        if (store.currentScreen !== 'browser') store.setScreen('browser');
      } else if (hash === '#/settings') {
        if (store.currentScreen !== 'settings') store.setScreen('settings');
      } else if (hash.startsWith('#/games/')) {
        const parts = hash.split('/');
        const gameId = parts[2];
        const subScreen = parts[3];

        if (gameId) {
          const entry = GameRegistry.get(gameId);
          if (entry) {
            store.setSelectedGame(entry.manifest);

            if (subScreen === 'results' && store.lastResults) {
              if (store.currentScreen !== 'results') store.setScreen('results');
            } else {
              if (store.currentScreen !== 'setup' && store.currentScreen !== 'play') {
                store.setScreen('setup');
              }
            }
          } else {
            store.setScreen('browser');
          }
        }
      }
    } finally {
      isUpdatingFromHash = false;
    }
  };

  // 1. Synchronize store on window hashchange & initial launch
  window.addEventListener('hashchange', syncStoreFromHash);
  syncStoreFromHash();

  // 2. Synchronize window hash when Zustand store changes
  const unsubStore = usePlatformStore.subscribe((state) => {
    if (isUpdatingFromHash) return;
    isUpdatingFromStore = true;

    try {
      let targetHash = '#/';

      switch (state.currentScreen) {
        case 'loading':
          targetHash = '#/';
          break;
        case 'menu':
          targetHash = '#/';
          break;
        case 'browser':
          targetHash = '#/browser';
          break;
        case 'settings':
          targetHash = '#/settings';
          break;
        case 'setup':
        case 'play':
          if (state.selectedGame) {
            targetHash = `#/games/${state.selectedGame.id}`;
          } else {
            targetHash = '#/browser';
          }
          break;
        case 'results':
          if (state.selectedGame) {
            targetHash = `#/games/${state.selectedGame.id}/results`;
          } else {
            targetHash = '#/browser';
          }
          break;
        default:
          targetHash = '#/';
          break;
      }

      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash);
      }
    } finally {
      isUpdatingFromStore = false;
    }
  });

  return () => {
    window.removeEventListener('hashchange', syncStoreFromHash);
    unsubStore();
  };
}
