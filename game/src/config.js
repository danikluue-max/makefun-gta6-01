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
  skyDay: 0x4f9be0,
  skyDeep: 0x2f6fb2,
  skyDusk: 0xff9a5c,
  skyNight: 0x0b1026,
  sea: 0x1d7f8e,
  sand: 0xe8d29a,
  asphalt: 0x2e3138,
  asphaltLine: 0xd8d3c0,
  sidewalk: 0x8d8578,
  buildingGlass: 0x9fc4d8,
  grass: 0x4d8a4a,
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
export const MISSION_REWARDS = [500, 800, 1000, 1200, 2500];

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
