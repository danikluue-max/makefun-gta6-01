// NUSA HEAT — tuning numbers, palette, districts and story constants in one place.
// The city is Teluk Nusa, a fictional sun-soaked coastal city in Indonesia. Every name,
// character, vehicle and place below is invented for this game.

export const STEP = 1 / 60;
export const SAVE_KEY = 'nusa-heat.save.v1';

// City extents (metres). Roads form a grid; the sea lies south of the beach strip.
export const CITY = {
  half: 220,
  roadHalf: 160,
  roadSpacing: 80,
  roadWidth: 14,
  beachZ: 196,
  seaZ: 238,
};

export const ROADS_X = [-160, -80, 0, 80, 160];
export const ROADS_Z = [-160, -80, 0, 80, 160];

export const DISTRICTS = {
  downtown: 'Pusat Kota',
  market: 'Pasar Nusa',
  port: 'Pelabuhan',
  housing: 'Perumahan Bukit',
  beach: 'Pantai Pasir Putih',
};

export const PALETTE = {
  skyDay: 0x63b3f2,
  skyDeep: 0x2a6fc4,
  skyDusk: 0xff8a4d,
  // Golden hour: the sun drops toward the sea and the whole sky goes warm
  // orange-pink. The cover shot lives here (17:30-18:30) — it has to stay
  // bright enough to read, unlike the old near-night dusk shot.
  skySunset: 0xff9e5e,
  skySunsetPink: 0xf27d8a,
  skyNight: 0x0b1026,
  sea: 0x1e9db4,
  sand: 0xf0d9a0,
  asphalt: 0x14161a,
  asphaltLine: 0xf2e9c8,
  sidewalk: 0x4a4d52,
  buildingGlass: 0xa8d4e8,
  grass: 0x58a04e,
  // Warm sun-soaked accents: shop awnings, signs and props use these so the
  // street reads as a tropical market town, not a grey grid.
  awningRed: 0xe05a4e,
  awningYellow: 0xf2c230,
  awningGreen: 0x3fae7a,
  awningBlue: 0x4a90d9,
  shopSign: 0xffd23c,
};

export const PLAYER_TUNING = {
  walkSpeed: 6,
  runSpeed: 10.5,
  radius: 0.55,
  maxHealth: 100,
  pistolDamage: 34,
  pistolRange: 70,
  pistolAmmo: 60,
};

export const CAR_TUNING = {
  accel: 16,
  brake: 26,
  reverseMax: 10,
  maxSpeed: 40,
  turnRate: 1.9,
  grip: 8,
  trafficSpeed: 11,
  policeSpeed: 44,
  // NOS: hold Shift while driving for a burst. The tank drains in ~4 s and
  // refills slowly; while it is on, top speed and acceleration jump.
  nosMaxSpeed: 58,
  nosAccel: 26,
  nosDrain: 0.25,
  nosRefill: 0.08,
};

export const WANTED = {
  maxStars: 5,
  decaySeconds: 26,
  stealCar: 1,
  hitPed: 1,
  hitPolice: 2,
  shoot: 1,
  kill: 2,
};

// Money (rupiah-flavoured "koin" is avoided: the game pays in $ like the street does).
// Eight jobs now: the street race pays the biggest single purse after the finale.
export const MISSION_REWARDS = [500, 800, 1000, 1200, 1500, 1800, 2500, 2500];

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
