// localStorage save: money, health, ammo, missions and where the player stood.
// The save is written on mission complete, on BUSTED / KNOCKED OUT and when
// the player quits to the title, and offered as Continue on the title screen.
import { SAVE_KEY } from './tune.js';

export function hasSave() {
  try {
    return window.localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

export function saveGame(G) {
  try {
    const data = {
      v: 1,
      money: G.money,
      earned: G.earned,
      health: G.health,
      ammo: G.ammo,
      reserve: G.reserve,
      hasPistol: G.hasPistol,
      missionsDone: G.missionsDone,
      nextMission: G.nextMission,
      x: Math.round(G.player.x),
      y: Math.round(G.player.y),
      time: Math.round(G.time),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1) return null;
    return d;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // storage unavailable; the game still plays
  }
}
