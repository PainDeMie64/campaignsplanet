# Feature Matrix

The active app is now a search-first campaign planet. Non-search product surfaces have been removed from `src/features/index.js`: no account progress, no timeline/atlas/compare panel, no campaign-card drawer, no map-detail panel, no analytics console, and no cinematic control strip.

| Commit | Area | Covers |
| --- | --- | --- |
| `9860a8d` | Foundation | Modular app shell, atlas data, Three.js planet, continent labels, terrain texture generation, search state/events. |
| `44e34cd` | Live sync | Live JSON source, cache restore/write, freshness status, manual/background refresh, stale/error states. |
| `977588f` | Search | Game/environment filters and result list. The current UI has since been simplified to map search only. |
| `caf80c5` | Deep links | URL state and copy-link/copy-snapshot actions. |
| `90799dc` | Accessibility/mobile | Keyboard navigation, reduced-motion toggle, quality toggle, mobile bottom drawer. |
| `679e552` | Performance/reliability | Manual chunks, FPS monitor, automatic quality fallback, page-visibility pause, WebGL context handling. |
| `24ace5b` | Verification | Data tests, visual verification, and live-atlas schema docs. |
| `c785e1a` | Product cleanup | Removed the account/progress, timeline/compare, catalog, map-detail, analytics, and cinematic modules from the active app. |
| `9917fa5` | Atlas rebuild | Replaced placeholder campaigns with in-game-style A-E/color series and larger separated continent polygons. |
| `b5cd25a` | Renderer optimization | Lowered render cost, removed per-campaign mesh draw calls, improved continent text, and fixed stale-release inertia. |
| `f03accc` | TrackMania 2 | Added TrackMania 2 Canyon/Stadium/Valley/Lagoon support and tokenized map search. |

Current active modules:

- `coreShell`
- `liveSync`
- `searchFilters`
- `deepLinks`
- `accessibilityMobile`
- `performanceReliability`

Current scope:

- Search official campaign maps by game, environment, series, and map name.
- Show game continents with in-game campaign series divisions.
- Keep live atlas syncing and cached fallback behavior.
- Keep direct links and mobile/keyboard navigation.
- Keep performance monitoring and visual/data verification.
