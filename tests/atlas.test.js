import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGN_ATLAS } from '../src/data/campaigns.js';
import { deriveAtlas } from '../src/data/deriveAtlas.js';
import { filterCampaigns, filterMaps } from '../src/data/selectors.js';
import { normalizeAtlasPayload, validateAtlasShape } from '../src/data/liveAtlas.js';
import { visibleLiveCampaignIds } from '../src/data/liveHistory.js';
import { campaignGroupLabel } from '../src/data/campaignGrouping.js';
import { buildFlatAtlasLayout, GAME_RELEASE_YEARS } from '../src/flat/flatAtlasLayout.js';
import { displayMapLabel } from '../src/flat/textLabels.js';

function baseState(atlas) {
  return {
    atlas,
    query: '',
    filters: {
      games: new Set(atlas.games.map((game) => game.id)),
      environments: new Set(),
      statuses: new Set(['active', 'legacy', 'retired'])
    },
    ui: {
      mode: 'flat',
      atlasView: 'flat',
      trackmania2020History: 'current'
    }
  };
}

function deterministicTextWidth(text, sizePx) {
  return String(text).length * sizePx * 0.62;
}

function visibleCampaignsForGame(state, game) {
  const liveVisible = visibleLiveCampaignIds(state);
  return state.atlas.campaigns.filter((campaign) => (
    campaign.gameId === game.id &&
    (game.id !== 'tm2020' || liveVisible.has(campaign.id))
  ));
}

function flattenLayoutMaps(layout) {
  return layout.games.flatMap((game) => (
    game.environments.flatMap((environment) => (
      environment.campaigns.flatMap((campaign) => campaign.maps)
    ))
  ));
}

test('derived atlas connects games, campaigns, and maps', () => {
  const atlas = deriveAtlas(CAMPAIGN_ATLAS);
  assert.ok(atlas.games.length > 0);
  assert.ok(atlas.campaigns.length > 0);
  assert.ok(atlas.maps.length > 0);
  for (const campaign of atlas.campaigns) {
    assert.equal(campaign.game, atlas.gameById[campaign.gameId]);
    assert.equal(campaign.maps.every((map) => map.campaignId === campaign.id), true);
  }
});

test('campaign filters search across game, campaign, environment, and map names', () => {
  const atlas = deriveAtlas(CAMPAIGN_ATLAS);
  const state = baseState(atlas);
  assert.ok(filterCampaigns({ ...state, query: 'stadium' }).some((campaign) => campaign.environment === 'Stadium'));
  assert.ok(filterCampaigns({ ...state, query: 'A06 Obstacle' }).some((campaign) => campaign.maps.some((map) => map.name === 'A06-Obstacle')));
});

test('map search returns map rows with campaign references', () => {
  const atlas = deriveAtlas(CAMPAIGN_ATLAS);
  const maps = filterMaps({ ...baseState(atlas), query: 'A06 Obstacle' });
  assert.ok(maps.some((map) => map.name === 'A06-Obstacle' && map.campaign));
});

test('atlas organization matches source-backed campaign buckets', () => {
  const atlas = deriveAtlas(CAMPAIGN_ATLAS);
  const byGame = (gameId) => atlas.campaigns.filter((campaign) => campaign.gameId === gameId);
  const groupsFor = (gameId) => [...new Set(byGame(gameId).map(campaignGroupLabel))];

  assert.deepEqual(groupsFor('tmn'), ['Solo Campaign', 'Pro Campaign', 'Bonus Campaign']);
  assert.equal(byGame('tmn').reduce((sum, campaign) => sum + campaign.maps.length, 0), 120);
  assert.deepEqual(
    byGame('tmn').filter((campaign) => campaign.category === 'Solo Campaign').map((campaign) => campaign.tierCode),
    'ABCDEFGHI'.split('')
  );
  assert.equal(atlas.campaignById['tmn-stadium-pro'].maps.length, 10);
  assert.equal(atlas.campaignById['tmn-stadium-bonus'].maps.length, 20);

  assert.deepEqual(groupsFor('tms'), ['Race', 'Race Extreme', 'Crazy', 'Platform', 'Puzzle', 'Stunts', 'Bonus Tracks']);
  assert.equal(byGame('tms').reduce((sum, campaign) => sum + campaign.maps.length, 0), 158);
  assert.deepEqual(
    atlas.campaignById['tms-race-holidays'].maps.map((map) => map.name),
    ['SkidOrDie', 'CarPark', 'ParadiseIsland', 'NightFlight', 'GoodMorning']
  );
  assert.deepEqual(
    atlas.campaignById['tms-platform-peak'].maps.map((map) => map.name),
    ['LandingArea', 'DoubleLoop', 'TrialTime', 'Platform Hard', 'ThinkForward']
  );
  assert.ok(atlas.campaignById['tms-puzzle-brain-teaser'].maps.some((map) => map.name === 'Bay Starter'));
  assert.ok(atlas.campaignById['tms-stunts-atmospheric-reentry'].maps.some((map) => map.name === 'GiantPinball'));
  assert.ok(atlas.campaignById['tms-bonus-tracks-microlaps'].maps.some((map) => map.name === 'SicilianArena'));
  assert.equal(byGame('tms').some((campaign) => campaign.maps.some((map) => ['DemoRace1', 'DemoRace2', 'SilicanArena', 'Forest Jumps'].includes(map.name))), false);

  assert.deepEqual(groupsFor('tmuf'), ['Race']);
  assert.equal(byGame('tmuf').reduce((sum, campaign) => sum + campaign.maps.length, 0), 147);
  assert.deepEqual([...new Set(byGame('tmuf').map((campaign) => campaign.environment))], ['Snow', 'Desert', 'Rally', 'Island', 'Coast', 'Bay', 'Stadium']);

  assert.deepEqual(groupsFor('tm2020'), ['Training', 'Seasonal Campaigns']);
  assert.equal(atlas.campaignById['tm2020-spring-2026-white'].category, 'Seasonal Campaigns');
  assert.equal(atlas.campaignById['tm2020-training-white'].category, 'Training');
});

test('live atlas validation rejects broken payloads', () => {
  const validation = validateAtlasShape({ games: [{ id: 'x' }], campaigns: [{ id: 'c', gameId: 'missing' }] });
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some((error) => error.includes('unknown game')));
});

test('live atlas normalization fills optional fields from seed defaults', () => {
  const seed = deriveAtlas(CAMPAIGN_ATLAS);
  const payload = {
    generatedAt: '2026-05-05',
    games: seed.games.map(({ campaigns, ...game }) => game),
    campaigns: seed.campaigns.map(({ game, ...campaign }) => campaign),
    maps: seed.maps.map(({ campaign, ...map }) => map)
  };
  const atlas = normalizeAtlasPayload(payload);
  assert.equal(atlas.games.length, seed.games.length);
  assert.equal(atlas.campaigns.length, seed.campaigns.length);
  assert.equal(atlas.maps.length, seed.maps.length);
});

test('map display labels never wrap', () => {
  assert.equal(displayMapLabel('A06-Obstacle'), 'A06 Obstacle');
  assert.equal(displayMapLabel('SnowA3'), 'Snow A 3');
  assert.equal(displayMapLabel('StadiumA15'), 'Stadium A 15');
  assert.equal(displayMapLabel('ClimbTheHill'), 'Climb The Hill');
  assert.equal(displayMapLabel('Spring - 01'), 'Spring 01');
  const atlas = deriveAtlas(CAMPAIGN_ATLAS);
  for (const map of atlas.maps) {
    assert.equal(displayMapLabel(map.name).includes('\n'), false, `${map.id} display label is single-line`);
  }
});

test('flat atlas layout is generated bottom-up from single-line map labels', () => {
  const atlas = deriveAtlas(CAMPAIGN_ATLAS);
  const state = {
    ...baseState(atlas),
    selectedGameId: 'tm2',
    selectedRegion: 'Canyon',
    selectedCampaignId: 'tm2-canyon-white'
  };
  const layout = buildFlatAtlasLayout(state, deterministicTextWidth);
  assert.equal(layout.games.length, atlas.games.length, 'flat atlas creates one continent per game');
  assert.equal(flattenLayoutMaps(layout).length, atlas.campaignById['tm2-canyon-white'].maps.length);
  for (const game of layout.games) {
    assert.ok(game.width > 0 && game.height > 0, `${game.game.id} game continent has area`);
    for (const environment of game.environments) {
      assert.ok(environment.width > 0 && environment.height > 0, `${game.game.id} ${environment.environment} environment has area`);
      assert.ok(environment.x >= 0 && environment.y >= 0, `${environment.environment} stays inside game origin`);
      assert.ok(environment.x + environment.width <= game.width, `${environment.environment} stays inside game width`);
      assert.ok(environment.y + environment.height <= game.height, `${environment.environment} stays inside game height`);
      for (const campaign of environment.campaigns) {
        assert.equal(campaignGroupLabel(campaign.campaign), environment.environment);
        assert.ok(campaign.x >= 0 && campaign.y >= 0, `${campaign.campaign.id} stays inside environment origin`);
        assert.ok(campaign.x + campaign.width <= environment.width, `${campaign.campaign.id} stays inside environment width`);
        assert.ok(campaign.y + campaign.height <= environment.height, `${campaign.campaign.id} stays inside environment height`);
        for (const map of campaign.maps) {
          const requiredWidth = deterministicTextWidth(map.label.toUpperCase(), layout.style.mapLabelSize) + layout.style.mapPadX * 2;
          assert.equal(map.label.includes('\n'), false, `${map.map.id} flat label is single-line`);
          assert.ok(map.width >= requiredWidth, `${map.map.id} map cell is generated from text width`);
          assert.ok(map.x >= 0 && map.y >= 0, `${map.map.id} map cell stays inside campaign origin`);
          assert.ok(map.x + map.width <= campaign.width, `${map.map.id} map cell stays inside campaign width`);
          assert.ok(map.y + map.height <= campaign.height, `${map.map.id} map cell stays inside campaign height`);
        }
      }
    }
  }
});

test('flat atlas expands only one game/environment/campaign path', () => {
  const atlas = deriveAtlas(CAMPAIGN_ATLAS);
  const state = {
    ...baseState(atlas),
    selectedGameId: 'tm2',
    selectedRegion: 'Canyon',
    selectedCampaignId: 'tm2-canyon-white'
  };
  const layout = buildFlatAtlasLayout(state, deterministicTextWidth);
  assert.deepEqual(layout.games.filter((game) => game.expanded).map((game) => game.game.id), ['tm2']);
  for (const game of layout.games) {
    if (game.game.id !== 'tm2') {
      assert.equal(game.environments.length, 0, `${game.game.id} has no expanded environments`);
      continue;
    }
    const expected = new Set(visibleCampaignsForGame(state, game.game).map(campaignGroupLabel));
    const actual = new Set(game.environments.map((environment) => environment.environment));
    assert.deepEqual(actual, expected, 'selected game exposes its environment categories');
    assert.deepEqual(game.environments.filter((environment) => environment.expanded).map((environment) => environment.environment), ['Canyon']);
    for (const environment of game.environments) {
      if (environment.environment !== 'Canyon') {
        assert.equal(environment.campaigns.length, 0, `${environment.environment} is collapsed`);
        continue;
      }
      assert.deepEqual(environment.campaigns.filter((campaign) => campaign.expanded).map((campaign) => campaign.campaign.id), ['tm2-canyon-white']);
      for (const campaign of environment.campaigns) {
        if (campaign.campaign.id === 'tm2-canyon-white') assert.ok(campaign.maps.length > 0, 'selected campaign exposes maps');
        else assert.equal(campaign.maps.length, 0, `${campaign.campaign.id} is collapsed`);
      }
    }
  }
});

test('flat atlas lays games out as a chronological timeline', () => {
  const atlas = deriveAtlas(CAMPAIGN_ATLAS);
  const layout = buildFlatAtlasLayout(baseState(atlas), deterministicTextWidth);
  const gameIds = layout.games.map((game) => game.game.id);
  assert.deepEqual(gameIds, ['tmo', 'tms', 'tmn', 'tmnf', 'tmuf', 'tm2', 'tm2020']);
  assert.deepEqual(
    layout.timeline.years.map((mark) => [mark.gameId, mark.year]),
    gameIds.map((gameId) => [gameId, GAME_RELEASE_YEARS[gameId]])
  );
  for (let index = 1; index < layout.games.length; index++) {
    assert.ok(layout.games[index].y > layout.games[index - 1].y, `${layout.games[index].game.id} appears after ${layout.games[index - 1].game.id}`);
    assert.ok(layout.timeline.years[index].y > layout.timeline.years[index - 1].y, `${layout.games[index].game.id} timeline mark is chronological`);
  }
});
