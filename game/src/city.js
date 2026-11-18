// Teluk Nusa's layout: the road grid, the city blocks, every building's footprint,
// the landmarks the story uses, and the helpers traffic and missions steer by.
// All of it is data — no three.js here — so the minimap, the AI and the renderer
// all read the same city.

import { CITY, ROADS_X, ROADS_Z } from './config.js';
import { chance, pick, range, rangeInt } from './rng.js';

const BUILDING_COLORS = [
  0xd8c9a3, 0xc9b18c, 0xb7c4c9, 0xd9a08c, 0xa8b89a, 0xc9c2b4, 0xe0d6c0, 0x9fb4c7,
];
const HOUSE_COLORS = [0xe8dcc0, 0xd9c1a3, 0xc4d2c0, 0xe0c9b8, 0xcfd8dc, 0xf0e2c8];

function blockRect(x0, z0, x1, z1) {
  return { x0, z0, x1, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 };
}

// Which district a block belongs to, by its centre.
function districtOf(cx, cz) {
  if (cz > 120 && cx > 100) return 'port';
  if (cx >= -80 && cx <= 0 && cz >= -80 && cz <= 0) return 'market';
  if (Math.abs(cx) <= 80 && Math.abs(cz) <= 80) return 'downtown';
  if (cz < -80) return 'housing';
  return 'downtown';
}

export function buildCity(random) {
  const roadsX = ROADS_X.slice();
  const roadsZ = ROADS_Z.slice();
  const buildings = [];
  const colliders = [];
  const stalls = [];
  const palms = [];
  const lamps = [];
  const containers = [];
  // Street furniture, all hand-placed data for world3d to render: benches
  // along the boulevard, umbrellas on the beach, crates of market goods by
  // the stalls, and big sign boards so the skyline reads at a glance.
  const benches = [];
  const umbrellas = [];
  const crates = [];
  const billboards = [];

  // Blocks between neighbouring roads.
  const xs = [-CITY.roadHalf - 60, ...roadsX, CITY.roadHalf + 60];
  const zs = [-CITY.roadHalf - 60, ...roadsZ, CITY.roadHalf + 60];
  // No-build zones around the hand-placed landmarks, so a random building
  // never lands on the garage forecourt, the tower, the mosque or the mall.
  const CLEAR_ZONES = [
    { x0: -152, z0: 104, x1: -88, z1: 136 },
    { x0: 24, z0: 24, x1: 56, z1: 56 },
    { x0: -135, z0: -53, x1: -105, z1: -27 },
    { x0: 20, z0: -135, x1: 60, z1: -105 },
  ];
  for (let i = 0; i < xs.length - 1; i += 1) {
    for (let j = 0; j < zs.length - 1; j += 1) {
      const block = blockRect(xs[i] + 11, zs[j] + 11, xs[i + 1] - 11, zs[j + 1] - 11);
      if (block.w < 20 || block.d < 20) continue;
      const district = districtOf(block.cx, block.cz);
      if (district === 'port' && block.cx > 100) {
        // Container yard: rows of shipping containers.
        for (let k = 0; k < 6; k += 1) {
          const cx = block.x0 + 10 + (k % 3) * 22;
          const cz = block.z0 + 12 + Math.floor(k / 3) * 20;
          containers.push({ x: cx, z: cz, w: 12, d: 5, h: 2.6, color: pick(random, [0xc75b4a, 0x4a7fc7, 0x53a05a, 0xd8a13c]) });
          colliders.push({ minX: cx - 6, maxX: cx + 6, minZ: cz - 2.5, maxZ: cz + 2.5 });
        }
        continue;
      }
      if (district === 'market') {
        // Open-air market: stalls in two rows, no big building.
        for (let k = 0; k < 8; k += 1) {
          const sx = block.x0 + 8 + (k % 4) * 14;
          const sz = block.z0 + 10 + Math.floor(k / 4) * 18;
          stalls.push({ x: sx, z: sz, color: pick(random, [0xe05a4e, 0xf2a93b, 0x3fae7a, 0x4a90d9]) });
        }
        continue;
      }
      const count = district === 'downtown' ? rangeInt(random, 2, 4) : rangeInt(random, 3, 5);
      for (let k = 0; k < count; k += 1) {
        const w = range(random, 10, Math.min(24, block.w / 2));
        const d = range(random, 10, Math.min(24, block.d / 2));
        const x = range(random, block.x0 + w / 2 + 2, block.x1 - w / 2 - 2);
        const z = range(random, block.z0 + d / 2 + 2, block.z1 - d / 2 - 2);
        let h;
        let type = 'box';
        let color = pick(random, BUILDING_COLORS);
        if (district === 'downtown') {
          h = range(random, 18, 58);
          if (chance(random, 0.22)) { type = 'tower'; h = range(random, 55, 78); }
        } else if (district === 'housing') {
          h = range(random, 7, 13);
          type = 'house';
          color = pick(random, HOUSE_COLORS);
        } else {
          h = range(random, 10, 22);
        }
        const b = { x, z, w, d, h, color, type, district };
        // Keep the landmark clear zones free of random buildings.
        if (CLEAR_ZONES.some((zone) => x - w / 2 < zone.x1 && x + w / 2 > zone.x0 && z - d / 2 < zone.z1 && z + d / 2 > zone.z0)) continue;
        buildings.push(b);
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      }
    }
  }

  // Landmarks (hand-placed, part of the story).
  const landmarks = {
    garage: { x: -120, z: 120, name: 'Bengkel Ombak', label: "Dara's garage" },
    market: { x: -40, z: -40, name: 'Pasar Nusa', label: 'the market' },
    port: { x: 180, z: 160, name: 'Pelabuhan', label: 'the port' },
    mall: { x: 40, z: -120, name: 'Mall Nusa', label: 'the mall' },
    tower: { x: 40, z: 40, name: 'Menara Nusa', label: 'the tower' },
    mosque: { x: -120, z: -40, name: 'Masjid Raya', label: 'the mosque' },
    yacht: { x: 196, z: 196, name: 'Dermaga', label: 'the yacht' },
    beach: { x: 0, z: 216, name: 'Pantai Pasir Putih', label: 'the beach' },
  };
  // The tower, the mosque and the mall get their own footprints, all inside
  // blocks and clear of the road grid so traffic never clips through them.
  buildings.push({ x: 40, z: 40, w: 26, d: 26, h: 86, color: 0x7fa8c9, type: 'tower', district: 'downtown' });
  colliders.push({ minX: 27, maxX: 53, minZ: 27, maxZ: 53 });
  buildings.push({ x: -120, z: -40, w: 24, d: 20, h: 22, color: 0xe8e2d0, type: 'mosque', district: 'downtown' });
  colliders.push({ minX: -132, maxX: -108, minZ: -50, maxZ: -30 });
  buildings.push({ x: 40, z: -120, w: 34, d: 24, h: 14, color: 0xd9a08c, type: 'mall', district: 'downtown' });
  colliders.push({ minX: 23, maxX: 57, minZ: -132, maxZ: -108 });
  buildings.push({ x: -120, z: 120, w: 22, d: 16, h: 10, color: 0xc75b4a, type: 'garage', district: 'downtown' });
  colliders.push({ minX: -131, maxX: -109, minZ: 112, maxZ: 128 });

  // Palm trees along the beach road and the boulevard; lamps on every road corner.
  for (let x = -200; x <= 200; x += 20) {
    palms.push({ x, z: 186 });
    if (Math.abs(x) % 40 === 0) palms.push({ x: x + 10, z: -186 });
  }
  // A second row of palms flanks the main boulevard (x = 0), so the drive
  // down the middle of town reads as a coastal avenue, not a bare grid.
  for (let z = -160; z <= 160; z += 40) {
    palms.push({ x: -10.5, z });
    palms.push({ x: 10.5, z });
  }
  // Benches face the boulevard every other block, so the sidewalks feel used.
  for (let z = -140; z <= 140; z += 40) {
    benches.push({ x: -10.5, z: z + 20, rotY: Math.PI / 2 });
    benches.push({ x: 10.5, z: z + 20, rotY: -Math.PI / 2 });
  }
  // Beach umbrellas in a loose row on the sand, clear of the road.
  for (let i = 0; i < 12; i += 1) {
    umbrellas.push({ x: -180 + i * 32 + (i % 3) * 5, z: 208 + (i % 2) * 6, color: pick(random, [0xe05a4e, 0xf2c230, 0x3fae7a, 0x4a90d9, 0x8a5fc7]) });
  }
  // Crates of market goods piled beside the stalls.
  for (const stall of stalls) {
    if (chance(random, 0.6)) crates.push({ x: stall.x + 4, z: stall.z + 2, color: pick(random, [0x8a6a48, 0xc75b4a, 0x3fae7a]) });
  }
  // Billboards: one over the boulevard, one by the port road, one at the mall,
  // one at the market, one by the pier.
  billboards.push({ x: -12, z: 80, rotY: Math.PI / 2, text: 'NUSA HEAT', sub: 'TELUK NUSA' });
  billboards.push({ x: 170, z: 100, rotY: 0, text: 'PANTAI', sub: 'PASIR PUTIH' });
  billboards.push({ x: 62, z: -120, rotY: -Math.PI / 2, text: 'MALL NUSA', sub: 'BUKA 24 JAM' });
  billboards.push({ x: -62, z: -40, rotY: Math.PI / 2, text: 'KOPI NUSA', sub: 'BUKA 24 JAM' });
  billboards.push({ x: 120, z: 180, rotY: 0, text: 'DERMAGA', sub: 'YACHT & IKAN' });
  // The ferris wheel on the beach by the port: the skyline landmark the
  // leaderboard covers all have — a big wheel on the shore, visible from
  // the boulevard at sunset.
  const ferrisWheel = { x: 165, z: 212 };
  for (const rx of roadsX) {
    for (const rz of roadsZ) {
      lamps.push({ x: rx + 9, z: rz + 9 });
    }
  }

  return {
    roadsX, roadsZ, buildings, colliders, stalls, palms, lamps, containers, landmarks,
    benches, umbrellas, crates, billboards, ferrisWheel,
  };
}

// Nearest point on the road network to (x, z): the roads are axis-aligned lines.
export function nearestRoadPoint(city, x, z) {
  let best = null;
  let bestD = Infinity;
  for (const rx of city.roadsX) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, z }; }
  }
  for (const rz of city.roadsZ) {
    const d = Math.abs(z - rz);
    if (d < bestD) { bestD = d; best = { x, z: rz }; }
  }
  return best;
}

// Is (x, z) inside a building collider (with a margin)?
export function hitsBuilding(city, x, z, margin = 0) {
  for (const c of city.colliders) {
    if (x > c.minX - margin && x < c.maxX + margin && z > c.minZ - margin && z < c.maxZ + margin) return c;
  }
  return null;
}

// Push a circle of radius r out of buildings; returns the corrected position.
export function resolveCollisions(city, x, z, r) {
  for (const c of city.colliders) {
    const cx = Math.max(c.minX, Math.min(x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - cx;
    const dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r;
        z = cz + (dz / d) * r;
      } else {
        x = c.maxX + r;
      }
    }
  }
  const half = CITY.half;
  x = Math.max(-half, Math.min(half, x));
  z = Math.max(-half, Math.min(CITY.beachZ + 8, z));
  return { x, z };
}
