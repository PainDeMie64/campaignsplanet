function parseParams(atlas) {
  const params = new URLSearchParams(window.location.search);
  const campaign = atlas.campaignById[params.get('campaign')];
  const map = atlas.mapById[params.get('map')];
  const game = atlas.gameById[params.get('game')] ?? campaign?.game ?? atlas.gameById[map?.gameId];
  return {
    gameId: game?.id ?? null,
    campaignId: campaign?.id ?? map?.campaignId ?? null,
    mapId: map?.id ?? null
  };
}

function shareUrl(state) {
  const url = new URL(window.location.href);
  url.searchParams.set('game', state.selectedGameId);
  if (state.selectedCampaignId) url.searchParams.set('campaign', state.selectedCampaignId);
  else url.searchParams.delete('campaign');
  if (state.selectedMapId) url.searchParams.set('map', state.selectedMapId);
  else url.searchParams.delete('map');
  return url.toString();
}

export function registerDeepLinks(app) {
  const initial = parseParams(app.store.getState().atlas);
  if (initial.gameId || initial.campaignId || initial.mapId) {
    app.store.setState((state) => ({
      selectedGameId: initial.gameId ?? state.selectedGameId,
      selectedRegion: initial.campaignId ? state.atlas.campaignById[initial.campaignId]?.category ?? state.selectedRegion : state.selectedRegion,
      selectedSection: initial.campaignId ? state.atlas.campaignById[initial.campaignId]?.section ?? null : state.selectedSection,
      selectedCampaignId: initial.campaignId ?? state.selectedCampaignId,
      selectedMapId: initial.mapId ?? state.selectedMapId
    }), { source: 'deep-link-initial' });
  }

  let lastUrl = '';
  const unsubscribe = app.store.subscribe((state) => {
    const next = shareUrl(state);
    if (next === lastUrl) return;
    lastUrl = next;
    history.replaceState(null, '', next);
  });

  function onPopState() {
    const params = parseParams(app.store.getState().atlas);
    app.store.setState((state) => ({
      selectedGameId: params.gameId ?? state.selectedGameId,
      selectedRegion: params.campaignId ? state.atlas.campaignById[params.campaignId]?.category ?? state.selectedRegion : state.selectedRegion,
      selectedSection: params.campaignId ? state.atlas.campaignById[params.campaignId]?.section ?? null : state.selectedSection,
      selectedCampaignId: params.campaignId ?? state.selectedCampaignId,
      selectedMapId: params.mapId ?? state.selectedMapId
    }), { source: 'deep-link-popstate' });
  }

  window.addEventListener('popstate', onPopState);

  return () => {
    unsubscribe();
    window.removeEventListener('popstate', onPopState);
  };
}
