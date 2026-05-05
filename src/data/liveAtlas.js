import { CAMPAIGN_ATLAS } from './campaigns.js';
import { deriveAtlas } from './deriveAtlas.js';

const CACHE_KEY = 'campaign-planet:atlas-cache:v1';
const CACHE_META_KEY = 'campaign-planet:atlas-cache-meta:v1';

export function liveAtlasEndpoint() {
  return window.CAMPAIGN_PLANET_SOURCE || import.meta.env.VITE_CAMPAIGN_ATLAS_URL || '/campaigns.json';
}

export function validateAtlasShape(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object') errors.push('Atlas payload must be an object.');
  if (!Array.isArray(raw?.games)) errors.push('Atlas payload requires a games array.');
  if (!Array.isArray(raw?.campaigns)) errors.push('Atlas payload requires a campaigns array.');

  for (const [index, game] of (raw?.games ?? []).entries()) {
    if (!game.id) errors.push(`Game at index ${index} is missing id.`);
    if (!game.name) errors.push(`Game ${game.id ?? index} is missing name.`);
  }

  const gameIds = new Set((raw?.games ?? []).map((game) => game.id));
  for (const [index, campaign] of (raw?.campaigns ?? []).entries()) {
    if (!campaign.id) errors.push(`Campaign at index ${index} is missing id.`);
    if (!gameIds.has(campaign.gameId)) errors.push(`Campaign ${campaign.id ?? index} references unknown game ${campaign.gameId}.`);
    if (!Array.isArray(campaign.maps)) errors.push(`Campaign ${campaign.id ?? index} requires a maps array.`);
  }

  return { ok: errors.length === 0, errors };
}

export function normalizeAtlasPayload(raw) {
  const fallback = structuredClone(CAMPAIGN_ATLAS);
  const normalized = {
    generatedAt: raw.generatedAt || new Date().toISOString(),
    games: raw.games.map((game) => {
      const seed = fallback.games.find((item) => item.id === game.id);
      return {
        ...seed,
        ...game,
        palette: { ...seed?.palette, ...game.palette },
        labelShift: { ...seed?.labelShift, ...game.labelShift }
      };
    }),
    campaigns: raw.campaigns.map((campaign) => ({
      official: true,
      officialStatus: 'active',
      ...campaign,
      maps: campaign.maps.map((map, index) => ({
        order: index + 1,
        official: true,
        tags: [],
        medals: { author: 0, gold: 0, silver: 0, bronze: 0 },
        ...map
      }))
    }))
  };

  const validation = validateAtlasShape(normalized);
  if (!validation.ok) {
    const error = new Error(validation.errors.join('\n'));
    error.validation = validation;
    throw error;
  }

  return deriveAtlas(normalized);
}

export function readCachedAtlas() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const meta = localStorage.getItem(CACHE_META_KEY);
    if (!raw) return null;
    return {
      atlas: normalizeAtlasPayload(JSON.parse(raw)),
      meta: meta ? JSON.parse(meta) : null
    };
  } catch (error) {
    console.warn('Failed to restore campaign atlas cache.', error);
    return null;
  }
}

export function writeCachedAtlas(raw, source) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(raw));
    localStorage.setItem(CACHE_META_KEY, JSON.stringify({
      source,
      cachedAt: new Date().toISOString()
    }));
  } catch (error) {
    console.warn('Failed to write campaign atlas cache.', error);
  }
}

export async function fetchLiveAtlas(endpoint = liveAtlasEndpoint(), { signal } = {}) {
  const response = await fetch(endpoint, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal
  });

  if (!response.ok) {
    const error = new Error(`Campaign atlas source responded with ${response.status}.`);
    error.status = response.status;
    throw error;
  }

  const raw = await response.json();
  const atlas = normalizeAtlasPayload(raw);
  writeCachedAtlas(raw, endpoint);
  return { raw, atlas, endpoint };
}
