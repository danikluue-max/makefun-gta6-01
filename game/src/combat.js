// Combat: a pistol shot is a ray from the camera through the crosshair. It can hit
// pedestrians, police officers and cars; a hit flashes a spark and deals damage.
// The shooter is told what it hit so the wanted system can react.

import * as THREE from 'three';

export function shootAt(scene, camera, targets, maxRange) {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  raycaster.far = maxRange;
  const hits = raycaster.intersectObjects(targets, true);
  if (hits.length === 0) return null;
  const hit = hits[0];
  // Walk up to the object that carries the game reference.
  let node = hit.object;
  while (node && !node.userData.ref) node = node.parent;
  return { point: hit.point, distance: hit.distance, ref: node ? node.userData.ref : null };
}

export function makeMuzzleFlash(scene, point) {
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd23c, transparent: true, opacity: 0.95 }),
  );
  flash.position.copy(point);
  scene.add(flash);
  return { mesh: flash, life: 0.07, maxLife: 0.07 };
}

export function makeHitSpark(scene, point) {
  const spark = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 6, 5),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
  );
  spark.position.copy(point);
  scene.add(spark);
  return { mesh: spark, life: 0.16, maxLife: 0.16 };
}

export function updateEffects(scene, effects, dt) {
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    const effect = effects[i];
    effect.life -= dt;
    // Shrink as it dies, so a flash pops instead of blinking out.
    const s = Math.max(0.05, effect.life / (effect.maxLife || 1));
    effect.mesh.scale.setScalar(s);
    if (effect.life <= 0) {
      scene.remove(effect.mesh);
      effects.splice(i, 1);
    }
  }
}
