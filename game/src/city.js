// Qamar City, generated from one seed: a grid of two-way roads, blocks of sandstone
// buildings with domes and rooftop tanks, a corniche along the western sea, market
// stalls in the Old Souq, shipping containers at the Port, a fountain plaza in
// Al-Bahr, and desert dunes along the south edge. The city never allocates after
// creation; it hands out collision tests and road helpers to the rest of the game.

import { CITY, DESERT_Y, GARAGE, LANE, PALETTE, REPAINT, ROADS_X, ROADS_Y, ROAD_WIDTH, SAFEHOUSE, SEA_X, WORLD, WORKSHOP } from './config.js';
import { pick, range } from './random.js';

const SIDEWALK = 14;

export function createCity(random) {
  const buildings = [];
  const palms = [];
  const stalls = [];
  const containers = [];
  const rocks = [];
  const fountains = [];
  const lamps = [];

  function roadRects() {
    const rects = [];
    for (const y of ROADS_Y) rects.push({ x: SEA_X, y: y - ROAD_WIDTH / 2, w: WORLD.width - SEA_X, h: ROAD_WIDTH });
    for (const x of ROADS_X) rects.push({ x: x - ROAD_WIDTH / 2, y: 0, w: ROAD_WIDTH, h: WORLD.height });
    return rects;
  }
  const roads = roadRects();

  function onRoad(x, y, margin = 0) {
    for (const road of roads) {
      if (x >= road.x - margin && x <= road.x + road.w + margin && y >= road.y - margin && y <= road.y + road.h + margin) return true;
    }
    return false;
  }

  /** The block rectangles between neighbouring roads (and the world edges). */
  function blocks() {
    const xs = [SEA_X + 40, ...ROADS_X, WORLD.width];
    const ys = [0, ...ROADS_Y, WORLD.height];
    const list = [];
    for (let i = 0; i < xs.length - 1; i += 1) {
      for (let j = 0; j < ys.length - 1; j += 1) {
        const x0 = xs[i] + ROAD_WIDTH / 2 + SIDEWALK;
        const x1 = xs[i + 1] - ROAD_WIDTH / 2 - SIDEWALK;
        const y0 = ys[j] + ROAD_WIDTH / 2 + SIDEWALK;
        const y1 = ys[j + 1] - ROAD_WIDTH / 2 - SIDEWALK;
        if (x1 - x0 > 60 && y1 - y0 > 60) list.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
      }
    }
    return list;
  }

  function addBuilding(x, y, w, h) {
    const dome = random() < 0.22;
    buildings.push({
      x, y, w, h,
      color: pick(random, PALETTE.building),
      roof: pick(random, PALETTE.roof),
      dome,
      tank: random() < 0.5,
      shadow: 6 + random() * 10,
    });
  }

  function fillBlock(block, i, j) {
    // The souq block becomes market stalls; the port block containers; the plaza a fountain.
    if (i === 1 && j === 2) {
      for (let i = 0; i < 10; i += 1) {
        stalls.push({
          x: block.x + 20 + (i % 5) * ((block.w - 40) / 5),
          y: block.y + 24 + Math.floor(i / 5) * ((block.h - 60) / 2),
          w: 52, h: 34,
          color: pick(random, ['#c0392b', '#d35400', '#27ae60', '#8e44ad', '#f39c12']),
        });
      }
      addBuilding(block.x + block.w * 0.3, block.y + block.h * 0.62, block.w * 0.4, block.h * 0.28);
      return;
    }
    if (i === 1 && j === 4) {
      for (let i = 0; i < 8; i += 1) {
        containers.push({
          x: block.x + 14 + (i % 4) * 56,
          y: block.y + 16 + Math.floor(i / 4) * 46,
          w: 48, h: 36,
          color: pick(random, ['#c0392b', '#2980b9', '#27ae60', '#e67e22']),
        });
      }
      return;
    }
    if (i === 3 && j === 3) {
      fountains.push({ x: block.x + block.w / 2, y: block.y + block.h / 2, r: 46 });
      for (let i = 0; i < 6; i += 1) {
        palms.push({ x: block.x + 30 + (i % 3) * ((block.w - 60) / 2), y: block.y + 30 + Math.floor(i / 3) * (block.h - 60), r: 7 });
      }
      return;
    }
    // Ordinary block: one to four buildings, split along the longer side.
    const count = 1 + Math.floor(random() * 3);
    if (count === 1) {
      addBuilding(block.x + 8, block.y + 8, block.w - 16, block.h - 16);
      return;
    }
    const vertical = block.w > block.h;
    for (let i = 0; i < count; i += 1) {
      if (vertical) {
        const w = (block.w - 16 - (count - 1) * 12) / count;
        addBuilding(block.x + 8 + i * (w + 12), block.y + 8, w, block.h - 16);
      } else {
        const h = (block.h - 16 - (count - 1) * 12) / count;
        addBuilding(block.x + 8, block.y + 8 + i * (h + 12), block.w - 16, h);
      }
    }
  }

  for (const block of blocks()) {
    // Recover the grid indices from the block's position.
    const i = ROADS_X.findIndex((x) => block.x < x);
    const j = ROADS_Y.findIndex((y) => block.y < y);
    fillBlock(block, i, j);
  }

  // Palm trees along the corniche and scattered through the gardens.
  for (let y = 60; y < WORLD.height - 60; y += 130) {
    palms.push({ x: 210 + random() * 40, y: y + random() * 40, r: 7 });
  }
  for (let i = 0; i < 40; i += 1) {
    const x = range(random, 1300, 2500);
    const y = range(random, 1300, 1720);
    if (!onRoad(x, y, 20)) palms.push({ x, y, r: 7 });
  }
  // Desert rocks and dunes along the south edge.
  for (let i = 0; i < 26; i += 1) {
    rocks.push({ x: range(random, 200, 2500), y: range(random, DESERT_Y + 20, WORLD.height - 20), r: 8 + random() * 16 });
  }
  // Street lamps at every intersection.
  for (const x of ROADS_X) {
    for (const y of ROADS_Y) lamps.push({ x: x + ROAD_WIDTH / 2 + 8, y: y - ROAD_WIDTH / 2 - 8 });
  }

  /** A point in the sea or in a building (or a rock) is solid for a circle of radius r. */
  function blocked(x, y, r) {
    if (x < SEA_X + r || x > WORLD.width - r || y < r || y > WORLD.height - r) return true;
    for (const b of buildings) {
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
    }
    for (const c of containers) {
      if (x + r > c.x && x - r < c.x + c.w && y + r > c.y && y - r < c.y + c.h) return true;
    }
    for (const s of stalls) {
      if (x + r > s.x && x - r < s.x + s.w && y + r > s.y && y - r < s.y + s.h) return true;
    }
    for (const f of fountains) {
      const dx = x - f.x;
      const dy = y - f.y;
      if (dx * dx + dy * dy < (f.r + r) * (f.r + r)) return true;
    }
    return false;
  }

  /**
   * Push a circle out of solid shapes, axis by axis, so it slides along walls
   * instead of sticking. Returns the corrected position.
   */
  function collide(x, y, r) {
    let nx = x;
    let ny = y;
    if (blocked(nx, y, r)) {
      // Try the x axis alone first: slide along the wall.
      if (!blocked(x, ny, r)) nx = x;
      else if (!blocked(nx, y, r)) ny = y;
    }
    if (blocked(nx, ny, r)) {
      // Still inside: push out along the smallest penetration axis.
      let best = null;
      const shapes = [];
      for (const b of buildings) shapes.push(b);
      for (const c of containers) shapes.push(c);
      for (const s of stalls) shapes.push(s);
      for (const shape of shapes) {
        if (nx + r > shape.x && nx - r < shape.x + shape.w && ny + r > shape.y && ny - r < shape.y + shape.h) {
          const pushLeft = nx + r - shape.x;
          const pushRight = shape.x + shape.w - (nx - r);
          const pushUp = ny + r - shape.y;
          const pushDown = shape.y + shape.h - (ny - r);
          const min = Math.min(pushLeft, pushRight, pushUp, pushDown);
          if (!best || min < best.d) best = { d: min, x: pushLeft === min ? -pushLeft : pushRight === min ? pushRight : 0, y: pushUp === min ? -pushUp : pushDown === min ? pushDown : 0 };
        }
      }
      if (best) {
        nx += best.x;
        ny += best.y;
      }
      nx = Math.max(SEA_X + r, Math.min(WORLD.width - r, nx));
      ny = Math.max(r, Math.min(WORLD.height - r, ny));
    }
    return { x: nx, y: ny };
  }

  function districtAt(x, y) {
    for (const d of CITY.districts) {
      if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
    }
    if (y > DESERT_Y) return 'Desert Dunes';
    if (x < 320) return 'Corniche';
    return 'Qamar City';
  }

  function nearestRoadPoint(x, y) {
    let bestX = ROADS_X[0];
    let bestD = Infinity;
    for (const rx of ROADS_X) {
      const d = Math.abs(rx - x);
      if (d < bestD) { bestD = d; bestX = rx; }
    }
    let bestY = ROADS_Y[0];
    bestD = Infinity;
    for (const ry of ROADS_Y) {
      const d = Math.abs(ry - y);
      if (d < bestD) { bestD = d; bestY = ry; }
    }
    return { x: bestX, y: bestY };
  }

  function randomRoadPoint() {
    if (random() < 0.5) {
      return { x: pick(random, ROADS_X), y: range(random, 100, WORLD.height - 100), horizontal: false };
    }
    return { x: range(random, 260, WORLD.width - 100), y: pick(random, ROADS_Y), horizontal: true };
  }

  return {
    buildings, palms, stalls, containers, rocks, fountains, lamps, roads,
    onRoad, blocked, collide, districtAt, nearestRoadPoint, randomRoadPoint,
    garage: GARAGE, safehouse: SAFEHOUSE, repaint: REPAINT, workshop: WORKSHOP,
  };
}
