// Everything Arab Town shows: the sun-soaked city from above, its traffic and
// people, the police and the rivals, the HUD with its minimap and wanted stars,
// the mission banners and dialogue, and the title, pause and game-over screens.
// The camera shows a 1280 x 720 window of the world, scaled to the browser.

import { CAR, CITY, DESERT_Y, FONT, PALETTE, PISTOL, SEA_X, VIEW, WANTED, WORLD } from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_BUSTED = 3;
export const SCREEN_WASTED = 4;

const MINIMAP = { x: VIEW.width - 216, y: 12, w: 204, h: 152 };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function inView(x, y, cam, margin = 80) {
    return x > cam.x - VIEW.width / 2 - margin && x < cam.x + VIEW.width / 2 + margin
      && y > cam.y - VIEW.height / 2 - margin && y < cam.y + VIEW.height / 2 + margin;
  }

  function drawGround(world) {
    const cam = world.camera;
    const x0 = cam.x - VIEW.width / 2;
    const y0 = cam.y - VIEW.height / 2;
    // Sand everywhere, greener in the gardens, dunes in the south.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(x0, y0, VIEW.width, VIEW.height);
    // Sea on the west.
    if (x0 < SEA_X) {
      ctx.fillStyle = PALETTE.sea;
      ctx.fillRect(x0, y0, SEA_X - x0, VIEW.height);
      ctx.fillStyle = PALETTE.seaDeep;
      for (let y = Math.floor(y0 / 90) * 90; y < y0 + VIEW.height; y += 90) {
        ctx.fillRect(SEA_X - 60, y, 60, 4);
      }
      ctx.fillStyle = PALETTE.seaFoam;
      ctx.fillRect(SEA_X - 4, y0, 4, VIEW.height);
    }
    // Desert dunes in the south.
    if (y0 + VIEW.height > DESERT_Y) {
      ctx.fillStyle = PALETTE.desert;
      ctx.fillRect(x0, Math.max(y0, DESERT_Y), VIEW.width, y0 + VIEW.height - Math.max(y0, DESERT_Y));
      ctx.fillStyle = PALETTE.sandDark;
      for (let i = 0; i < 8; i += 1) {
        const dx = Math.floor((x0 + i * 317) / 317) * 317;
        ctx.beginPath();
        ctx.ellipse(dx + 120, DESERT_Y + 70 + (i % 3) * 40, 180, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawRoads(world) {
    const cam = world.camera;
    for (const road of world.city.roads) {
      if (!inView(road.x + road.w / 2, road.y + road.h / 2, cam, 120)) continue;
      ctx.fillStyle = PALETTE.sidewalk;
      ctx.fillRect(road.x - 14, road.y - 14, road.w + 28, road.h + 28);
      ctx.fillStyle = PALETTE.road;
      ctx.fillRect(road.x, road.y, road.w, road.h);
      ctx.fillStyle = PALETTE.lane;
      if (road.w > road.h) {
        // Horizontal road: dashed centre line.
        for (let x = road.x + 10; x < road.x + road.w - 10; x += 46) ctx.fillRect(x, road.y + road.h / 2 - 2, 26, 4);
      } else {
        for (let y = road.y + 10; y < road.y + road.h - 10; y += 46) ctx.fillRect(road.x + road.w / 2 - 2, y, 4, 26);
      }
    }
  }

  function drawBuildings(world) {
    const cam = world.camera;
    for (const b of world.city.buildings) {
      if (!inView(b.x + b.w / 2, b.y + b.h / 2, cam, 60)) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(b.x + b.shadow, b.y + b.shadow, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
      if (b.dome) {
        ctx.fillStyle = b.roof;
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w, b.h) * 0.26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.gold;
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (b.tank) {
        ctx.fillStyle = '#7f8c8d';
        ctx.beginPath();
        ctx.arc(b.x + 16, b.y + 16, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawProps(world) {
    const cam = world.camera;
    // Market stalls, containers, fountains, palms, rocks, lamps.
    for (const s of world.city.stalls) {
      if (!inView(s.x, s.y, cam, 40)) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(s.x + 3, s.y + 3, s.w, s.h);
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#f7f2e4';
      ctx.fillRect(s.x, s.y, s.w, 8);
    }
    for (const c of world.city.containers) {
      if (!inView(c.x, c.y, cam, 40)) continue;
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(c.x, c.y, c.w, c.h);
    }
    for (const f of world.city.fountains) {
      if (!inView(f.x, f.y, cam, 60)) continue;
      ctx.fillStyle = '#8fb8c9';
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5fa8c4';
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const p of world.city.palms) {
      if (!inView(p.x, p.y, cam, 30)) continue;
      ctx.fillStyle = PALETTE.palmTrunk;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      ctx.fillStyle = PALETTE.palm;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#57a05c';
      ctx.beginPath();
      ctx.arc(p.x - 4, p.y - 3, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const r of world.city.rocks) {
      if (!inView(r.x, r.y, cam, 30)) continue;
      ctx.fillStyle = '#b59a6a';
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const lamp of world.city.lamps) {
      if (!inView(lamp.x, lamp.y, cam, 20)) continue;
      ctx.fillStyle = '#3a352f';
      ctx.fillRect(lamp.x - 2, lamp.y - 2, 4, 4);
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlace(x, y, label, cam) {
    if (!inView(x, y, cam, 40)) return;
    ctx.fillStyle = 'rgba(36,31,26,0.75)';
    roundRect(ctx, x - 34, y - 34, 68, 22, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 12px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y - 23);
  }

  function drawCity(world) {
    drawGround(world);
    drawRoads(world);
    drawBuildings(world);
    drawProps(world);
    // Named places: the garage, the safehouse, the repaint shop, the workshop.
    const cam = world.camera;
    drawPlace(world.city.garage.x, world.city.garage.y, 'GARAGE', cam);
    drawPlace(world.city.safehouse.x, world.city.safehouse.y, 'HOME', cam);
    drawPlace(world.city.repaint.x, world.city.repaint.y, 'PAINT', cam);
    drawPlace(world.city.workshop.x, world.city.workshop.y, 'AMMO', cam);
  }

  function drawCar(x, y, heading, color, model, lights, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, -CAR.length / 2 + 3, -CAR.width / 2 + 3, CAR.length, CAR.width, 8);
    ctx.fill();
    // Wheels.
    ctx.fillStyle = '#141414';
    ctx.fillRect(-CAR.length / 2 + 6, -CAR.width / 2 - 3, 12, 6);
    ctx.fillRect(-CAR.length / 2 + 6, CAR.width / 2 - 3, 12, 6);
    ctx.fillRect(CAR.length / 2 - 18, -CAR.width / 2 - 3, 12, 6);
    ctx.fillRect(CAR.length / 2 - 18, CAR.width / 2 - 3, 12, 6);
    // Body.
    ctx.fillStyle = color;
    roundRect(ctx, -CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width, 8);
    ctx.fill();
    // Roof and windshield.
    ctx.fillStyle = 'rgba(20,30,40,0.85)';
    roundRect(ctx, -8, -CAR.width / 2 + 5, 18, CAR.width - 10, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(CAR.length / 2 - 14, -CAR.width / 2 + 4, 4, CAR.width - 8);
    if (model === 'Taxi') {
      ctx.fillStyle = '#222';
      for (let i = 0; i < 6; i += 1) ctx.fillRect(-CAR.length / 2 + 6 + i * 9, -3, 5, 6);
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(-6, -CAR.width / 2 - 2, 12, 4);
    }
    if (model === 'Interceptor') {
      ctx.fillStyle = '#1c4ed8';
      ctx.fillRect(-10, -CAR.width / 2 + 3, 20, 5);
      const phase = Math.floor(time * 4) % 2 === 0;
      ctx.fillStyle = phase ? '#ff2d2d' : '#2d6bff';
      ctx.beginPath();
      ctx.arc(-4, -CAR.width / 2 - 1, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = phase ? '#2d6bff' : '#ff2d2d';
      ctx.beginPath();
      ctx.arc(6, -CAR.width / 2 - 1, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (lights) {
      ctx.fillStyle = 'rgba(255,240,180,0.85)';
      ctx.beginPath();
      ctx.arc(CAR.length / 2 + 2, -10, 3, 0, Math.PI * 2);
      ctx.arc(CAR.length / 2 + 2, 10, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPerson(x, y, heading, color, hasGun, muzzle, time) {
    ctx.save();
    ctx.translate(x, y);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body and head, facing the heading.
    ctx.rotate(heading);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(4, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    if (hasGun) {
      ctx.fillStyle = '#222';
      ctx.fillRect(8, -2, 12, 4);
      if (muzzle > 0) {
        ctx.fillStyle = '#ffe27a';
        ctx.beginPath();
        ctx.arc(24, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawEntities(world, time) {
    const cam = world.camera;
    // Cash, health and ammo pickups.
    for (const p of world.pickups) {
      if (!inView(p.x, p.y, cam, 30)) continue;
      const bob = Math.sin(p.bob * 3) * 3;
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      if (p.kind === 'cash') {
        ctx.fillStyle = PALETTE.gold;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8a6d1a';
        ctx.font = 'bold 11px ' + FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
      } else if (p.kind === 'health') {
        ctx.fillStyle = '#e5534b';
        ctx.fillRect(-8, -8, 16, 16);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-2, -6, 4, 12);
        ctx.fillRect(-6, -2, 12, 4);
      } else {
        ctx.fillStyle = '#3498db';
        ctx.fillRect(-8, -8, 16, 16);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px ' + FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('AMMO', 0, 0);
      }
      ctx.restore();
    }

    // Parked and drivable cars.
    for (const v of world.vehicles) {
      if (!inView(v.x, v.y, cam, 60)) continue;
      drawCar(v.x, v.y, v.heading, v.color, v.model, false, time);
    }
    // The debtor's fleeing coupe.
    if (world.state.chaseCar && world.state.chaseCar.active) {
      const c = world.state.chaseCar;
      if (inView(c.x, c.y, cam, 60)) drawCar(c.x, c.y, c.heading, c.color, c.model, true, time);
    }
    // Traffic.
    for (const t of world.traffic.cars) {
      if (!inView(t.x, t.y, cam, 60)) continue;
      const heading = t.axis === 'h' ? (t.dir === 1 ? 0 : Math.PI) : (t.dir === 1 ? Math.PI / 2 : -Math.PI / 2);
      drawCar(t.x, t.y, heading, t.color, t.model, false, time);
    }
    // Pedestrians.
    for (const ped of world.traffic.peds) {
      if (!inView(ped.x, ped.y, cam, 30)) continue;
      if (ped.state === 'down') {
        ctx.save();
        ctx.translate(ped.x, ped.y);
        ctx.rotate(ped.heading + Math.PI / 2);
        ctx.fillStyle = ped.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 13, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        drawPerson(ped.x, ped.y, ped.heading, ped.color, false, 0, time);
      }
    }
    // Rivals.
    for (const e of world.enemies) {
      if (e.health <= 0) continue;
      if (!inView(e.x, e.y, cam, 30)) continue;
      drawPerson(e.x, e.y, e.heading, e.color, true, 0, time);
      ctx.fillStyle = '#222';
      ctx.fillRect(e.x - 14, e.y - 22, 28, 5);
      ctx.fillStyle = '#e5534b';
      ctx.fillRect(e.x - 14, e.y - 22, 28 * (e.health / 60), 5);
    }
    // Police cars and officers.
    for (const pc of world.police.cars) {
      if (!inView(pc.x, pc.y, cam, 60)) continue;
      drawCar(pc.x, pc.y, pc.heading, pc.color, pc.model, true, time);
    }
    for (const officer of world.police.officers) {
      if (!inView(officer.x, officer.y, cam, 30)) continue;
      drawPerson(officer.x, officer.y, officer.heading, officer.color, false, 0, time);
    }
    // Bullets.
    ctx.fillStyle = '#ffe27a';
    for (const b of world.bullets) {
      if (!inView(b.x, b.y, cam, 20)) continue;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // The player.
    const p = world.player;
    if (p.inCar) {
      drawCar(p.x, p.y, p.heading, p.inCar.color, p.inCar.model, true, time);
    } else {
      const blink = p.invulnerable > 0 && Math.floor(time * 12) % 2 === 0;
      if (!blink) drawPerson(p.x, p.y, p.heading, PALETTE.player, p.hasPistol, p.muzzle, time);
    }
  }

  function drawMarker(world, time) {
    const target = world.missions.target();
    const fare = world.state.fare;
    let mark = null;
    let label = null;
    if (target) {
      mark = { x: target.x, y: target.y };
      label = 'OBJECTIVE';
    } else if (fare) {
      mark = fare.phase === 'pickup' ? { x: fare.x, y: fare.y } : { x: fare.dx, y: fare.dy };
      label = fare.phase === 'pickup' ? 'FARE' : 'DROP OFF';
    }
    if (!mark) return;
    const cam = world.camera;
    const pulse = 1 + Math.sin(time * 4) * 0.15;
    // Beacon in the world.
    ctx.save();
    ctx.strokeStyle = PALETTE.marker;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(mark.x, mark.y, 26 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.marker;
    ctx.beginPath();
    ctx.arc(mark.x, mark.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Arrow at the screen edge when the marker is off-screen.
    const sx = mark.x - (cam.x - VIEW.width / 2);
    const sy = mark.y - (cam.y - VIEW.height / 2);
    if (sx < 30 || sx > VIEW.width - 30 || sy < 30 || sy > VIEW.height - 30) {
      const cx = Math.max(40, Math.min(VIEW.width - 40, sx));
      const cy = Math.max(40, Math.min(VIEW.height - 40, sy));
      const angle = Math.atan2(sy - cy, sx - cx);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.fillStyle = PALETTE.marker;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-10, -11);
      ctx.lineTo(-10, 11);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = PALETTE.marker;
      ctx.font = 'bold 13px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cx, cy + 26);
    }
  }

  function drawMinimap(world) {
    const scale = MINIMAP.w / WORLD.width;
    ctx.fillStyle = 'rgba(20,16,12,0.85)';
    roundRect(ctx, MINIMAP.x - 4, MINIMAP.y - 4, MINIMAP.w + 8, MINIMAP.h + 8, 8);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, MINIMAP.x, MINIMAP.y, MINIMAP.w, MINIMAP.h, 4);
    ctx.clip();
    ctx.fillStyle = '#d9c48f';
    ctx.fillRect(MINIMAP.x, MINIMAP.y, MINIMAP.w, MINIMAP.h);
    ctx.fillStyle = '#2f7fa8';
    ctx.fillRect(MINIMAP.x, MINIMAP.y, SEA_X * scale, MINIMAP.h);
    ctx.fillStyle = '#3d3a38';
    for (const road of world.city.roads) {
      ctx.fillRect(MINIMAP.x + road.x * scale, MINIMAP.y + road.y * scale, Math.max(2, road.w * scale), Math.max(2, road.h * scale));
    }
    ctx.fillStyle = 'rgba(60,50,40,0.5)';
    for (const b of world.city.buildings) {
      ctx.fillRect(MINIMAP.x + b.x * scale, MINIMAP.y + b.y * scale, Math.max(1, b.w * scale), Math.max(1, b.h * scale));
    }
    const target = world.missions.target();
    if (target) {
      ctx.fillStyle = PALETTE.marker;
      ctx.beginPath();
      ctx.arc(MINIMAP.x + target.x * scale, MINIMAP.y + target.y * scale, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const pc of world.police.cars) {
      ctx.fillStyle = '#2d6bff';
      ctx.beginPath();
      ctx.arc(MINIMAP.x + pc.x * scale, MINIMAP.y + pc.y * scale, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const t of world.traffic.cars) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(MINIMAP.x + t.x * scale - 1, MINIMAP.y + t.y * scale - 1, 2, 2);
    }
    const p = world.player;
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(MINIMAP.x + p.x * scale, MINIMAP.y + p.y * scale, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(MINIMAP.x + p.x * scale, MINIMAP.y + p.y * scale, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 12px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(world.city.districtAt(p.x, p.y), MINIMAP.x, MINIMAP.y + MINIMAP.h + 14);
  }

  function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let cy = y;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, cy);
        line = word;
        cy += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, cy);
  }

  function drawHud(world, ui, time) {
    const p = world.player;
    const st = world.state;
    // A red edge pulse when the whole city is after the player.
    if (world.police.wanted >= 4) {
      const alpha = 0.10 + 0.08 * Math.sin(time * 5);
      ctx.fillStyle = `rgba(229,83,75,${alpha})`;
      ctx.fillRect(0, 0, VIEW.width, 10);
      ctx.fillRect(0, VIEW.height - 10, VIEW.width, 10);
      ctx.fillRect(0, 0, 10, VIEW.height);
      ctx.fillRect(VIEW.width - 10, 0, 10, VIEW.height);
    }
    // Top-left: health, money, wanted stars, ammo.
    ctx.fillStyle = 'rgba(20,16,12,0.72)';
    roundRect(ctx, 12, 12, 250, 86, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.muted;
    ctx.font = 'bold 12px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('HEALTH', 24, 30);
    ctx.fillStyle = '#222';
    ctx.fillRect(84, 22, 150, 14);
    ctx.fillStyle = p.health > 30 ? PALETTE.health : PALETTE.healthLow;
    ctx.fillRect(84, 22, 150 * Math.max(0, p.health / 100), 14);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 20px ' + FONT;
    ctx.fillText('$' + st.money, 24, 58);
    ctx.fillStyle = PALETTE.wanted;
    ctx.font = 'bold 22px ' + FONT;
    let stars = '';
    for (let i = 0; i < WANTED.max; i += 1) stars += i < world.police.wanted ? '★' : '☆';
    ctx.fillText(stars, 24, 84);
    if (p.hasPistol) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 15px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText(`AMMO ${p.ammo} / ${p.reserveAmmo}`, 250, 84);
      ctx.textAlign = 'left';
    }

    // Mission objective, top centre.
    const mission = world.missions.current;
    let stepText = null;
    if (mission && world.missions.active) {
      const step = world.missions.step;
      if (step.kind === 'shootout') {
        const left = world.enemies.filter((e) => e.health > 0).length;
        stepText = `Drive off the Sand Vipers (${left} left)`;
      } else {
        stepText = step.text;
      }
    }
    const objective = stepText || (world.missions.missionIndex >= 0 && !world.missions.active
      ? (world.state.storyDone ? 'Free roam — taxi fares pay the bills' : 'Press Enter for the next mission')
      : 'Press Enter to start the story');
    ctx.fillStyle = 'rgba(20,16,12,0.72)';
    const ow = Math.min(560, 40 + objective.length * 7.4);
    roundRect(ctx, (VIEW.width - ow) / 2, 12, ow, 34, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.objective;
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText((mission ? mission.name + ' — ' : '') + objective, VIEW.width / 2, 30);

    drawMinimap(world);

    // Speed, bottom right, while driving.
    if (p.inCar) {
      ctx.fillStyle = 'rgba(20,16,12,0.72)';
      roundRect(ctx, VIEW.width - 132, VIEW.height - 56, 120, 44, 10);
      ctx.fill();
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 24px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(Math.abs(p.inCar.speed) * 0.36) + ' km/h', VIEW.width - 72, VIEW.height - 34);
    }

    // Controls hint, bottom left.
    ctx.fillStyle = 'rgba(20,16,12,0.55)';
    roundRect(ctx, 12, VIEW.height - 36, 430, 24, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '12px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText(p.inCar ? 'WASD drive · Space brake · E get out · M mute · P pause' : 'WASD move · Shift run · E enter car · Click shoot · F punch · M mute', 22, VIEW.height - 24);

    // Prompt above the bottom bar.
    if (world.state.prompt) {
      ctx.fillStyle = 'rgba(20,16,12,0.8)';
      const pw = 40 + world.state.prompt.text.length * 7.2;
      roundRect(ctx, (VIEW.width - pw) / 2, VIEW.height - 92, pw, 30, 10);
      ctx.fill();
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 14px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(world.state.prompt.text, VIEW.width / 2, VIEW.height - 77);
    }

    // Banner, centre.
    if (world.state.banner) {
      ctx.fillStyle = 'rgba(20,16,12,0.85)';
      const bw = 60 + world.state.banner.length * 8;
      roundRect(ctx, (VIEW.width - bw) / 2, 120, bw, 40, 10);
      ctx.fill();
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 18px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(world.state.banner, VIEW.width / 2, 141);
    }

    // Dialogue box, bottom.
    const dialogue = world.missions.dialogue;
    if (dialogue) {
      ctx.fillStyle = 'rgba(20,16,12,0.88)';
      roundRect(ctx, 180, VIEW.height - 168, VIEW.width - 360, 64, 12);
      ctx.fill();
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 15px ' + FONT;
      ctx.textAlign = 'left';
      ctx.fillText(dialogue.who, 200, VIEW.height - 146);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '15px ' + FONT;
      wrapText(dialogue.text, 200, VIEW.height - 124, VIEW.width - 400, 19);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '12px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText('Enter ▸', VIEW.width - 200, VIEW.height - 146);
      ctx.textAlign = 'left';
    }

    if (ui.muted) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = 'bold 13px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText('MUTED (M)', VIEW.width - 14, VIEW.height - 66);
      ctx.textAlign = 'left';
    }
  }

  function panel(text, sub, color) {
    ctx.fillStyle = 'rgba(10,8,6,0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = color || PALETTE.text;
    ctx.font = 'bold 64px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, VIEW.width / 2, VIEW.height / 2 - 60);
    if (sub) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = '18px ' + FONT;
      ctx.fillText(sub, VIEW.width / 2, VIEW.height / 2 - 10);
    }
  }

  function drawTitle(world, ui, time) {
    ctx.fillStyle = 'rgba(10,8,6,0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 92px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ARAB TOWN', VIEW.width / 2, 190);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '28px ' + FONT;
    ctx.fillText('Qamar City — an open-world crime story', VIEW.width / 2, 250);
    ctx.font = '18px ' + FONT;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('Drive, steal, run fares, outrun the police — and finish all six missions.', VIEW.width / 2, 292);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 22px ' + FONT;
    const blink = Math.floor(time * 2) % 2 === 0;
    if (blink) ctx.fillText('Press Enter or click to start', VIEW.width / 2, 380);
    ctx.font = '15px ' + FONT;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('WASD move / drive · Shift run · E enter car · Mouse aim, click shoot · F punch · R reload', VIEW.width / 2, 440);
    ctx.fillText('P pause · M mute · progress saves automatically', VIEW.width / 2, 466);
    if (ui.best > 0) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 16px ' + FONT;
      ctx.fillText('Most money held: $' + ui.best, VIEW.width / 2, 520);
    }
  }

  function draw(world, screen, ui, time) {
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);
    ctx.save();
    const cam = world.camera;
    ctx.translate(-(cam.x - VIEW.width / 2), -(cam.y - VIEW.height / 2));
    drawCity(world);
    if (screen !== SCREEN_TITLE) {
      drawEntities(world, time);
    } else {
      // The title screen shows the city alive: traffic and people only.
      for (const t of world.traffic.cars) {
        const heading = t.axis === 'h' ? (t.dir === 1 ? 0 : Math.PI) : (t.dir === 1 ? Math.PI / 2 : -Math.PI / 2);
        drawCar(t.x, t.y, heading, t.color, t.model, false, time);
      }
      for (const ped of world.traffic.peds) {
        if (ped.state !== 'down') drawPerson(ped.x, ped.y, ped.heading, ped.color, false, 0, time);
      }
    }
    drawMarker(world, time);
    ctx.restore();

    if (screen === SCREEN_TITLE) {
      drawTitle(world, ui, time);
      return;
    }
    if (screen === SCREEN_PAUSED) {
      panel('PAUSED', 'Press P or Esc to keep playing', PALETTE.text);
      return;
    }
    if (screen === SCREEN_BUSTED) {
      panel('CAUGHT', 'The police took $' + WANTED.bustFine + '. Press Enter to walk out of the clinic.', PALETTE.wanted);
      return;
    }
    if (screen === SCREEN_WASTED) {
      panel('KNOCKED OUT', 'Press Enter to wake up at the safehouse.', PALETTE.healthLow);
      return;
    }
    drawHud(world, ui, time);
  }

  return { draw };
}
