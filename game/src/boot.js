// Boot: builds the world, wires every system together and runs the loop.
// The game lives in one of five modes — title, play, pause, busted, knocked
// — and this file is the only place that switches between them.
import { createState } from './state.js';
import { buildCity, randomRoadPoint, districtAt } from './city.js';
import { makeRng } from './rng.js';
import { SoundBank } from './sfx.js';
import { Input } from './keys.js';
import { updateWalker, updateBullets, tryEnterCar, exitCar } from './walker.js';
import { updateCars, spawnTraffic, spawnParked, makeCar, spawnPoliceCar } from './driver.js';
import { updateWanted, triggerKnocked } from './wanted.js';
import { startMission, updateMission, updateFoes, advanceDialogue, MISSIONS } from './jobs.js';
import { updatePickups, updateFares, buyAmmo, repaint } from './economy.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { render } from './paint.js';
import { installDebug, markReady } from './stage.js';
import { PLACES, TAXI_COLOR, WORLD_W, WORLD_H } from './tune.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 7) || 7;

const G = createState();
G.rng = makeRng(seed ^ 0x51ab);
G.city = buildCity(seed);
G.view = { w: window.innerWidth, h: window.innerHeight };
G.mouseX = 0;
G.mouseY = 0;
G.toast = null;
G.currentDistrict = null;
G.hasSaveFlag = hasSave();
const sfx = new SoundBank();
const input = new Input(canvas);

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  G.view.w = canvas.width;
  G.view.h = canvas.height;
}
window.addEventListener('resize', resize);
resize();

function spawnPeds(n) {
  for (let i = 0; i < n; i += 1) {
    const pt = randomRoadPoint(G.rng);
    G.peds.push({
      x: pt.x,
      y: pt.y,
      angle: G.rng.range(0, Math.PI * 2),
      speed: 45 + G.rng.range(0, 25),
      color: ['#7a6a8a', '#8a5a3a', '#3a6a8a', '#6a8a3a', '#a05a7a'][G.rng.int(0, 4)],
      state: 'walk',
      t: 0,
    });
  }
}

function spawnTaxi() {
  // Parked facing north, toward the first fare, so the opening drive is a
  // straight road instead of a U-turn out of the stand.
  const taxi = makeCar('taxi', PLACES.taxiStand.x, PLACES.taxiStand.y, -Math.PI / 2, TAXI_COLOR);
  taxi.missionTaxi = true;
  G.cars.push(taxi);
}

function populate() {
  spawnTraffic(G, 14);
  spawnParked(G, 8);
  spawnPeds(26);
  spawnTaxi();
}

populate();

installDebug(G, {
  startMission: (i) => startMission(G, i, sfx),
  setWanted: (n) => {
    G.wanted = Math.max(0, Math.min(5, n));
    G.wantedQuiet = 0;
  },
  teleport: (x, y) => {
    const p = G.player;
    if (p.car) {
      p.car.x = x;
      p.car.y = y;
      p.car.speed = 0;
    }
    p.x = x;
    p.y = y;
    G.camera.x = x;
    G.camera.y = y;
  },
  givePistol: () => {
    G.hasPistol = true;
    G.ammo = G.magSize;
    G.reserve = 96;
  },
  spawnPolice: (n) => {
    for (let i = 0; i < n; i += 1) spawnPoliceCar(G);
  },
});

function titleItems() {
  const items = ['New Game'];
  if (G.hasSaveFlag) items.push('Continue');
  items.push('How to play');
  return items;
}

// Fresh state, keeping the city, the rng and the viewport.
function freshRun() {
  const keepCity = G.city;
  const keepRng = G.rng;
  const keepView = G.view;
  const fresh = createState();
  for (const k of Object.keys(fresh)) G[k] = fresh[k];
  G.city = keepCity;
  G.rng = keepRng;
  G.view = keepView;
  G.mouseX = input.mouse.x;
  G.mouseY = input.mouse.y;
  G.toast = null;
  G.currentDistrict = null;
  G.hasSaveFlag = hasSave();
  G.helpOpen = false;
  populate();
}

function startNewGame() {
  freshRun();
  G.mode = 'play';
  G.toast = { text: 'Old Souq', t: 2.5 };
  G.currentDistrict = 'Old Souq';
  sfx.ensure();
  sfx.click();
}

function startContinue() {
  const d = loadGame();
  if (!d) {
    startNewGame();
    return;
  }
  freshRun();
  G.money = d.money;
  G.earned = d.earned;
  G.health = d.health;
  G.ammo = d.ammo;
  G.reserve = d.reserve;
  G.hasPistol = d.hasPistol;
  G.missionsDone = d.missionsDone || [];
  G.nextMission = d.nextMission || 0;
  G.player.x = d.x;
  G.player.y = d.y;
  G.time = d.time || 0;
  G.camera.x = d.x;
  G.camera.y = d.y;
  G.mode = 'play';
  sfx.ensure();
  sfx.click();
}

function near(x, y, r) {
  return Math.hypot(G.player.x - x, G.player.y - y) < r;
}

function computePrompt() {
  const p = G.player;
  if (G.dialogue) return '';
  if (!p.onFoot) {
    if (near(PLACES.garage.x, PLACES.garage.y, 90)) {
      return G.wanted > 0 ? 'Press E — Repaint $200 (clear wanted)' : 'Press E — Step out';
    }
    return 'Press E — Step out of the car';
  }
  if (G.activeMission) {
    const step = G.activeMission.def.steps[G.activeMission.step];
    if (step && step.kind === 'enter') {
      for (const c of G.cars) {
        if (c.gone || c.kind === 'police') continue;
        if (Math.hypot(c.x - p.x, c.y - p.y) < 74) return 'Press E — Get in the car';
      }
    }
    return '';
  }
  if (G.nextMission < MISSIONS.length) {
    const m = MISSIONS[G.nextMission];
    if (near(m.start.x, m.start.y, 80)) return `Press E — Start: ${m.name}`;
  }
  if (near(PLACES.ammoShop.x, PLACES.ammoShop.y, 80)) return 'Press E — Ammo $40 (12 bullets)';
  if (near(PLACES.garage.x, PLACES.garage.y, 80)) return 'Drive your car in to repaint ($200)';
  for (const c of G.cars) {
    if (c.gone || c.kind === 'police') continue;
    if (Math.hypot(c.x - p.x, c.y - p.y) < 74) return 'Press E — Get in the car';
  }
  return '';
}

function tryInteract() {
  const p = G.player;
  if (!p.onFoot) {
    if (near(PLACES.garage.x, PLACES.garage.y, 90) && G.wanted > 0) {
      const msg = repaint(G, sfx);
      G.banner = { text: msg, sub: '', t: 1.6 };
      return;
    }
    exitCar(G);
    sfx.click();
    return;
  }
  if (!G.activeMission && G.nextMission < MISSIONS.length) {
    const m = MISSIONS[G.nextMission];
    if (near(m.start.x, m.start.y, 80)) {
      startMission(G, G.nextMission, sfx);
      return;
    }
  }
  if (near(PLACES.ammoShop.x, PLACES.ammoShop.y, 80)) {
    const msg = buyAmmo(G, sfx);
    G.banner = { text: msg, sub: '', t: 1.6 };
    return;
  }
  const note = tryEnterCar(G, sfx);
  if (note) {
    G.banner = { text: note, sub: '', t: 1.6 };
  } else {
    sfx.click();
  }
}

function updateCamera(dt) {
  const p = G.player;
  const tx = p.x;
  const ty = p.y;
  G.camera.x += (tx - G.camera.x) * Math.min(1, dt * 5);
  G.camera.y += (ty - G.camera.y) * Math.min(1, dt * 5);
  const hw = G.view.w / 2;
  const hh = G.view.h / 2;
  G.camera.x = Math.max(Math.min(hw, WORLD_W - hw), Math.min(G.camera.x, Math.max(hw, WORLD_W - hw)));
  G.camera.y = Math.max(Math.min(hh, WORLD_H - hh), Math.min(G.camera.y, Math.max(hh, WORLD_H - hh)));
  if (G.view.w >= WORLD_W) G.camera.x = WORLD_W / 2;
  if (G.view.h >= WORLD_H) G.camera.y = WORLD_H / 2;
}

function update(dt) {
  G.time += dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 22);
  if (G.banner) {
    G.banner.t -= dt;
    if (G.banner.t <= 0) G.banner = null;
  }
  if (G.toast) {
    G.toast.t -= dt;
    if (G.toast.t <= 0) G.toast = null;
  }
  for (let i = G.floats.length - 1; i >= 0; i -= 1) {
    const f = G.floats[i];
    f.life -= dt;
    f.y -= 22 * dt;
    if (f.life <= 0) G.floats.splice(i, 1);
  }
  for (let i = G.parts.length - 1; i >= 0; i -= 1) {
    const pt = G.parts[i];
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 1 - 2 * dt;
    pt.vy *= 1 - 2 * dt;
    if (pt.life <= 0) G.parts.splice(i, 1);
  }
  G.mouseX = input.mouse.x;
  G.mouseY = input.mouse.y;

  if (G.mode === 'title') {
    const items = titleItems();
    if (input.pressed('KeyW') || input.pressed('ArrowUp')) {
      G.titleChoice = (G.titleChoice + items.length - 1) % items.length;
      sfx.click();
    }
    if (input.pressed('KeyS') || input.pressed('ArrowDown')) {
      G.titleChoice = (G.titleChoice + 1) % items.length;
      sfx.click();
    }
    if (input.pressed('Enter')) {
      const choice = items[G.titleChoice];
      if (choice === 'Continue') startContinue();
      else if (choice === 'How to play') {
        G.dialogue = {
          name: 'How to play',
          lines: [
            ['Controls', 'WASD or arrows to walk and drive. E gets in and out of cars, starts missions and buys things. Mouse aims, click shoots, F punches, R reloads.'],
            ['The city', 'Six districts, traffic, pedestrians, shops and the police. Steal a car and the heat rises — lose it at Qamar Customs, or lie low. Missions pay $150 to $800.'],
          ],
          i: 0,
        };
        G.mode = 'play';
        // The help text shows over a frozen street; Enter closes it.
        G.helpOpen = true;
      } else {
        startNewGame();
      }
    }
    return;
  }

  if (G.mode === 'pause') {
    if (input.pressed('KeyP') || input.pressed('Escape')) {
      G.mode = 'play';
      sfx.click();
    }
    if (input.pressed('KeyQ')) {
      saveGame(G);
      G.hasSaveFlag = hasSave();
      G.mode = 'title';
      G.dialogue = null;
      sfx.click();
    }
    return;
  }

  if (G.mode === 'busted' || G.mode === 'knocked') {
    if (input.pressed('Enter')) {
      G.mode = 'play';
      sfx.click();
    }
    return;
  }

  // Mode 'play'.
  if (G.helpOpen) {
    if (input.pressed('Enter')) {
      G.helpOpen = false;
      G.dialogue = null;
      G.mode = 'title';
    }
    return;
  }
  if (G.dialogue) {
    if (input.pressed('Enter') || input.mouse.clicked) advanceDialogue(G);
    return;
  }
  if (input.pressed('KeyP') || input.pressed('Escape')) {
    G.mode = 'pause';
    sfx.click();
    return;
  }
  if (input.pressed('KeyM')) {
    G.muted = !G.muted;
    sfx.setMuted(G.muted);
  }
  if (input.pressed('KeyE')) tryInteract();

  updateWalker(G, dt, input, sfx);
  updateCars(G, dt, input, sfx);
  updateBullets(G, dt, sfx);
  updateFoes(G, dt, sfx);
  updateMission(G, dt, sfx);
  updateWanted(G, dt, sfx);
  updatePickups(G, dt, sfx);
  updateFares(G, dt, sfx);
  updateCamera(dt);
  G.prompt = computePrompt();

  const d = districtAt(G.player.x, G.player.y);
  if (G.currentDistrict !== d.name) {
    G.currentDistrict = d.name;
    G.toast = { text: d.name, t: 2.5 };
  }
  if (G.health <= 0) triggerKnocked(G, sfx);
}

let last = performance.now();
let firstFrame = true;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (input.gesture) sfx.ensure();
  update(dt);
  render(G, ctx);
  input.endFrame();
  if (firstFrame) {
    firstFrame = false;
    markReady();
  }
}
requestAnimationFrame(frame);
