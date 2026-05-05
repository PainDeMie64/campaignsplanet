# Trackmania Campaign Organization Audit

This file records the source-backed structure used by the atlas data.

## Sources Checked

- TrackMania Original is backed by the gamers.org medal-times table. It lists the concrete mode buckets and map names used by the atlas: Race A-G, Platform A-E, Puzzle A-G, Stunts A-D, and the Power-Up Survival 01-18 maps.
  Sources: https://www.gamers.org/tmn/docs/original_medal_times.html and https://www.trackmania.wiki/wiki/TrackMania_Original
- Trackmania Sunrise references list Island, Coast, and Bay, with Race, Puzzle, Platform, and Crazy as the main solo modes. Sunrise is also unusual because campaign tracks have individual names. The concrete atlas source for organization is the gamers.org medal-times table, which lists the real mode buckets, named campaign folders, map names, medal targets, and lap counts: Race, Race extreme, Crazy, Platform, Puzzle, Stunts, and Bonus Tracks.
  Sources: https://www.gamers.org/tmn/docs/sunrise_medal_times.html, https://trackmania.fandom.com/wiki/Trackmania_Sunrise, https://trackmania.fandom.com/wiki/Trackmania_Sunrise_eXtreme, and https://www.gamespot.com/articles/trackmania-sunrise-updated-hands-on/1100-6120784/
- TrackMania Nations ESWC is backed by the gamers.org medal-times table. It lists A-0 through I-9, Bonus A-0 through Bonus B-9, and Pro A-0 through Pro A-9.
  Sources: https://www.gamers.org/tmn/docs/nations_medal_times.html and https://www.trackmania.wiki/wiki/TrackMania_Nations_ESWC
- Trackmania United Forever is backed by BigBang1112's official-leaderboard extraction report. It documents the in-game `GetCampaignScores` campaign names `UnitedRace`, `UnitedPuzzle`, `UnitedPlatform`, `UnitedStunts`, `Nations`, and `ManiaStar`, and links a generated `maps.json` that maps official map UIDs to names. The atlas uses that source for the full United Forever campaign set: 147 UnitedRace maps, 21 Puzzle maps, 21 Platform maps, 21 Stunts maps, 65 Nations maps, and 147 ManiaStar/StarTrack maps.
  Sources: https://antislowmo.bigbang1112.cz/, https://antislowmo.bigbang1112.cz/maps.json, https://www.trackmania.wiki/w/index.php?title=TrackMania_United_Forever, and https://store.steampowered.com/app/7200/Trackmania_United_Forever/
- TrackMania 2 Canyon, Stadium, Valley, and Lagoon are backed by gamers.org medal-time tables. The atlas uses the source-listed A01-E05 map names for each 65-map Race campaign instead of prefixing them with the environment.
  Sources: https://www.gamers.org/tm2/docs/canyon_medal_times.html, https://www.gamers.org/tm2/docs/stadium_medal_times.html, https://www.gamers.org/tm2/docs/valley_medal_times.html, and https://www.gamers.org/tm2/docs/lagoon_medal_times.html
- Official Trackmania docs: seasonal Trackmania campaigns have 25 maps of varying styles split into White, Green, Blue, Red, and Black difficulties.
  Source: https://doc.trackmania.com/play/what-is-a-seasonal-campaign/

## Atlas Decisions

- The accordion's first expanded level is now the real campaign bucket, not always the physical environment.
- `environment` remains map/campaign metadata.
- `category` controls the visible grouping:
  - Original is grouped by its source-listed mode buckets: `Race`, `Platform`, `Puzzle`, `Stunts`, and `Survival`.
  - Sunrise is grouped by its source-listed mode buckets: `Race`, `Race Extreme`, `Crazy`, `Platform`, `Puzzle`, `Stunts`, and `Bonus Tracks`.
  - Nations ESWC is grouped as `Solo Campaign`, `Pro Campaign`, and `Bonus Campaign`.
  - United Forever is grouped by official leaderboard campaign and environment where the map names encode one: `Race - <environment>`, `Platform`, `Puzzle`, `Stunts`, `Nations`, and `StarTrack - <environment>`.
  - Nations Forever and TrackMania 2 keep their environment-first grouping where that matches the visible campaign structure.
  - Trackmania 2020 is grouped as `Training` and `Seasonal Campaigns`; its maps are marked `Mixed` because official seasonal campaigns are explicitly described as varied styles rather than a single Stadium-only environment.

## Remaining Data Limits

- Nations Forever remains represented both as its own free 2008 game and inside United Forever's official `Nations` campaign, because the leaderboard source exposes it as part of United Forever while the standalone release also deserves its own timeline entry.
