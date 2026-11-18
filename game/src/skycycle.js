// The day/night cycle: the sun circles, the sky shifts from morning blue through
// a long sunset to a dark night with stars, and the street lamps glow after dark.
// One full day lasts eight minutes of play.

import * as THREE from 'three';
import { PALETTE } from './config.js';
import { hash01 } from './rng.js';

export const DAY_LENGTH_SECONDS = 480;

export function createSky(scene) {
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 700;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x3a4a3a, 0.75);
  scene.add(hemi);
  // A few soft clouds: flattened white puffs drifting slowly across the sky,
  // placed by a fixed hash so the same frame always shows the same sky.
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 16; i += 1) {
    const puff = new THREE.Group();
    const n = 3 + Math.floor(hash01(i * 7 + 1) * 3);
    for (let j = 0; j < n; j += 1) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(7 + hash01(i * 13 + j * 3) * 8, 10, 8), cloudMat);
      ball.position.set((hash01(i * 5 + j) - 0.5) * 26, (hash01(i * 11 + j * 2) - 0.5) * 2.5, (hash01(i * 17 + j * 4) - 0.5) * 10);
      ball.scale.y = 0.45;
      puff.add(ball);
    }
    puff.position.set((hash01(i * 3 + 2) - 0.5) * 700, 130 + hash01(i * 9) * 60, (hash01(i * 21 + 5) - 0.5) * 700);
    clouds.add(puff);
  }
  scene.add(clouds);
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
  return { sun, hemi, stars, clouds };
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
    sky.sun.intensity = 0.9 + sunHeight * 1.5;
    // The sun goes warm as it drops: pale noon white to deep orange at
    // sunset, so the light on the street turns golden instead of white.
    sky.sun.color.copy(lerpColor(0xff9a4d, 0xfff2d8, Math.min(1, sunHeight / 0.45)));
  } else {
    sky.sun.position.set(0, -100, 0);
    sky.sun.intensity = 0.12;
  }
  // Sky colour: dawn, noon, dusk, night. Noon is a saturated tropical blue
  // now — the old pale sky washed the whole frame out under the bright sun.
  let skyColor;
  let hemiIntensity = 1.0;
  if (!sunUp) {
    skyColor = PALETTE.skyNight;
    hemiIntensity = 0.28;
  } else if (sunHeight < 0.45) {
    // GOLDEN HOUR (roughly 17:00-18:30): the sky goes warm orange-pink,
    // but the scene must stay readable — the old dusk shot failed because
    // the light fell off with the sun. Here the hemisphere light never
    // drops below 0.88 and the sun stays strong, so shadows are long and
    // warm while the street, cars and HUD still read clearly. The sky
    // blend uses t² so it stays warm orange instead of washing out to
    // mauve where the sunset pink meets the noon blue.
    const t = Math.min(1, sunHeight / 0.45); // 0 = sunset, 1 = late afternoon
    const sunset = lerpColor(PALETTE.skySunset, PALETTE.skySunsetPink, 0.35);
    skyColor = lerpColor(sunset, PALETTE.skyDay, t * t);
    hemiIntensity = 0.85 + t * 0.15;
    sky.sun.intensity = Math.max(sky.sun.intensity, 1.8);
    // Warm bounce off the ground at sunset: the low sun lights the street
    // from the side, so the asphalt needs a warm ground colour or it goes
    // near-black in the foreground. The hemisphere's sky colour goes warm
    // too, or every upward face stays cold blue under a pink sky.
    sky.hemi.groundColor.setHex(0x7a6a55);
    sky.hemi.color.setHex(0xffd9b0);
  } else {
    skyColor = PALETTE.skyDay;
    hemiIntensity = 1.0;
    sky.hemi.groundColor.setHex(0x3a4a3a);
    sky.hemi.color.setHex(0xbfd9ff);
  }
  // The flat sky reads deeper than the haze at the horizon, so the noon sky
  // stays blue instead of washing out to white under the bright sun; the fog
  // starts farther out so distant buildings keep their colour. At golden
  // hour the deep-blue blend is what turned the sunset mauve, so it is
  // almost skipped there and the sky stays warm orange-pink.
  const deepBlend = sunUp && sunHeight < 0.45 ? 0.1 : 0.35;
  scene.background = lerpColor(skyColor, PALETTE.skyDeep, deepBlend);
  scene.fog = new THREE.Fog(skyColor, 320, 760);
  sky.hemi.intensity = hemiIntensity;
  sky.stars.visible = !sunUp;
  // Clouds drift with the day and fade out at night, so the noon sky has
  // depth instead of a flat blue dome.
  if (sky.clouds) {
    sky.clouds.visible = sunUp;
    sky.clouds.position.x = ((timeOfDay * 4) % 80) - 40;
  }
  const night = !sunUp;
  for (const head of lampHeads) {
    head.material.emissive.setHex(night ? 0xaa8833 : 0x554400);
  }
}
