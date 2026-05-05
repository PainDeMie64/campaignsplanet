import { createEventBus } from './eventBus.js';
import { createStore } from './store.js';
import { CAMPAIGN_ATLAS } from '../data/campaigns.js';
import { deriveAtlas } from '../data/deriveAtlas.js';
import { FlatAtlasRenderer } from '../flat/FlatAtlasRenderer.js';

export async function createApp(nodes) {
  const events = createEventBus();
  const atlas = deriveAtlas(CAMPAIGN_ATLAS);
  const store = createStore({
    atlas,
    selectedGameId: atlas.games[0]?.id ?? null,
    selectedRegion: null,
    selectedCampaignId: null,
    selectedMapId: null,
    hoveredGameId: null,
    hoveredCampaignId: null,
    query: '',
    filters: {
      games: new Set(atlas.games.map((game) => game.id)),
      environments: new Set(),
      statuses: new Set(['active', 'legacy', 'retired'])
    },
    ui: {
      mode: 'flat',
      atlasView: 'flat',
      quality: 'auto',
      theme: 'dark',
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      trackmania2020History: 'current'
    },
    sync: {
      state: 'seeded',
      lastUpdated: atlas.generatedAt,
      source: 'Bundled official-campaign seed',
      message: 'Using bundled campaign atlas until a live source is configured.'
    }
  });

  const flat = new FlatAtlasRenderer({
    canvas: nodes.flatCanvas,
    store
  });

  const app = {
    ...nodes,
    events,
    store,
    atlas,
    flat,
    destroyers: [],
    destroy() {
      for (const destroy of app.destroyers.splice(0)) destroy();
      flat.destroy();
    }
  };

  document.documentElement.dataset.theme = store.getState().ui.theme;
  nodes.flatCanvas.classList.add('is-active');
  app.destroyers.push(store.subscribe((state, prev) => {
    if (state.ui.theme === prev.ui.theme) return;
    document.documentElement.dataset.theme = state.ui.theme;
  }));
  return app;
}
