// Everything that moves on the streets: the player's car, traffic, police
// cars and pedestrians, plus car-to-car and car-to-building collisions.
// Traffic follows the road grid by steering between road points; police
// steer straight at the player and ram.
import { resolveCircle, nearestRoadPoint, randomRoadPoint } from './city.js';
import {
  SPEEDS, CAR_COLORS, TAXI_COLOR, POLICE_COLOR, WORLD_W, WORLD_H, ROADS_X, ROADS_Y,
} from './tune.js';
import { addParts } from './state.js';

let carSeq = 1;

export function makeCar(kind, x, y, angle, color) {
  return {
    id: carSeq,
    kind,
    x,
    y,
    angle,
    speed: 0,
    color: color || CAR_COLORS[carSeq % CAR_COLORS.length],
    w: 46,
    h: 22,
    health: 100,
    driver: null,
    stolenByPlayer: false,
    missionTaxi: false,
    target: null,
    cruise: 100 + Math.random() * 45,
    stuck: 0,
    lastD: 1e9,
    siren: 0,
    gone: false,
  };
}

export function spawnTraffic(G, n) {
  for (let i = 0; i < n; i += 1) {
    const pt = randomRoadPoint(G.rng);
    const c = makeCar('sedan', pt.x, pt.y, Math.random() * Math.PI * 2);
    c.driver = 'traffic';
    c.target = nextTrafficTarget(G, c);
    G.cars.push(c);
  }
}

export function spawnParked(G, n) {
  for (let i = 0; i < n; i += 1) {
    const pt = randomRoadPoint(G.rng);
    const c = makeCar('sedan', pt.x + 40, pt.y, 0);
    c.driver = null;
    c.angle = Math.random() < 0.5 ? 0 : Math.PI;
    G.cars.push(c);
  }
}

export function spawnPoliceCar(G) {
  const p = G.player;
  for (let tries = 0; tries < 12; tries += 1) {
    const pt = randomRoadPoint(G.rng);
    const d = Math.hypot(pt.x - p.x, pt.y - p.y);
    if (d > 420 && d < 780) {
      const c = makeCar('police', pt.x, pt.y, Math.atan2(p.y - pt.y, p.x - pt.x), POLICE_COLOR);
      c.driver = 'police';
      G.cars.push(c);
      return c;
    }
  }
  const pt = nearestRoadPoint(p.x + 500, p.y);
  const c = makeCar('police', pt.x, pt.y, Math.atan2(p.y - pt.y, p.x - pt.x), POLICE_COLOR);
  c.driver = 'police';
  G.cars.push(c);
  return c;
}

function nextTrafficTarget(G, car) {
  const rng = G.rng;
  let vx = ROADS_X[0];
  let best = Infinity;
  for (const rx of ROADS_X) {
    const d = Math.abs(car.x - rx);
    if (d < best) {
      best = d;
      vx = rx;
    }
  }
  let hy = ROADS_Y[0];
  best = Infinity;
  for (const ry of ROADS_Y) {
    const d = Math.abs(car.y - ry);
    if (d < best) {
      best = d;
      hy = ry;
    }
  }
  const onV = Math.abs(car.x - vx) < 26;
  const onH = Math.abs(car.y - hy) < 26;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  if (onV && (!onH || rng.chance(0.5))) {
    if (rng.chance(0.35)) {
      return { x: clamp(car.x + rng.pick([-1, 1]) * rng.range(200, 420), 60, WORLD_W - 60), y: hy };
    }
    return { x: vx, y: clamp(car.y + rng.pick([-1, 1]) * rng.range(200, 420), 60, WORLD_H - 60) };
  }
  if (onH) {
    if (rng.chance(0.35)) {
      return { x: vx, y: clamp(car.y + rng.pick([-1, 1]) * rng.range(200, 420), 60, WORLD_H - 60) };
    }
    return { x: clamp(car.x + rng.pick([-1, 1]) * rng.range(200, 420), 60, WORLD_W - 60), y: hy };
  }
  return nearestRoadPoint(car.x, car.y);
}

function steerToward(car, tx, ty, maxTurn, dt) {
  const want = Math.atan2(ty - car.y, tx - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-maxTurn * dt, Math.min(maxTurn * dt, diff));
}

export function updatePlayerCar(G, dt, input, sfx) {
  const p = G.player;
  if (p.onFoot || !p.car) {
    sfx.engine(false, 0);
    return;
  }
  const c = p.car;
  const fwd = input.isDown('KeyW') || input.isDown('ArrowUp');
  const back = input.isDown('KeyS') || input.isDown('ArrowDown');
  const left = input.isDown('KeyA') || input.isDown('ArrowLeft');
  const right = input.isDown('KeyD') || input.isDown('ArrowRight');
  const brake = input.isDown('Space');
  if (fwd) c.speed += SPEEDS.carAccel * dt;
  if (back) c.speed -= (c.speed > 5 ? SPEEDS.carAccel * 1.4 : SPEEDS.carAccel * 0.6) * dt;
  c.speed -= c.speed * 0.55 * dt;
  if (brake) c.speed -= c.speed * 2.2 * dt;
  c.speed = Math.max(-130, Math.min(SPEEDS.carTop, c.speed));
  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  const spd01 = Math.min(1, Math.abs(c.speed) / SPEEDS.carTop);
  const dir = c.speed >= 0 ? 1 : -1;
  // The wheels always answer a little, even from a standstill, so a car
  // wedged against a wall can turn its nose away instead of staying stuck.
  c.angle += steer * 2.1 * Math.max(0.45, spd01) * dir * dt;
  c.x += Math.cos(c.angle) * c.speed * dt;
  c.y += Math.sin(c.angle) * c.speed * dt;
  p.x = c.x;
  p.y = c.y;
  p.angle = c.angle;
  p.speed = Math.abs(c.speed);
  const hit = resolveCircle(G.city, c, 20);
  if (hit && Math.abs(c.speed) > 150) {
    sfx.crash(true);
    G.shake = Math.max(G.shake, 7);
    c.health -= 6;
    addParts(G, c.x, c.y, 8, '#d8c9a0', 160);
    c.speed *= -0.25;
  } else if (hit) {
    c.speed *= 0.5;
  }
  sfx.engine(true, spd01);
}

function updateTrafficCar(G, car, dt) {
  if (!car.target) car.target = nextTrafficTarget(G, car);
  const d = Math.hypot(car.target.x - car.x, car.target.y - car.y);
  if (d < 28) {
    car.target = nextTrafficTarget(G, car);
    car.stuck = 0;
    car.lastD = 1e9;
    return;
  }
  if (d > car.lastD - 1) {
    car.stuck += dt;
    if (car.stuck > 2.5) {
      car.target = nearestRoadPoint(car.x, car.y);
      car.stuck = 0;
      car.lastD = 1e9;
      return;
    }
  } else {
    car.stuck = 0;
  }
  car.lastD = d;
  steerToward(car, car.target.x, car.target.y, 2.4, dt);
  car.speed += (car.cruise - car.speed) * Math.min(1, dt * 0.8);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (resolveCircle(G.city, car, 20)) car.speed *= 0.7;
}

function updatePoliceCar(G, car, dt) {
  const p = G.player;
  steerToward(car, p.x, p.y, 2.8, dt);
  car.speed = Math.min(SPEEDS.police, car.speed + 320 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.siren += dt;
  if (resolveCircle(G.city, car, 20)) car.speed *= 0.6;
  const d = Math.hypot(p.x - car.x, p.y - car.y);
  if (!p.onFoot && p.car && d < 38) {
    p.car.health -= 14 * dt;
    p.car.speed *= 1 - 0.5 * dt;
    G.shake = Math.max(G.shake, 4);
  }
}

export function updatePeds(G, dt, sfx) {
  const p = G.player;
  for (const ped of G.peds) {
    if (ped.state === 'down') {
      ped.t += dt;
      if (ped.t > 4) {
        ped.state = 'flee';
        ped.t = 0;
        ped.tx = ped.x + 300;
        ped.ty = ped.y;
      }
      continue;
    }
    // Flee from a fast car nearby.
    let fleeX = 0;
    let fleeY = 0;
    for (const c of G.cars) {
      if (c.gone || Math.abs(c.speed) < 70) continue;
      const d = Math.hypot(c.x - ped.x, c.y - ped.y);
      if (d < 90) {
        fleeX += (ped.x - c.x) / (d || 1);
        fleeY += (ped.y - c.y) / (d || 1);
      }
    }
    if (fleeX !== 0 || fleeY !== 0) {
      ped.state = 'flee';
      ped.angle = Math.atan2(fleeY, fleeX);
      ped.x += Math.cos(ped.angle) * 110 * dt;
      ped.y += Math.sin(ped.angle) * 110 * dt;
    } else if (ped.state === 'flee') {
      ped.state = 'walk';
      const pt = randomRoadPoint(G.rng);
      ped.tx = pt.x;
      ped.ty = pt.y;
    } else {
      if (ped.tx === undefined) {
        const pt = randomRoadPoint(G.rng);
        ped.tx = pt.x;
        ped.ty = pt.y;
      }
      const d = Math.hypot(ped.tx - ped.x, ped.ty - ped.y);
      if (d < 20) {
        const pt = randomRoadPoint(G.rng);
        ped.tx = pt.x;
        ped.ty = pt.y;
      } else {
        ped.angle = Math.atan2(ped.ty - ped.y, ped.tx - ped.x);
        ped.x += Math.cos(ped.angle) * ped.speed * dt;
        ped.y += Math.sin(ped.angle) * ped.speed * dt;
      }
    }
    resolveCircle(G.city, ped, 10);
    // Run over by a fast car.
    for (const c of G.cars) {
      if (c.gone || Math.abs(c.speed) < 70) continue;
      if (Math.hypot(c.x - ped.x, c.y - ped.y) < 24) {
        ped.state = 'down';
        ped.t = 0;
        addParts(G, ped.x, ped.y, 8, '#d8c9a0', 120);
        if (c.driver === 'player') {
          sfx.crash(false);
          G.shake = Math.max(G.shake, 5);
          const wanted = G.wanted + 1;
          G.wanted = Math.min(5, wanted);
          G.wantedQuiet = 0;
        }
        break;
      }
    }
  }
}

function collideCars(G, sfx) {
  const cars = G.cars.filter((c) => !c.gone);
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 40 && d > 0.01) {
        const overlap = (40 - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
        const closing = Math.abs(a.speed - b.speed);
        if (closing > 120) {
          a.health -= 3;
          b.health -= 3;
          if (a.driver === 'player' || b.driver === 'player') {
            sfx.crash(false);
            G.shake = Math.max(G.shake, 4);
          }
        }
        a.speed *= 0.9;
        b.speed *= 0.9;
      }
    }
  }
}

export function updateCars(G, dt, input, sfx) {
  updatePlayerCar(G, dt, input, sfx);
  for (const c of G.cars) {
    if (c.gone) continue;
    if (c.driver === 'traffic') updateTrafficCar(G, c, dt);
    else if (c.driver === 'police') updatePoliceCar(G, c, dt);
  }
  updatePeds(G, dt, sfx);
  collideCars(G, sfx);
  // Wrecked cars explode; the player is thrown out on foot.
  for (const c of G.cars) {
    if (c.gone || c.health > 0) continue;
    c.gone = true;
    addParts(G, c.x, c.y, 26, '#ff7a2e', 260);
    addParts(G, c.x, c.y, 14, '#3a3f4a', 160);
    sfx.crash(true);
    G.shake = Math.max(G.shake, 9);
    if (c.driver === 'player') {
      const p = G.player;
      p.car = null;
      p.onFoot = true;
      p.x = c.x + 40;
      p.y = c.y;
      p.angle = c.angle;
      c.driver = null;
    }
  }
  G.cars = G.cars.filter((c) => !c.gone);
}

export { TAXI_COLOR, POLICE_COLOR };
