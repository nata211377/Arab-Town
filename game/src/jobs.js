// Six story missions with dialogue, objectives and rewards, plus the rivals
// who fight the player in the shootouts. A mission is data (steps) plus a
// small engine: start it at its marker, follow the steps, finish or fail it.
import { PLACES } from './tune.js';
import { makeCar } from './driver.js';
import { addWanted } from './wanted.js';
import { resolveCircle } from './city.js';
import { addFloat, addParts } from './state.js';
import { saveGame } from './save.js';

export const MISSIONS = [
  {
    id: 'm1',
    name: 'Homecoming',
    giver: 'Rashid',
    reward: 150,
    start: { x: PLACES.taxiStand.x, y: PLACES.taxiStand.y },
    intro: [
      ['Rashid', 'Cousin! You made it back to Qamar City. The old yellow cab is yours now.'],
      ['Rashid', 'A fare is waiting at the Marina corner. Pick them up, then drop them at Palm Heights. Drive careful — the police here love a reason.'],
    ],
    steps: [
      { kind: 'enter', car: 'taxi', label: 'Get in the yellow taxi' },
      { kind: 'goto', x: 1120, y: 480, label: 'Pick up the fare' },
      { kind: 'goto', x: 2080, y: 560, label: 'Drop the fare at Palm Heights' },
    ],
  },
  {
    id: 'm2',
    name: 'Hot Wheels',
    giver: 'Layla',
    reward: 300,
    start: { x: PLACES.clinic.x, y: PLACES.clinic.y },
    intro: [
      ['Layla', 'The Sand Vipers tipped off the police about you. Three stars, and they are coming.'],
      ['Layla', 'Stay out of their hands for forty seconds, then slip back here to the clinic. Do not get caught.'],
    ],
    steps: [
      { kind: 'survive', t: 40, label: 'Stay free for 40 seconds' },
      { kind: 'goto', x: PLACES.clinic.x, y: PLACES.clinic.y, label: 'Reach the safehouse' },
    ],
  },
  {
    id: 'm3',
    name: 'Special Delivery',
    giver: 'Omar',
    reward: 350,
    start: { x: PLACES.ammoShop.x, y: PLACES.ammoShop.y },
    intro: [
      ['Omar', 'A package is waiting in the Date Gardens. It has to reach the Port docks in seventy-five seconds.'],
      ['Omar', 'No questions, no stops. If the timer runs out, the deal is dead.'],
    ],
    steps: [
      { kind: 'goto', x: 320, y: 1440, label: 'Collect the package' },
      { kind: 'timed', x: 1120, y: 1600, t: 75, label: 'Deliver to the Port docks' },
    ],
  },
  {
    id: 'm4',
    name: 'Dockside Trouble',
    giver: 'Layla',
    reward: 500,
    start: { x: PLACES.docks.x, y: PLACES.docks.y },
    intro: [
      ['Layla', 'The Sand Vipers are shaking down the dock workers again. Five of them, by the containers.'],
      ['Layla', 'Take them down. Watch your ammo — and watch the cranes, they like to flank.'],
    ],
    steps: [
      { kind: 'kill', x: 1120, y: 1500, count: 5, label: 'Clear the docks' },
    ],
  },
  {
    id: 'm5',
    name: 'Borrowed Wheels',
    giver: 'Omar',
    reward: 450,
    start: { x: PLACES.garage.x, y: PLACES.garage.y },
    intro: [
      ['Omar', 'A yellow sports car is parked up in Palm Heights. Its owner is... away.'],
      ['Omar', 'Bring it to Qamar Customs. Try not to scratch it. The police will notice, so be quick.'],
    ],
    steps: [
      { kind: 'goto', x: 2080, y: 480, label: 'Find the yellow sports car' },
      { kind: 'enter', car: 'sport', label: 'Take the sports car' },
      { kind: 'deliver', x: PLACES.garage.x, y: PLACES.garage.y, label: 'Bring it to Qamar Customs' },
    ],
  },
  {
    id: 'm6',
    name: "Viper's Nest",
    giver: 'Rashid',
    reward: 800,
    start: { x: PLACES.hideout.x, y: PLACES.hideout.y },
    intro: [
      ['Rashid', "This is it. Khalid and his Vipers are holed up in the old warehouse. Eight of them, plus Khalid himself."],
      ['Rashid', 'Finish this, then get back to the clinic. Qamar City will be yours again.'],
    ],
    steps: [
      { kind: 'kill', x: 1440, y: 1560, count: 8, boss: true, label: 'Storm the hideout' },
      { kind: 'goto', x: PLACES.clinic.x, y: PLACES.clinic.y, label: 'Get back to the safehouse' },
    ],
  },
];

export function foesAlive(G) {
  let n = 0;
  for (const f of G.foes) if (f.health > 0) n += 1;
  return n;
}

// Where the current objective points, or where the next mission starts.
export function missionMarker(G) {
  if (G.activeMission) {
    const step = G.activeMission.def.steps[G.activeMission.step];
    if (!step) return null;
    if (step.kind === 'goto' || step.kind === 'timed' || step.kind === 'kill') {
      let label = step.label;
      if (step.kind === 'kill' && G.activeMission.progress) {
        const pr = G.activeMission.progress;
        label = `${step.label} (${pr.done}/${pr.total})`;
      }
      return { x: step.x, y: step.y, label, mission: true };
    }
    if (step.kind === 'deliver') {
      return { x: step.x, y: step.y, label: step.label, mission: true };
    }
    if (step.kind === 'enter') {
      if (step.car === 'sport' && G.activeMission.targetCar) {
        return { x: G.activeMission.targetCar.x, y: G.activeMission.targetCar.y, label: step.label, mission: true };
      }
      return { x: PLACES.taxiStand.x, y: PLACES.taxiStand.y, label: step.label, mission: true };
    }
    return { x: G.player.x, y: G.player.y, label: step.label, mission: true };
  }
  if (G.nextMission < MISSIONS.length) {
    const m = MISSIONS[G.nextMission];
    return { x: m.start.x, y: m.start.y, label: `${m.name} — ${m.giver}`, mission: true };
  }
  return null;
}

export function startMission(G, i, sfx) {
  if (i < 0 || i >= MISSIONS.length) return false;
  if (G.activeMission) return false;
  const def = MISSIONS[i];
  G.activeMission = { def, step: 0, t: 0, spawned: false, targetCar: null };
  if (def.id === 'm5') {
    const car = makeCar('sport', 2080, 480, Math.PI / 2, '#d8c21a');
    car.sport = true;
    G.cars.push(car);
    G.activeMission.targetCar = car;
  }
  G.dialogue = { name: def.giver, lines: def.intro, i: 0 };
  if (sfx) sfx.click();
  startStep(G, sfx);
  return true;
}

function startStep(G, sfx) {
  const m = G.activeMission;
  const step = m.def.steps[m.step];
  m.spawned = false;
  if (step.kind === 'survive') {
    m.t = step.t;
    addWanted(G, 3);
  } else if (step.kind === 'timed') {
    m.t = step.t;
  } else if (step.kind === 'kill') {
    spawnFoes(G, step.x, step.y, step.count, !!step.boss);
    m.spawned = true;
  }
}

function spawnFoes(G, x, y, count, boss) {
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2 + G.rng.range(-0.4, 0.4);
    const r = 90 + G.rng.range(0, 120);
    const fx = x + Math.cos(a) * r;
    const fy = y + Math.sin(a) * r;
    const foe = {
      x: fx,
      y: fy,
      angle: 0,
      health: 60,
      kind: 'viper',
      speed: 120,
      shootCd: G.rng.range(0.6, 1.6),
      radius: 14,
    };
    resolveCircle(G.city, foe, 16);
    G.foes.push(foe);
  }
  if (boss) {
    const foe = {
      x: x + 40,
      y: y - 60,
      angle: 0,
      health: 240,
      kind: 'boss',
      speed: 135,
      shootCd: 1,
      radius: 18,
    };
    resolveCircle(G.city, foe, 20);
    G.foes.push(foe);
  }
}

export function updateMission(G, dt, sfx) {
  const m = G.activeMission;
  if (!m) return;
  if (G.dialogue) return;
  const step = m.def.steps[m.step];
  if (!step) return;
  const p = G.player;
  let done = false;
  if (step.kind === 'enter') {
    if (!p.onFoot) {
      if (step.car === 'taxi' && p.car && p.car.missionTaxi) done = true;
      else if (step.car === 'sport' && p.car && p.car.sport) done = true;
      else if (!step.car) done = true;
    }
  } else if (step.kind === 'goto') {
    if (Math.hypot(p.x - step.x, p.y - step.y) < 70) done = true;
  } else if (step.kind === 'timed') {
    m.t -= dt;
    if (Math.hypot(p.x - step.x, p.y - step.y) < 70) done = true;
    else if (m.t <= 0) {
      failMission(G, sfx, 'Too slow — the deal is dead.');
      return;
    }
  } else if (step.kind === 'deliver') {
    if (!p.onFoot && p.car && p.car.sport && Math.hypot(p.car.x - step.x, p.car.y - step.y) < 90) {
      done = true;
    }
  } else if (step.kind === 'kill') {
    const left = foesAlive(G);
    m.progress = { done: step.count - left, total: step.count };
    if (left <= 0) done = true;
  } else if (step.kind === 'survive') {
    m.t -= dt;
    if (m.t <= 0) done = true;
  }
  if (!done) return;
  m.step += 1;
  if (m.step >= m.def.steps.length) {
    completeMission(G, sfx);
    return;
  }
  sfx.pickup();
  startStep(G, sfx);
}

function completeMission(G, sfx) {
  const m = G.activeMission;
  G.money += m.def.reward;
  G.earned += m.def.reward;
  G.missionsDone.push(m.def.id);
  G.nextMission = Math.max(G.nextMission, MISSIONS.indexOf(m.def) + 1);
  G.activeMission = null;
  G.banner = { text: 'MISSION COMPLETE', sub: `${m.def.name}  +$${m.def.reward}`, t: 3 };
  addFloat(G, G.player.x, G.player.y - 30, `+$${m.def.reward}`, '#7de07d');
  sfx.missionOk();
  saveGame(G);
}

function failMission(G, sfx, why) {
  G.activeMission = null;
  G.banner = { text: 'MISSION FAILED', sub: why, t: 3 };
  if (sfx) sfx.busted();
}

// Rivals: walk at the player, keep some distance, and shoot with bad aim.
export function updateFoes(G, dt, sfx) {
  const p = G.player;
  for (const f of G.foes) {
    if (f.health <= 0) continue;
    const dx = p.x - f.x;
    const dy = p.y - f.y;
    const d = Math.hypot(dx, dy);
    if (d < 520) {
      f.angle = Math.atan2(dy, dx);
      if (d > 240) {
        f.x += Math.cos(f.angle) * f.speed * dt;
        f.y += Math.sin(f.angle) * f.speed * dt;
      } else if (d < 140) {
        f.x -= Math.cos(f.angle) * f.speed * 0.6 * dt;
        f.y -= Math.sin(f.angle) * f.speed * 0.6 * dt;
      }
      f.shootCd -= dt;
      if (f.shootCd <= 0 && d < 420) {
        f.shootCd = f.kind === 'boss' ? 0.9 : 1.4 + G.rng.range(0, 0.6);
        const a = f.angle + (G.rng.next() - 0.5) * 0.35;
        G.bullets.push({
          x: f.x + Math.cos(a) * 20,
          y: f.y + Math.sin(a) * 20,
          vx: Math.cos(a) * 380,
          vy: Math.sin(a) * 380,
          life: 1.1,
          dmg: f.kind === 'boss' ? 12 : 8,
          from: 'foe',
        });
        sfx.shot();
      }
    }
    resolveCircle(G.city, f, f.radius);
  }
  G.foes = G.foes.filter((f) => f.health > 0);
}

export function advanceDialogue(G) {
  if (!G.dialogue) return false;
  G.dialogue.i += 1;
  if (G.dialogue.i >= G.dialogue.lines.length) {
    G.dialogue = null;
    return true;
  }
  return false;
}
