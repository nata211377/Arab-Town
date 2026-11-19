// All drawing: the city, the cars and people, the HUD, the minimap and the
// screens. Nothing here changes game state; it only reads it.
import { WORLD_W, WORLD_H, ROAD_W, ROADS_X, ROADS_Y, PLACES } from './tune.js';
import { missionMarker, MISSIONS, foesAlive } from './jobs.js';
import { districtAt } from './city.js';

const FONT = 'Arial, sans-serif';

export function render(G, ctx) {
  const vw = G.view.w;
  const vh = G.view.h;
  ctx.save();
  if (G.mode === 'title') {
    drawTitle(G, ctx);
    ctx.restore();
    return;
  }
  const shx = G.shake > 0 ? (Math.random() - 0.5) * G.shake : 0;
  const shy = G.shake > 0 ? (Math.random() - 0.5) * G.shake : 0;
  const camX = G.camera.x + shx;
  const camY = G.camera.y + shy;
  ctx.translate(vw / 2 - camX, vh / 2 - camY);
  const vx0 = camX - vw / 2 - 60;
  const vy0 = camY - vh / 2 - 60;
  const vx1 = camX + vw / 2 + 60;
  const vy1 = camY + vh / 2 + 60;
  drawGround(G, ctx, vx0, vy0, vx1, vy1);
  drawWater(G, ctx, vx0, vy0, vx1, vy1);
  drawRoads(G, ctx, vx0, vy0, vx1, vy1);
  drawBuildings(G, ctx, vx0, vy0, vx1, vy1);
  drawContainers(G, ctx, vx0, vy0, vx1, vy1);
  drawPalms(G, ctx, vx0, vy0, vx1, vy1);
  drawPickups(G, ctx);
  drawPlaces(G, ctx);
  drawMarker(G, ctx);
  drawFare(G, ctx);
  const items = [];
  for (const c of G.cars) items.push({ y: c.y, f: () => drawCar(G, ctx, c) });
  for (const pd of G.peds) items.push({ y: pd.y, f: () => drawPed(ctx, pd) });
  for (const f of G.foes) items.push({ y: f.y, f: () => drawFoe(ctx, f) });
  items.push({ y: G.player.y, f: () => drawPlayer(G, ctx) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();
  drawBullets(G, ctx);
  drawParts(G, ctx);
  drawFloats(G, ctx);
  ctx.restore();
  drawHUD(G, ctx);
  if (G.dialogue) drawDialogue(G, ctx);
  if (G.mode === 'pause') drawPause(G, ctx);
  if (G.mode === 'busted') drawEndCard(G, ctx, 'BUSTED', 'The police caught you. Fine paid — back to the clinic.');
  if (G.mode === 'knocked') drawEndCard(G, ctx, 'KNOCKED OUT', 'You went down. The clinic patched you up — for a fee.');
}

function inView(x, y, vx0, vy0, vx1, vy1) {
  return x >= vx0 && x <= vx1 && y >= vy0 && y <= vy1;
}

function drawGround(G, ctx, vx0, vy0, vx1, vy1) {
  ctx.fillStyle = '#d9b380';
  ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  for (const d of G.city.districts) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(d.x, d.y, d.w, d.h);
  }
  for (const s of G.city.speckles) {
    if (!inView(s.x, s.y, vx0, vy0, vx1, vy1)) continue;
    ctx.fillStyle = s.dark ? 'rgba(120,90,50,0.25)' : 'rgba(255,240,200,0.25)';
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.textAlign = 'center';
  ctx.font = `700 44px ${FONT}`;
  for (const d of G.city.districts) {
    if (!inView(d.x + d.w / 2, d.y + d.h / 2, vx0 - 400, vy0 - 400, vx1 + 400, vy1 + 400)) continue;
    ctx.fillStyle = 'rgba(90,60,30,0.20)';
    ctx.fillText(d.name.toUpperCase(), d.x + d.w / 2, d.y + d.h / 2);
  }
}

function drawWater(G, ctx, vx0, vy0, vx1, vy1) {
  for (const w of G.city.water) {
    if (w.x > vx1 || w.x + w.w < vx0 || w.y > vy1 || w.y + w.h < vy0) continue;
    ctx.fillStyle = '#3f8fb5';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    for (let y = w.y + 14; y < w.y + w.h; y += 26) {
      ctx.beginPath();
      for (let x = w.x; x <= w.x + w.w; x += 16) {
        const yy = y + Math.sin(x * 0.05 + G.time * 2) * 3;
        if (x === w.x) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }
}

function drawRoads(G, ctx, vx0, vy0, vx1, vy1) {
  ctx.fillStyle = '#3d3d44';
  for (const rx of ROADS_X) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD_H);
  for (const ry of ROADS_Y) ctx.fillRect(0, ry - ROAD_W / 2, WORLD_W, ROAD_W);
  // Centre dashes.
  ctx.fillStyle = '#d8b93a';
  for (const rx of ROADS_X) {
    if (rx < vx0 || rx > vx1) continue;
    for (let y = 0; y < WORLD_H; y += 56) {
      if (y < vy0 - 30 || y > vy1 + 30) continue;
      ctx.fillRect(rx - 2, y, 4, 28);
    }
  }
  for (const ry of ROADS_Y) {
    if (ry < vy0 || ry > vy1) continue;
    for (let x = 0; x < WORLD_W; x += 56) {
      if (x < vx0 - 30 || x > vx1 + 30) continue;
      ctx.fillRect(x, ry - 2, 28, 4);
    }
  }
  // Crosswalks at intersections.
  ctx.fillStyle = 'rgba(240,240,230,0.75)';
  for (const rx of ROADS_X) {
    for (const ry of ROADS_Y) {
      if (rx < vx0 - 80 || rx > vx1 + 80 || ry < vy0 - 80 || ry > vy1 + 80) continue;
      for (let i = -3; i <= 3; i += 1) {
        ctx.fillRect(rx - 28 + i * 9, ry - ROAD_W / 2 + 4, 5, 10);
        ctx.fillRect(rx - 28 + i * 9, ry + ROAD_W / 2 - 14, 5, 10);
      }
    }
  }
}

function drawBuildings(G, ctx, vx0, vy0, vx1, vy1) {
  for (const b of G.city.buildings) {
    if (b.x + b.w < vx0 || b.x > vx1 || b.y + b.h < vy0 || b.y > vy1) continue;
    ctx.fillStyle = 'rgba(60,40,20,0.25)';
    ctx.fillRect(b.x + 4, b.y + 5, b.w, b.h);
    ctx.fillStyle = b.wall;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
    ctx.fillStyle = 'rgba(40,30,20,0.55)';
    const cols = Math.max(1, Math.floor(b.w / 26));
    const rows = Math.max(1, Math.floor(b.h / 26));
    for (let i = 0; i < cols; i += 1) {
      for (let j = 0; j < rows; j += 1) {
        ctx.fillRect(b.x + 10 + i * 26, b.y + 10 + j * 26, 9, 12);
      }
    }
    if (b.dome) {
      ctx.fillStyle = '#e8dcc0';
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w, b.h) * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawContainers(G, ctx, vx0, vy0, vx1, vy1) {
  for (const c of G.city.containers) {
    if (c.x + c.w < vx0 || c.x > vx1 || c.y + c.h < vy0 || c.y > vy1) continue;
    ctx.fillStyle = c.color;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let x = c.x + 6; x < c.x + c.w; x += 10) ctx.fillRect(x, c.y + 3, 2, c.h - 6);
  }
}

function drawPalms(G, ctx, vx0, vy0, vx1, vy1) {
  for (const p of G.city.palms) {
    if (!inView(p.x, p.y, vx0, vy0, vx1, vy1)) continue;
    ctx.strokeStyle = '#7a5a34';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 3 * p.s, p.y - 14 * p.s);
    ctx.stroke();
    ctx.strokeStyle = '#3f7a34';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI / 2 + (i - 2) * 0.5;
      ctx.beginPath();
      ctx.moveTo(p.x + 3 * p.s, p.y - 14 * p.s);
      ctx.lineTo(p.x + 3 * p.s + Math.cos(a) * 12 * p.s, p.y - 14 * p.s + Math.sin(a) * 10 * p.s);
      ctx.stroke();
    }
  }
}

function drawPickups(G, ctx) {
  for (const pk of G.pickups) {
    const bob = Math.sin(G.time * 3 + pk.x) * 3;
    const y = pk.y + bob;
    if (pk.kind === 'cash') {
      ctx.fillStyle = '#2e8a4a';
      ctx.beginPath();
      ctx.arc(pk.x, y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8f5e8';
      ctx.font = `700 13px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('$', pk.x, y + 5);
    } else if (pk.kind === 'health') {
      ctx.fillStyle = '#f5f5f0';
      ctx.beginPath();
      ctx.arc(pk.x, y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2e8a4a';
      ctx.fillRect(pk.x - 2, y - 7, 4, 14);
      ctx.fillRect(pk.x - 7, y - 2, 14, 4);
    } else {
      ctx.fillStyle = '#c28a2e';
      ctx.fillRect(pk.x - 9, y - 7, 18, 14);
      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(pk.x - 5, y - 4, 3, 8);
      ctx.fillRect(pk.x, y - 4, 3, 8);
      ctx.fillRect(pk.x + 5, y - 4, 3, 8);
    }
  }
}

function drawPlaces(G, ctx) {
  const marks = [
    { x: PLACES.clinic.x, y: PLACES.clinic.y, label: 'CLINIC', color: '#2e8a4a' },
    { x: PLACES.ammoShop.x, y: PLACES.ammoShop.y, label: 'AMMO SOUQ', color: '#c28a2e' },
    { x: PLACES.garage.x, y: PLACES.garage.y, label: 'QAMAR CUSTOMS', color: '#7a5ac2' },
  ];
  ctx.textAlign = 'center';
  ctx.font = `700 11px ${FONT}`;
  for (const m of marks) {
    ctx.strokeStyle = m.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 26 + Math.sin(G.time * 2) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = m.color;
    ctx.fillText(m.label, m.x, m.y - 32);
  }
}

function drawMarker(G, ctx) {
  const mk = missionMarker(G);
  if (!mk) return;
  const pulse = 26 + Math.sin(G.time * 4) * 5;
  ctx.strokeStyle = '#ffd21a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(mk.x, mk.y, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd21a';
  ctx.beginPath();
  ctx.moveTo(mk.x, mk.y - 44);
  ctx.lineTo(mk.x - 9, mk.y - 62);
  ctx.lineTo(mk.x + 9, mk.y - 62);
  ctx.closePath();
  ctx.fill();
  ctx.font = `700 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1a1208';
  ctx.fillText(mk.label, mk.x, mk.y - 68);
}

function drawFare(G, ctx) {
  if (!G.fare) return;
  const f = G.fare;
  ctx.fillStyle = '#2e8a4a';
  ctx.beginPath();
  ctx.arc(f.x, f.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('$', f.x, f.y + 5);
}

function drawCar(G, ctx, c) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-22, -9, 46, 22);
  ctx.fillStyle = c.color;
  roundRect(ctx, -23, -11, 46, 22, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(30,40,60,0.85)';
  roundRect(ctx, -6, -9, 16, 18, 4);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(-18, -13, 8, 4);
  ctx.fillRect(-18, 9, 8, 4);
  ctx.fillRect(12, -13, 8, 4);
  ctx.fillRect(12, 9, 8, 4);
  if (c.kind === 'taxi') {
    ctx.fillStyle = '#1a1a1a';
    for (let x = -20; x < 20; x += 8) ctx.fillRect(x, -11, 4, 3);
    ctx.fillStyle = '#ffd21a';
    ctx.fillRect(-4, -15, 10, 5);
  }
  if (c.kind === 'police') {
    ctx.fillStyle = '#2456c2';
    ctx.fillRect(-8, -11, 18, 4);
    const flash = Math.sin(G.time * 10 + c.id) > 0;
    ctx.fillStyle = flash ? '#ff2e2e' : '#2e6bff';
    ctx.fillRect(-2, -14, 7, 5);
    ctx.fillStyle = flash ? '#2e6bff' : '#ff2e2e';
    ctx.fillRect(6, -14, 7, 5);
  }
  if (c.kind === 'sport') {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-25, -8, 6, 16);
  }
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(24, -6, 2.5, 0, Math.PI * 2);
  ctx.arc(24, 6, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (c.health < 100 && c.health > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(c.x - 20, c.y - 30, 40, 5);
    ctx.fillStyle = c.health > 50 ? '#7de07d' : '#ff5a4a';
    ctx.fillRect(c.x - 20, c.y - 30, 40 * (c.health / 100), 5);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPed(ctx, pd) {
  if (pd.state === 'down') {
    ctx.fillStyle = '#8a8a8a';
    ctx.beginPath();
    ctx.ellipse(pd.x, pd.y, 12, 6, pd.angle, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.fillStyle = pd.color;
  ctx.beginPath();
  ctx.arc(pd.x, pd.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c9a0';
  ctx.beginPath();
  ctx.arc(pd.x + Math.cos(pd.angle) * 3, pd.y + Math.sin(pd.angle) * 3, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawFoe(ctx, f) {
  ctx.fillStyle = f.kind === 'boss' ? '#8a6d1a' : '#7a1e1e';
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.radius + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c23b2e';
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(f.x, f.y);
  ctx.lineTo(f.x + Math.cos(f.angle) * (f.radius + 10), f.y + Math.sin(f.angle) * (f.radius + 10));
  ctx.stroke();
  if (f.kind === 'boss') {
    ctx.fillStyle = '#ffd21a';
    ctx.font = `700 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('KHALID', f.x, f.y - f.radius - 14);
  }
  const max = f.kind === 'boss' ? 240 : 60;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(f.x - 18, f.y - f.radius - 10, 36, 4);
  ctx.fillStyle = '#ff5a4a';
  ctx.fillRect(f.x - 18, f.y - f.radius - 10, 36 * Math.max(0, f.health / max), 4);
}

function drawPlayer(G, ctx) {
  const p = G.player;
  if (!p.onFoot) return;
  if (p.invuln > 0 && Math.floor(G.time * 12) % 2 === 0) return;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 8, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e7a6a';
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c9a0';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.angle) * 20, p.y + Math.sin(p.angle) * 20);
  ctx.stroke();
}

function drawBullets(G, ctx) {
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 3;
  for (const b of G.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

function drawParts(G, ctx) {
  for (const pt of G.parts) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
}

function drawFloats(G, ctx) {
  ctx.textAlign = 'center';
  ctx.font = `700 14px ${FONT}`;
  for (const f of G.floats) {
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawHUD(G, ctx) {
  const vw = G.view.w;
  const vh = G.view.h;
  ctx.textAlign = 'left';
  // Health + money, top left.
  ctx.fillStyle = 'rgba(10,10,14,0.55)';
  roundRect(ctx, 12, 12, 240, 62, 8);
  ctx.fill();
  ctx.fillStyle = '#e8e8e8';
  ctx.font = `700 13px ${FONT}`;
  ctx.fillText('HEALTH', 22, 30);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(80, 20, 150, 12);
  ctx.fillStyle = G.health > 50 ? '#7de07d' : G.health > 25 ? '#ffd21a' : '#ff5a4a';
  ctx.fillRect(80, 20, 150 * Math.max(0, G.health / G.maxHealth), 12);
  ctx.fillStyle = '#ffd21a';
  ctx.font = `700 20px ${FONT}`;
  ctx.fillText(`$${G.money}`, 22, 62);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = `400 12px ${FONT}`;
  ctx.fillText(`Missions ${G.missionsDone.length}/6`, 130, 62);
  // Wanted stars, top centre.
  ctx.textAlign = 'center';
  ctx.font = '26px Arial, sans-serif';
  let stars = '';
  for (let i = 0; i < 5; i += 1) stars += i < G.wanted ? '★' : '☆';
  ctx.fillStyle = G.wanted > 0 ? '#ffd21a' : 'rgba(232,232,232,0.5)';
  ctx.fillText(stars, vw / 2, 38);
  if (G.wanted > 0) {
    ctx.fillStyle = '#ff5a4a';
    ctx.font = `700 12px ${FONT}`;
    ctx.fillText('WANTED', vw / 2, 56);
  }
  // District toast.
  if (G.toast && G.toast.t > 0) {
    ctx.globalAlpha = Math.min(1, G.toast.t);
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 20px ${FONT}`;
    ctx.fillText(G.toast.text, vw / 2, 84);
    ctx.globalAlpha = 1;
  }
  // Objective, top right.
  const mk = missionMarker(G);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(10,10,14,0.55)';
  roundRect(ctx, vw - 292, 12, 280, 62, 8);
  ctx.fill();
  ctx.fillStyle = '#ffd21a';
  ctx.font = `700 13px ${FONT}`;
  if (G.activeMission) {
    ctx.fillText(G.activeMission.def.name.toUpperCase(), vw - 22, 30);
    ctx.fillStyle = '#e8e8e8';
    ctx.font = `400 13px ${FONT}`;
    ctx.fillText(mk ? mk.label : '', vw - 22, 50);
    const step = G.activeMission.def.steps[G.activeMission.step];
    if (step && (step.kind === 'survive' || step.kind === 'timed')) {
      ctx.fillStyle = '#ff8a5a';
      ctx.font = `700 15px ${FONT}`;
      ctx.fillText(`${Math.max(0, Math.ceil(G.activeMission.t))}s`, vw - 22, 68);
    }
  } else if (G.nextMission < MISSIONS.length) {
    ctx.fillText('NEXT MISSION', vw - 22, 30);
    ctx.fillStyle = '#e8e8e8';
    ctx.font = `400 13px ${FONT}`;
    ctx.fillText(`${MISSIONS[G.nextMission].name} — ${MISSIONS[G.nextMission].giver}`, vw - 22, 50);
  } else {
    ctx.fillText('CITY IS YOURS', vw - 22, 30);
    ctx.fillStyle = '#e8e8e8';
    ctx.font = `400 13px ${FONT}`;
    ctx.fillText('All missions complete', vw - 22, 50);
  }
  // Bottom left: ammo / speed.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(10,10,14,0.55)';
  roundRect(ctx, 12, vh - 64, 210, 52, 8);
  ctx.fill();
  if (G.player.onFoot) {
    ctx.fillStyle = '#e8e8e8';
    ctx.font = `700 16px ${FONT}`;
    ctx.fillText(G.hasPistol ? `AMMO  ${G.ammo} / ${G.reserve}` : 'NO PISTOL', 22, vh - 40);
    ctx.font = `400 12px ${FONT}`;
    ctx.fillStyle = '#b8b8b8';
    ctx.fillText('LMB shoot • F punch • R reload', 22, vh - 22);
  } else {
    const kmh = Math.round(Math.abs(G.player.speed || 0) * 0.9);
    ctx.fillStyle = '#e8e8e8';
    ctx.font = `700 20px ${FONT}`;
    ctx.fillText(`${kmh} km/h`, 22, vh - 38);
    const car = G.player.car;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(110, vh - 50, 90, 10);
    ctx.fillStyle = car && car.health > 50 ? '#7de07d' : '#ff5a4a';
    ctx.fillRect(110, vh - 50, 90 * Math.max(0, (car ? car.health : 0) / 100), 10);
    ctx.font = `400 12px ${FONT}`;
    ctx.fillStyle = '#b8b8b8';
    ctx.fillText('W drive • S brake • Space handbrake', 22, vh - 22);
  }
  // Interact prompt, bottom centre.
  if (G.prompt) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,10,14,0.65)';
    const w = ctx.measureText(G.prompt).width + 28;
    roundRect(ctx, vw / 2 - w / 2, vh - 120, w, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd21a';
    ctx.font = `700 14px ${FONT}`;
    ctx.fillText(G.prompt, vw / 2, vh - 100);
  }
  // Banner.
  if (G.banner && G.banner.t > 0) {
    ctx.globalAlpha = Math.min(1, G.banner.t);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd21a';
    ctx.font = `700 44px ${FONT}`;
    ctx.fillText(G.banner.text, vw / 2, vh / 2 - 60);
    ctx.fillStyle = '#ffffff';
    ctx.font = `400 20px ${FONT}`;
    ctx.fillText(G.banner.sub, vw / 2, vh / 2 - 28);
    ctx.globalAlpha = 1;
  }
  drawMinimap(G, ctx);
  // Aim reticle.
  if (G.mode === 'play' && G.player.onFoot && G.hasPistol && !G.dialogue) {
    const mx = G.mouseX || 0;
    const my = G.mouseY || 0;
    ctx.strokeStyle = '#ffd21a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, my, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx - 13, my);
    ctx.lineTo(mx - 5, my);
    ctx.moveTo(mx + 5, my);
    ctx.lineTo(mx + 13, my);
    ctx.moveTo(mx, my - 13);
    ctx.lineTo(mx, my - 5);
    ctx.moveTo(mx, my + 5);
    ctx.lineTo(mx, my + 13);
    ctx.stroke();
  }
}

function drawMinimap(G, ctx) {
  const vw = G.view.w;
  const vh = G.view.h;
  const mmW = 220;
  const mmH = 160;
  const mmX = vw - mmW - 12;
  const mmY = vh - mmH - 12;
  const sx = mmW / WORLD_W;
  const sy = mmH / WORLD_H;
  ctx.fillStyle = 'rgba(10,10,14,0.7)';
  roundRect(ctx, mmX - 4, mmY - 4, mmW + 8, mmH + 8, 8);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(mmX, mmY, mmW, mmH);
  ctx.clip();
  for (const d of G.city.districts) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(mmX + d.x * sx, mmY + d.y * sy, d.w * sx, d.h * sy);
  }
  for (const w of G.city.water) {
    ctx.fillStyle = '#3f8fb5';
    ctx.fillRect(mmX + w.x * sx, mmY + w.y * sy, w.w * sx, w.h * sy);
  }
  ctx.strokeStyle = '#3d3d44';
  ctx.lineWidth = 2;
  for (const rx of ROADS_X) {
    ctx.beginPath();
    ctx.moveTo(mmX + rx * sx, mmY);
    ctx.lineTo(mmX + rx * sx, mmY + mmH);
    ctx.stroke();
  }
  for (const ry of ROADS_Y) {
    ctx.beginPath();
    ctx.moveTo(mmX, mmY + ry * sy);
    ctx.lineTo(mmX + mmW, mmY + ry * sy);
    ctx.stroke();
  }
  const dot = (x, y, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mmX + x * sx, mmY + y * sy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  dot(PLACES.clinic.x, PLACES.clinic.y, '#2e8a4a', 3);
  dot(PLACES.ammoShop.x, PLACES.ammoShop.y, '#c28a2e', 3);
  dot(PLACES.garage.x, PLACES.garage.y, '#7a5ac2', 3);
  if (G.fare) dot(G.fare.x, G.fare.y, '#2e8a4a', 4);
  for (const c of G.cars) {
    if (c.kind === 'police') dot(c.x, c.y, '#2e6bff', 3);
  }
  for (const f of G.foes) dot(f.x, f.y, '#ff2e2e', 3);
  const mk = missionMarker(G);
  if (mk) {
    ctx.fillStyle = '#ffd21a';
    const mx = mmX + mk.x * sx;
    const my = mmY + mk.y * sy;
    ctx.beginPath();
    ctx.moveTo(mx, my - 6);
    ctx.lineTo(mx + 5, my + 4);
    ctx.lineTo(mx - 5, my + 4);
    ctx.closePath();
    ctx.fill();
  }
  // Player arrow.
  const px = mmX + G.player.x * sx;
  const py = mmY + G.player.y * sy;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(G.player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // View rectangle.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  const vx0 = (G.camera.x - G.view.w / 2) * sx;
  const vy0 = (G.camera.y - G.view.h / 2) * sy;
  ctx.strokeRect(mmX + vx0, mmY + vy0, G.view.w * sx, G.view.h * sy);
  ctx.restore();
}

function drawDialogue(G, ctx) {
  const vw = G.view.w;
  const vh = G.view.h;
  const d = G.dialogue;
  const line = d.lines[d.i];
  const w = Math.min(680, vw - 80);
  const h = 110;
  const x = (vw - w) / 2;
  const y = vh - h - 140;
  ctx.fillStyle = 'rgba(12,10,8,0.88)';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = '#ffd21a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd21a';
  ctx.font = `700 15px ${FONT}`;
  ctx.fillText(line[0], x + 18, y + 26);
  ctx.fillStyle = '#f5f0e6';
  ctx.font = `400 16px ${FONT}`;
  wrapText(ctx, line[1], x + 18, y + 52, w - 36, 22);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#b8b8b8';
  ctx.font = `400 12px ${FONT}`;
  ctx.fillText('Enter ▸', x + w - 14, y + h - 12);
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineH;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}

function drawTitle(G, ctx) {
  const vw = G.view.w;
  const vh = G.view.h;
  const grad = ctx.createLinearGradient(0, 0, 0, vh);
  grad.addColorStop(0, '#ffdf9e');
  grad.addColorStop(0.55, '#f7b267');
  grad.addColorStop(1, '#c97e4a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, vw, vh);
  // Sun, kept clear of the title.
  const sunX = vw * 0.85;
  const sunY = vh * 0.12;
  const pulse = 1 + Math.sin(G.time * 1.2) * 0.03;
  ctx.fillStyle = 'rgba(255,244,200,0.9)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 52 * pulse, 0, Math.PI * 2);
  ctx.fill();
  // Skyline silhouette.
  ctx.fillStyle = 'rgba(90,50,25,0.55)';
  const base = vh * 0.72;
  let bx = 0;
  const rng = (i) => ((i * 2654435761) % 1000) / 1000;
  for (let i = 0; bx < vw; i += 1) {
    const bw = 60 + rng(i) * 90;
    const bh = 60 + rng(i + 7) * 150;
    ctx.fillRect(bx, base - bh, bw, bh + vh);
    if (rng(i + 3) > 0.7) {
      ctx.beginPath();
      ctx.arc(bx + bw / 2, base - bh, 16, Math.PI, 0);
      ctx.fill();
    }
    bx += bw + 8;
  }
  ctx.fillStyle = '#3d3d44';
  ctx.fillRect(0, base, vw, vh - base);
  ctx.fillStyle = '#d8b93a';
  for (let x = 0; x < vw; x += 70) ctx.fillRect(x, base + (vh - base) / 2, 34, 4);
  // Title.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2a1608';
  ctx.font = `900 ${Math.min(96, vw * 0.09)}px ${FONT}`;
  ctx.fillText('ARAB TOWN', vw / 2, vh * 0.34);
  ctx.fillStyle = '#fff3d6';
  ctx.font = `700 ${Math.min(30, vw * 0.028)}px ${FONT}`;
  ctx.fillText('— QAMAR CITY —', vw / 2, vh * 0.34 + 44);
  ctx.fillStyle = '#2a1608';
  ctx.font = `400 17px ${FONT}`;
  ctx.fillText('A sun-soaked open-world crime story. Drive, steal, run the city.', vw / 2, vh * 0.34 + 78);
  // Menu.
  const items = ['New Game'];
  if (G.hasSaveFlag) items.push('Continue');
  items.push('How to play');
  const my = vh * 0.58;
  ctx.font = `700 22px ${FONT}`;
  items.forEach((item, i) => {
    const y = my + i * 40;
    if (G.titleChoice === i) {
      ctx.fillStyle = '#ffd21a';
      ctx.fillText(`▶ ${item}`, vw / 2, y);
    } else {
      ctx.fillStyle = 'rgba(42,22,8,0.75)';
      ctx.fillText(item, vw / 2, y);
    }
  });
  ctx.fillStyle = 'rgba(42,22,8,0.8)';
  ctx.font = `400 14px ${FONT}`;
  ctx.fillText('WASD move / drive • E enter car & talk • Mouse aim, click shoot • R reload • P pause • M mute', vw / 2, vh - 56);
  ctx.fillText('An original game. No network, no files leave your machine. Progress saves automatically.', vw / 2, vh - 32);
}

function drawPause(G, ctx) {
  const vw = G.view.w;
  const vh = G.view.h;
  ctx.fillStyle = 'rgba(8,8,12,0.6)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 46px ${FONT}`;
  ctx.fillText('PAUSED', vw / 2, vh / 2 - 20);
  ctx.font = `400 17px ${FONT}`;
  ctx.fillStyle = '#d8d8d8';
  ctx.fillText('P / Esc — resume      Q — save and quit to title', vw / 2, vh / 2 + 22);
}

function drawEndCard(G, ctx, title, sub) {
  const vw = G.view.w;
  const vh = G.view.h;
  ctx.fillStyle = 'rgba(20,4,4,0.72)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5a4a';
  ctx.font = `900 64px ${FONT}`;
  ctx.fillText(title, vw / 2, vh / 2 - 10);
  ctx.fillStyle = '#ffffff';
  ctx.font = `400 18px ${FONT}`;
  ctx.fillText(sub, vw / 2, vh / 2 + 28);
  ctx.fillStyle = '#ffd21a';
  ctx.font = `700 16px ${FONT}`;
  ctx.fillText('Press Enter to continue', vw / 2, vh / 2 + 66);
}
