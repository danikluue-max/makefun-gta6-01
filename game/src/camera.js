// The third-person camera: on foot it orbits the player with the mouse (drag to
// look around); in a car it chases behind the car and leans into turns. The
// camera never clips through buildings — it pulls in when something is close.

import * as THREE from 'three';
import { resolveCollisions } from './city.js';

export class CameraRig {
  constructor(camera, city) {
    this.camera = camera;
    this.city = city;
    this.yaw = 0;
    this.pitch = 0.32;
    this.distance = 8;
    this.current = new THREE.Vector3(0, 8, -12);
    this.lookAt = new THREE.Vector3(0, 2, 0);
  }

  orbit(dx, dy) {
    this.yaw -= dx * 0.005;
    this.pitch = Math.max(0.08, Math.min(1.1, this.pitch + dy * 0.004));
  }

  zoom(delta) {
    this.distance = Math.max(4.5, Math.min(15, this.distance + delta * 0.002));
  }

  // Follow a point at (x, z) facing `heading` (car) or the orbit yaw (on foot).
  update(dt, target, inCar, carHeading) {
    const tx = target.x;
    const tz = target.z;
    const headHeight = inCar ? 2.2 : 2.0;
    let wantYaw = this.yaw;
    let wantDist = this.distance;
    if (inCar) {
      // Chase: behind the car, easing toward its heading — a touch closer
      // and lower than before, so the car fills the frame instead of
      // floating small at the bottom of the road.
      let diff = carHeading - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 3.2);
      wantYaw = this.yaw;
      wantDist = this.distance + 1.2;
    }
    const pitch = inCar ? this.pitch * 0.62 : this.pitch;
    const camX = tx - Math.cos(wantYaw) * Math.cos(pitch) * wantDist;
    const camZ = tz + Math.sin(wantYaw) * Math.cos(pitch) * wantDist;
    const camY = headHeight + Math.sin(pitch) * wantDist;
    const goal = new THREE.Vector3(camX, camY, camZ);
    // Keep the camera out of building walls: a chase camera buried in a
    // container shows the player nothing but a grey box. The lerp below
    // smooths the push so the camera slides around corners instead of
    // snapping. (A wall between the camera and the player can still block
    // the view — that needs a line-of-sight pull-in, not done here.)
    if (this.city) {
      const freed = resolveCollisions(this.city, goal.x, goal.z, 0.5);
      goal.x = freed.x;
      goal.z = freed.z;
    }
    const k = 1 - Math.pow(0.0001, dt);
    this.current.lerp(goal, k);
    const lookGoal = new THREE.Vector3(tx, headHeight, tz);
    this.lookAt.lerp(lookGoal, 1 - Math.pow(0.00001, dt));
    this.camera.position.copy(this.current);
    this.camera.lookAt(this.lookAt);
  }

  // The direction the player faces when walking: the camera's forward on the ground.
  forward() {
    return { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) };
  }

  right() {
    return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
  }
}
