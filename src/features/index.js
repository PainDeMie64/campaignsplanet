import { registerLiveSync } from './liveSync.js';
import { registerDeepLinks } from './deepLinks.js';

const FEATURE_MODULES = [
  registerLiveSync,
  registerDeepLinks
];

export function registerFeatures(app) {
  for (const register of FEATURE_MODULES) {
    const destroy = register(app);
    if (typeof destroy === 'function') app.destroyers.push(destroy);
  }
}
