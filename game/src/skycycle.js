// The day/night cycle: the sun circles, the sky shifts from morning blue through
// a long sunset to a dark night with stars, and the street lamps glow after dark.
// One full day lasts eight minutes of play.

import * as THREE from 'three';
import { PALETTE } from './config.js';

export const DAY_LENGTH_SECONDS = 480;

export function createSky(scene) {
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 700;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x3a4a3a, 0.75);
  scene.add(hemi);
  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(600 * 3), 3)),
    new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: false }),
  );
  const positions = stars.geometry.attributes.position.array;
  for (let i = 0; i < 600; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const height = 120 + Math.random() * 180;
    positions[i * 3] = Math.cos(angle) * 420;
    positions[i * 3 + 1] = height;
    positions[i * 3 + 2] = Math.sin(angle) * 420;
  }
  stars.visible = false;
  scene.add(stars);
  return { sun, hemi, stars };
}

function lerpColor(a, b, t) {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return ca.lerp(cb, t);
}

export function updateSky(sky, scene, timeOfDay, lampHeads) {
  // timeOfDay is hours 0-24; the sun is up between 6:00 and 18:30.
  const dayFrac = ((timeOfDay - 6) / 12.5);
  const sunUp = dayFrac > 0 && dayFrac < 1;
  const angle = dayFrac * Math.PI;
  const sunHeight = Math.sin(angle);
  if (sunUp) {
    sky.sun.position.set(Math.cos(angle) * 300, Math.max(20, sunHeight * 320), 120);
    sky.sun.intensity = 0.6 + sunHeight * 1.3;
  } else {
    sky.sun.position.set(0, -100, 0);
    sky.sun.intensity = 0.12;
  }
  // Sky colour: dawn, noon, dusk, night.
  let skyColor;
  let hemiIntensity = 0.9;
  if (!sunUp) {
    skyColor = PALETTE.skyNight;
    hemiIntensity = 0.28;
  } else if (sunHeight < 0.25) {
    const t = sunHeight / 0.25;
    skyColor = lerpColor(PALETTE.skyDusk, PALETTE.skyDay, t);
    hemiIntensity = 0.45 + t * 0.3;
  } else {
    skyColor = PALETTE.skyDay;
  }
  // The flat sky reads deeper than the haze at the horizon, so the noon sky
  // stays blue instead of washing out to white under the bright sun; the fog
  // starts farther out so distant buildings keep their colour.
  scene.background = lerpColor(skyColor, PALETTE.skyDeep, 0.35);
  scene.fog = new THREE.Fog(skyColor, 320, 760);
  sky.hemi.intensity = hemiIntensity;
  sky.stars.visible = !sunUp;
  const night = !sunUp;
  for (const head of lampHeads) {
    head.material.emissive.setHex(night ? 0xaa8833 : 0x554400);
  }
}
