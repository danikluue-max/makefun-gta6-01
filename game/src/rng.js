// A small seeded random number generator (mulberry32): the same seed builds the
// same city, so screenshot scenes and replays are repeatable.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

export function range(random, min, max) {
  return min + random() * (max - min);
}

export function rangeInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

// A probability roll, and a Fisher-Yates shuffle that returns a new array.
export function chance(random, p) {
  return random() < p;
}

// A deterministic 0..1 hash of an integer, for placing scenery (clouds,
// billboards) without touching the seeded city random: the same index always
// gives the same spot, so a staged screenshot is repeatable.
export function hash01(n) {
  let h = (n * 374761393 + 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function shuffle(random, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
