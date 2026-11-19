// Static tuning for Arab Town: world size, roads, districts, places and prices.
// Nothing here is read from anywhere else; the city builder and the game logic
// both read these numbers so the world stays consistent.
export const WORLD_W = 2560;
export const WORLD_H = 1920;
export const ROAD_W = 64;
export const ROADS_X = [160, 480, 800, 1120, 1440, 1760, 2080, 2400];
export const ROADS_Y = [160, 480, 800, 1120, 1440, 1760];

export const SAVE_KEY = 'arabtown.save.v1';

export const DISTRICTS = [
  { name: 'Old Souq', x: 0, y: 0, w: 853, h: 960, ground: '#d9b380', accent: '#a34a24' },
  { name: 'Marina', x: 853, y: 0, w: 854, h: 960, ground: '#e2c69b', accent: '#2d6a8a' },
  { name: 'Palm Heights', x: 1707, y: 0, w: 853, h: 960, ground: '#e6cd9e', accent: '#7a8c2f' },
  { name: 'Date Gardens', x: 0, y: 960, w: 853, h: 960, ground: '#d2ab6e', accent: '#4d7a3a' },
  { name: 'Port', x: 853, y: 960, w: 854, h: 960, ground: '#c8a173', accent: '#5a5a66' },
  { name: 'Al-Bahr', x: 1707, y: 960, w: 853, h: 960, ground: '#dfc79d', accent: '#2d7a8a' },
];

// Fixed places. Every one sits on a road centre so the player can always reach it.
export const PLACES = {
  spawn: { x: 480, y: 800, label: 'Home' },
  clinic: { x: 480, y: 200, label: 'Clinic & Safehouse' },
  ammoShop: { x: 1120, y: 800, label: 'Ammo Souq' },
  garage: { x: 1440, y: 1120, label: 'Qamar Customs' },
  taxiStand: { x: 480, y: 860, label: 'Taxi Stand' },
  docks: { x: 1120, y: 1500, label: 'Port Docks' },
  hideout: { x: 1440, y: 1560, label: 'Viper Hideout' },
  marinaFare: { x: 1440, y: 300, label: 'Marina Promenade' },
  heightsFare: { x: 2080, y: 560, label: 'Palm Heights' },
  gardensFare: { x: 320, y: 1440, label: 'Date Gardens' },
  portFare: { x: 1120, y: 1700, label: 'Port Gate' },
};

export const PRICES = {
  ammo: 40,
  ammoBullets: 12,
  repaint: 200,
  bustedFine: 100,
  knockedFine: 50,
  fareMin: 25,
  fareMax: 60,
};

export const CAR_COLORS = ['#c23b2e', '#2e6fc2', '#d8d3c8', '#3a3f4a', '#c28a2e', '#6a4a8a', '#2e8a6a'];
export const TAXI_COLOR = '#e8b820';
export const POLICE_COLOR = '#e8e8ec';
export const SPORT_COLOR = '#d8c21a';

export const SPEEDS = {
  walk: 175,
  carTop: 430,
  carAccel: 320,
  traffic: 120,
  police: 400,
  ped: 55,
  foe: 120,
  boss: 135,
};
