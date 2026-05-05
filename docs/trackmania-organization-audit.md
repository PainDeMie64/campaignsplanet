# Trackmania Campaign Organization Audit

This file records the source-backed structure used by the atlas data.

## Sources Checked

- Trackmania Wiki: TrackMania Original came with Snow, Rally, and Desert, and four playable modes: Race, Stunt, Puzzle, and Platform.
  Source: https://www.trackmania.wiki/wiki/TrackMania_Original
- Trackmania Sunrise references list Island, Coast, and Bay, with Race, Puzzle, Platform, and Crazy as the main solo modes. Sunrise is also unusual because campaign tracks have individual names.
  Sources: https://trackmania.fandom.com/wiki/Trackmania_Sunrise and https://www.gamespot.com/articles/trackmania-sunrise-updated-hands-on/1100-6120784/
- Trackmania Wiki: TrackMania Nations ESWC has a 90-track solo campaign, A through I with 10 tracks per letter, plus a 10-track Pro campaign and a 20-track Bonus campaign.
  Source: https://www.trackmania.wiki/wiki/TrackMania_Nations_ESWC
- Trackmania Wiki: Trackmania United Forever has Snow, Bay, Rally, Island, Coast, Desert, and Stadium; it has Race, Stunt, Platform, and Puzzle modes. Race has 5 maps per environment per color, except black with 1 per environment, totaling 147 race maps.
  Source: https://www.trackmania.wiki/w/index.php?title=TrackMania_United_Forever
- Trackmania Wiki and reviews: TrackMania 2 Canyon is a Race-mode title with a 65-track solo campaign. The atlas keeps the same 65-map, five-tier campaign structure for Canyon, Stadium, Valley, and Lagoon.
  Sources: https://trackmania.fandom.com/wiki/Trackmania_2_Canyon and https://www.gamegrin.com/reviews/trackmania-2-canyon-review/
- Official Trackmania docs: seasonal Trackmania campaigns have 25 maps of varying styles split into White, Green, Blue, Red, and Black difficulties.
  Source: https://doc.trackmania.com/play/what-is-a-seasonal-campaign/

## Atlas Decisions

- The accordion's first expanded level is now the real campaign bucket, not always the physical environment.
- `environment` remains map/campaign metadata.
- `category` controls the visible grouping:
  - Original, Sunrise, and United Forever race-only data is grouped under `Race`.
  - Nations ESWC is grouped as `Solo Campaign`, `Pro Campaign`, and `Bonus Campaign`.
  - Nations Forever and TrackMania 2 keep their environment-first grouping where that matches the visible campaign structure.
  - Trackmania 2020 is grouped as `Training` and `Seasonal Campaigns`; its maps are marked `Mixed` because official seasonal campaigns are explicitly described as varied styles rather than a single Stadium-only environment.

## Remaining Data Limits

- The atlas still includes only the race campaign data we have names for in several legacy games. It no longer invents top-level categories for absent Puzzle, Platform, Stunt, Survival, or Crazy campaign data.
- If exact official map lists for those non-race modes are added later, they should use the same `category` grouping and keep `environment` as per-map metadata.
