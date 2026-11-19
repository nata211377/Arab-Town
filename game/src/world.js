// Arab Town's rules and state, with no drawing in it: the player on foot and behind
// the wheel, drivable cars, bullets, rivals, cash and health pickups, the taxi side
// job, the repaint garage and the workshop, crimes and the wanted level, and the
// mission engine that drives the story. step() advances one fixed step and returns
// what happened as bit flags, so the caller can react with sound and banners.

import { CAR, CITY, MONEY, PISTOL, PLAYER, REPAINT, SAFEHOUSE, STEP, WANTED, WORKSHOP, WORLD } from './config.js';
import { createCity } from './city.js';
import { createTraffic } from './traffic.js';
import { EVENT_BUSTED, createPolice } from './police.js';
import { MISSIONS, createMissions } from './missions.js';
import { pick, range } from './random.js';

export { EVENT_BUSTED };

export const EVENT_WASTED = 2;
export const EVENT_MISSION_DONE = 4;
export const EVENT_MISSION_FAILED = 8;
export const EVENT_CRASH = 16;
export const EVENT_SHOT = 32;
export const EVENT_COIN = 64;
export const EVENT_PICKUP = 128;
export const EVENT_WANTED_UP = 256;

function circleRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export function createWorld(random, audio) {
  const city = createCity(random);
  const traffic = createTraffic(city, random);
  const police = createPolice(city, random);
  const missions = createMissions();

  const player = {
    x: city.garage.x, y: city.garage.y - 10,
    heading: -Math.PI / 2, health: PLAYER.health,
    inCar: null, speed: 0,
    ammo: 0, reserveAmmo: PISTOL.startAmmo, hasPistol: false,
    punchCooldown: 0, shootCooldown: 0, reloadTimer: 0,
    invulnerable: 0, muzzle: 0, stepTimer: 0,
  };

  const vehicles = [];
  const enemies = [];
  const bullets = [];
  const pickups = [];
  const camera = { x: player.x, y: player.y };
  const state = {
    money: MONEY.start,
    missionsCompleted: 0,
    storyDone: false,
    elapsed: 0,
    carsStolen: 0,
    faresDone: 0,
    bustedCount: 0,
    wastedCount: 0,
    banner: null,
    bannerTimer: 0,
    prompt: null,
    danger: null,
    fare: null,
    fareTimer: 0,
    chaseCar: null,
    chaseHits: 0,
  };

  function spawnParkedCars() {
    // Parked on the roads, never inside a block: a car must be drivable from its spot.
    const spots = [
      { x: 640, y: 700, kind: 'taxi', color: CAR.taxiColor, model: 'Taxi' },
      { x: 700, y: 240, kind: 'civil', color: '#c0392b', model: 'Sedan' },
      { x: 1000, y: 560, kind: 'civil', color: '#2980b9', model: 'Hatchback' },
      { x: 1300, y: 880, kind: 'civil', color: '#27ae60', model: 'Pickup' },
      { x: 1660, y: 1200, kind: 'civil', color: '#e67e22', model: 'Coupe' },
      { x: 1980, y: 1520, kind: 'civil', color: '#8e44ad', model: 'Van' },
      { x: 2240, y: 600, kind: 'civil', color: '#16a085', model: 'Sedan' },
      { x: 420, y: 1200, kind: 'civil', color: '#d4a017', model: 'Hatchback' },
      { x: 900, y: 1520, kind: 'civil', color: '#2c3e50', model: 'Coupe' },
      { x: 1750, y: 240, kind: 'civil', color: '#ecf0f1', model: 'Sedan' },
    ];
    for (const s of spots) {
      vehicles.push({
        // The taxi faces south along its road, so the first drive is straight ahead.
        x: s.x, y: s.y, heading: s.kind === 'taxi' ? Math.PI / 2 : random() * Math.PI * 2, speed: 0,
        color: s.color, model: s.model, kind: s.kind, health: 100,
      });
    }
  }

  function spawnPickup(kind) {
    for (let tries = 0; tries < 10; tries += 1) {
      const point = city.randomRoadPoint();
      const x = point.x + (random() - 0.5) * 120;
      const y = point.y + (random() - 0.5) * 120;
      if (!city.blocked(x, y, 12)) {
        pickups.push({ x, y, kind, amount: kind === 'cash' ? MONEY.cashPickup : kind === 'health' ? 40 : 24, bob: random() * 6 });
        return;
      }
    }
  }

  spawnParkedCars();
  for (let i = 0; i < 4; i += 1) spawnPickup('cash');
  for (let i = 0; i < 2; i += 1) spawnPickup('health');

  function addMoney(amount) {
    state.money += amount;
  }

  function nearestVehicle(maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const v of vehicles) {
      const d = Math.hypot(v.x - player.x, v.y - player.y);
      if (d < bestD) { bestD = d; best = v; }
    }
    return best;
  }

  function enterCar(vehicle) {
    const index = vehicles.indexOf(vehicle);
    if (index >= 0) vehicles.splice(index, 1);
    player.inCar = vehicle;
    player.x = vehicle.x;
    player.y = vehicle.y;
    player.heading = vehicle.heading;
    player.speed = 0;
    audio.door();
    if (vehicle.kind === 'civil' || vehicle.kind === 'getaway') {
      state.carsStolen += 1;
      if (vehicle.kind === 'getaway') {
        // Stealing the Marina sports car is the big job: three stars at once.
        police.addWanted(3);
        return EVENT_WANTED_UP;
      }
      if (police.addWanted(WANTED.stealCar)) return EVENT_WANTED_UP;
    }
    return 0;
  }

  function exitCar() {
    const car = player.inCar;
    if (!car) return;
    const sideX = player.x + Math.cos(player.heading + Math.PI / 2) * 40;
    const sideY = player.y + Math.sin(player.heading + Math.PI / 2) * 40;
    const pos = city.collide(sideX, sideY, PLAYER.radius);
    player.x = pos.x;
    player.y = pos.y;
    player.inCar = null;
    player.speed = 0;
    car.x = player.x - Math.cos(player.heading + Math.PI / 2) * 40;
    car.y = player.y - Math.sin(player.heading + Math.PI / 2) * 40;
    car.speed = 0;
    vehicles.push(car);
    audio.door();
  }

  function shootAt(angle, from, damage) {
    bullets.push({
      x: from.x + Math.cos(angle) * 22,
      y: from.y + Math.sin(angle) * 22,
      vx: Math.cos(angle) * PISTOL.bulletSpeed,
      vy: Math.sin(angle) * PISTOL.bulletSpeed,
      life: PISTOL.range / PISTOL.bulletSpeed,
      damage,
      from,
    });
  }

  function playerShoot(angle) {
    if (!player.hasPistol || player.shootCooldown > 0 || player.reloadTimer > 0) return 0;
    if (player.ammo <= 0) {
      player.reloadTimer = PISTOL.reloadTime;
      return 0;
    }
    player.ammo -= 1;
    player.shootCooldown = PISTOL.cooldown;
    player.muzzle = 0.06;
    shootAt(angle, { x: player.x, y: player.y, tag: 'player' }, PISTOL.damage);
    audio.gunshot();
    state.danger = { x: player.x, y: player.y, t: 0.5 };
    return EVENT_SHOT;
  }

  function playerPunch() {
    if (player.punchCooldown > 0) return 0;
    player.punchCooldown = PLAYER.punchCooldown;
    audio.punch();
    const px = player.x + Math.cos(player.heading) * PLAYER.punchRange;
    const py = player.y + Math.sin(player.heading) * PLAYER.punchRange;
    for (const e of enemies) {
      if (e.health > 0 && Math.hypot(e.x - px, e.y - py) < 30) {
        e.health -= PLAYER.punchDamage;
        if (e.health <= 0) killEnemy(e);
      }
    }
    return 0;
  }

  function killEnemy(e) {
    e.health = 0;
    addMoney(20);
    pickups.push({ x: e.x, y: e.y, kind: 'cash', amount: 20, bob: 0 });
  }

  function damagePlayer(amount) {
    if (player.invulnerable > 0) return 0;
    player.health -= amount;
    player.invulnerable = 0.6;
    if (player.health <= 0) {
      player.health = 0;
      return EVENT_WASTED;
    }
    return 0;
  }

  function stepPlayer(dt, input, aimAngle) {
    if (player.punchCooldown > 0) player.punchCooldown -= dt;
    if (player.shootCooldown > 0) player.shootCooldown -= dt;
    if (player.invulnerable > 0) player.invulnerable -= dt;
    if (player.muzzle > 0) player.muzzle -= dt;
    if (player.reloadTimer > 0) {
      player.reloadTimer -= dt;
      if (player.reloadTimer <= 0) {
        const need = PISTOL.magSize - player.ammo;
        const take = Math.min(need, player.reserveAmmo);
        player.ammo += take;
        player.reserveAmmo -= take;
      }
    }

    const axis = input.axis();
    if (player.inCar) {
      const car = player.inCar;
      // Arcade car physics: speed along the heading, steering that bites with speed.
      if (axis.y < 0) car.speed += CAR.accel * dt;
      else if (axis.y > 0) {
        if (car.speed > 30) car.speed -= CAR.brake * dt;
        else car.speed -= CAR.reverseAccel * dt;
      } else {
        car.speed -= car.speed * CAR.drag * dt;
        if (Math.abs(car.speed) < 4) car.speed = 0;
      }
      car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
      // Steering bites even from a stop, so a parked car can turn onto the road.
      const steerAuthority = Math.min(1, 0.35 + Math.abs(car.speed) / 200);
      const steerDir = car.speed >= 0 ? 1 : -1;
      car.heading += axis.x * CAR.steer * steerAuthority * steerDir * dt;
      const nx = car.x + Math.cos(car.heading) * car.speed * dt;
      const ny = car.y + Math.sin(car.heading) * car.speed * dt;
      if (city.blocked(nx, ny, 20)) {
        const hitSpeed = Math.abs(car.speed);
        car.speed *= -0.25;
        if (hitSpeed > 200) return EVENT_CRASH;
      } else {
        car.x = nx;
        car.y = ny;
      }
      car.x = Math.max(180, Math.min(WORLD.width - 10, car.x));
      car.y = Math.max(10, Math.min(WORLD.height - 10, car.y));
      player.x = car.x;
      player.y = car.y;
      player.heading = car.heading;
      audio.engine(car.speed, CAR.maxSpeed);
    } else {
      audio.engineOff();
      const speed = input.running ? PLAYER.runSpeed : PLAYER.walkSpeed;
      let vx = axis.x * speed;
      let vy = axis.y * speed;
      if (vx !== 0 && vy !== 0) { vx *= 0.7071; vy *= 0.7071; }
      const pos = city.collide(player.x + vx * dt, player.y + vy * dt, PLAYER.radius);
      player.x = pos.x;
      player.y = pos.y;
      if (vx !== 0 || vy !== 0) {
        player.heading = Math.atan2(vy, vx);
        player.stepTimer -= dt * Math.hypot(vx, vy) / 60;
        if (player.stepTimer <= 0) {
          player.stepTimer = 1;
          audio.step();
        }
      }
      if (player.hasPistol) player.heading = aimAngle;
    }
    return 0;
  }

  function stepVehicles(dt) {
    // The player's car against traffic cars and pedestrians.
    const car = player.inCar;
    if (!car) return 0;
    let events = 0;
    for (const t of traffic.cars) {
      const d = Math.hypot(t.x - car.x, t.y - car.y);
      if (d < 44) {
        const push = (44 - d) / 2;
        const nx = (car.x - t.x) / (d || 1);
        const ny = (car.y - t.y) / (d || 1);
        car.x += nx * push;
        car.y += ny * push;
        t.x -= nx * push;
        t.y -= ny * push;
        if (Math.abs(car.speed) > 180) {
          car.speed *= 0.55;
          t.stopped = 0.8;
          audio.crash();
          events |= EVENT_CRASH;
        }
      }
    }
    for (const ped of traffic.peds) {
      if (ped.state === 'down') continue;
      const d = Math.hypot(ped.x - car.x, ped.y - car.y);
      if (d < 34) {
        if (Math.abs(car.speed) > 120) {
          ped.state = 'down';
          ped.down = 6;
          car.speed *= 0.8;
          audio.crash();
          if (police.addWanted(WANTED.hitPed)) events |= EVENT_WANTED_UP;
        } else {
          ped.state = 'flee';
          ped.heading = Math.atan2(ped.y - car.y, ped.x - car.x);
          ped.panic = 1;
        }
      }
    }
    // The debtor's car, when the chase is on.
    if (state.chaseCar && state.chaseCar.active) {
      const chase = state.chaseCar;
      const d = Math.hypot(chase.x - car.x, chase.y - car.y);
      if (d < 46 && Math.abs(car.speed) > 150 && chase.ramCooldown <= 0) {
        chase.ramCooldown = 1.2;
        chase.hits += 1;
        chase.speed *= 0.4;
        car.speed *= 0.6;
        audio.crash();
        events |= EVENT_CRASH;
        if (chase.hits >= 3) {
          chase.active = false;
          chase.speed = 0;
        }
      }
    }
    return events;
  }

  function stepChaseCar(dt) {
    const chase = state.chaseCar;
    if (!chase || !chase.active) return;
    if (chase.ramCooldown > 0) chase.ramCooldown -= dt;
    // Flee along the roads, away from the player.
    const dx = chase.x - player.x;
    const dy = chase.y - player.y;
    const away = Math.atan2(dy, dx);
    let diff = away - chase.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    chase.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
    chase.speed = Math.min(430, chase.speed + 300 * dt);
    const nx = chase.x + Math.cos(chase.heading) * chase.speed * dt;
    const ny = chase.y + Math.sin(chase.heading) * chase.speed * dt;
    if (!city.blocked(nx, ny, 20)) {
      chase.x = nx;
      chase.y = ny;
    } else {
      chase.heading += Math.PI * 0.6 * dt * 4;
    }
  }

  function stepEnemies(dt) {
    for (const e of enemies) {
      if (e.health <= 0) continue;
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      e.heading = Math.atan2(dy, dx);
      if (dist > 300) {
        const nx = e.x + Math.cos(e.heading) * 200 * dt;
        const ny = e.y + Math.sin(e.heading) * 200 * dt;
        if (!city.blocked(nx, ny, 12)) { e.x = nx; e.y = ny; }
      } else if (e.shootCooldown <= 0) {
        e.shootCooldown = 1.1 + random() * 0.9;
        const spread = (random() - 0.5) * 0.3;
        shootAt(e.heading + spread, { x: e.x, y: e.y, tag: 'enemy' }, 12);
        audio.enemyShot();
      }
      if (e.shootCooldown > 0) e.shootCooldown -= dt;
    }
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      if (enemies[i].health <= 0 && enemies[i].deadTimer === undefined) enemies[i].deadTimer = 4;
      if (enemies[i].deadTimer !== undefined) {
        enemies[i].deadTimer -= dt;
        if (enemies[i].deadTimer <= 0) enemies.splice(i, 1);
      }
    }
  }

  function stepBullets(dt) {
    let events = 0;
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const b = bullets[i];
      b.life -= dt;
      const steps = 4;
      let dead = b.life <= 0;
      for (let s = 0; s < steps && !dead; s += 1) {
        b.x += (b.vx * dt) / steps;
        b.y += (b.vy * dt) / steps;
        if (city.blocked(b.x, b.y, 2)) dead = true;
      }
      if (dead) { bullets.splice(i, 1); continue; }
      if (b.from.tag === 'player') {
        for (const e of enemies) {
          if (e.health > 0 && Math.hypot(e.x - b.x, e.y - b.y) < 18) {
            e.health -= b.damage;
            if (e.health <= 0) killEnemy(e);
            dead = true;
            break;
          }
        }
        if (!dead) {
          for (const ped of traffic.peds) {
            if (ped.state !== 'down' && Math.hypot(ped.x - b.x, ped.y - b.y) < 14) {
              ped.state = 'down';
              ped.down = 6;
              if (police.addWanted(WANTED.killPed)) events |= EVENT_WANTED_UP;
              dead = true;
              break;
            }
          }
        }
        if (!dead) {
          for (const officer of police.officers) {
            if (Math.hypot(officer.x - b.x, officer.y - b.y) < 16) {
              if (police.addWanted(WANTED.killPolice)) events |= EVENT_WANTED_UP;
              dead = true;
              break;
            }
          }
        }
      } else if (b.from.tag === 'enemy') {
        if (!player.inCar && Math.hypot(player.x - b.x, player.y - b.y) < 16) {
          events |= damagePlayer(b.damage);
          dead = true;
        } else if (player.inCar && Math.hypot(player.inCar.x - b.x, player.inCar.y - b.y) < 26) {
          player.inCar.health -= b.damage;
          dead = true;
        }
      }
      if (dead) bullets.splice(i, 1);
    }
    return events;
  }

  function stepPickups(dt) {
    let events = 0;
    for (let i = pickups.length - 1; i >= 0; i -= 1) {
      const p = pickups[i];
      p.bob += dt;
      if (Math.hypot(p.x - player.x, p.y - player.y) < 34) {
        if (p.kind === 'cash') {
          addMoney(p.amount);
          audio.coin();
          events |= EVENT_COIN;
        } else if (p.kind === 'health') {
          player.health = Math.min(PLAYER.health, player.health + p.amount);
          audio.pickup();
          events |= EVENT_PICKUP;
        } else if (p.kind === 'ammo') {
          player.reserveAmmo += p.amount;
          audio.pickup();
          events |= EVENT_PICKUP;
        }
        pickups.splice(i, 1);
      }
    }
    return events;
  }

  function stepFare(dt) {
    if (missions.active) return;
    if (!player.inCar || player.inCar.kind !== 'taxi') { state.fare = null; return; }
    if (!state.fare) {
      state.fareTimer -= dt;
      if (state.fareTimer <= 0) {
        const point = city.randomRoadPoint();
        state.fare = { phase: 'pickup', x: point.x, y: point.y, dx: 0, dy: 0 };
      }
      return;
    }
    const f = state.fare;
    if (f.phase === 'pickup') {
      if (Math.hypot(player.x - f.x, player.y - f.y) < 70) {
        const drop = city.randomRoadPoint();
        f.phase = 'dropoff';
        f.dx = drop.x;
        f.dy = drop.y;
        audio.pickup();
      }
    } else if (Math.hypot(player.x - f.dx, player.y - f.dy) < 80) {
      addMoney(MONEY.taxiFare);
      state.faresDone += 1;
      state.fare = null;
      state.fareTimer = 8;
      audio.coin();
    }
  }

  function nearbyPrompt() {
    if (player.inCar) {
      const car = player.inCar;
      if (Math.hypot(car.x - city.repaint.x, car.y - city.repaint.y) < 90) {
        return { text: `Repaint garage — press E ($${MONEY.repaintFee}, clears wanted)`, action: 'repaint' };
      }
      return null;
    }
    const v = nearestVehicle(64);
    if (v) return { text: `Press E to get in the ${v.model}`, action: 'enter', vehicle: v };
    if (Math.hypot(player.x - city.workshop.x, player.y - city.workshop.y) < 80) {
      return { text: `Layla's workshop — press E for ammo ($${PISTOL.ammoPrice})`, action: 'ammo' };
    }
    return null;
  }

  function doPromptAction(action) {
    if (action === 'enter') {
      const v = nearestVehicle(64);
      if (v) return enterCar(v);
    } else if (action === 'repaint') {
      if (state.money >= MONEY.repaintFee) {
        state.money -= MONEY.repaintFee;
        police.clearWanted();
        player.inCar.color = pick(random, CAR.colors);
        audio.pickup();
        state.banner = 'Fresh paint — the police lost your trail.';
        state.bannerTimer = 3;
      }
    } else if (action === 'ammo') {
      if (state.money >= PISTOL.ammoPrice) {
        state.money -= PISTOL.ammoPrice;
        player.reserveAmmo += 24;
        player.hasPistol = true;
        audio.pickup();
      }
    }
    return 0;
  }

  function missionCtx() {
    return {
      player,
      addMoney,
      playPickup: () => audio.pickup(),
      givePistol: () => {
        player.hasPistol = true;
        player.ammo = PISTOL.magSize;
        player.reserveAmmo = 48;
      },
      spawnMissionTaxi: () => { /* the taxi is already parked at the garage */ },
      spawnChaseCar: (x, y) => {
        state.chaseCar = { x, y, heading: 0, speed: 0, hits: 0, ramCooldown: 0, active: true, color: '#c0392b', model: 'Coupe' };
        state.chaseHits = 0;
      },
      spawnGetawayCar: (x, y) => {
        vehicles.push({ x, y, heading: -Math.PI / 2, speed: 0, color: '#f5f5f5', model: 'Sports', kind: 'getaway', health: 100 });
      },
      chaseHits: () => (state.chaseCar ? state.chaseCar.hits : 0),
      chaseCarPos: () => (state.chaseCar ? { x: state.chaseCar.x, y: state.chaseCar.y } : null),
      rivalsLeft: () => enemies.filter((e) => e.health > 0).length,
      policeWanted: () => police.wanted,
      clearWanted: () => police.clearWanted(),
      playerCarIs: (kind) => !!(player.inCar && player.inCar.kind === kind),
    };
  }

  missions.setChaseTarget(() => (state.chaseCar ? { x: state.chaseCar.x, y: state.chaseCar.y, radius: 80 } : null));

  function startMission(index) {
    missions.start(index, missionCtx());
    audio.mission();
    if (MISSIONS[index].id === 'm5') {
      for (let i = 0; i < 5; i += 1) {
        enemies.push({
          x: 260 + random() * 110, y: 1360 + random() * 100,
          heading: 0, health: 60, shootCooldown: 1 + random(), color: '#7a3b8f',
        });
      }
    }
  }

  function respawn() {
    player.health = PLAYER.health;
    player.x = city.safehouse.x;
    player.y = city.safehouse.y;
    if (player.inCar) {
      vehicles.push(player.inCar);
      player.inCar = null;
    }
    player.speed = 0;
    police.clearWanted();
    state.money = Math.max(0, state.money - WANTED.bustFine);
  }

  function reset() {
    player.x = city.garage.x;
    player.y = city.garage.y - 10;
    player.heading = -Math.PI / 2;
    player.health = PLAYER.health;
    player.inCar = null;
    player.speed = 0;
    player.ammo = 0;
    player.reserveAmmo = PISTOL.startAmmo;
    player.hasPistol = false;
    state.money = MONEY.start;
    state.missionsCompleted = 0;
    state.storyDone = false;
    state.elapsed = 0;
    state.chaseCar = null;
    state.chaseHits = 0;
    state.fare = null;
    enemies.length = 0;
    bullets.length = 0;
    vehicles.length = 0;
    pickups.length = 0;
    spawnParkedCars();
    for (let i = 0; i < 4; i += 1) spawnPickup('cash');
    for (let i = 0; i < 2; i += 1) spawnPickup('health');
    police.clearWanted();
    missions.reset();
    camera.x = player.x;
    camera.y = player.y;
  }

  function step(dt, input, aimAngle, actions) {
    let events = 0;
    state.elapsed += dt;
    if (state.bannerTimer > 0) {
      state.bannerTimer -= dt;
      if (state.bannerTimer <= 0) state.banner = null;
    }
    if (state.danger) {
      state.danger.t -= dt;
      if (state.danger.t <= 0) state.danger = null;
    }

    // One-shot actions.
    state.prompt = nearbyPrompt();
    if (actions.enter) {
      if (player.inCar) exitCar();
      else if (state.prompt) events |= doPromptAction(state.prompt.action);
    }
    if (actions.shootHeld && !player.inCar) events |= playerShoot(aimAngle);
    if (actions.punch) events |= playerPunch();
    if (actions.reload && player.hasPistol && player.reloadTimer <= 0 && player.ammo < PISTOL.magSize && player.reserveAmmo > 0) {
      player.reloadTimer = PISTOL.reloadTime;
    }

    events |= stepPlayer(dt, input, aimAngle);
    events |= stepVehicles(dt);
    stepChaseCar(dt);
    stepEnemies(dt);
    events |= stepBullets(dt);
    events |= stepPickups(dt);
    stepFare(dt);

    const ctx = {
      player: { x: player.x, y: player.y, inCar: player.inCar ? { x: player.x, y: player.y } : null },
      playerCar: player.inCar,
      danger: state.danger,
    };
    traffic.step(dt, ctx);
    const policeEvents = police.step(dt, { player: { x: player.x, y: player.y, inCar: !!player.inCar } });
    events |= policeEvents;

    // Police cars ram the player's car; on foot they catch the player.
    if (player.inCar) {
      for (const pc of police.cars) {
        const d = Math.hypot(pc.x - player.x, pc.y - player.y);
        if (d < 46 && Math.abs(player.inCar.speed) < 120) {
          player.inCar.speed *= 0.5;
          audio.crash();
          events |= EVENT_CRASH;
        }
      }
    }

    // Missions.
    const missionEvent = missions.stepUpdate(dt, missionCtx());
    if (missionEvent === 'completed') {
      state.missionsCompleted += 1;
      audio.mission();
      state.banner = `${missions.current.name} complete — $${missions.current.reward}`;
      state.bannerTimer = 4;
      events |= EVENT_MISSION_DONE;
      if (state.missionsCompleted >= MISSIONS.length) {
        state.storyDone = true;
        state.banner = 'Story complete — Qamar City is yours. Free roam!';
        state.bannerTimer = 6;
      }
    } else if (missionEvent === 'failed') {
      audio.fail();
      events |= EVENT_MISSION_FAILED;
    }

    // Traffic cars hitting the player on foot.
    if (!player.inCar) {
      for (const t of traffic.cars) {
        const d = Math.hypot(t.x - player.x, t.y - player.y);
        if (d < 30 && t.speed > 60) {
          events |= damagePlayer(20);
          const away = Math.atan2(player.y - t.y, player.x - t.x);
          const pos = city.collide(player.x + Math.cos(away) * 40, player.y + Math.sin(away) * 40, PLAYER.radius);
          player.x = pos.x;
          player.y = pos.y;
        }
      }
    }

    // Camera follows the player.
    camera.x += (player.x - camera.x) * Math.min(1, dt * 5);
    camera.y += (player.y - camera.y) * Math.min(1, dt * 5);
    camera.x = Math.max(640, Math.min(WORLD.width - 640, camera.x));
    camera.y = Math.max(360, Math.min(WORLD.height - 360, camera.y));

    // Siren while police are close.
    const policeNear = police.cars.some((pc) => Math.hypot(pc.x - player.x, pc.y - player.y) < 700);
    audio.siren(police.wanted > 0 && policeNear);
    audio.updateSiren(dt);

    return events;
  }

  function serialize() {
    return {
      money: state.money,
      missionsCompleted: state.missionsCompleted,
      storyDone: state.storyDone,
      player: { x: player.x, y: player.y, health: player.health, ammo: player.ammo, reserveAmmo: player.reserveAmmo, hasPistol: player.hasPistol },
    };
  }

  function deserialize(save) {
    if (!save) return;
    state.money = save.money ?? MONEY.start;
    state.missionsCompleted = save.missionsCompleted ?? 0;
    state.storyDone = !!save.storyDone;
    if (save.player) {
      player.x = save.player.x ?? city.garage.x;
      player.y = save.player.y ?? city.garage.y - 10;
      player.health = save.player.health ?? PLAYER.health;
      player.ammo = save.player.ammo ?? 0;
      player.reserveAmmo = save.player.reserveAmmo ?? PISTOL.startAmmo;
      player.hasPistol = !!save.player.hasPistol;
    }
    camera.x = player.x;
    camera.y = player.y;
  }

  return {
    city, traffic, police, missions, player, vehicles, enemies, bullets, pickups, camera, state,
    step, reset, startMission, respawn, serialize, deserialize, addMoney,
    get money() { return state.money; },
  };
}
