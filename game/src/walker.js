// The player on foot: walking, aiming, shooting, punching, reloading and
// getting in and out of cars. Bullets live here too, since both the player
// and the mission rivals fire them.
import { resolveCircle, circleHitsBuilding } from './city.js';
import { SPEEDS } from './tune.js';
import { addParts } from './state.js';
import { addWanted } from './wanted.js';

export function updateWalker(G, dt, input, sfx) {
  const p = G.player;
  if (!p.onFoot) return;
  p.fireCd -= dt;
  p.punchCd -= dt;
  p.reloadT -= dt;
  p.invuln -= dt;

  // Finish a reload.
  if (p.reloadT <= 0 && p.reloading) {
    p.reloading = false;
    const need = G.magSize - G.ammo;
    const take = Math.min(need, G.reserve);
    G.ammo += take;
    G.reserve -= take;
  }

  const ax = input.axes();
  let mx = ax.x;
  let my = ax.y;
  const len = Math.hypot(mx, my);
  if (len > 0) {
    mx /= len;
    my /= len;
    p.angle = Math.atan2(my, mx);
    p.speed = SPEEDS.walk;
  } else {
    p.speed = 0;
  }
  p.x += mx * SPEEDS.walk * dt;
  p.y += my * SPEEDS.walk * dt;
  resolveCircle(G.city, p, p.radius);

  // Aim follows the mouse in world space. Until the mouse has moved, the
  // player aims where they walk, so keyboard-only play still shoots straight.
  const vw = G.view.w;
  const vh = G.view.h;
  if (input.mouse.moved) {
    p.aimX = G.camera.x + (input.mouse.x - vw / 2);
    p.aimY = G.camera.y + (input.mouse.y - vh / 2);
    if (!p.reloading) p.angle = Math.atan2(p.aimY - p.y, p.aimX - p.x);
  } else {
    p.aimX = p.x + Math.cos(p.angle) * 120;
    p.aimY = p.y + Math.sin(p.angle) * 120;
  }

  // Reload.
  if (input.pressed('KeyR') && !p.reloading && G.reserve > 0 && G.ammo < G.magSize) {
    p.reloading = true;
    p.reloadT = 1.1;
    sfx.reload();
  }

  // Fire the pistol, or punch when there is nothing to shoot with.
  if (input.mouse.down && p.fireCd <= 0 && !p.reloading) {
    if (G.hasPistol && G.ammo > 0) {
      fireBullet(G, sfx);
    } else if (p.punchCd <= 0) {
      punch(G, sfx);
    }
  }
  if (input.pressed('KeyF') && p.punchCd <= 0) punch(G, sfx);
}

function fireBullet(G, sfx) {
  const p = G.player;
  G.ammo -= 1;
  p.fireCd = 0.22;
  G.stats.shots += 1;
  const a = Math.atan2(p.aimY - p.y, p.aimX - p.x);
  const spread = (Math.random() - 0.5) * 0.05;
  G.bullets.push({
    x: p.x + Math.cos(a) * 20,
    y: p.y + Math.sin(a) * 20,
    vx: Math.cos(a + spread) * 720,
    vy: Math.sin(a + spread) * 720,
    life: 0.8,
    dmg: 34,
    from: 'player',
  });
  addParts(G, p.x + Math.cos(a) * 24, p.y + Math.sin(a) * 24, 3, '#ffd76a', 160);
  sfx.shot();
}

function punch(G, sfx) {
  const p = G.player;
  p.punchCd = 0.35;
  sfx.punch();
  const a = p.angle;
  for (const f of G.foes) {
    if (f.health <= 0) continue;
    const dx = f.x - p.x;
    const dy = f.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 56 && Math.abs(Math.atan2(dy, dx) - a) < 1.1) {
      f.health -= 15;
      f.x += (dx / (d || 1)) * 26;
      f.y += (dy / (d || 1)) * 26;
      addParts(G, f.x, f.y, 4, '#ffb37a', 140);
      if (f.health <= 0) {
        G.stats.kills += 1;
        addParts(G, f.x, f.y, 12, '#c23b2e', 180);
      }
    }
  }
}

export function updateBullets(G, dt, sfx) {
  const p = G.player;
  for (let i = G.bullets.length - 1; i >= 0; i -= 1) {
    const b = G.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead && circleHitsBuilding(G.city, b.x, b.y, 2)) {
      addParts(G, b.x, b.y, 3, '#d8c9a0', 90);
      dead = true;
    }
    if (!dead && b.from === 'player') {
      for (const f of G.foes) {
        if (f.health <= 0) continue;
        if (Math.hypot(f.x - b.x, f.y - b.y) < 16) {
          f.health -= b.dmg;
          G.stats.hits += 1;
          addParts(G, b.x, b.y, 5, '#ff5a4a', 150);
          if (f.health <= 0) {
            G.stats.kills += 1;
            addParts(G, f.x, f.y, 14, '#c23b2e', 200);
          }
          dead = true;
          break;
        }
      }
      if (!dead) {
        for (const c of G.cars) {
          if (c.gone) continue;
          if (Math.hypot(c.x - b.x, c.y - b.y) < 24) {
            c.health -= b.dmg * 0.5;
            addParts(G, b.x, b.y, 4, '#ffd76a', 130);
            dead = true;
            break;
          }
        }
      }
    }
    if (!dead && b.from === 'foe' && p.onFoot && p.invuln <= 0) {
      if (Math.hypot(p.x - b.x, p.y - b.y) < 14) {
        G.health -= b.dmg;
        p.invuln = 0.4;
        G.shake = Math.max(G.shake, 6);
        addParts(G, p.x, p.y, 6, '#ff5a4a', 140);
        dead = true;
      }
    }
    if (!dead && b.from === 'foe' && !p.onFoot && p.car) {
      if (Math.hypot(p.car.x - b.x, p.car.y - b.y) < 24) {
        p.car.health -= b.dmg * 0.5;
        addParts(G, b.x, b.y, 4, '#ffd76a', 130);
        dead = true;
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }
}

// Step out of the car onto the road beside it.
export function exitCar(G) {
  const p = G.player;
  if (p.onFoot || !p.car) return;
  const c = p.car;
  c.driver = null;
  c.speed = 0;
  p.car = null;
  p.onFoot = true;
  p.x = c.x + Math.cos(c.angle + Math.PI / 2) * 34;
  p.y = c.y + Math.sin(c.angle + Math.PI / 2) * 34;
  p.angle = c.angle;
  resolveCircle(G.city, p, p.radius);
}

// Get into the nearest car. Returns a note for the HUD, or null.
export function tryEnterCar(G, sfx) {
  const p = G.player;
  if (!p.onFoot) return null;
  let best = null;
  let bestD = 74;
  for (const c of G.cars) {
    if (c.gone || c.kind === 'police') continue;
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  if (!best) return null;
  // A traffic car still has its driver: they run off, and it counts as theft.
  if (best.driver === 'traffic') {
    best.driver = null;
    G.peds.push({
      x: best.x + 30,
      y: best.y + 10,
      angle: 0,
      speed: 90,
      color: '#7a6a8a',
      state: 'flee',
      t: 0,
      tx: best.x + 200,
      ty: best.y,
    });
  }
  const missionTaxi =
    best.missionTaxi && G.activeMission && G.activeMission.def.id === 'm1';
  if (!best.stolenByPlayer && !missionTaxi) {
    best.stolenByPlayer = true;
    G.stats.stolen += 1;
    addWanted(G, 1);
    sfx.horn();
    p.onFoot = false;
    p.car = best;
    best.driver = 'player';
    p.angle = best.angle;
    return 'Car stolen! Wanted +1';
  }
  p.onFoot = false;
  p.car = best;
  best.driver = 'player';
  p.angle = best.angle;
  return null;
}
