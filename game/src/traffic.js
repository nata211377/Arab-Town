// Traffic and pedestrians: cars that drive the road grid in their lanes, slowing for
// the car ahead, and people who stroll the sidewalks and run from gunfire and speeding
// cars. Both are pure state and movement; the world owns collisions and crimes.

import { CAR, LANE, ROADS_X, ROADS_Y, TRAFFIC, WORLD } from './config.js';
import { pick, range } from './random.js';

export function createTraffic(city, random) {
  const cars = [];
  const peds = [];

  function spawnCar() {
    const point = city.randomRoadPoint();
    const axis = point.horizontal ? 'h' : 'v';
    const dir = random() < 0.5 ? 1 : -1;
    const road = axis === 'h' ? point.y : point.x;
    const speed = TRAFFIC.carSpeed + (random() * 2 - 1) * TRAFFIC.carSpeedJitter;
    cars.push({
      x: point.x, y: point.y,
      axis, dir, road, speed,
      color: pick(random, CAR.colors),
      model: pick(random, CAR.models),
      stopped: 0,
      honk: 0,
    });
  }

  function spawnPed() {
    const point = city.randomRoadPoint();
    const onSidewalk = random() < 0.5;
    const x = point.horizontal ? point.x : point.x + (onSidewalk ? 62 : -62);
    const y = point.horizontal ? point.y + (onSidewalk ? 62 : -62) : point.y;
    peds.push({
      x, y,
      heading: random() * Math.PI * 2,
      speed: TRAFFIC.pedSpeed + (random() * 2 - 1) * TRAFFIC.pedSpeedJitter,
      color: pick(random, ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#ecf0f1', '#1abc9c', '#e67e22']),
      state: 'walk',
      timer: 2 + random() * 4,
      down: 0,
      panic: 0,
    });
  }

  for (let i = 0; i < TRAFFIC.maxCars; i += 1) spawnCar();
  for (let i = 0; i < TRAFFIC.maxPeds; i += 1) spawnPed();

  function laneOffset(axis, dir) {
    if (axis === 'h') return dir === 1 ? LANE : -LANE;
    return dir === 1 ? -LANE : LANE;
  }

  function atIntersection(car) {
    if (car.axis === 'h') {
      for (const x of ROADS_X) if (Math.abs(car.x - x) < 14) return x;
    } else {
      for (const y of ROADS_Y) if (Math.abs(car.y - y) < 14) return y;
    }
    return null;
  }

  function stepCar(car, dt, ctx) {
    // Ease back to the lane centre after a turn.
    const target = car.axis === 'h' ? car.road + laneOffset('h', car.dir) : car.road + laneOffset('v', car.dir);
    if (car.axis === 'h') car.y += (target - car.y) * Math.min(1, dt * 4);
    else car.x += (target - car.x) * Math.min(1, dt * 4);

    // Slow for the car ahead in the same lane, and for the player's car.
    let want = car.speed;
    const ahead = car.axis === 'h' ? 76 : 76;
    for (const other of cars) {
      if (other === car || other.axis !== car.axis || other.dir !== car.dir) continue;
      if (Math.abs((car.axis === 'h' ? other.y : other.x) - (car.axis === 'h' ? car.y : car.x)) > 30) continue;
      const gap = (car.axis === 'h' ? (other.x - car.x) * car.dir : (other.y - car.y) * car.dir);
      if (gap > 0 && gap < ahead) want = Math.min(want, Math.max(0, (gap - 46) * 2));
    }
    if (ctx.playerCar) {
      const dx = ctx.playerCar.x - car.x;
      const dy = ctx.playerCar.y - car.y;
      const along = car.axis === 'h' ? dx * car.dir : dy * car.dir;
      const side = car.axis === 'h' ? Math.abs(dy) : Math.abs(dx);
      if (along > 0 && along < 90 && side < 40) want = 0;
    }
    if (car.stopped > 0) {
      car.stopped -= dt;
      want = 0;
    }
    const speed = Math.max(0, Math.min(want, car.speed));
    if (car.axis === 'h') car.x += car.dir * speed * dt;
    else car.y += car.dir * speed * dt;

    // Turn at intersections, sometimes.
    const cross = atIntersection(car);
    if (cross !== null && random() < dt * 0.9) {
      if (car.axis === 'h' && ROADS_Y.includes(cross) === false) {
        // not a crossing road
      } else if (car.axis === 'h') {
        car.axis = 'v';
        car.road = cross;
        car.dir = random() < 0.5 ? 1 : -1;
        car.x = cross;
      } else {
        car.axis = 'h';
        car.road = cross;
        car.dir = random() < 0.5 ? 1 : -1;
        car.y = cross;
      }
    }

    // Wrap around the far edge so traffic never runs out.
    if (car.x < 120) { car.x = WORLD.width - 120; }
    if (car.x > WORLD.width - 120) { car.x = 120; }
    if (car.y < 60) { car.y = WORLD.height - 60; }
    if (car.y > WORLD.height - 60) { car.y = 60; }
    if (car.honk > 0) car.honk -= dt;
  }

  function stepPed(ped, dt, ctx) {
    if (ped.state === 'down') {
      ped.down -= dt;
      return;
    }
    ped.timer -= dt;
    if (ctx.danger && ped.panic <= 0) {
      const dx = ped.x - ctx.danger.x;
      const dy = ped.y - ctx.danger.y;
      const d = Math.hypot(dx, dy);
      if (d < 260) {
        ped.state = 'flee';
        ped.heading = Math.atan2(dy, dx);
        ped.panic = 1.2 + random();
        ped.timer = ped.panic;
      }
    }
    if (ped.state === 'flee') {
      ped.panic -= dt;
      if (ped.panic <= 0) ped.state = 'walk';
    } else if (ped.timer <= 0) {
      ped.heading = random() * Math.PI * 2;
      ped.timer = 2 + random() * 5;
    }
    const speed = ped.state === 'flee' ? ped.speed * 2.6 : ped.speed;
    let nx = ped.x + Math.cos(ped.heading) * speed * dt;
    let ny = ped.y + Math.sin(ped.heading) * speed * dt;
    if (city.blocked(nx, ny, 10)) {
      ped.heading += Math.PI / 2 + random() * Math.PI;
      nx = ped.x;
      ny = ped.y;
    }
    // Stay out of the sea and the desert's deep dunes.
    nx = Math.max(180, Math.min(WORLD.width - 10, nx));
    ny = Math.max(10, Math.min(WORLD.height - 10, ny));
    ped.x = nx;
    ped.y = ny;
  }

  function step(dt, ctx) {
    for (const car of cars) stepCar(car, dt, ctx);
    for (const ped of peds) stepPed(ped, dt, ctx);
    // Keep the streets full.
    while (cars.length < TRAFFIC.maxCars) spawnCar();
    while (peds.filter((p) => p.state !== 'down').length < TRAFFIC.maxPeds) spawnPed();
    // Remove the long-gone.
    for (let i = peds.length - 1; i >= 0; i -= 1) {
      if (peds[i].state === 'down' && peds[i].down <= 0) peds.splice(i, 1);
    }
  }

  return { cars, peds, step, spawnCar, spawnPed };
}
