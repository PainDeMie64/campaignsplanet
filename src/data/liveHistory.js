const LIVE_GAME_ID = 'tm2020';

function campaignSeason(campaign) {
  return campaign.name.replace(/\s+(White|Green|Blue|Red|Black) Series$/, '');
}

export function liveCampaignGroups(atlas) {
  const groups = new Map();
  for (const campaign of atlas.campaigns) {
    if (campaign.gameId !== LIVE_GAME_ID) continue;
    const season = campaignSeason(campaign);
    const item = groups.get(season) ?? {
      id: season.toLowerCase().replaceAll(' ', '-'),
      season,
      releaseDate: campaign.releaseDate,
      campaigns: []
    };
    item.campaigns.push(campaign);
    if (campaign.releaseDate < item.releaseDate) item.releaseDate = campaign.releaseDate;
    groups.set(season, item);
  }
  return [...groups.values()].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function currentLiveCampaignGroup(atlas, now = new Date()) {
  const groups = liveCampaignGroups(atlas);
  const today = localDateKey(now);
  return groups.find((group) => group.releaseDate <= today) ?? groups.at(-1) ?? null;
}

export function selectedLiveHistory(state) {
  return state.ui.trackmania2020History || 'current';
}

export function selectedLiveCampaignGroup(state) {
  const selected = selectedLiveHistory(state);
  const groups = liveCampaignGroups(state.atlas);
  if (selected === 'all') return null;
  if (selected === 'current') return currentLiveCampaignGroup(state.atlas);
  return groups.find((group) => group.id === selected) ?? currentLiveCampaignGroup(state.atlas);
}

export function visibleLiveCampaignIds(state) {
  const groups = liveCampaignGroups(state.atlas);
  const selected = selectedLiveHistory(state);
  const currentGroup = currentLiveCampaignGroup(state.atlas);
  const visibleGroups = selected === 'all'
    ? groups
    : selected === 'current'
      ? currentGroup ? [currentGroup] : groups.slice(0, 1)
      : groups.filter((group) => group.id === selected);
  return new Set(visibleGroups.flatMap((group) => group.campaigns.map((campaign) => campaign.id)));
}
