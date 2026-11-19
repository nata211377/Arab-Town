// The economy: cash, health and ammo pickups on the street, taxi fares
// when driving a cab, and the two shops — the Ammo Souq and the repaint
// garage that washes the wanted level away for a fee.
import { PRICES, PLACES } from './tune.js';
import { randomRoadPoint } from './city.js';
import { addFloat } from './state.js';
import { clearWanted } from './wanted.js';

export function updatePickups(G, dt, sfx) {
  G.pickupTimer -= dt;
  if (G.pickupTimer <= 0) {
    G.pickupTimer = 6;
    if (G.pickups.length < 8) {
      const pt = randomRoadPoint(G.rng);
      const kind = G.rng.pick(['cash', 'cash', 'health', 'ammo']);
      G.pickups.push({
        x: pt.x,
        y: pt.y,
        kind,
        amount: kind === 'cash' ? G.rng.int(20, 50) : kind === 'health' ? 30 : 12,
        t: 0,
      });
    }
  }
  const p = G.player;
  for (let i = G.pickups.length - 1; i >= 0; i -= 1) {
    const pk = G.pickups[i];
    pk.t += dt;
    if (Math.hypot(pk.x - p.x, pk.y - p.y) < 30) {
      if (pk.kind === 'cash') {
        G.money += pk.amount;
        G.earned += pk.amount;
        addFloat(G, pk.x, pk.y, `+$${pk.amount}`, '#7de07d');
        sfx.coin();
      } else if (pk.kind === 'health') {
        G.health = Math.min(G.maxHealth, G.health + pk.amount);
        addFloat(G, pk.x, pk.y, `+${pk.amount} HP`, '#7de07d');
        sfx.pickup();
      } else {
        G.reserve += pk.amount;
        addFloat(G, pk.x, pk.y, `+${pk.amount} ammo`, '#ffd76a');
        sfx.pickup();
      }
      G.pickups.splice(i, 1);
    }
  }
}

// A fare appears while the player drives a taxi: pick the passenger up,
// then drop them where they want to go, for cash.
export function updateFares(G, dt, sfx) {
  const p = G.player;
  if (!G.fare && !p.onFoot && p.car && p.car.kind === 'taxi') {
    G.fareTimer -= dt;
    if (G.fareTimer <= 0) {
      G.fareTimer = 8;
      const spots = [PLACES.marinaFare, PLACES.heightsFare, PLACES.gardensFare, PLACES.portFare];
      const a = spots[G.rng.int(0, spots.length - 1)];
      let b = spots[G.rng.int(0, spots.length - 1)];
      if (b === a) b = spots[(spots.indexOf(a) + 1) % spots.length];
      G.fare = {
        phase: 'pickup',
        x: a.x,
        y: a.y,
        dx: b.x,
        dy: b.y,
        pay: G.rng.int(PRICES.fareMin, PRICES.fareMax),
        label: a.label,
      };
    }
  }
  if (!G.fare) return;
  const f = G.fare;
  if (p.onFoot || !p.car) return;
  if (Math.hypot(f.x - p.x, f.y - p.y) < 70) {
    if (f.phase === 'pickup') {
      f.phase = 'drop';
      f.x = f.dx;
      f.y = f.dy;
      sfx.pickup();
      addFloat(G, p.x, p.y - 30, 'Passenger aboard', '#ffd76a');
    } else {
      G.money += f.pay;
      G.earned += f.pay;
      G.stats.fares += 1;
      addFloat(G, p.x, p.y - 30, `+$${f.pay} fare`, '#7de07d');
      sfx.coin();
      G.fare = null;
      G.fareTimer = 5;
    }
  }
}

export function buyAmmo(G, sfx) {
  if (G.money < PRICES.ammo) return 'Not enough cash';
  if (G.reserve >= 120) return 'Ammo full';
  G.money -= PRICES.ammo;
  G.reserve += PRICES.ammoBullets;
  sfx.coin();
  return 'Bought 12 bullets ($40)';
}

export function repaint(G, sfx) {
  if (G.wanted === 0) return 'No heat to lose';
  if (G.money < PRICES.repaint) return 'Not enough cash';
  G.money -= PRICES.repaint;
  clearWanted(G);
  sfx.coin();
  return 'Repainted — wanted cleared';
}
