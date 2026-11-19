// Arab Town — every number that tunes the game lives here, in one place.
// The world is a fixed 2560 x 1920 city. The camera shows a 1280 x 720 window
// of it, scaled to fit the screen, so no value below depends on the display.

/** The city is this many world units across and down. */
export const WORLD = { width: 2560, height: 1920 };

/** One simulation step, in seconds: the world ticks 60 times a second. */
export const STEP = 1 / 60;

/** The camera's logical window, in world units. */
export const VIEW = { width: 1280, height: 720 };

/** The sea starts here on the west edge; nothing walks or drives in it. */
export const SEA_X = 170;

/** The desert dunes start here on the south edge. */
export const DESERT_Y = 1780;

/** Centrelines of the two-way roads that cross the city. */
export const ROADS_X = [320, 640, 960, 1280, 1600, 1920, 2240];
export const ROADS_Y = [240, 560, 880, 1200, 1520, 1760];
/** How wide a road is, and how far a lane sits from its centreline. */
export const ROAD_WIDTH = 88;
export const LANE = 22;

/** Qamar City: an original sun-soaked desert-coast Arab city. */
export const CITY = {
  name: 'Qamar City',
  districts: [
    { name: 'Old Souq', x: 320, y: 560, w: 640, h: 640 },
    { name: 'The Marina', x: 170, y: 240, w: 470, h: 320 },
    { name: 'Palm Heights', x: 1280, y: 240, w: 960, h: 320 },
    { name: 'Date Gardens', x: 1280, y: 1200, w: 960, h: 560 },
    { name: 'The Port', x: 170, y: 1200, w: 800, h: 560 },
    { name: 'Al-Bahr', x: 960, y: 880, w: 640, h: 320 },
  ],
  streets: [
    'Corniche Road', 'Souq Street', 'Palm Avenue', 'Date Palm Boulevard',
    'Harbor Road', 'Saffron Lane', 'Marina Drive', 'Old Town Road',
    'Fig Tree Street', 'Spice Market Lane', 'Pearl Crescent', 'Oasis Road',
  ],
};

/** Rashid's garage, where the player starts: on Souq Street. */
export const GARAGE = { x: 520, y: 700 };

/** The safehouse the player sleeps at, a small house in Palm Heights. */
export const SAFEHOUSE = { x: 2140, y: 420 };

/** The repaint garage: a new colour clears the wanted level, for a fee. */
export const REPAINT = { x: 1500, y: 1060 };

/** Layla's workshop: bullets and repairs are sold here. */
export const WORKSHOP = { x: 860, y: 1060 };

export const PLAYER = {
  radius: 14,
  walkSpeed: 250,
  runSpeed: 340,
  health: 100,
  punchDamage: 12,
  punchRange: 34,
  punchCooldown: 0.38,
};

export const PISTOL = {
  damage: 34,
  range: 460,
  cooldown: 0.22,
  bulletSpeed: 900,
  magSize: 12,
  reloadTime: 1.1,
  ammoPrice: 30,
  startAmmo: 24,
};

export const CAR = {
  length: 64,
  width: 32,
  accel: 420,
  brake: 900,
  reverseAccel: 260,
  maxSpeed: 560,
  maxReverse: 180,
  steer: 3.0,
  drag: 0.55,
  grip: 6.5,
  handbrake: 3.2,
  colors: ['#c0392b', '#2980b9', '#f39c12', '#27ae60', '#8e44ad', '#ecf0f1', '#2c3e50', '#e67e22', '#16a085', '#d4a017'],
  taxiColor: '#f1c40f',
  policeColor: '#eef2f5',
  models: ['Sedan', 'Hatchback', 'Pickup', 'Coupe', 'Van', 'Sports'],
};

export const TRAFFIC = {
  maxCars: 14,
  maxPeds: 26,
  carSpeed: 150,
  carSpeedJitter: 60,
  pedSpeed: 55,
  pedSpeedJitter: 25,
};

export const WANTED = {
  max: 5,
  decaySeconds: 26,
  stealCar: 1,
  hitPed: 1,
  shootNearPolice: 1,
  killPed: 1,
  killPolice: 2,
  /** Police cars and officers on foot at each wanted level. */
  policeCars: [0, 1, 2, 3, 3, 4],
  policeFoot: [0, 0, 1, 2, 3, 4],
  policeCarSpeed: 520,
  policeFootSpeed: 285,
  catchRadius: 26,
  /** Dollars the police take when they catch the player. */
  bustFine: 120,
};

export const MONEY = {
  start: 150,
  repaintFee: 50,
  repairFee: 40,
  taxiFare: 35,
  cashPickup: 25,
};

export const PALETTE = {
  sand: '#e8d5a4',
  sandDark: '#dcc288',
  grass: '#7fae5a',
  road: '#3d3a38',
  roadEdge: '#57514d',
  lane: '#e8e0c8',
  sidewalk: '#cbb98d',
  building: ['#f5e6c8', '#e8d3a7', '#d9a066', '#c97e4e', '#f0e0b8', '#b7d3c4', '#e0b48f', '#8fb8a8'],
  roof: ['#b5673a', '#7d8a6a', '#a8573c', '#5f7d6b', '#c98a4b'],
  sea: '#2f7fa8',
  seaDeep: '#256b92',
  seaFoam: '#bfe3ee',
  desert: '#e3c98f',
  palm: '#3f7d44',
  palmTrunk: '#8a6b48',
  player: '#e74c3c',
  playerCar: '#e74c3c',
  police: '#eef2f5',
  policeLight: ['#ff2d2d', '#2d6bff'],
  rival: '#7a3b8f',
  taxi: '#f1c40f',
  text: '#f7f2e4',
  muted: '#c9bfa5',
  panel: '#241f1acc',
  panelSolid: '#241f1a',
  gold: '#f2c94c',
  health: '#58c96b',
  healthLow: '#e5534b',
  wanted: '#ffcf3d',
  marker: '#ffcf3d',
  objective: '#ffe9a8',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** localStorage keys for progress and best money (this browser only). */
export const SAVE_KEY = 'arab-town.save.v1';
export const BEST_KEY = 'arab-town.best.v1';
