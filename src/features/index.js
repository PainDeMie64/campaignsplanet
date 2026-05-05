import { registerLiveSync } from './liveSync.js';
import { registerDeepLinks } from './deepLinks.js';
import { registerExchangeOverlay } from './exchangeOverlay.js';

const FEATURE_MODULES = [
  registerLiveSync,
  registerDeepLinks,
  registerExchangeOverlay
];

export function registerFeatures(app) {
  for (const register of FEATURE_MODULES) {
    const destroy = register(app);
    if (typeof destroy === 'function') app.destroyers.push(destroy);
  }
}
