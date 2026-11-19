// A tiny seeded random generator (mulberry32). One seed always grows the same
// city, the same traffic and the same screenshot scenes, run after run.

/** A function that returns the next pseudo-random number in [0, 1). */
export function createRandom(seed) {
  let state = seed | 0;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One item from an array, chosen with the seeded random. */
export function pick(random, array) {
  return array[Math.floor(random() * array.length)];
}

/** A number between min and max, chosen with the seeded random. */
export function range(random, min, max) {
  return min + random() * (max - min);
}
