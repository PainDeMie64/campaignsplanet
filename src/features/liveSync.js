import { visibleLiveCampaignIds } from '../data/liveHistory.js';
import { fetchLiveAtlas, liveAtlasEndpoint, readCachedAtlas } from '../data/liveAtlas.js';

const REFRESH_INTERVAL = 5 * 60 * 1000;

function isVisibleCampaign(state, campaign) {
  if (!campaign) return false;
  if (campaign.gameId !== 'tm2020') return true;
  return visibleLiveCampaignIds(state).has(campaign.id);
}

function firstVisibleCampaign(state, gameId) {
  const visibleLiveIds = visibleLiveCampaignIds(state);
  return state.atlas.campaigns.find((campaign) => {
    if (campaign.gameId !== gameId) return false;
    return campaign.gameId !== 'tm2020' || visibleLiveIds.has(campaign.id);
  });
}

function applyAtlas(app, atlas, sync) {
  app.atlas = atlas;
  app.store.setState((state) => {
    const nextState = { ...state, atlas };
    const selectedCampaign = atlas.campaignById[state.selectedCampaignId];
    const selectedGame = atlas.gameById[state.selectedGameId] ?? atlas.games[0];
    const campaign = isVisibleCampaign(nextState, selectedCampaign)
      ? selectedCampaign
      : firstVisibleCampaign(nextState, selectedGame?.id) ?? atlas.campaigns[0];
    return {
      atlas,
      selectedGameId: selectedGame?.id ?? null,
      selectedRegion: campaign?.category ?? campaign?.environment ?? null,
      selectedSection: campaign?.section ?? null,
      selectedCampaignId: campaign?.id ?? null,
      selectedMapId: campaign?.maps[0]?.id ?? null,
      sync
    };
  }, { source: 'live-sync' });
}

export function registerLiveSync(app) {
  const endpoint = liveAtlasEndpoint();

  let controller = null;
  let timer = null;

  async function refresh() {
    controller?.abort();
    controller = new AbortController();
    app.store.update('sync', (sync) => ({
      ...sync,
      state: sync.state === 'live' ? 'refreshing' : 'loading',
      source: endpoint,
      message: 'Refreshing campaign source.'
    }), { source: 'live-sync-refresh' });

    const timeout = setTimeout(() => controller.abort(), 4500);
    try {
      const { atlas } = await fetchLiveAtlas(endpoint, { signal: controller.signal });
      clearTimeout(timeout);
      applyAtlas(app, atlas, {
        state: 'live',
        source: endpoint,
        lastUpdated: atlas.generatedAt,
        message: 'Live campaign source connected.'
      });
    } catch (error) {
      clearTimeout(timeout);
      const previous = app.store.getState().sync.state;
      app.store.update('sync', (sync) => ({
        ...sync,
        state: previous === 'cached' ? 'cached' : 'error',
        source: endpoint,
        message: error.name === 'AbortError' ? 'Live source timed out.' : error.message
      }), { source: 'live-sync-error' });
    }
  }

  const cached = readCachedAtlas();
  if (cached) {
    applyAtlas(app, cached.atlas, {
      state: 'cached',
      source: cached.meta?.source ?? endpoint,
      lastUpdated: cached.meta?.cachedAt ?? cached.atlas.generatedAt,
      message: 'Restored cached campaign atlas.'
    });
  }

  refresh();
  timer = setInterval(() => refresh(), REFRESH_INTERVAL);

  return () => {
    clearInterval(timer);
    controller?.abort();
  };
}
