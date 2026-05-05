const continent = (points) => points.map(([lat, lon]) => ({ lat, lon }));

const CLASSIC_TIERS = [
  { id: 'white', code: 'A', name: 'White Series', count: 15, difficulty: 1, color: '#f4f7f8' },
  { id: 'green', code: 'B', name: 'Green Series', count: 15, difficulty: 3, color: '#58d36c' },
  { id: 'blue', code: 'C', name: 'Blue Series', count: 15, difficulty: 5, color: '#4da3ff' },
  { id: 'red', code: 'D', name: 'Red Series', count: 15, difficulty: 7, color: '#ff4d6d' },
  { id: 'black', code: 'E', name: 'Black Series', count: 5, difficulty: 9, color: '#111923' }
];

const SEASON_TIERS = CLASSIC_TIERS.map((tier) => ({ ...tier, count: 5 }));
const ORIGINAL_TIERS = tierCounts({ white: 8, green: 8, blue: 8, red: 8, black: 5 });
const NATIONS_TIERS = tierCounts({ white: 10, green: 10, blue: 10, red: 10, black: 5 });
const UNITED_TIERS = tierCounts({ white: 5, green: 5, blue: 5, red: 5, black: 1 });

function tierCounts(counts) {
  return CLASSIC_TIERS.map((tier) => ({ ...tier, count: counts[tier.id] ?? tier.count }));
}

function tierWithCode(tiers, code) {
  const tier = tiers.find((item) => item.code === code);
  if (!tier) throw new Error(`Unknown campaign tier ${code}`);
  return tier;
}

function medals(seed, index, difficulty) {
  const author = 25000 + seed * 1300 + index * 2600 + difficulty * 820;
  return {
    author,
    gold: author + 2400,
    silver: author + 6500,
    bronze: author + 11800
  };
}

function makeMaps({ campaignId, tier, environment, surface, nameForIndex }) {
  const seed = [...campaignId].reduce((total, char) => total + char.charCodeAt(0), 0) % 17;
  return Array.from({ length: tier.count }, (_, index) => ({
    id: `${campaignId}-${String(index + 1).padStart(2, '0')}`,
    name: nameForIndex(index),
    order: index + 1,
    official: true,
    environment,
    surface,
    difficulty: Math.min(10, Math.max(1, tier.difficulty + Math.floor(index / 6))),
    tags: [environment.toLowerCase(), surface, tier.id, tier.code],
    medals: medals(seed, index, tier.difficulty),
    tmxId: null
  }));
}

function tierCampaign({
  id,
  gameId,
  family,
  environment,
  tier,
  releaseDate,
  era,
  status = 'legacy',
  lat,
  lon,
  region,
  surface,
  description,
  nameForIndex
}) {
  return {
    id,
    gameId,
    name: `${family} ${tier.name}`,
    releaseDate,
    era,
    environment,
    tier: tier.name,
    tierCode: tier.code,
    tierColor: tier.color,
    officialStatus: status,
    official: true,
    difficulty: tier.difficulty,
    lat,
    lon,
    region,
    description,
    maps: makeMaps({
      campaignId: id,
      tier,
      environment,
      surface,
      nameForIndex
    })
  };
}

function classicSeries({ gameId, family, environment, baseId, releaseDate, era, status, points, region, surface, description, tiers = CLASSIC_TIERS, mapNameForIndex }) {
  return tiers.map((tier, index) => tierCampaign({
    id: `${baseId}-${tier.id}`,
    gameId,
    family,
    environment,
    tier,
    releaseDate,
    era,
    status,
    lat: points[index].lat,
    lon: points[index].lon,
    region,
    surface,
    description,
    nameForIndex: (mapIndex) => mapNameForIndex
      ? mapNameForIndex({ tier, mapIndex, environment })
      : `${tier.code}${String(mapIndex + 1).padStart(2, '0')} Race`
  }));
}

function explicitMaps({ campaignId, names, environment, surface, difficulty, tier }) {
  const seed = [...campaignId].reduce((total, char) => total + char.charCodeAt(0), 0) % 17;
  return names.map((name, index) => ({
    id: `${campaignId}-${String(index + 1).padStart(2, '0')}`,
    name,
    order: index + 1,
    official: true,
    environment,
    surface,
    difficulty,
    tags: [environment.toLowerCase(), surface, tier.id, tier.code],
    medals: medals(seed, index, difficulty),
    tmxId: null
  }));
}

function explicitCampaign({
  id,
  gameId,
  family,
  environment,
  tier,
  releaseDate,
  era,
  status = 'legacy',
  lat,
  lon,
  region,
  surface,
  description,
  mapNames
}) {
  return {
    id,
    gameId,
    name: `${family} ${tier.name}`,
    releaseDate,
    era,
    environment,
    tier: tier.name,
    tierCode: tier.code,
    tierColor: tier.color,
    officialStatus: status,
    official: true,
    difficulty: tier.difficulty,
    lat,
    lon,
    region,
    description,
    maps: explicitMaps({
      campaignId: id,
      names: mapNames,
      environment,
      surface,
      difficulty: tier.difficulty,
      tier
    })
  };
}

const SEASON_MAP_NAME_OVERRIDES = {
  'Winter 2026': {
    21: 'China 2026',
    22: 'France 2026',
    23: 'USA 2026',
    24: 'Brazil 2026',
    25: 'Greece 2026'
  },
  'Spring 2026': {
    21: 'Germany 2026',
    22: 'South Korea 2026',
    23: 'Canada 2026',
    24: 'Australia 2026',
    25: 'Hungary 2026'
  }
};

function seasonSeries({ gameId, seasonName, baseId, releaseDate, status, points }) {
  return SEASON_TIERS.map((tier, tierIndex) => tierCampaign({
    id: `${baseId}-${tier.id}`,
    gameId,
    family: seasonName,
    environment: 'Stadium',
    tier,
    releaseDate,
    era: 'Modern',
    status,
    lat: points[tierIndex].lat,
    lon: points[tierIndex].lon,
    region: `${seasonName} ${tier.name}`,
    surface: 'stadium',
    description: `${seasonName} official campaign maps in the ${tier.name.toLowerCase()} tier.`,
    nameForIndex: (mapIndex) => {
      const number = tierIndex * 5 + mapIndex + 1;
      const two = String(number).padStart(2, '0');
      const defaultName = seasonName === 'Training' ? `Training - ${two}` : `${seasonName} - ${two}`;
      return SEASON_MAP_NAME_OVERRIDES[seasonName]?.[number] ?? defaultName;
    }
  }));
}

const TMNF_MAP_TYPES = {
  A: ['Race', 'Race', 'Race', 'Acrobatic', 'Race', 'Obstacle', 'Race', 'Endurance', 'Race', 'Acrobatic', 'Race', 'Speed', 'Race', 'Race', 'Speed'],
  B: ['Race', 'Race', 'Race', 'Acrobatic', 'Race', 'Obstacle', 'Race', 'Endurance', 'Acrobatic', 'Speed', 'Race', 'Race', 'Obstacle', 'Speed', 'Race'],
  C: ['Race', 'Race', 'Acrobatic', 'Race', 'Endurance', 'Speed', 'Race', 'Obstacle', 'Race', 'Acrobatic', 'Race', 'Obstacle', 'Race', 'Endurance', 'Speed'],
  D: ['Endurance', 'Race', 'Acrobatic', 'Race', 'Race', 'Obstacle', 'Race', 'Speed', 'Obstacle', 'Race', 'Acrobatic', 'Speed', 'Race', 'Endurance', 'Endurance'],
  E: ['Obstacle', 'Endurance', 'Endurance', 'Obstacle', 'Endurance']
};

function tmnfMapName({ tier, mapIndex }) {
  const number = String(mapIndex + 1).padStart(2, '0');
  const type = TMNF_MAP_TYPES[tier.code]?.[mapIndex] ?? 'Race';
  return `${tier.code}${number}-${type}`;
}

const points = (...items) => items.map(([lat, lon]) => ({ lat, lon }));

const tmoSnow = points([38, -118], [43, -114], [49, -113], [54, -117], [58, -124]);
const tmoDesert = points([28, -136], [34, -143], [42, -146], [50, -143], [57, -136]);
const tmoRally = points([36, -153], [43, -157], [51, -156], [58, -151], [62, -144]);

const tmsIsland = points([-47, -149], [-37, -147], [-28, -144], [-21, -137], [-15, -130]);
const tmsBay = points([-58, -137], [-49, -135], [-40, -133], [-31, -130], [-24, -123]);
const tmsCoast = points([-54, -125], [-46, -121], [-37, -117], [-28, -115], [-19, -114]);

const tmnStadium = points([59, -76], [55, -65], [50, -54], [44, -44], [36, -36]);
const tmufSnow = points([42, 49], [46, 52], [50, 54], [54, 52], [56, 48]);
const tmufDesert = points([54, 1], [58, 7], [61, 14], [63, 21], [61, 27]);
const tmufRally = points([39, -1], [36, 6], [34, 13], [33, 20], [34, 27]);
const tmufIsland = points([53, 27], [56, 32], [58, 37], [57, 42], [52, 43]);
const tmufCoast = points([25, 10], [24, 16], [24, 22], [25, 28], [27, 33]);
const tmufBay = points([31, 39], [30, 45], [31, 51], [34, 56], [39, 57]);
const tmufStadium = points([43, 13], [44, 19], [45, 25], [46, 31], [47, 37]);

const tmnfStadium = points([52, 96], [58, 109], [56, 122], [50, 134], [42, 140]);

const tm2Canyon = points([-14, 24], [-20, 32], [-27, 39], [-34, 46], [-42, 52]);
const tm2Stadium = points([-9, 54], [-13, 60], [-17, 66], [-21, 72], [-26, 76]);
const tm2Valley = points([-43, 28], [-49, 36], [-54, 45], [-57, 54], [-55, 63]);
const tm2Lagoon = points([-36, 65], [-39, 69], [-42, 73], [-43, 77], [-40, 80]);

const tm2020Training = points([-47, -52], [-39, -57], [-31, -62], [-23, -64], [-16, -60]);
const tm2020Spring = points([-52, -44], [-45, -40], [-38, -37], [-30, -36], [-22, -39]);
const tm2020Summer = points([-35, -23], [-27, -21], [-20, -24], [-14, -30], [-9, -38]);
const tm2020Fall = points([-21, -58], [-16, -50], [-12, -43], [-10, -35], [-14, -27]);
const tm2020Winter = points([-55, -31], [-48, -24], [-40, -20], [-32, -22], [-24, -28]);

const TM2020_SEASONS = [
  { seasonName: 'Training', baseId: 'tm2020-training', releaseDate: '2020-06-30', points: tm2020Training },
  { seasonName: 'Summer 2020', baseId: 'tm2020-summer-2020', releaseDate: '2020-07-01', points: tm2020Summer },
  { seasonName: 'Fall 2020', baseId: 'tm2020-fall-2020', releaseDate: '2020-10-01', points: tm2020Fall },
  { seasonName: 'Winter 2021', baseId: 'tm2020-winter-2021', releaseDate: '2021-01-01', points: tm2020Winter },
  { seasonName: 'Spring 2021', baseId: 'tm2020-spring-2021', releaseDate: '2021-04-01', points: tm2020Spring },
  { seasonName: 'Summer 2021', baseId: 'tm2020-summer-2021', releaseDate: '2021-07-01', points: tm2020Summer },
  { seasonName: 'Fall 2021', baseId: 'tm2020-fall-2021', releaseDate: '2021-10-01', points: tm2020Fall },
  { seasonName: 'Winter 2022', baseId: 'tm2020-winter-2022', releaseDate: '2022-01-01', points: tm2020Winter },
  { seasonName: 'Spring 2022', baseId: 'tm2020-spring-2022', releaseDate: '2022-04-01', points: tm2020Spring },
  { seasonName: 'Summer 2022', baseId: 'tm2020-summer-2022', releaseDate: '2022-07-01', points: tm2020Summer },
  { seasonName: 'Fall 2022', baseId: 'tm2020-fall-2022', releaseDate: '2022-10-01', points: tm2020Fall },
  { seasonName: 'Winter 2023', baseId: 'tm2020-winter-2023', releaseDate: '2023-01-01', points: tm2020Winter },
  { seasonName: 'Spring 2023', baseId: 'tm2020-spring-2023', releaseDate: '2023-04-01', points: tm2020Spring },
  { seasonName: 'Summer 2023', baseId: 'tm2020-summer-2023', releaseDate: '2023-07-01', points: tm2020Summer },
  { seasonName: 'Fall 2023', baseId: 'tm2020-fall-2023', releaseDate: '2023-10-01', points: tm2020Fall },
  { seasonName: 'Winter 2024', baseId: 'tm2020-winter-2024', releaseDate: '2024-01-01', points: tm2020Winter },
  { seasonName: 'Spring 2024', baseId: 'tm2020-spring-2024', releaseDate: '2024-04-01', points: tm2020Spring },
  { seasonName: 'Summer 2024', baseId: 'tm2020-summer-2024', releaseDate: '2024-07-01', points: tm2020Summer },
  { seasonName: 'Fall 2024', baseId: 'tm2020-fall-2024', releaseDate: '2024-10-01', points: tm2020Fall },
  { seasonName: 'Winter 2025', baseId: 'tm2020-winter-2025', releaseDate: '2025-01-01', points: tm2020Winter },
  { seasonName: 'Spring 2025', baseId: 'tm2020-spring-2025', releaseDate: '2025-04-01', points: tm2020Spring },
  { seasonName: 'Summer 2025', baseId: 'tm2020-summer-2025', releaseDate: '2025-07-01', points: tm2020Summer },
  { seasonName: 'Fall 2025', baseId: 'tm2020-fall-2025', releaseDate: '2025-10-01', points: tm2020Fall },
  { seasonName: 'Winter 2026', baseId: 'tm2020-winter-2026', releaseDate: '2026-01-01', points: tm2020Winter },
  { seasonName: 'Spring 2026', baseId: 'tm2020-spring-2026', releaseDate: '2026-04-01', points: tm2020Spring }
];

const SUNRISE_RACE_TIERS = [
  { ...CLASSIC_TIERS[0], id: 'starter', name: 'Starter Race' },
  { ...CLASSIC_TIERS[1], id: 'race', name: 'Race' },
  { ...CLASSIC_TIERS[2], id: 'expert', name: 'Expert Race' }
];

const SUNRISE_RACE_MAPS = {
  Island: {
    starter: ['Aerial Lights', 'High Tide', 'Midnight', 'Small Ring', 'VulcanRing'],
    race: ['Anaconda', 'BeachTime', 'BeautifulDay', 'CarPark', 'CrazyBridge', 'Dangerous Descent', 'EnterTheWorm', 'GoodMorning', 'LateAfter8', 'NightFlight', 'NightRound', 'ParadiseIsland', 'SkidOrDie', 'SpeedWave', 'Straight Ahead', 'TwoMountains', 'VulcanBird', 'VulcanHarbor', 'XRace03', 'XRace06', 'XRace09'],
    expert: ['Antigrav', 'Orbital', 'RampRage']
  },
  Coast: {
    starter: ['Five Rows', 'Training Circuit'],
    race: ['AquaScheme', 'ClimbTheHill', "CoteD'Azur", 'DarkRuin', 'GoingHome', 'GrandPrix', 'GrandPrix2', 'HomeRun', 'JumpOnBrakes', 'Magnitude', 'NightRider', 'QuietRide', 'RabbitHill', 'RomanRuin', 'RuinByNight', 'RuinOfTheSun', 'SeeYouSoon', 'SilicanArena', 'Snake', 'Toscany', 'TownToTown', 'Up and Down', 'Village', 'XRace01', 'XRace04', 'XRace07'],
    expert: ['GrandPrix30']
  },
  Bay: {
    starter: ['Bouncy Alley', 'Chaos Area', 'Forest Jumps', 'Secret Caves'],
    race: ['BipBopSound', 'BuildingRider', 'CentralPark', 'CleanLanding', 'Crazy8', 'CrossOver', 'DemoRace1', 'DemoRace2', 'Deviation', 'DownTown', 'EmperorRoof', 'FollowTheLeader', 'GateOfTheSun', 'HighStreet', 'Kangourou', "LoopN'Roof", 'OnTheRoofAgain', 'OutOfTheDock', 'ShoppingCentre', 'Suburbs', 'TrickyTrack', 'TunnelEffect', 'Westside', 'XRace02', 'XRace05', 'XRace08'],
    expert: ['HappyBay']
  }
};

function sunriseRaceSeries({ gameId, family, environment, baseId, releaseDate, points, region, surface, description }) {
  return SUNRISE_RACE_TIERS
    .map((tier, index) => {
      const mapNames = SUNRISE_RACE_MAPS[environment]?.[tier.id] ?? [];
      if (!mapNames.length) return null;
      return explicitCampaign({
        id: `${baseId}-${tier.id}`,
        gameId,
        family,
        environment,
        tier: { ...tier, count: mapNames.length },
        releaseDate,
        era: 'Sunrise',
        lat: points[index].lat,
        lon: points[index].lon,
        region,
        surface,
        description,
        mapNames
      });
    })
    .filter(Boolean);
}

function originalRaceCampaign({ environment, baseId, tierCode, lat, lon, surface, description }) {
  const tier = tierWithCode(ORIGINAL_TIERS, tierCode);
  return tierCampaign({
    id: `${baseId}-${tier.id}`,
    gameId: 'tmo',
    family: environment,
    environment,
    tier,
    releaseDate: '2003-11-21',
    era: 'Classic',
    lat,
    lon,
    region: environment,
    surface,
    description,
    nameForIndex: (mapIndex) => `Race${tier.code}${mapIndex + 1}`
  });
}

export const CAMPAIGN_ATLAS = {
  generatedAt: new Date().toISOString(),
  games: [
    {
      id: 'tmo',
      name: 'TrackMania Original',
      shortName: 'Original',
      subtitle: 'ORIGINAL',
      releaseYear: 2003,
      status: 'legacy',
      palette: { land: '#665745', coast: '#f1d28b', accent: '#ffcf5f', ocean: '#263846' },
      terrain: 'three original environments split by A-E official series',
      environments: ['Snow', 'Desert', 'Rally'],
      regionLabelOffsets: {
        Snow: { dx: -25, dy: -54 },
        Desert: { dx: -65, dy: 8 },
        Rally: { dx: 60, dy: 32 }
      },
      polygon: continent([[66, -158], [72, -136], [62, -112], [44, -102], [23, -114], [18, -142], [36, -166], [54, -164]]),
      labelShift: { lat: 3, lon: -2 }
    },
    {
      id: 'tms',
      name: 'TrackMania Sunrise',
      shortName: 'Sunrise',
      subtitle: 'SUNRISE',
      releaseYear: 2005,
      status: 'legacy',
      palette: { land: '#34677e', coast: '#ffd166', accent: '#ff8e3c', ocean: '#18303d' },
      terrain: 'Island, Coast, and Bay regions divided into A-E official series',
      environments: ['Island', 'Coast', 'Bay'],
      regionLabelOffsets: {
        Island: { dx: 80, dy: -70 },
        Bay: { dx: -134, dy: 54 },
        Coast: { dx: -86, dy: -28 }
      },
      polygon: continent([[-8, -166], [8, -142], [-4, -110], [-28, -96], [-58, -108], [-72, -138], [-54, -168], [-28, -158]]),
      labelShift: { lat: 0, lon: -2 }
    },
    {
      id: 'tmn',
      name: 'TrackMania Nations',
      shortName: 'Nations',
      subtitle: 'NATIONS',
      releaseYear: 2006,
      status: 'legacy',
      palette: { land: '#3a6372', coast: '#e7eef5', accent: '#48b4f8', ocean: '#213847' },
      terrain: 'single Stadium continent with A-E series progression',
      environments: ['Stadium'],
      regionLabelOffsets: {
        Stadium: { dx: 0, dy: -56 }
      },
      polygon: continent([[67, -88], [72, -58], [58, -28], [32, -24], [16, -52], [26, -82], [48, -98]]),
      labelShift: { lat: 4, lon: 0 }
    },
    {
      id: 'tmuf',
      name: 'TrackMania United Forever',
      shortName: 'United Forever',
      subtitle: 'UNITED FOREVER',
      releaseYear: 2008,
      status: 'legacy',
      palette: { land: '#485f59', coast: '#f3f0d7', accent: '#61d394', ocean: '#20343f' },
      terrain: 'seven-environment federation laid out by official A-E series',
      environments: ['Snow', 'Desert', 'Rally', 'Island', 'Coast', 'Bay', 'Stadium'],
      regionLabelOffsets: {
        Snow: { dx: -80, dy: -60 },
        Desert: { dx: 0, dy: -50 },
        Island: { dx: 0, dy: -44 },
        Stadium: { dx: -20, dy: 48 },
        Rally: { dx: 52, dy: -45 },
        Coast: { dx: 30, dy: 65 }
      },
      polygon: continent([[66, -6], [72, 26], [58, 60], [30, 66], [12, 38], [20, 4], [44, -18]]),
      labelShift: { lat: 4, lon: 0 }
    },
    {
      id: 'tmnf',
      name: 'TrackMania Nations Forever',
      shortName: 'Nations Forever',
      subtitle: 'NATIONS FOREVER',
      releaseYear: 2008,
      status: 'active',
      palette: { land: '#3d536e', coast: '#f8f9ff', accent: '#ff4d6d', ocean: '#1e3244' },
      terrain: 'Stadium A-E campaign tiers with white through black districts',
      environments: ['Stadium'],
      regionLabelOffsets: {
        Stadium: { dx: 72, dy: 76 }
      },
      polygon: continent([[66, 84], [72, 116], [62, 146], [38, 154], [18, 130], [24, 100], [46, 80]]),
      labelShift: { lat: 4, lon: 0 }
    },
    {
      id: 'tm2',
      name: 'TrackMania 2',
      shortName: 'TrackMania 2',
      subtitle: 'MANIAPLANET',
      releaseYear: 2011,
      status: 'legacy',
      palette: { land: '#6a5548', coast: '#ffd6a5', accent: '#ff9f1c', ocean: '#1b313b' },
      terrain: 'Canyon, Stadium, Valley, and Lagoon regions with A-E official series',
      environments: ['Canyon', 'Stadium', 'Valley', 'Lagoon'],
      countryRegionOrder: ['Stadium', 'Canyon', 'Lagoon', 'Valley'],
      regionLabelOffsets: {
        Canyon: { dx: -52, dy: -32 },
        Stadium: { dx: -24, dy: -48 },
        Valley: { dx: 16, dy: 72 },
        Lagoon: { dx: -40, dy: -20 }
      },
      polygon: continent([[-6, 14], [8, 48], [-6, 82], [-34, 98], [-62, 78], [-70, 42], [-48, 16], [-24, 6]]),
      labelShift: { lat: 0, lon: 0 }
    },
    {
      id: 'tm2020',
      name: 'Trackmania 2020',
      shortName: 'Trackmania 2020',
      subtitle: '2020',
      releaseYear: 2020,
      status: 'active',
      palette: { land: '#394458', coast: '#b7f7ff', accent: '#35f2a5', ocean: '#172935' },
      terrain: 'current seasonal campaign by default, with older seasons available after selecting the continent',
      environments: ['Stadium'],
      regionLabelOffsets: {
        'Spring 2026 White Series': { dx: -112, dy: -8 },
        'Spring 2026 Green Series': { dx: 112, dy: -8 },
        'Spring 2026 Blue Series': { dx: -126, dy: -8 },
        'Spring 2026 Red Series': { dx: 112, dy: -16 },
        'Spring 2026 Black Series': { dx: -112, dy: -22 },
        'Training White Series': { dx: 130, dy: -10 },
        'Training Green Series': { dx: 130, dy: -10 },
        'Training Blue Series': { dx: 130, dy: -10 },
        'Training Red Series': { dx: 130, dy: -12 },
        'Training Black Series': { dx: 130, dy: -12 },
        'Summer 2025 White Series': { dx: -126, dy: -18 },
        'Summer 2025 Green Series': { dx: -150, dy: -30 },
        'Summer 2025 Blue Series': { dx: -126, dy: -30 },
        'Summer 2025 Red Series': { dx: 126, dy: -10 },
        'Summer 2025 Black Series': { dx: -126, dy: -10 }
      },
      polygon: continent([[0, -66], [4, -34], [-10, -8], [-38, -12], [-66, -36], [-56, -64], [-24, -78]]),
      labelShift: { lat: 0, lon: 2 }
    }
  ],
  campaigns: [
    originalRaceCampaign({ environment: 'Snow', baseId: 'tmo-snow', tierCode: 'A', lat: tmoSnow[0].lat, lon: tmoSnow[0].lon, surface: 'snow', description: 'TrackMania Original Snow RaceA official progression.' }),
    originalRaceCampaign({ environment: 'Snow', baseId: 'tmo-snow', tierCode: 'D', lat: tmoSnow[3].lat, lon: tmoSnow[3].lon, surface: 'snow', description: 'TrackMania Original Snow RaceD official progression.' }),
    originalRaceCampaign({ environment: 'Desert', baseId: 'tmo-desert', tierCode: 'B', lat: tmoDesert[1].lat, lon: tmoDesert[1].lon, surface: 'road', description: 'TrackMania Original Desert RaceB official progression.' }),
    originalRaceCampaign({ environment: 'Desert', baseId: 'tmo-desert', tierCode: 'E', lat: tmoDesert[4].lat, lon: tmoDesert[4].lon, surface: 'road', description: 'TrackMania Original Desert RaceE official progression.' }),
    originalRaceCampaign({ environment: 'Rally', baseId: 'tmo-rally', tierCode: 'C', lat: tmoRally[2].lat, lon: tmoRally[2].lon, surface: 'road', description: 'TrackMania Original Rally RaceC official progression.' }),

    ...sunriseRaceSeries({ gameId: 'tms', family: 'Island', environment: 'Island', baseId: 'tms-island', releaseDate: '2005-04-06', points: tmsIsland, region: 'Island', surface: 'asphalt', description: 'Sunrise Island official race maps from Nadeo.' }),
    ...sunriseRaceSeries({ gameId: 'tms', family: 'Bay', environment: 'Bay', baseId: 'tms-bay', releaseDate: '2005-04-06', points: tmsBay, region: 'Bay', surface: 'city', description: 'Sunrise Bay official race maps from Nadeo.' }),
    ...sunriseRaceSeries({ gameId: 'tms', family: 'Coast', environment: 'Coast', baseId: 'tms-coast', releaseDate: '2005-04-06', points: tmsCoast, region: 'Coast', surface: 'road', description: 'Sunrise Coast official race maps from Nadeo.' }),

    ...classicSeries({ gameId: 'tmn', family: 'Stadium', environment: 'Stadium', baseId: 'tmn-stadium', releaseDate: '2006-01-27', era: 'Nations', points: tmnStadium, region: 'Stadium', surface: 'stadium', description: 'TrackMania Nations Stadium official race progression.', tiers: NATIONS_TIERS, mapNameForIndex: ({ tier, mapIndex }) => `${tier.code}-${mapIndex}` }),

    ...classicSeries({ gameId: 'tmuf', family: 'Snow', environment: 'Snow', baseId: 'tmuf-snow', releaseDate: '2008-04-16', era: 'Forever', points: tmufSnow, region: 'Snow', surface: 'snow', description: 'United Forever Snow official race progression.', tiers: UNITED_TIERS, mapNameForIndex: ({ tier, mapIndex, environment }) => tier.code === 'E' ? `${environment}E` : `${environment}${tier.code}${mapIndex + 1}` }),
    ...classicSeries({ gameId: 'tmuf', family: 'Desert', environment: 'Desert', baseId: 'tmuf-desert', releaseDate: '2008-04-16', era: 'Forever', points: tmufDesert, region: 'Desert', surface: 'road', description: 'United Forever Desert official race progression.', tiers: UNITED_TIERS, mapNameForIndex: ({ tier, mapIndex, environment }) => tier.code === 'E' ? `${environment}E` : `${environment}${tier.code}${mapIndex + 1}` }),
    ...classicSeries({ gameId: 'tmuf', family: 'Rally', environment: 'Rally', baseId: 'tmuf-rally', releaseDate: '2008-04-16', era: 'Forever', points: tmufRally, region: 'Rally', surface: 'road', description: 'United Forever Rally official race progression.', tiers: UNITED_TIERS, mapNameForIndex: ({ tier, mapIndex, environment }) => tier.code === 'E' ? `${environment}E` : `${environment}${tier.code}${mapIndex + 1}` }),
    ...classicSeries({ gameId: 'tmuf', family: 'Island', environment: 'Island', baseId: 'tmuf-island', releaseDate: '2008-04-16', era: 'Forever', points: tmufIsland, region: 'Island', surface: 'asphalt', description: 'United Forever Island official race progression.', tiers: UNITED_TIERS, mapNameForIndex: ({ tier, mapIndex, environment }) => tier.code === 'E' ? `${environment}E` : `${environment}${tier.code}${mapIndex + 1}` }),
    ...classicSeries({ gameId: 'tmuf', family: 'Coast', environment: 'Coast', baseId: 'tmuf-coast', releaseDate: '2008-04-16', era: 'Forever', points: tmufCoast, region: 'Coast', surface: 'road', description: 'United Forever Coast official race progression.', tiers: UNITED_TIERS, mapNameForIndex: ({ tier, mapIndex, environment }) => tier.code === 'E' ? `${environment}E` : `${environment}${tier.code}${mapIndex + 1}` }),
    ...classicSeries({ gameId: 'tmuf', family: 'Bay', environment: 'Bay', baseId: 'tmuf-bay', releaseDate: '2008-04-16', era: 'Forever', points: tmufBay, region: 'Bay', surface: 'city', description: 'United Forever Bay official race progression.', tiers: UNITED_TIERS, mapNameForIndex: ({ tier, mapIndex, environment }) => tier.code === 'E' ? `${environment}E` : `${environment}${tier.code}${mapIndex + 1}` }),
    ...classicSeries({ gameId: 'tmuf', family: 'Stadium', environment: 'Stadium', baseId: 'tmuf-stadium', releaseDate: '2008-04-16', era: 'Forever', points: tmufStadium, region: 'Stadium', surface: 'stadium', description: 'United Forever Stadium official race progression.', tiers: UNITED_TIERS, mapNameForIndex: ({ tier, mapIndex, environment }) => tier.code === 'E' ? `${environment}E` : `${environment}${tier.code}${mapIndex + 1}` }),

    ...classicSeries({ gameId: 'tmnf', family: 'Stadium', environment: 'Stadium', baseId: 'tmnf-stadium', releaseDate: '2008-04-16', era: 'Forever', status: 'active', points: tmnfStadium, region: 'Stadium', surface: 'stadium', description: 'Nations Forever Stadium official A-E progression.', mapNameForIndex: tmnfMapName }),

    ...classicSeries({ gameId: 'tm2', family: 'Canyon', environment: 'Canyon', baseId: 'tm2-canyon', releaseDate: '2011-09-14', era: 'Maniaplanet', points: tm2Canyon, region: 'Canyon', surface: 'canyon', description: 'TrackMania 2 Canyon official A-E progression.', mapNameForIndex: ({ tier, mapIndex, environment }) => `${environment} ${tier.code}${String(mapIndex + 1).padStart(2, '0')}` }),
    ...classicSeries({ gameId: 'tm2', family: 'Stadium', environment: 'Stadium', baseId: 'tm2-stadium', releaseDate: '2013-02-27', era: 'Maniaplanet', points: tm2Stadium, region: 'Stadium', surface: 'stadium', description: 'TrackMania 2 Stadium official A-E progression.', mapNameForIndex: ({ tier, mapIndex, environment }) => `${environment} ${tier.code}${String(mapIndex + 1).padStart(2, '0')}` }),
    ...classicSeries({ gameId: 'tm2', family: 'Valley', environment: 'Valley', baseId: 'tm2-valley', releaseDate: '2013-07-04', era: 'Maniaplanet', points: tm2Valley, region: 'Valley', surface: 'road', description: 'TrackMania 2 Valley official A-E progression.', mapNameForIndex: ({ tier, mapIndex, environment }) => `${environment} ${tier.code}${String(mapIndex + 1).padStart(2, '0')}` }),
    ...classicSeries({ gameId: 'tm2', family: 'Lagoon', environment: 'Lagoon', baseId: 'tm2-lagoon', releaseDate: '2017-05-23', era: 'Maniaplanet', points: tm2Lagoon, region: 'Lagoon', surface: 'wood', description: 'TrackMania 2 Lagoon official A-E progression.', mapNameForIndex: ({ tier, mapIndex, environment }) => `${environment} ${tier.code}${String(mapIndex + 1).padStart(2, '0')}` }),

    ...TM2020_SEASONS.flatMap((season) => seasonSeries({ gameId: 'tm2020', status: 'active', ...season }))
  ]
};
