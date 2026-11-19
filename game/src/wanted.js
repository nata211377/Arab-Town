// The wanted level: how heat rises, how police answer it, and what happens
// when they catch the player on foot (BUSTED) or the player goes down
// (KNOCKED OUT). Both end at the clinic with a fine and a clean slate.
import { PRICES } from './tune.js';
import { respawnAtClinic } from './state.js';
import { spawnPoliceCar } from './driver.js';
import { saveGame } from './save.js';

export function addWanted(G, n) {
  if (n <= 0) return;
  G.wanted = Math.min(5, G.wanted + n);
  G.wantedQuiet = 0;
}

export function updateWanted(G, dt, sfx) {
  if (G.mode !== 'play') return;
  // Heat cools off when the player lies low and no police are close.
  if (G.wanted > 0) {
    G.wantedQuiet += dt;
    let nearCop = false;
    for (const c of G.cars) {
      if (c.kind === 'police' && !c.gone && Math.hypot(c.x - G.player.x, c.y - G.player.y) < 420) {
        nearCop = true;
        break;
      }
    }
    if (G.wantedQuiet > 18 && !nearCop) {
      G.wanted -= 1;
      G.wantedQuiet = 0;
    }
  }
  // Keep the street full of police cars, one per star.
  const cops = G.cars.filter((c) => c.kind === 'police' && !c.gone);
  if (G.wanted > 0 && cops.length < G.wanted) {
    G.policeTimer -= dt;
    if (G.policeTimer <= 0) {
      spawnPoliceCar(G);
      G.policeTimer = 3.5;
    }
  }
  if (G.wanted === 0) {
    for (const c of cops) c.gone = true;
  }
  // BUSTED: a police car touches the player on foot.
  const p = G.player;
  if (p.onFoot && G.wanted > 0) {
    for (const c of cops) {
      if (Math.hypot(c.x - p.x, c.y - p.y) < 30) {
        triggerBusted(G, sfx);
        return;
      }
    }
  }
  // Siren while any police car is near.
  let siren = false;
  for (const c of cops) {
    if (Math.hypot(c.x - p.x, c.y - p.y) < 620) {
      siren = true;
      break;
    }
  }
  sfx.siren(siren);
}

export function triggerBusted(G, sfx) {
  const fine = Math.min(G.money, PRICES.bustedFine + 25 * G.wanted);
  G.money -= fine;
  sfx.busted();
  respawnAtClinic(G);
  G.mode = 'busted';
  G.banner = null;
  saveGame(G);
}

export function triggerKnocked(G, sfx) {
  const fine = Math.min(G.money, PRICES.knockedFine);
  G.money -= fine;
  sfx.busted();
  respawnAtClinic(G);
  G.mode = 'knocked';
  saveGame(G);
}

export function clearWanted(G) {
  G.wanted = 0;
  G.wantedQuiet = 0;
  for (const c of G.cars) {
    if (c.kind === 'police') c.gone = true;
  }
}
