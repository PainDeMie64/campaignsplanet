import { visibleLiveCampaignIds } from './liveHistory.js';
import { campaignGroupLabel } from './campaignGrouping.js';

export function getSelectedGame(state) {
  return state.atlas.gameById[state.selectedGameId] ?? state.atlas.games[0] ?? null;
}

function isCampaignVisible(state, campaign, visibleLiveIds = visibleLiveCampaignIds(state)) {
  if (!campaign) return false;
  return campaign.gameId !== 'tm2020' || visibleLiveIds.has(campaign.id);
}

export function getSelectedCampaign(state) {
  const visibleLiveIds = visibleLiveCampaignIds(state);
  if (state.selectedCampaignId) {
    const selected = state.atlas.campaignById[state.selectedCampaignId] ?? null;
    if (isCampaignVisible(state, selected, visibleLiveIds)) return selected;
  }
  const game = getSelectedGame(state);
  return state.atlas.campaigns.find((campaign) => {
    if (campaign.gameId !== game?.id) return false;
    if (state.selectedRegion && campaignGroupLabel(campaign) !== state.selectedRegion) return false;
    return isCampaignVisible(state, campaign, visibleLiveIds);
  }) ?? null;
}

export function getSelectedMap(state) {
  if (state.selectedMapId) return state.atlas.mapById[state.selectedMapId] ?? null;
  const campaign = getSelectedCampaign(state);
  return campaign?.maps[0] ?? null;
}

function matchesQuery(haystack, query) {
  if (!query) return true;
  const text = haystack.toLowerCase();
  return query.split(/\s+/).every((term) => text.includes(term));
}

export function filterCampaigns(state) {
  const query = state.query.trim().toLowerCase();
  const { games, environments, statuses } = state.filters;
  const visibleLiveIds = visibleLiveCampaignIds(state);

  return state.atlas.campaigns.filter((campaign) => {
    if (campaign.gameId === 'tm2020' && !visibleLiveIds.has(campaign.id)) return false;
    if (games.size && !games.has(campaign.gameId)) return false;
    if (environments.size && !environments.has(campaign.environment)) return false;
    if (statuses.size && !statuses.has(campaign.officialStatus)) return false;
    if (!query) return true;
    const haystack = [
      campaign.name,
      campaign.game.name,
      campaignGroupLabel(campaign),
      campaign.environment,
      campaign.mode,
      campaign.tier,
      campaign.region,
      ...campaign.maps.map((map) => map.name)
    ].join(' ');
    return matchesQuery(haystack, query);
  });
}

export function filterMaps(state) {
  const campaigns = filterCampaigns(state);
  const query = state.query.trim().toLowerCase();
  const rows = campaigns.flatMap((campaign) => campaign.maps.map((map) => ({ ...map, campaign })));
  if (!query) return rows;
  return rows.filter((map) => {
    const haystack = [
      map.name,
      map.environment,
      map.surface,
      campaignGroupLabel(map.campaign),
      map.campaign.name,
      map.campaign.tier,
      map.campaign.region,
      map.campaign.game.name,
      ...map.tags
    ].join(' ');
    return matchesQuery(haystack, query);
  });
}

export function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}
