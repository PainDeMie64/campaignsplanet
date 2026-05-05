import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGN_ATLAS } from '../src/data/campaigns.js';
import { deriveAtlas } from '../src/data/deriveAtlas.js';
import { filterCampaigns, filterMaps } from '../src/data/selectors.js';
import { normalizeAtlasPayload, validateAtlasShape } from '../src/data/liveAtlas.js';
import { visibleLiveCampaignIds } from '../src/data/liveHistory.js';
import { buildFlatAtlasLayout } from '../src/flat/flatAtlasLayout.js';
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
  const state = baseState(atlas);
  const layout = buildFlatAtlasLayout(state, deterministicTextWidth);
  assert.equal(layout.games.length, atlas.games.length, 'flat atlas creates one continent per game');
  assert.equal(flattenLayoutMaps(layout).length, layout.games.reduce((sum, game) => (
    sum + visibleCampaignsForGame(state, game.game).reduce((count, campaign) => count + campaign.maps.length, 0)
  ), 0));
  for (const game of layout.games) {
    assert.ok(game.width > 0 && game.height > 0, `${game.game.id} game continent has area`);
    for (const environment of game.environments) {
      assert.ok(environment.width > 0 && environment.height > 0, `${game.game.id} ${environment.environment} environment has area`);
      assert.ok(environment.x >= 0 && environment.y >= 0, `${environment.environment} stays inside game origin`);
      assert.ok(environment.x + environment.width <= game.width, `${environment.environment} stays inside game width`);
      assert.ok(environment.y + environment.height <= game.height, `${environment.environment} stays inside game height`);
      for (const campaign of environment.campaigns) {
        assert.equal(campaign.campaign.environment, environment.environment);
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

test('flat atlas creates environment sections for every visible campaign environment', () => {
  const atlas = deriveAtlas(CAMPAIGN_ATLAS);
  const state = baseState(atlas);
  const layout = buildFlatAtlasLayout(state, deterministicTextWidth);
  for (const game of layout.games) {
    const expected = new Set(visibleCampaignsForGame(state, game.game).map((campaign) => campaign.environment));
    const actual = new Set(game.environments.map((environment) => environment.environment));
    assert.deepEqual(actual, expected, `${game.game.id} environment categories match visible campaign data`);
  }
});
