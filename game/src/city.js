// Qamar City: a seeded road grid, buildings, palms, the harbour and the Port.
// The layout is deterministic for a seed, so a playtest can drive to a place
// by coordinates and find it there. This module also owns collision geometry:
// every building is an axis-aligned box, and the helpers below resolve circles
// (the player, cars, pedestrians) out of them.
import { WORLD_W, WORLD_H, ROAD_W, ROADS_X, ROADS_Y, DISTRICTS, PLACES } from './tune.js';
import { makeRng } from './rng.js';

const ROOFS = ['#c99a5b', '#b98a4e', '#a87c46', '#d8b878', '#9a6b3f', '#c2a06a', '#b4552d', '#8a6a4a'];
const WALLS = ['#e8d5ae', '#dfc491', '#d9b380', '#e3c99a', '#cfa878', '#d6bd8a'];

export function buildCity(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const containers = [];
  const palms = [];
  const speckles = [];

  // Blocks are the gaps between roads. Buildings stay inside them, so roads
  // are always clear and every place (which sits on a road) is reachable.
  const xGaps = [];
  let prev = 0;
  for (const rx of ROADS_X) {
    xGaps.push([prev, rx - ROAD_W / 2]);
    prev = rx + ROAD_W / 2;
  }
  xGaps.push([prev, WORLD_W]);
  const yGaps = [];
  prev = 0;
  for (const ry of ROADS_Y) {
    yGaps.push([prev, ry - ROAD_W / 2]);
    prev = ry + ROAD_W / 2;
  }
  yGaps.push([prev, WORLD_H]);

  for (const [x0, x1] of xGaps) {
    for (const [y0, y1] of yGaps) {
      const bw = x1 - x0;
      const bh = y1 - y0;
      if (bw < 70 || bh < 70) continue;
      const inPort = x0 >= 853 && x1 <= 1707 && y0 >= 960;
      // The Port waterfront (bottom row) holds containers, not buildings.
      if (inPort && y0 >= 1700) {
        const n = rng.int(2, 4);
        for (let i = 0; i < n; i += 1) {
          containers.push({
            x: x0 + 8 + rng.range(0, Math.max(1, bw - 70)),
            y: y0 + 8 + rng.range(0, Math.max(1, bh - 40)),
            w: rng.range(40, 64),
            h: 26,
            color: rng.pick(['#b4552d', '#2d6a8a', '#7a8c2f', '#c28a2e', '#5a5a66']),
          });
        }
        continue;
      }
      if (rng.chance(0.12)) continue; // plaza / empty lot
      const count = bw > 200 && bh > 200 && rng.chance(0.6) ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        const w = Math.min(bw - 24, rng.range(70, 170));
        const h = Math.min(bh - 24, rng.range(60, 150));
        const x = x0 + 12 + rng.range(0, Math.max(1, bw - w - 24));
        const y = y0 + 12 + rng.range(0, Math.max(1, bh - h - 24));
        buildings.push({
          x,
          y,
          w,
          h,
          roof: rng.pick(ROOFS),
          wall: rng.pick(WALLS),
          dome: rng.chance(0.22),
          windows: rng.int(2, 5),
        });
      }
    }
  }

  // Palms along sidewalks: never on a road, never inside a building.
  let guard = 0;
  while (palms.length < 90 && guard < 900) {
    guard += 1;
    const x = rng.range(40, WORLD_W - 40);
    const y = rng.range(40, WORLD_H - 40);
    if (pointOnRoad(x, y)) continue;
    let inside = false;
    for (const b of buildings) {
      if (x > b.x - 8 && x < b.x + b.w + 8 && y > b.y - 8 && y < b.y + b.h + 8) {
        inside = true;
        break;
      }
    }
    if (inside) continue;
    palms.push({ x, y, s: rng.range(0.8, 1.3) });
  }

  // Ground speckles for texture.
  for (let i = 0; i < 520; i += 1) {
    speckles.push({
      x: rng.range(0, WORLD_W),
      y: rng.range(0, WORLD_H),
      s: rng.range(1, 3),
      dark: rng.chance(0.5),
    });
  }

  return {
    seed,
    buildings,
    containers,
    palms,
    speckles,
    districts: DISTRICTS,
    places: PLACES,
    // The sea along the east edge, and the harbour basin at the Port.
    water: [
      { x: 2464, y: 0, w: 96, h: WORLD_H },
      { x: 853, y: 1856, w: 854, h: 64 },
    ],
  };
}

export function pointOnRoad(x, y) {
  for (const rx of ROADS_X) {
    if (Math.abs(x - rx) <= ROAD_W / 2 + 4) return true;
  }
  for (const ry of ROADS_Y) {
    if (Math.abs(y - ry) <= ROAD_W / 2 + 4) return true;
  }
  return false;
}

// The building a circle overlaps, or null.
export function circleHitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return b;
  }
  return null;
}

// Push a circle (entity with x, y) out of every building and the world edge.
// Returns true when anything was hit.
export function resolveCircle(city, e, r) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(e.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(e.y, b.y + b.h));
    const dx = e.x - cx;
    const dy = e.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      hit = true;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        e.x = cx + (dx / d) * r;
        e.y = cy + (dy / d) * r;
      } else {
        const pl = e.x - b.x;
        const pr = b.x + b.w - e.x;
        const pt = e.y - b.y;
        const pb = b.y + b.h - e.y;
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) e.x = b.x - r;
        else if (m === pr) e.x = b.x + b.w + r;
        else if (m === pt) e.y = b.y - r;
        else e.y = b.y + b.h + r;
      }
    }
  }
  const ox = Math.max(r, Math.min(WORLD_W - r, e.x));
  const oy = Math.max(r, Math.min(WORLD_H - r, e.y));
  if (ox !== e.x || oy !== e.y) {
    hit = true;
    e.x = ox;
    e.y = oy;
  }
  return hit;
}

// A point on a road near (x, y): snap to the closest road centre line.
export function nearestRoadPoint(x, y) {
  let bestX = ROADS_X[0];
  let bestDx = Infinity;
  for (const rx of ROADS_X) {
    const d = Math.abs(x - rx);
    if (d < bestDx) {
      bestDx = d;
      bestX = rx;
    }
  }
  let bestY = ROADS_Y[0];
  let bestDy = Infinity;
  for (const ry of ROADS_Y) {
    const d = Math.abs(y - ry);
    if (d < bestDy) {
      bestDy = d;
      bestY = ry;
    }
  }
  if (bestDx <= bestDy) return { x: bestX, y: Math.max(40, Math.min(WORLD_H - 40, y)) };
  return { x: Math.max(40, Math.min(WORLD_W - 40, x)), y: bestY };
}

export function randomRoadPoint(rng) {
  if (rng.chance(0.5)) {
    return { x: rng.pick(ROADS_X), y: rng.range(60, WORLD_H - 60) };
  }
  return { x: rng.range(60, WORLD_W - 60), y: rng.pick(ROADS_Y) };
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return DISTRICTS[0];
}
