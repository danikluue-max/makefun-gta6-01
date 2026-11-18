// Builds the visible city: ground, sea and beach, the road grid with lane markings,
// sidewalks, every building, market stalls, container yard, palms and street lamps.
// All geometry is procedural three.js — no downloaded models or textures.

import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';

function makeWindowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  // The wall behind the windows is a light warm grey: Lambert multiplies the
  // texture by the building colour, so a dark base turned tall buildings
  // almost black. A light base keeps the tint visible and the windows read.
  ctx.fillStyle = '#b9bec6';
  ctx.fillRect(0, 0, 128, 256);
  for (let y = 8; y < 248; y += 18) {
    for (let x = 8; x < 120; x += 18) {
      const lit = Math.random() < 0.45;
      ctx.fillStyle = lit ? '#ffd98a' : '#7d9bb0';
      ctx.fillRect(x, y, 11, 12);
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
  for (const b of city.buildings) {
    const tall = b.h > 20;
    const mat = tall
      ? new THREE.MeshLambertMaterial({ color: b.color, map: windowTexture })
      : new THREE.MeshLambertMaterial({ color: b.color });
    const mesh = box(b.w, b.h, b.d, b.color, b.x, b.h / 2, b.z, mat);
    group.add(mesh);
    const roof = box(b.w + 0.6, 0.5, b.d + 0.6, 0x4a4a52, b.x, b.h + 0.25, b.z, roofMat);
    roof.castShadow = false;
    group.add(roof);
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
  }

  // Market stalls: striped canopy on four poles.
  for (const stall of city.stalls) {
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(4.2, 2.2, 4),
      new THREE.MeshLambertMaterial({ color: stall.color }),
    );
    canopy.position.set(stall.x, 3.4, stall.z);
    canopy.rotation.y = Math.PI / 4;
    canopy.castShadow = true;
    group.add(canopy);
    const table = box(4, 1, 3, 0x8a6a48, stall.x, 0.5, stall.z);
    group.add(table);
  }

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
      const frond = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.1), frondMat);
      const angle = (f / 6) * Math.PI * 2;
      frond.position.set(palm.x + Math.cos(angle) * 1.4, 7, palm.z + Math.sin(angle) * 1.4);
      frond.rotation.set(-0.5, 0, angle + Math.PI / 2);
      frond.rotation.x = -0.45;
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

  return { group, lampHeads };
}
