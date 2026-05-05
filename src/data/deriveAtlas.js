import { campaignGroupLabel } from './campaignGrouping.js';

export function deriveAtlas(rawAtlas) {
  const games = rawAtlas.games.map((game) => ({ ...game }));
  const campaigns = rawAtlas.campaigns.map((campaign) => ({
    ...campaign,
    maps: campaign.maps.map((map) => ({ ...map, campaignId: campaign.id, gameId: campaign.gameId }))
  }));
  const maps = campaigns.flatMap((campaign) => campaign.maps);

  const gameById = Object.fromEntries(games.map((game) => [game.id, game]));
  const campaignById = Object.fromEntries(campaigns.map((campaign) => [campaign.id, campaign]));
  const mapById = Object.fromEntries(maps.map((map) => [map.id, map]));

  for (const game of games) {
    const gameCampaigns = campaigns.filter((campaign) => campaign.gameId === game.id);
    game.campaignCount = gameCampaigns.length;
    game.mapCount = gameCampaigns.reduce((total, campaign) => total + campaign.maps.length, 0);
    game.activeCount = gameCampaigns.filter((campaign) => campaign.officialStatus === 'active').length;
    game.environments = [...new Set(game.environments.concat(gameCampaigns.map(campaignGroupLabel)))];
  }

  for (const campaign of campaigns) {
    campaign.game = gameById[campaign.gameId];
    campaign.mapCount = campaign.maps.length;
    campaign.averageDifficulty = Math.round(
      campaign.maps.reduce((total, map) => total + map.difficulty, 0) / Math.max(1, campaign.maps.length)
    );
  }

  const environments = [...new Set(campaigns.map((campaign) => campaign.environment))].sort();
  const statuses = [...new Set(campaigns.map((campaign) => campaign.officialStatus))].sort();
  const eras = [...new Set(campaigns.map((campaign) => campaign.era))].sort();
  const generatedAt = rawAtlas.generatedAt;

  return {
    generatedAt,
    games,
    campaigns,
    maps,
    gameById,
    campaignById,
    mapById,
    environments,
    statuses,
    eras,
    totals: {
      games: games.length,
      campaigns: campaigns.length,
      maps: maps.length,
      activeCampaigns: campaigns.filter((campaign) => campaign.officialStatus === 'active').length
    }
  };
}
