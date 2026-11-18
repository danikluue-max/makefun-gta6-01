// Builds the visible city: ground, sea and beach, the road grid with lane markings,
// sidewalks, every building, market stalls, container yard, palms and street lamps.
// All geometry is procedural three.js — no downloaded models or textures.

import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';

function makeTextTexture(text, sub, bg, fg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = fg;
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, sub ? 50 : 64);
  if (sub) {
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(sub, 256, 100);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeWindowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  // The wall behind the windows is a light warm grey: Lambert multiplies the
  // texture by the building colour, so a dark base turned tall buildings
  // almost black. A light base keeps the tint visible and the windows read.
  ctx.fillStyle = '#c6cbd2';
  ctx.fillRect(0, 0, 128, 256);
  // A shop band at the bottom: a warm awning stripe over a dark storefront,
  // so street-level buildings read as shops instead of blank walls.
  ctx.fillStyle = '#e05a4e';
  ctx.fillRect(0, 226, 128, 14);
  ctx.fillStyle = '#3a2c22';
  ctx.fillRect(0, 240, 128, 16);
  ctx.fillStyle = '#ffd23c';
  for (let x = 6; x < 128; x += 20) ctx.fillRect(x, 244, 12, 8);
  // Windows: two sizes, some lit warm, some cool glass, thin shutters on
  // the sides so the facade has depth instead of a flat grid of dots.
  for (let y = 8; y < 218; y += 22) {
    for (let x = 8; x < 120; x += 24) {
      const tall = ((x + y) / 24) % 2 === 0;
      const lit = Math.random() < 0.42;
      ctx.fillStyle = lit ? '#ffd98a' : '#6f9db8';
      ctx.fillRect(x, y, 14, tall ? 16 : 11);
      ctx.fillStyle = 'rgba(60,60,70,0.55)';
      ctx.fillRect(x - 3, y, 2, tall ? 16 : 11);
      ctx.fillRect(x + 15, y, 2, tall ? 16 : 11);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x, y, 14, 2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function box(w, h, d, color, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material ?? new THREE.MeshLambertMaterial({ color }));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function buildWorld(scene, city) {
  const windowTexture = makeWindowTexture();
  const group = new THREE.Group();
  scene.add(group);

  // Ground: one big lawn plane, then the sea and the beach strip.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.half * 2 + 400, CITY.half * 2 + 400),
    new THREE.MeshLambertMaterial({ color: PALETTE.grass }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 40);
  ground.receiveShadow = true;
  group.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.half * 2 + 400, CITY.seaZ - CITY.beachZ + 24),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0, (CITY.beachZ + CITY.seaZ) / 2 + 6);
  sand.receiveShadow = true;
  group.add(sand);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.half * 2 + 600, 400),
    new THREE.MeshLambertMaterial({ color: PALETTE.sea }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.4, CITY.seaZ + 200);
  group.add(sea);

  // The market square: warm paving over the whole market block, so the stalls
  // stand on a plaza instead of a lawn. It sits just above the grass and
  // just below the roads and sidewalks, which cross it at their own heights.
  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(72, 72),
    new THREE.MeshLambertMaterial({ color: 0xb09a7a }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(-40, 0.005, -40);
  plaza.receiveShadow = true;
  group.add(plaza);

  // Roads: asphalt strips with pale centre dashes, plus sidewalks.
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.asphalt });
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  const dashMat = new THREE.MeshLambertMaterial({ color: PALETTE.asphaltLine });
  const roadLen = CITY.half * 2 + 120;
  for (const rx of city.roadsX) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadWidth, roadLen), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(rx, 0.02, 0);
    road.receiveShadow = true;
    group.add(road);
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadWidth + 6, roadLen), walkMat);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(rx, 0.01, 0);
    walk.receiveShadow = true;
    group.add(walk);
    for (let z = -CITY.half; z < CITY.half; z += 16) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 6), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(rx, 0.04, z);
      group.add(dash);
    }
  }
  for (const rz of city.roadsZ) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(roadLen, CITY.roadWidth), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, rz);
    road.receiveShadow = true;
    group.add(road);
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(roadLen, CITY.roadWidth + 6), walkMat);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(0, 0.01, rz);
    walk.receiveShadow = true;
    group.add(walk);
    for (let x = -CITY.half; x < CITY.half; x += 16) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.5), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.04, rz);
      group.add(dash);
    }
  }

  // Buildings: boxes with a window texture on the tall ones, flat roofs with a rim.
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a4a52 });
  const tankMat = new THREE.MeshLambertMaterial({ color: 0x8a8f98 });
  const acMat = new THREE.MeshLambertMaterial({ color: 0xb9bec6 });
  const neonColors = [0xff4d8d, 0x2ee5d6, 0xffd23c, 0x7a5cff, 0xff6a3d];
  let buildingIndex = 0;
  for (const b of city.buildings) {
    buildingIndex += 1;
    const tall = b.h > 20;
    const mat = tall
      ? new THREE.MeshLambertMaterial({ color: b.color, map: windowTexture })
      : new THREE.MeshLambertMaterial({ color: b.color });
    const mesh = box(b.w, b.h, b.d, b.color, b.x, b.h / 2, b.z, mat);
    group.add(mesh);
    // Roof rim in a darker shade of the wall colour, plus rooftop props —
    // a water tank and an AC box on tall roofs, so the skyline is not a row
    // of flat grey slabs.
    const roof = box(b.w + 0.6, 0.5, b.d + 0.6, 0x4a4a52, b.x, b.h + 0.25, b.z, roofMat);
    roof.castShadow = false;
    group.add(roof);
    if (tall) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.4, 10), tankMat);
      tank.position.set(b.x - b.w / 4, b.h + 1.7, b.z - b.d / 4);
      tank.castShadow = true;
      group.add(tank);
      const ac = box(2.2, 0.9, 1.6, 0xb9bec6, b.x + b.w / 4, b.h + 0.95, b.z + b.d / 4, acMat);
      group.add(ac);
    } else if (b.type === 'house') {
      // Low houses get a pitched roof cap instead of a flat slab.
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(b.w, b.d) * 0.72, 2.4, 4),
        new THREE.MeshLambertMaterial({ color: 0xc75b4a }),
      );
      cap.position.set(b.x, b.h + 1.4, b.z);
      cap.rotation.y = Math.PI / 4;
      cap.castShadow = true;
      group.add(cap);
    } else {
      // Street-level shops get a striped awning over the door side, so the
      // ground floor reads as a storefront from the road.
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(Math.min(b.w * 0.7, 12), 0.3, 3.2),
        new THREE.MeshLambertMaterial({ color: [PALETTE.awningRed, PALETTE.awningYellow, PALETTE.awningGreen][Math.abs(Math.round(b.x * 3 + b.z)) % 3] }),
      );
      awning.position.set(b.x, 3.4, b.z - b.d / 2 - 1.2);
      awning.castShadow = true;
      group.add(awning);
    }
    if (b.type === 'mosque') {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshLambertMaterial({ color: 0x3f8f6f }),
      );
      dome.position.set(b.x, b.h, b.z);
      dome.castShadow = true;
      group.add(dome);
      const minaret = box(2, 26, 2, 0xe8e2d0, b.x + 14, 13, b.z, new THREE.MeshLambertMaterial({ color: 0xe8e2d0 }));
      group.add(minaret);
    }
    if (b.type === 'garage') {
      const signMat = new THREE.MeshLambertMaterial({ color: 0xffd23c, emissive: 0x665500 });
      const sign = box(16, 3, 0.6, 0xffd23c, b.x, b.h + 1.5, b.z - b.d / 2 - 0.4, signMat);
      group.add(sign);
    }
    if (b.type === 'mall') {
      const signMat = new THREE.MeshLambertMaterial({ color: 0x4a90d9, emissive: 0x0a2a55 });
      const sign = box(24, 3, 0.6, 0x4a90d9, b.x, b.h + 1.5, b.z + b.d / 2 + 0.4, signMat);
      group.add(sign);
    }
    // Neon: tall downtown buildings get a bright vertical strip on their
    // south face, so the skyline glows at golden hour. MeshBasicMaterial
    // is unlit — it stays bright even as the sun drops.
    if (tall) {
      const neon = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, b.h * 0.62, 0.25),
        new THREE.MeshBasicMaterial({ color: neonColors[buildingIndex % neonColors.length] }),
      );
      neon.position.set(b.x - b.w / 4, b.h * 0.42, b.z + b.d / 2 + 0.18);
      group.add(neon);
    }
  }

  // Market stalls: a round umbrella canopy on four poles, sized to the table
  // instead of towering over it.
  for (const stall of city.stalls) {
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(3.4, 1.3, 8),
      new THREE.MeshLambertMaterial({ color: stall.color }),
    );
    canopy.position.set(stall.x, 3.0, stall.z);
    canopy.castShadow = true;
    group.add(canopy);
    const table = box(4, 1, 3, 0x8a6a48, stall.x, 0.5, stall.z);
    group.add(table);
    // Goods on the table: bright crates of fruit and cloth, so the market
    // reads as a market instead of empty tables under cones.
    const goodsMat = new THREE.MeshLambertMaterial({ color: stall.color });
    const goods = box(3.2, 0.5, 2.2, stall.color, stall.x, 1.25, stall.z, goodsMat);
    group.add(goods);
    const fruit = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xf2a93b }),
    );
    fruit.position.set(stall.x - 1, 1.7, stall.z);
    group.add(fruit);
    const fruit2 = fruit.clone();
    fruit2.material = new THREE.MeshLambertMaterial({ color: 0x3fae7a });
    fruit2.position.set(stall.x + 1, 1.7, stall.z + 0.5);
    group.add(fruit2);
  }

  // Crates of market goods piled beside the stalls.
  for (const crate of city.crates) {
    const mesh = box(1.6, 1.2, 1.6, crate.color, crate.x, 0.6, crate.z);
    group.add(mesh);
    const mesh2 = box(1.2, 0.9, 1.2, 0x8a6a48, crate.x + 1.4, 0.45, crate.z + 0.6);
    group.add(mesh2);
  }

  // Benches along the boulevard: a wooden seat on two concrete feet.
  for (const bench of city.benches) {
    const seat = box(2.4, 0.18, 0.7, 0x8a6a48, bench.x, 0.55, bench.z);
    seat.rotation.y = bench.rotY;
    group.add(seat);
    const back = box(2.4, 0.7, 0.14, 0x8a6a48, bench.x + (bench.rotY > 0 ? 0.35 : -0.35), 1.0, bench.z);
    back.rotation.y = bench.rotY;
    group.add(back);
  }

  // Beach umbrellas: a bright cone on a pole, with a low sun lounger beside it.
  for (const umb of city.umbrellas) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), new THREE.MeshLambertMaterial({ color: 0xe8e4da }));
    pole.position.set(umb.x, 1.3, umb.z);
    group.add(pole);
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 1.0, 8),
      new THREE.MeshLambertMaterial({ color: umb.color }),
    );
    top.position.set(umb.x, 3.0, umb.z);
    top.castShadow = true;
    group.add(top);
    const lounger = box(1.8, 0.25, 0.7, 0x4a90d9, umb.x + 2.6, 0.2, umb.z + 0.5);
    group.add(lounger);
  }

  // Billboards: two poles and a big board with painted text, so the skyline
  // has landmarks a player can navigate by from a distance.
  for (const board of city.billboards) {
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
    for (const dx of [-5, 5]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 10, 6), poleMat);
      pole.position.set(board.x + dx, 5, board.z);
      pole.castShadow = true;
      group.add(pole);
    }
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 3.5),
      new THREE.MeshLambertMaterial({ map: makeTextTexture(board.text, board.sub, '#1c2f4a', '#ffd23c') }),
    );
    face.position.set(board.x, 11.5, board.z);
    face.rotation.y = board.rotY;
    group.add(face);
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 3.5),
      new THREE.MeshLambertMaterial({ color: 0x2e3138 }),
    );
    back.position.set(board.x, 11.5, board.z);
    back.rotation.y = board.rotY + Math.PI;
    group.add(back);
  }

  // A pale foam strip where the sea meets the sand, so the shoreline reads.
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.half * 2 + 400, 3),
    new THREE.MeshLambertMaterial({ color: 0xeaf6f2, transparent: true, opacity: 0.65 }),
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, 0.02, CITY.seaZ);
  group.add(foam);

  // Shipping containers at the port.
  for (const c of city.containers) {
    const mesh = box(c.w, c.h, c.d, c.color, c.x, c.h / 2, c.z);
    group.add(mesh);
  }

  // Palm trees: a leaning trunk and a crown of flat fronds.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x2f8f4e, side: THREE.DoubleSide });
  for (const palm of city.palms) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 6), trunkMat);
    trunk.position.set(palm.x, 3.5, palm.z);
    trunk.rotation.z = 0.12;
    trunk.castShadow = true;
    group.add(trunk);
    for (let f = 0; f < 6; f += 1) {
      const frond = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.9), frondMat);
      const angle = (f / 6) * Math.PI * 2;
      frond.position.set(palm.x + Math.cos(angle) * 1.2, 7, palm.z + Math.sin(angle) * 1.2);
      frond.rotation.set(-0.5, 0, angle + Math.PI / 2);
      frond.rotation.x = -0.7;
      group.add(frond);
    }
  }

  // Street lamps: pole, arm and a glowing head (the light itself is one
  // shared point light per lamp is too many — lamps glow at night via emissive).
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
  const lampHeads = [];
  for (const lamp of city.lamps) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), poleMat);
    pole.position.set(lamp.x, 3, lamp.z);
    group.add(pole);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0x554400 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), headMat);
    head.position.set(lamp.x, 6.1, lamp.z);
    group.add(head);
    lampHeads.push(head);
  }

  // Hills north of the city: big soft cones on the horizon.
  const hillMat = new THREE.MeshLambertMaterial({ color: 0x5d7d55 });
  for (const [hx, hz, hr, hh] of [[-140, -280, 90, 42], [40, -300, 120, 55], [200, -270, 80, 36]]) {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(hr, hh, 8), hillMat);
    hill.position.set(hx, hh / 2 - 2, hz);
    group.add(hill);
  }

  // The yacht at the pier: the getaway boat at the end of the story.
  const yacht = new THREE.Group();
  const hullMat = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 12), hullMat);
  hull.position.y = 0.8;
  hull.castShadow = true;
  yacht.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(2, 4, 4), hullMat);
  bow.rotation.x = Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.position.set(0, 0.8, 8);
  yacht.add(bow);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(3, 1.8, 5), new THREE.MeshLambertMaterial({ color: 0x9fc4d8 }));
  cabin.position.set(0, 2.5, -1);
  cabin.castShadow = true;
  yacht.add(cabin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 9, 6), new THREE.MeshLambertMaterial({ color: 0x8a6a48 }));
  mast.position.set(0, 6, 1);
  yacht.add(mast);
  yacht.position.set(196, 0, 196);
  yacht.rotation.y = Math.PI / 4;
  group.add(yacht);

  // The ferris wheel on the beach by the port: two A-frame legs, a big rim
  // with spokes and cabins. The face points east-west so drivers coming
  // down the boulevard see it against the sunset. The rim turns slowly
  // (main.js rotates `ferrisSpin` by elapsed time).
  const ferris = new THREE.Group();
  const legMat = new THREE.MeshLambertMaterial({ color: 0xe8e4da });
  for (const s of [1, -1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 26, 1.2), legMat);
    leg.position.set(0, 13, s * 6);
    leg.rotation.x = s * 0.22;
    leg.castShadow = true;
    ferris.add(leg);
  }
  const ferrisSpin = new THREE.Group();
  const rimMat = new THREE.MeshLambertMaterial({ color: 0xff4d8d });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(12, 0.55, 8, 32), rimMat);
  ferrisSpin.add(rim);
  const spokeMat = new THREE.MeshLambertMaterial({ color: 0xd8dde2 });
  for (let s = 0; s < 8; s += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(23.5, 0.35, 0.35), spokeMat);
    spoke.rotation.z = (s / 8) * Math.PI;
    ferrisSpin.add(spoke);
  }
  const cabinMat = new THREE.MeshLambertMaterial({ color: 0xffd23c });
  for (let c = 0; c < 8; c += 1) {
    const angle = (c / 8) * Math.PI * 2;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2, 2), cabinMat);
    cabin.position.set(Math.cos(angle) * 12, Math.sin(angle) * 12, 0);
    cabin.castShadow = true;
    ferrisSpin.add(cabin);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.4, 12), legMat);
  hub.rotation.x = Math.PI / 2;
  ferrisSpin.add(hub);
  ferrisSpin.position.y = 15;
  ferris.add(ferrisSpin);
  ferris.position.set(city.ferrisWheel.x, 0, city.ferrisWheel.z);
  ferris.rotation.y = Math.PI / 2;
  group.add(ferris);

  return { group, lampHeads, ferrisSpin };
}
