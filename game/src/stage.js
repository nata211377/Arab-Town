// The staging handle the playtest tools drive the game through.
// window.__arab exposes the live state plus the few actions a test needs
// (start a mission, set the wanted level, teleport, arm the player), and
// window.__shotReady flips true once the first frame has rendered, so a
// screenshot tool knows the scene is settled. It changes nothing about
// normal play: without a test driving it, the game just runs.
export function installDebug(G, api) {
  window.__arab = {
    state: G,
    version: 1,
    startMission(i) {
      return api.startMission(i);
    },
    setWanted(n) {
      return api.setWanted(n);
    },
    teleport(x, y) {
      return api.teleport(x, y);
    },
    givePistol() {
      return api.givePistol();
    },
    spawnPolice(n) {
      return api.spawnPolice(n);
    },
    setMoney(n) {
      G.money = n;
    },
  };
  window.__shotReady = false;
}

export function markReady() {
  window.__shotReady = true;
}
