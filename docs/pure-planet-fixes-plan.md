# Pure Planet Fixes Implementation Plan

## Goals

- Keep the app as a pure planet experience with no map 3D preview model and no inspection camera mode.
- Make vector text read as painted onto the planet surface instead of hovering above it.
- Make labels at the same visual hierarchy use a shared size while still fitting inside their land regions.
- Replace generated map names with verified official names wherever the atlas currently fabricates names.
- Restore Trackmania 2020 chronological browsing with planet-surface previous/next controls, defaulting to the campaign current on May 4, 2026.
- Remove the planet-edge halo/atmosphere effect.
- Add a planet-level light mode toggle that updates the renderer tone without restoring overlay UI modules.

## Implementation Steps

1. **Text geometry and sizing**
   - Lower vector text radii to sit just above border/land geometry, reduce text depth, and keep depth testing on.
   - Generate focused country-region land from the leaves upward instead of fitting labels into old continent silhouettes:
     - map label text creates the minimum map cell boxes,
     - map cells create the selected campaign box,
     - campaign boxes create the environment box,
     - environment boxes create the generated continent wrapper.
   - Do not use hard-coded continent polygons as country-region clipping constraints; use them only as globe placement anchors and fallbacks.
   - Replace the current label fit clamp with checks that verify an axis-aligned label box remains inside the generated target polygon.
   - Preserve uniform sizing by computing each hierarchy group from the smallest safe size in that group:
     - game titles across visible continents,
     - environment labels within a continent view,
     - campaign/tier labels within an active region,
     - map labels within a selected campaign.
   - Allow labels to shrink below the readability floor only when required to avoid crossing borders.

2. **Map-name accuracy**
   - Verify generated names against public official-campaign sources:
     - Trackmania.com campaign pages for Trackmania 2020 seasonal campaigns.
     - TrackMania Exchange / ManiaExchange APIs for older official Nadeo maps.
   - Add explicit name arrays or official name overrides in `src/data/campaigns.js`; avoid runtime network lookups.
   - Add atlas tests that catch known discrepancies such as `A06-Obstacle`.

3. **Trackmania 2020 chronology**
   - Expand the TM2020 season list to chronological campaign groups from Training through Spring 2026.
   - Make the default history mode select the current group by date. On May 4, 2026, that is Spring 2026.
   - Render previous/next season controls on the Trackmania 2020 continent itself.
   - Keep visible campaign filtering tied to the selected history group so older seasons do not clutter the continent unless selected.

4. **Atmosphere removal**
   - Remove the translucent atmosphere shell and orbital ring from `PlanetRenderer`.
   - Remove the related animation code and keep the remaining planet edge visually clean in both themes.

5. **Light mode**
   - Add `ui.theme` state and a renderer-level keyboard toggle.
   - Apply `data-theme` on `document.documentElement` and update renderer clear/fog/light tone when the theme changes.
   - Add light-theme CSS variables for the body background and planet-only contrast states.

6. **Planet-only interaction surface**
   - Remove the existing shell/search/history/accessibility UI modules from the active app and delete their overlay code.
   - Keep only non-visual feature plumbing that directly supports the planet, such as live atlas loading, deep links, and renderer reliability.
   - Put any required interaction on the planet/renderer path instead of DOM panels or drawers.

7. **Verification**
   - Run `npm test` and `npm run build`.
   - Use text searches to confirm removed atmosphere/inspection/model paths do not reappear.
   - Start a local Vite server and inspect screenshots for dark/light mode, TM2020 previous/next, and focused map labels.

## Review Pass 1

- Risk: uniform label sizing can become too small if one very long label forces an entire group down.
- Adjustment: apply uniform sizing only within the same hierarchy and visible context, not globally across all map labels in the atlas.

## Review Pass 2

- Risk: a minimum font size can violate the "never over the borders" requirement.
- Adjustment: the fitter must prefer shrinking below the nominal minimum over overflowing the polygon.

## Review Pass 3

- Risk: TM2020 chronological controls can become inaccurate if hard-coded to a single current season.
- Adjustment: derive current mode from release dates and the current date, with Spring 2026 selected by default for May 4, 2026.

## Review Pass 4

- Risk: light mode can change CSS without changing WebGL colors, producing a mismatched canvas.
- Adjustment: theme changes must update both DOM variables and renderer scene tone.

## Review Pass 5

- Risk: overlay controls would violate the pure-planet direction.
- Adjustment: remove UI modules completely and implement remaining controls through the planet renderer/surface.

## Review Pass 6

- Risk: a hybrid layout can size labels bottom-up and then destroy that work by clipping the result back into old continent coastlines.
- Adjustment: the country-region texture fill, vector coast, hit testing, and borders must all use the generated bottom-up continent polygon.

## Review Pass 7

- Risk: selected map-heavy campaigns can still become unreadable if they share one narrow campaign strip with their siblings.
- Adjustment: when a campaign is selected, give it a dedicated full row in its environment so its map layout owns enough width before camera focus.

## Review Pass 8

- Risk: child cells can be sized bottom-up but then stretched by the partitioner, so the visible map group no longer behaves like the actual contents of its campaign container.
- Adjustment: replace proportional row stretching with a wrapper-preserving partitioner: rows keep their child-box proportions, rows are centered inside the wrapper, and selected map-cell bounds must match the selected campaign bounds.

## Review Pass 9

- Risk: even with child bounds matching the selected campaign, selection can still mutate the campaign's own position/size, so maps appear somewhere other than the campaign the user clicked.
- Adjustment: remove selected campaign state from all parent geometry calculations. Selection may only reveal descendants; it must not change continent, environment, or campaign cells. Tests compare the pre-selection campaign cell to the selected map-group bounds.

## Final Plan Check

No unresolved issues found. The plan covers all requested items, keeps changes local to the pure-planet branch, and avoids reintroducing map previewing.
