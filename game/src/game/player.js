// First-person controller at mouse scale. TODO (M1): collisions, climbing, stamina, noise, lantern.
import * as THREE from 'three';
import { input } from '../core/input.js';

const EYE = .07, EYE_CROUCH = .04;               // metres: a mouse's eye height
const SPEED = { walk: .55, sprint: 1.4, crouch: .25 }; // m/s
const LOOK = .0022;                                // rad per mouse pixel at sensitivity 1

/** @param {THREE.PerspectiveCamera} camera */
export function createPlayer(camera) {
  const pos = new THREE.Vector3(), vel = new THREE.Vector3();
  let yaw = 0, pitch = 0, eye = EYE, bobT = 0;

  return {
    pos,
    /** @param {THREE.Vector3} p @param {number} y */
    reset(p, y) { pos.copy(p); vel.set(0, 0, 0); yaw = y; pitch = 0; eye = EYE; bobT = 0; this.place(0, false); },

    /**
     * @param {number} dt
     * @param {{sensitivity:number, invertY:boolean, shake:boolean, fast:boolean,
     *          bounds:{minX:number,maxX:number,minZ:number,maxZ:number}}} o
     */
    update(dt, o) {
      const m = input.consumeMouse();
      yaw -= m.dx * LOOK * o.sensitivity;
      pitch -= m.dy * LOOK * o.sensitivity * (o.invertY ? -1 : 1);
      pitch = Math.max(-1.5, Math.min(1.5, pitch));

      const f = (input.isDown('forward') ? 1 : 0) - (input.isDown('back') ? 1 : 0);
      const s = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
      const crouch = input.isDown('crouch');
      const speed = (crouch ? SPEED.crouch : input.isDown('sprint') ? SPEED.sprint : SPEED.walk) * (o.fast ? 10 : 1);
      const wish = new THREE.Vector3(
        Math.cos(yaw) * s - Math.sin(yaw) * f, 0, -Math.sin(yaw) * s - Math.cos(yaw) * f);
      if (wish.lengthSq() > 1) wish.normalize();
      vel.lerp(wish.multiplyScalar(speed), 1 - Math.exp(-dt * 12));
      pos.addScaledVector(vel, dt);
      pos.x = Math.max(o.bounds.minX, Math.min(o.bounds.maxX, pos.x));
      pos.z = Math.max(o.bounds.minZ, Math.min(o.bounds.maxZ, pos.z));
      pos.y = 0; // TODO (M1): ground height + collisions

      eye += ((crouch ? EYE_CROUCH : EYE) - eye) * (1 - Math.exp(-dt * 10));
      const moving = vel.length() / Math.max(speed, .001);
      bobT += dt * (speed > SPEED.walk * 1.5 ? 16 : 11) * moving;
      this.place(moving, o.shake);
    },

    /** Apply position/rotation to the camera with optional head bob. */
    place(moving, shake) {
      const k = shake ? Math.min(1, moving) : 0;
      camera.position.set(pos.x, pos.y + eye + Math.abs(Math.sin(bobT)) * .006 * k, pos.z);
      camera.rotation.set(pitch + Math.sin(bobT * 2) * .006 * k, yaw, Math.sin(bobT) * .01 * k);
    },
  };
}
