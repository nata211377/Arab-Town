// The whole game state in one object, built fresh for a new game.
// Every system reads and writes this object; no module keeps its own copy
// of anything that matters, so saving is one JSON dump of a few fields.
import { PLACES } from './tune.js';

export function createState() {
  return {
    time: 0,
    // title | play | pause | busted | knocked
    mode: 'title',
    money: 200,
    earned: 0,
    health: 100,
    maxHealth: 100,
    wanted: 0,
    wantedQuiet: 0,
    ammo: 12,
    magSize: 12,
    reserve: 48,
    hasPistol: true,
    missionsDone: [],
    nextMission: 0,
    activeMission: null,
    player: {
      x: PLACES.spawn.x,
      y: PLACES.spawn.y,
      angle: -Math.PI / 2,
      radius: 14,
      onFoot: true,
      car: null,
      speed: 0,
      aimX: 0,
      aimY: 0,
      fireCd: 0,
      punchCd: 0,
      reloadT: 0,
      invuln: 0,
    },
    cars: [],
    peds: [],
    foes: [],
    bullets: [],
    pickups: [],
    parts: [],
    floats: [],
    camera: { x: PLACES.spawn.x, y: PLACES.spawn.y },
    city: null,
    dialogue: null,
    banner: null,
    prompt: '',
    shake: 0,
    muted: false,
    fare: null,
    fareTimer: 0,
    stats: { shots: 0, hits: 0, stolen: 0, fares: 0, kills: 0 },
    pickupTimer: 0,
    policeTimer: 0,
    titleChoice: 0,
  };
}

// Put the player back at the clinic after BUSTED or KNOCKED OUT.
export function respawnAtClinic(G) {
  const p = G.player;
  if (p.car) {
    p.car.driver = null;
    p.car = null;
  }
  p.onFoot = true;
  p.x = PLACES.clinic.x;
  p.y = PLACES.clinic.y + 40;
  p.angle = Math.PI / 2;
  p.health = 0;
  G.health = G.maxHealth;
  G.wanted = 0;
  G.wantedQuiet = 0;
  G.foes = [];
  G.bullets = [];
  G.activeMission = null;
  G.dialogue = null;
  G.fare = null;
  for (const c of G.cars) {
    if (c.kind === 'police') c.gone = true;
  }
  G.camera.x = p.x;
  G.camera.y = p.y;
}

export function addFloat(G, x, y, text, color) {
  G.floats.push({ x, y, text, color: color || '#ffffff', life: 1.4, max: 1.4 });
}

export function addParts(G, x, y, n, color, speed) {
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = (speed || 120) * (0.4 + Math.random() * 0.8);
    G.parts.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.5 + Math.random() * 0.5,
      max: 1,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}
