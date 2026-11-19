// The wanted system and the police: stars rise with crimes and fall when the
// player stays unseen; police cars chase and ram, officers on foot chase and
// catch. Wanted zero means the city is calm; five means every unit in Qamar
// City is after the player.

import { CAR, WANTED } from './config.js';
import { pick } from './random.js';

export const EVENT_BUSTED = 1;

export function createPolice(city, random) {
  const cars = [];
  const officers = [];
  let wanted = 0;
  let decayTimer = 0;
  let unseenTimer = 0;

  function addWanted(amount) {
    const before = wanted;
    wanted = Math.min(WANTED.max, wanted + amount);
    return wanted > before;
  }

  function clearWanted() {
    wanted = 0;
    cars.length = 0;
    officers.length = 0;
  }

  /** A road point near the player, but not on top of them. */
  function spawnPointNear(x, y, minDist) {
    for (let tries = 0; tries < 12; tries += 1) {
      const point = city.randomRoadPoint();
      const d = Math.hypot(point.x - x, point.y - y);
      if (d > minDist && d < 1100) return point;
    }
    return city.randomRoadPoint();
  }

  function spawnCar(x, y) {
    const point = spawnPointNear(x, y, 420);
    cars.push({
      x: point.x, y: point.y,
      heading: random() * Math.PI * 2,
      speed: 0,
      color: '#eef2f5',
      model: 'Interceptor',
      siren: random(),
      stuck: 0,
    });
  }

  function spawnOfficer(x, y) {
    const point = spawnPointNear(x, y, 320);
    officers.push({
      x: point.x, y: point.y,
      heading: 0,
      speed: 0,
      state: 'chase',
      color: '#1c2733',
    });
  }

  /** Steer a police car toward the player and drive it; returns the distance. */
  function stepCar(car, dt, ctx) {
    const dx = ctx.player.x - car.x;
    const dy = ctx.player.y - car.y;
    const dist = Math.hypot(dx, dy) || 1;
    const targetHeading = Math.atan2(dy, dx);
    let diff = targetHeading - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += Math.max(-2.8 * dt, Math.min(2.8 * dt, diff));
    const want = dist > 60 ? WANTED.policeCarSpeed : WANTED.policeCarSpeed * 0.4;
    car.speed += (want - car.speed) * Math.min(1, dt * 1.6);
    const nx = car.x + Math.cos(car.heading) * car.speed * dt;
    const ny = car.y + Math.sin(car.heading) * car.speed * dt;
    if (city.blocked(nx, ny, 20)) {
      car.stuck += dt;
      car.heading += (random() - 0.5) * 3 * dt + (car.stuck > 1 ? Math.PI * dt : 0);
      if (car.stuck > 2.5) {
        // Too stuck to be useful: reappear further out on the road.
        const point = spawnPointNear(ctx.player.x, ctx.player.y, 500);
        car.x = point.x;
        car.y = point.y;
        car.speed = 0;
        car.stuck = 0;
      }
    } else {
      car.stuck = 0;
      car.x = nx;
      car.y = ny;
    }
    car.siren += dt;
    return dist;
  }

  /** Run an officer toward the player on foot; returns the distance. */
  function stepOfficer(officer, dt, ctx) {
    const dx = ctx.player.x - officer.x;
    const dy = ctx.player.y - officer.y;
    const dist = Math.hypot(dx, dy) || 1;
    officer.heading = Math.atan2(dy, dx);
    officer.speed = WANTED.policeFootSpeed;
    const nx = officer.x + Math.cos(officer.heading) * officer.speed * dt;
    const ny = officer.y + Math.sin(officer.heading) * officer.speed * dt;
    if (!city.blocked(nx, ny, 12)) {
      officer.x = nx;
      officer.y = ny;
    }
    return dist;
  }

  function step(dt, ctx) {
    let events = 0;
    const px = ctx.player.x;
    const py = ctx.player.y;

    // Keep the force at the wanted level's strength.
    const wantCars = WANTED.policeCars[wanted] || 0;
    const wantFoot = WANTED.policeFoot[wanted] || 0;
    while (cars.length < wantCars) spawnCar(px, py);
    while (officers.length < wantFoot && !ctx.player.inCar) spawnOfficer(px, py);
    if (ctx.player.inCar) officers.length = 0;
    while (cars.length > wantCars) cars.pop();
    while (officers.length > wantFoot) officers.pop();

    let nearest = Infinity;
    for (const car of cars) nearest = Math.min(nearest, stepCar(car, dt, ctx));
    for (const officer of officers) {
      const dist = stepOfficer(officer, dt, ctx);
      nearest = Math.min(nearest, dist);
      if (dist < WANTED.catchRadius) events |= EVENT_BUSTED;
    }

    // Seen recently? The wanted level only decays while no police is close.
    if (nearest < 420) {
      unseenTimer = 0;
      decayTimer = 0;
    } else {
      unseenTimer += dt;
      if (wanted > 0 && unseenTimer > 6) {
        decayTimer += dt;
        if (decayTimer >= WANTED.decaySeconds) {
          wanted -= 1;
          decayTimer = 0;
          unseenTimer = 0;
        }
      }
    }
    return events;
  }

  return {
    cars, officers,
    get wanted() { return wanted; },
    addWanted, clearWanted, step,
  };
}
