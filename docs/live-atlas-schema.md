# Live Atlas Schema

The live sync module reads `window.CAMPAIGN_PLANET_SOURCE`, `VITE_CAMPAIGN_ATLAS_URL`, or `/campaigns.json`.

Required shape:

```json
{
  "generatedAt": "2026-04-28T00:00:00.000Z",
  "games": [
    {
      "id": "tmnf",
      "name": "TrackMania Nations Forever",
      "shortName": "Nations Forever",
      "releaseYear": 2008,
      "polygon": [{ "lat": 54, "lon": -58 }]
    }
  ],
  "campaigns": [
    {
      "id": "tmnf-white",
      "gameId": "tmnf",
      "name": "Nations Forever White Series",
      "releaseDate": "2008-04-16",
      "environment": "Stadium",
      "difficulty": 1,
      "lat": 55,
      "lon": -40,
      "maps": [
        {
          "id": "tmnf-white-01",
          "name": "A01 Race",
          "difficulty": 1,
          "medals": {
            "author": 30000,
            "gold": 33000,
            "silver": 38000,
            "bronze": 44000
          }
        }
      ]
    }
  ]
}
```

Optional fields are merged with bundled seed defaults where possible: palettes, label shifts, official status, map tags, and medal objects.
