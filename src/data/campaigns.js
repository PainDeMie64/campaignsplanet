const continent = (points) => points.map(([lat, lon]) => ({ lat, lon }));

const CLASSIC_TIERS = [
  { id: 'white', code: 'A', name: 'White Series', count: 15, difficulty: 1, color: '#f4f7f8' },
  { id: 'green', code: 'B', name: 'Green Series', count: 15, difficulty: 3, color: '#58d36c' },
  { id: 'blue', code: 'C', name: 'Blue Series', count: 15, difficulty: 5, color: '#4da3ff' },
  { id: 'red', code: 'D', name: 'Red Series', count: 15, difficulty: 7, color: '#ff4d6d' },
  { id: 'black', code: 'E', name: 'Black Series', count: 5, difficulty: 9, color: '#111923' }
];

const SEASON_TIERS = CLASSIC_TIERS.map((tier) => ({ ...tier, count: 5 }));
const UNITED_TIERS = tierCounts({ white: 5, green: 5, blue: 5, red: 5, black: 1 });

const MODE = {
  RACE: 'Race',
  RACE_EXTREME: 'Race Extreme',
  STUNT: 'Stunt',
  STUNTS: 'Stunts',
  PLATFORM: 'Platform',
  PUZZLE: 'Puzzle',
  CRAZY: 'Crazy',
  SURVIVAL: 'Survival',
  NATIONS: 'Nations',
  STARTRACK: 'StarTrack',
  SOLO: 'Solo Campaign',
  PRO: 'Pro Campaign',
  BONUS: 'Bonus Campaign',
  BONUS_TRACKS: 'Bonus Tracks',
  SEASONAL: 'Seasonal Campaigns',
  TRAINING: 'Training'
};

function tierCounts(counts) {
  return CLASSIC_TIERS.map((tier) => ({ ...tier, count: counts[tier.id] ?? tier.count }));
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

function makeMaps({ campaignId, tier, environment, surface, mode, category, section = null, nameForIndex }) {
  const seed = [...campaignId].reduce((total, char) => total + char.charCodeAt(0), 0) % 17;
  return Array.from({ length: tier.count }, (_, index) => ({
    id: `${campaignId}-${String(index + 1).padStart(2, '0')}`,
    name: nameForIndex(index),
    order: index + 1,
    official: true,
    environment,
    surface,
    mode,
    category,
    section,
    difficulty: Math.min(10, Math.max(1, tier.difficulty + Math.floor(index / 6))),
    tags: [environment.toLowerCase(), surface, mode?.toLowerCase(), category?.toLowerCase(), section?.toLowerCase(), tier.id, tier.code].filter(Boolean),
    medals: medals(seed, index, tier.difficulty),
    tmxId: null
  }));
}

function tierCampaign({
  id,
  gameId,
  family,
  environment,
  mode = MODE.RACE,
  category = environment,
  section = null,
  tier,
  shortLabel = tier.code,
  order,
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
    mode,
    category,
    section,
    tier: tier.name,
    tierCode: tier.code,
    shortLabel,
    tierColor: tier.color,
    officialStatus: status,
    official: true,
    difficulty: tier.difficulty,
    order: order ?? tier.difficulty,
    lat,
    lon,
    region,
    description,
    maps: makeMaps({
      campaignId: id,
      tier,
      environment,
      surface,
      mode,
      category,
      section,
      nameForIndex
    })
  };
}

function classicSeries({ gameId, family, environment, mode = MODE.RACE, category = environment, section = null, baseId, releaseDate, era, status, points, region, surface, description, tiers = CLASSIC_TIERS, shortLabelForTier, orderForTier, mapNameForIndex }) {
  return tiers.map((tier, index) => tierCampaign({
    id: `${baseId}-${tier.id}`,
    gameId,
    family,
    environment,
    mode,
    category,
    section,
    tier,
    shortLabel: shortLabelForTier ? shortLabelForTier({ tier, environment, index }) : tier.code,
    order: orderForTier ? orderForTier({ tier, environment, index }) : index,
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

function explicitMaps({ campaignId, names, environment, surface, mode, category, difficulty, tier }) {
  const seed = [...campaignId].reduce((total, char) => total + char.charCodeAt(0), 0) % 17;
  return names.map((name, index) => ({
    id: `${campaignId}-${String(index + 1).padStart(2, '0')}`,
    name,
    order: index + 1,
    official: true,
    environment,
    surface,
    mode,
    category,
    difficulty,
    tags: [environment.toLowerCase(), surface, mode?.toLowerCase(), category?.toLowerCase(), tier.id, tier.code].filter(Boolean),
    medals: medals(seed, index, difficulty),
    tmxId: null
  }));
}

function explicitCampaign({
  id,
  gameId,
  family,
  environment,
  mode = MODE.RACE,
  category = environment,
  tier,
  shortLabel = tier.code,
  order,
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
    mode,
    category,
    tier: tier.name,
    tierCode: tier.code,
    shortLabel,
    tierColor: tier.color,
    officialStatus: status,
    official: true,
    difficulty: tier.difficulty,
    order: order ?? tier.difficulty,
    lat,
    lon,
    region,
    description,
    maps: explicitMaps({
      campaignId: id,
      names: mapNames,
      environment,
      surface,
      mode,
      category,
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
    environment: 'Mixed',
    mode: MODE.RACE,
    category: seasonName === 'Training' ? MODE.TRAINING : MODE.SEASONAL,
    tier,
    shortLabel: seasonName === 'Training' ? tier.name.replace(' Series', '') : `${seasonName} ${tier.name.replace(' Series', '')}`,
    order: tierIndex,
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

const NATIONS_ESWC_LETTERS = 'ABCDEFGHI'.split('').map((code, index) => ({
  id: `group-${code.toLowerCase()}`,
  code,
  name: `Group ${code}`,
  count: 10,
  difficulty: Math.min(9, index + 1),
  color: CLASSIC_TIERS[Math.min(CLASSIC_TIERS.length - 1, Math.floor(index / 2))].color
}));

const NATIONS_ESWC_SPECIAL_TIERS = [
  { id: 'pro', code: 'PRO', name: 'Pro', count: 10, difficulty: 8, color: '#ff4d6d' },
  { id: 'bonus', code: 'BONUS', name: 'Bonus', count: 20, difficulty: 6, color: '#ffd166' }
];

const NATIONS_ESWC_SPECIAL_MAPS = {
  pro: Array.from({ length: 10 }, (_, index) => `Pro A-${index}`),
  bonus: [
    ...Array.from({ length: 10 }, (_, index) => `Bonus A-${index}`),
    ...Array.from({ length: 10 }, (_, index) => `Bonus B-${index}`)
  ]
};

function nationsEswcSeries({ points }) {
  const soloCampaigns = NATIONS_ESWC_LETTERS.map((tier, index) => tierCampaign({
    id: `tmn-stadium-${tier.id}`,
    gameId: 'tmn',
    family: 'Stadium',
    environment: 'Stadium',
    mode: MODE.RACE,
    category: MODE.SOLO,
    tier,
    shortLabel: tier.code,
    order: index,
    releaseDate: '2006-01-27',
    era: 'Nations',
    status: 'legacy',
    lat: points[Math.min(index, points.length - 1)].lat,
    lon: points[Math.min(index, points.length - 1)].lon,
    region: MODE.SOLO,
    surface: 'stadium',
    description: 'TrackMania Nations ESWC solo campaign group.',
    nameForIndex: (mapIndex) => `${tier.code}-${mapIndex}`
  }));
  const specialCampaigns = NATIONS_ESWC_SPECIAL_TIERS.map((tier, index) => tierCampaign({
    id: `tmn-stadium-${tier.id}`,
    gameId: 'tmn',
    family: 'Stadium',
    environment: 'Stadium',
    mode: MODE.RACE,
    category: tier.id === 'pro' ? MODE.PRO : MODE.BONUS,
    tier,
    shortLabel: tier.code,
    order: index,
    releaseDate: '2006-01-27',
    era: 'Nations',
    status: 'legacy',
    lat: points.at(-1).lat,
    lon: points.at(-1).lon,
    region: tier.id === 'pro' ? MODE.PRO : MODE.BONUS,
    surface: 'stadium',
    description: `TrackMania Nations ESWC ${tier.name.toLowerCase()} campaign maps.`,
    nameForIndex: (mapIndex) => NATIONS_ESWC_SPECIAL_MAPS[tier.id][mapIndex]
  }));
  return [...soloCampaigns, ...specialCampaigns];
}

const points = (...items) => items.map(([lat, lon]) => ({ lat, lon }));

const tmnStadium = points([59, -76], [55, -65], [50, -54], [44, -44], [36, -36]);
const tmufSnow = points([42, 49], [46, 52], [50, 54], [54, 52], [56, 48]);
const tmufDesert = points([54, 1], [58, 7], [61, 14], [63, 21], [61, 27]);
const tmufRally = points([39, -1], [36, 6], [34, 13], [33, 20], [34, 27]);
const tmufIsland = points([53, 27], [56, 32], [58, 37], [57, 42], [52, 43]);
const tmufCoast = points([25, 10], [24, 16], [24, 22], [25, 28], [27, 33]);
const tmufBay = points([31, 39], [30, 45], [31, 51], [34, 56], [39, 57]);
const tmufStadium = points([43, 13], [44, 19], [45, 25], [46, 31], [47, 37]);
const tmufMixed = points([28, 44], [35, 50], [42, 56], [49, 50], [56, 44]);

const tmnfStadium = points([52, 96], [58, 109], [56, 122], [50, 134], [42, 140]);

const tm2Canyon = points([-14, 24], [-20, 32], [-27, 39], [-34, 46], [-42, 52]);
const tm2Stadium = points([-9, 54], [-13, 60], [-17, 66], [-21, 72], [-26, 76]);
const tm2Valley = points([-43, 28], [-49, 36], [-54, 45], [-57, 54], [-55, 63]);
const tm2Lagoon = points([-36, 65], [-39, 69], [-42, 73], [-43, 77], [-40, 80]);

const UNITED_ENVIRONMENTS = [
  { environment: 'Snow', points: tmufSnow, surface: 'snow' },
  { environment: 'Desert', points: tmufDesert, surface: 'road' },
  { environment: 'Rally', points: tmufRally, surface: 'road' },
  { environment: 'Island', points: tmufIsland, surface: 'asphalt' },
  { environment: 'Coast', points: tmufCoast, surface: 'road' },
  { environment: 'Bay', points: tmufBay, surface: 'city' },
  { environment: 'Stadium', points: tmufStadium, surface: 'stadium' }
];

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

const SUNRISE_CATEGORY_META = {
  [MODE.RACE]: { releaseDate: '2005-04-06', era: 'Sunrise', color: '#f4f7f8', difficulty: 2 },
  [MODE.RACE_EXTREME]: { releaseDate: '2005-11-14', era: 'Sunrise eXtreme', color: '#ff4d6d', difficulty: 7, mode: MODE.RACE },
  [MODE.CRAZY]: { releaseDate: '2005-04-06', era: 'Sunrise', color: '#ffcf5f', difficulty: 5 },
  [MODE.PLATFORM]: { releaseDate: '2005-04-06', era: 'Sunrise', color: '#4da3ff', difficulty: 6 },
  [MODE.PUZZLE]: { releaseDate: '2005-04-06', era: 'Sunrise', color: '#58d36c', difficulty: 5 },
  [MODE.STUNTS]: { releaseDate: '2005-11-14', era: 'Sunrise eXtreme', color: '#ff9f1c', difficulty: 6, mode: MODE.STUNT },
  [MODE.BONUS_TRACKS]: { releaseDate: '2005-11-14', era: 'Sunrise eXtreme', color: '#b78cff', difficulty: 4, mode: MODE.RACE }
};

const SUNRISE_CAMPAIGN_GROUPS = [
  {
    category: MODE.RACE,
    groups: [
      ['Holidays', ['SkidOrDie', 'CarPark', 'ParadiseIsland', 'NightFlight', 'GoodMorning']],
      ['Shopping', ['Downtown', 'CrossOver', 'FollowTheLeader', 'TrickyTrack', 'OnTheRoofAgain']],
      ['Excursion', ['QuietRide', 'GrandPrix', 'Snake', 'JumpOnBrakes', 'Village']],
      ['Surfing', ['SpeedWave', 'Antigrav', 'BeautifulDay', 'Midnight', 'RampRage']],
      ['NightLife', ['HighStreet', 'TunnelEffect', 'Suburbs', 'Deviation', 'BuildingRider']],
      ['Evasion', ['Magnitude', 'GrandPrix2', 'HomeRun', 'AquaScheme', 'NightRider']],
      ['Pointbreak', ['Orbital', 'HappyBay', 'GrandPrix30']]
    ]
  },
  {
    category: MODE.RACE_EXTREME,
    groups: [
      ['Extreme', ['XRace01', 'XRace02', 'XRace03', 'XRace04', 'XRace05', 'XRace06', 'XRace07', 'XRace08', 'XRace09']]
    ]
  },
  {
    category: MODE.CRAZY,
    groups: [
      ['Carnival', ['Small Ring', 'Secret Caves', 'Training Circuit', 'Straight Ahead', 'Forest Jump', 'Up and Down', 'Dangerous Descent']],
      ['Circus', ['Aerial Lights', 'Chaos Area', 'Five Rows', 'High Tide', 'Bouncy Alley']]
    ]
  },
  {
    category: MODE.PLATFORM,
    groups: [
      ['Lagoon', ['AirControl', 'OverTheTop', 'OldSchool', 'CityAirport', 'Gravity']],
      ['Docks', ['DockOfTheBay', 'UrbanStyle', 'TheCage', 'NiceShot', 'LittleWalk']],
      ['Cliffs', ['Stop!', 'FullTurtle', 'StepByStep', 'Spiral', 'MissingBridge']],
      ['Peak', ['LandingArea', 'DoubleLoop', 'TrialTime', 'Platform Hard', 'ThinkForward']],
      ['Summit', ['TamTam', 'Platform Extreme', 'Vertigo']]
    ]
  },
  {
    category: MODE.PUZZLE,
    groups: [
      ['Brain Teaser', ['Bay Starter', 'Buildings Ahead', 'Ideal 265', 'Tight Budget', 'Double Jump']],
      ['Question', ['Tilted Curves', 'Trident', 'The Right Speed', 'Smooth Slopes', 'Deadend Checkpoints']],
      ['Riddle', ['4Roads', 'Tangram', 'Highs and Lows', 'Undulate Line', 'Tangram2']],
      ['Brainstorm', ['Meteor Crash', 'MiniG3', 'Tunneling', 'Harbor Ramps', 'Aim for the Top']],
      ['Enigma', ['Big Bowl', 'Work Around', 'Drunken Tunnel', 'The Left Speed', 'Pillar of Summer']],
      ['Mystery', ['PlotHoles', 'Simple Line', 'Water Pillar', 'Strange Motif', 'Rabbit Holes']],
      ['Koan', ['Final Speed', 'Mixed Line', 'Pyramid of Doom']]
    ]
  },
  {
    category: MODE.STUNTS,
    groups: [
      ['Jump Rope', ['WarmUp', "Rock'n'Roll", 'ChaosTheory']],
      ['Trampoline', ['StuntPark', 'Aquaplanning', 'BoatRide']],
      ['Bungie Jumping', ['RocketJump', 'WatchTheStep', 'FlipFlop']],
      ['Parachute', ['HeadOrTails', 'Medallion', 'SpinHell']],
      ['Atmospheric Reentry', ['Backyard', 'Satellite', 'GiantPinball']]
    ]
  },
  {
    category: MODE.BONUS_TRACKS,
    groups: [
      ['MicroLaps', ['CentralPark', 'Crazy8', 'DarkRuin', 'NightRound', 'SeeYouSoon', 'ShoppingCenter', 'SicilianArena', 'TwoMountains', 'VulcanRing']],
      ['MicroTracks', ['EmperorRoof', 'Kangourou', 'OutOfTheDock', 'RomanRuin', 'RuinByNight', 'RuinOfTheSun', 'VulcanBird', 'VulcanHarbor']],
      ['MiniLaps', ["CoteD'Azur", 'CrazyBridge', 'EnterTheWorm', 'GateOfTheSun', 'LateAfter8', 'RabbitHill', 'Toscany', 'WestSide']],
      ['MiniTracks', ['Anaconda', 'BeachTime', 'BipBopSound', 'CleanLanding', 'ClimbTheHill', 'GoingHome', "LoopN'Roof", 'TownToTown']]
    ]
  }
];

function slug(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function sunriseCampaignSeries() {
  return SUNRISE_CAMPAIGN_GROUPS.flatMap((section, sectionIndex) => {
    const meta = SUNRISE_CATEGORY_META[section.category];
    return section.groups.map(([group, mapNames], groupIndex) => explicitCampaign({
      id: `tms-${slug(section.category)}-${slug(group)}`,
      gameId: 'tms',
      family: section.category,
      environment: 'Mixed',
      mode: meta.mode ?? section.category,
      category: section.category,
      tier: {
        id: slug(group),
        code: group,
        name: group,
        count: mapNames.length,
        difficulty: Math.min(10, meta.difficulty + Math.floor(groupIndex / 2)),
        color: meta.color
      },
      shortLabel: group,
      order: sectionIndex * 100 + groupIndex,
      releaseDate: meta.releaseDate,
      era: meta.era,
      region: group,
      surface: 'mixed',
      description: `TrackMania Sunrise ${section.category} ${group} campaign maps from the medal-times source.`,
      mapNames
    }));
  });
}

function codeMaps(prefix, letters, countForLetter) {
  return letters.flatMap((letter) => (
    Array.from({ length: countForLetter(letter) }, (_, index) => `${prefix}${letter}${index + 1}`)
  ));
}

const ORIGINAL_CAMPAIGN_GROUPS = [
  {
    category: MODE.RACE,
    releaseDate: '2003-11-21',
    era: 'Classic',
    color: '#f4f7f8',
    difficulty: 2,
    groups: 'ABCDEFG'.split('').map((letter) => [
      `Group ${letter}`,
      codeMaps('Race', [letter], (item) => item === 'G' ? 3 : 8)
    ])
  },
  {
    category: MODE.PLATFORM,
    releaseDate: '2005-10-12',
    era: 'Original',
    color: '#4da3ff',
    difficulty: 6,
    groups: 'ABCDE'.split('').map((letter) => [
      `Group ${letter}`,
      codeMaps('Platform', [letter], () => 3)
    ])
  },
  {
    category: MODE.PUZZLE,
    releaseDate: '2003-11-21',
    era: 'Classic',
    color: '#58d36c',
    difficulty: 5,
    groups: 'ABCDEFG'.split('').map((letter) => [
      `Group ${letter}`,
      codeMaps('Puzzle', [letter], (item) => item === 'G' ? 3 : 8)
    ])
  },
  {
    category: MODE.STUNTS,
    releaseDate: '2005-10-12',
    era: 'Original',
    color: '#ff9f1c',
    difficulty: 6,
    mode: MODE.STUNT,
    groups: 'ABCD'.split('').map((letter) => [
      `Group ${letter}`,
      codeMaps('Stunts', [letter], () => 3)
    ])
  },
  {
    category: MODE.SURVIVAL,
    releaseDate: '2004-05-21',
    era: 'Power-Up',
    color: '#ff4d6d',
    difficulty: 7,
    mode: MODE.RACE,
    groups: [
      ['Survival', Array.from({ length: 18 }, (_, index) => `Survival${String(index + 1).padStart(2, '0')}`)]
    ]
  }
];

function originalCampaignSeries() {
  return ORIGINAL_CAMPAIGN_GROUPS.flatMap((section, sectionIndex) => (
    section.groups.map(([group, mapNames], groupIndex) => explicitCampaign({
      id: `tmo-${slug(section.category)}-${slug(group)}`,
      gameId: 'tmo',
      family: section.category,
      environment: 'Mixed',
      mode: section.mode ?? section.category,
      category: section.category,
      tier: {
        id: slug(group),
        code: group,
        name: group,
        count: mapNames.length,
        difficulty: Math.min(10, section.difficulty + Math.floor(groupIndex / 2)),
        color: section.color
      },
      shortLabel: group,
      order: sectionIndex * 100 + groupIndex,
      releaseDate: section.releaseDate,
      era: section.era,
      region: group,
      surface: 'mixed',
      description: `TrackMania Original ${section.category} ${group} maps from the medal-times source.`,
      mapNames
    }))
  ));
}

function unitedTierMapName(prefix, tier, mapIndex) {
  if (tier.code === 'E') return prefix === 'Stunt' ? `${prefix}E1` : `${prefix}E`;
  return `${prefix}${tier.code}${mapIndex + 1}`;
}

function unitedRaceSeries() {
  return UNITED_ENVIRONMENTS.flatMap(({ environment, points: environmentPoints, surface }) => (
    classicSeries({
      gameId: 'tmuf',
      family: environment,
      environment,
      category: MODE.RACE,
      section: environment,
      baseId: `tmuf-${slug(environment)}`,
      releaseDate: '2008-04-16',
      era: 'Forever',
      points: environmentPoints,
      region: environment,
      surface,
      description: `UnitedRace official ${environment} campaign from the TrackMania Forever leaderboard source.`,
      tiers: UNITED_TIERS,
      shortLabelForTier: ({ tier }) => tier.code,
      mapNameForIndex: ({ tier, mapIndex }) => unitedTierMapName(environment, tier, mapIndex)
    })
  ));
}

function unitedModeSeries({ family, mode, category, prefix, baseId, surface, description }) {
  return classicSeries({
    gameId: 'tmuf',
    family,
    environment: 'Mixed',
    mode,
    category,
    baseId,
    releaseDate: '2008-04-16',
    era: 'Forever',
    points: tmufMixed,
    region: category,
    surface,
    description,
    tiers: UNITED_TIERS,
    shortLabelForTier: ({ tier }) => tier.code,
    mapNameForIndex: ({ tier, mapIndex }) => unitedTierMapName(prefix, tier, mapIndex)
  });
}

function unitedNationsSeries() {
  return classicSeries({
    gameId: 'tmuf',
    family: MODE.NATIONS,
    environment: 'Stadium',
    category: MODE.NATIONS,
    baseId: 'tmuf-nations',
    releaseDate: '2008-04-16',
    era: 'Forever',
    points: tmnfStadium,
    region: MODE.NATIONS,
    surface: 'stadium',
    description: 'Nations campaign as exposed by the TrackMania Forever United leaderboard source.',
    mapNameForIndex: tmnfMapName
  });
}

function unitedStarTrackSeries() {
  return UNITED_ENVIRONMENTS.flatMap(({ environment, points: environmentPoints, surface }) => (
    classicSeries({
      gameId: 'tmuf',
      family: `${MODE.STARTRACK} ${environment}`,
      environment,
      category: MODE.STARTRACK,
      section: environment,
      baseId: `tmuf-star-${slug(environment)}`,
      releaseDate: '2009-11-26',
      era: 'Star Edition',
      points: environmentPoints,
      region: `${MODE.STARTRACK} - ${environment}`,
      surface,
      description: `ManiaStar official StarTrack ${environment} campaign from the TrackMania Forever leaderboard source.`,
      tiers: UNITED_TIERS,
      shortLabelForTier: ({ tier }) => tier.code,
      mapNameForIndex: ({ tier, mapIndex }) => unitedTierMapName(`Star${environment}`, tier, mapIndex)
    })
  ));
}

function unitedForeverCampaignSeries() {
  return [
    ...unitedRaceSeries(),
    ...unitedModeSeries({
      family: 'United Platform',
      mode: MODE.PLATFORM,
      category: MODE.PLATFORM,
      prefix: 'Platform',
      baseId: 'tmuf-platform',
      surface: 'mixed',
      description: 'UnitedPlatform official campaign from the TrackMania Forever leaderboard source.'
    }),
    ...unitedModeSeries({
      family: 'United Puzzle',
      mode: MODE.PUZZLE,
      category: MODE.PUZZLE,
      prefix: 'Puzzle',
      baseId: 'tmuf-puzzle',
      surface: 'mixed',
      description: 'UnitedPuzzle official campaign from the TrackMania Forever leaderboard source.'
    }),
    ...unitedModeSeries({
      family: 'United Stunts',
      mode: MODE.STUNT,
      category: MODE.STUNTS,
      prefix: 'Stunt',
      baseId: 'tmuf-stunts',
      surface: 'mixed',
      description: 'UnitedStunts official campaign from the TrackMania Forever leaderboard source.'
    }),
    ...unitedNationsSeries(),
    ...unitedStarTrackSeries()
  ];
}

const UNITED_CATEGORY_ORDER = [
  MODE.RACE,
  MODE.PLATFORM,
  MODE.PUZZLE,
  MODE.STUNTS,
  MODE.NATIONS,
  MODE.STARTRACK
];

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
      terrain: 'first-game campaigns organized by source-listed mode and letter group',
      environments: [MODE.RACE, MODE.PLATFORM, MODE.PUZZLE, MODE.STUNTS, MODE.SURVIVAL],
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
      terrain: 'Sunrise and Sunrise eXtreme campaigns organized by in-game mode and named folder',
      environments: [MODE.RACE, MODE.RACE_EXTREME, MODE.CRAZY, MODE.PLATFORM, MODE.PUZZLE, MODE.STUNTS, MODE.BONUS_TRACKS],
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
      terrain: 'single Stadium campaign with A-I solo groups plus Pro and Bonus campaigns',
      environments: [MODE.SOLO, MODE.PRO, MODE.BONUS],
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
      terrain: 'UnitedRace, UnitedPuzzle, UnitedPlatform, UnitedStunts, Nations, and ManiaStar campaigns from official leaderboard names',
      environments: UNITED_CATEGORY_ORDER,
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
      environments: [MODE.SEASONAL, MODE.TRAINING],
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
    ...originalCampaignSeries(),

    ...sunriseCampaignSeries(),

    ...nationsEswcSeries({ points: tmnStadium }),

    ...unitedForeverCampaignSeries(),

    ...classicSeries({ gameId: 'tmnf', family: 'Stadium', environment: 'Stadium', baseId: 'tmnf-stadium', releaseDate: '2008-04-16', era: 'Forever', status: 'active', points: tmnfStadium, region: 'Stadium', surface: 'stadium', description: 'Nations Forever Stadium official A-E progression.', mapNameForIndex: tmnfMapName }),

    ...classicSeries({ gameId: 'tm2', family: 'Canyon', environment: 'Canyon', baseId: 'tm2-canyon', releaseDate: '2011-09-14', era: 'Maniaplanet', points: tm2Canyon, region: 'Canyon', surface: 'canyon', description: 'TrackMania 2 Canyon official A-E progression.', mapNameForIndex: ({ tier, mapIndex }) => `${tier.code}${String(mapIndex + 1).padStart(2, '0')}` }),
    ...classicSeries({ gameId: 'tm2', family: 'Stadium', environment: 'Stadium', baseId: 'tm2-stadium', releaseDate: '2013-02-27', era: 'Maniaplanet', points: tm2Stadium, region: 'Stadium', surface: 'stadium', description: 'TrackMania 2 Stadium official A-E progression.', mapNameForIndex: ({ tier, mapIndex }) => `${tier.code}${String(mapIndex + 1).padStart(2, '0')}` }),
    ...classicSeries({ gameId: 'tm2', family: 'Valley', environment: 'Valley', baseId: 'tm2-valley', releaseDate: '2013-07-04', era: 'Maniaplanet', points: tm2Valley, region: 'Valley', surface: 'road', description: 'TrackMania 2 Valley official A-E progression.', mapNameForIndex: ({ tier, mapIndex }) => `${tier.code}${String(mapIndex + 1).padStart(2, '0')}` }),
    ...classicSeries({ gameId: 'tm2', family: 'Lagoon', environment: 'Lagoon', baseId: 'tm2-lagoon', releaseDate: '2017-05-23', era: 'Maniaplanet', points: tm2Lagoon, region: 'Lagoon', surface: 'wood', description: 'TrackMania 2 Lagoon official A-E progression.', mapNameForIndex: ({ tier, mapIndex }) => `${tier.code}${String(mapIndex + 1).padStart(2, '0')}` }),

    ...TM2020_SEASONS.flatMap((season) => seasonSeries({ gameId: 'tm2020', status: 'active', ...season }))
  ]
};
