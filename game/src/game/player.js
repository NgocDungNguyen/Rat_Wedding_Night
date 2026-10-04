// First-person mouse on the Rapier character controller.
// Move / sprint (stamina) / crouch under gaps / jump (Space) / climb walls and objects (hold Space facing them),
// falls (noise + damage), health, a hand lantern (F) and a carried item (heavy: no sprint, jump or climb).
import * as THREE from 'three';
import { input } from '../core/input.js';
import { audio } from '../core/audio.js';

export const RADIUS = .016;
export const HEIGHT = { stand: .06, crouch: .034 };
const EYE = { stand: .07, crouch: .04 };
export const SPEED = { walk: .55, sprint: 1.4, crouch: .25, carry: .35, carryCrouch: .18, climb: .28, climbSide: .14 };
const LOOK = .0022, GRAVITY = 9.8, JUMP_V = 1.55; // ≈ 12 cm hop
export const STAMINA = { max: 100, sprint: 20, climb: 15, jump: 12, regen: 24, delay: .7, recover: 30 };
export const HEALTH = { max: 100, regen: 5, regenDelay: 7, fallSafe: 3.2, fallDmg: 26 };

/** @param {THREE.PerspectiveCamera} camera */
export function createPlayer(camera) {
  const vel = new THREE.Vector3();
  let yaw = 0, pitch = 0, eye = EYE.stand, bobT = 0, vy = 0, grounded = true, stepAcc = 0;
  let prevJump = false, staminaIdle = 0, sinceHurt = 99, invuln = 0, breathT = 0;
  /** @type {ReturnType<import('./world.js').createWorld['prototype']['createCharacter']>|any} */ let ch = null;

  // Hand lantern: small paper lantern bottom-right of view + warm light.
  const held = new THREE.Group(); camera.add(held);
  const lantern = new THREE.Group();
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xc02018, emissive: 0xff5a20, emissiveIntensity: 1.2, roughness: .8 });
  { const paper = new THREE.Mesh(new THREE.SphereGeometry(.012, 12, 10), paperMat); paper.scale.y = 1.25;
    const capMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10 });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .004, 10), capMat); cap.position.y = .016;
    const cap2 = cap.clone(); cap2.position.y = -.016;
    lantern.add(paper, cap, cap2); lantern.position.set(.028, -.03, -.06); }
  const lanternLight = new THREE.PointLight(0xffa050, 0, 2, 2); lanternLight.position.set(.02, -.015, -.05);
  held.add(lantern, lanternLight); lantern.visible = false;
  /** @type {THREE.Object3D|null} */ let carryMesh = null;

  const p = {
    /** Feet position (shared with the character controller). */
    pos: new THREE.Vector3(),
    climbEnd: '', crouched: false, sprinting: false, climbing: false, grounded: true, moving: 0, speed: 0,
    hasLantern: false, lanternOn: false,
    carry: /** @type {string|null} */ (null),
    stamina: STAMINA.max, exhausted: false,
    hp: HEALTH.max, dead: false,
    noise: 0, impulse: 0,
    get yaw() { return yaw; },

    /** Attach to a level's physics world at position/yaw. */
    spawn(world, at, y) {
      ch?.dispose();
      ch = world.createCharacter({ kind: 'player', radius: RADIUS, height: HEIGHT.stand, pos: at, step: .02, mass: .03 });
      p.pos = ch.feet;
      vel.set(0, 0, 0); vy = 0; yaw = y; pitch = 0; eye = EYE.stand; bobT = 0; grounded = true;
      Object.assign(p, { crouched: false, climbing: false, noise: 0, impulse: 0, stamina: STAMINA.max, exhausted: false, hp: HEALTH.max, dead: false });
      sinceHurt = 99; invuln = 0;
      input.consumeMouse(); p.place(0, false);
    },
    detach() { ch?.dispose(); ch = null; },
    /** Move instantly (checkpoints, debug). */
    teleport(v, y = yaw, pt = 0) { ch.teleport(v); vel.set(0, 0, 0); vy = 0; yaw = y; pitch = pt; p.place(0, false); },
    setLantern(has, on = has) { p.hasLantern = has; p.lanternOn = has && on; lantern.visible = has; },
    toggleLantern() { if (!p.hasLantern) return; p.lanternOn = !p.lanternOn; audio.ui('click', .25, .7); },
    /** @param {string|null} id @param {THREE.Object3D|null} mesh shown in view while carried */
    setCarry(id, mesh = null) {
      if (carryMesh) held.remove(carryMesh);
      p.carry = id; carryMesh = mesh;
      if (mesh) { mesh.position.set(0, -.05, -.09); mesh.rotation.set(.3, .4, 0); held.add(mesh); }
    },
    /** Take damage; `from` pushes the mouse away. Returns true if it killed. */
    damage(n, from = null) {
      if (invuln > 0 || p.dead) return false;
      p.hp = Math.max(0, p.hp - n); sinceHurt = 0; invuln = .9;
      if (from) { const dx = p.pos.x - from.x, dz = p.pos.z - from.z, d = Math.hypot(dx, dz) || 1; vel.set(dx / d * 1.6, 0, dz / d * 1.6); vy = 1.2; p.climbing = false; }
      if (p.hp <= 0) p.dead = true;
      return p.dead;
    },
    heal(n) { p.hp = Math.min(HEALTH.max, p.hp + n); },
    get hurtRecently() { return sinceHurt < .5; },

    /**
     * @param {number} dt
     * @param {ReturnType<import('./world.js').createWorld>} world
     * @param {{sensitivity:number, invertY:boolean, shake:boolean, fast:boolean, danger:boolean}} o
     */
    update(dt, world, o) {
      const m = input.consumeMouse();
      yaw -= m.dx * LOOK * o.sensitivity;
      pitch -= m.dy * LOOK * o.sensitivity * (o.invertY ? -1 : 1);
      pitch = Math.max(-1.5, Math.min(1.5, pitch));
      invuln = Math.max(0, invuln - dt); sinceHurt += dt;
      const pos = p.pos;
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw);

      const jumpHeld = input.isDown('jump'), jumpPressed = jumpHeld && !prevJump; prevJump = jumpHeld;
      const f = (input.isDown('forward') ? 1 : 0) - (input.isDown('back') ? 1 : 0);
      const s = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);

      // Crouch: held, or forced while something is just above (under a gate).
      const head = world.ray({ x: pos.x, y: pos.y + HEIGHT.crouch - .004, z: pos.z }, { x: 0, y: 1, z: 0 }, HEIGHT.stand - HEIGHT.crouch + .006, true);
      p.crouched = !p.climbing && (input.isDown('crouch') || !!head);
      ch.setHeight(p.crouched ? HEIGHT.crouch : HEIGHT.stand);
      const h = ch.height;

      // ---- climbing (hold Space facing a climbable surface)
      const wallAhead = (y) => {
        const hit = world.ray({ x: pos.x, y, z: pos.z }, { x: fx, y: 0, z: fz }, RADIUS + .03, false);
        return hit && hit.meta?.climb && (hit.normal.x * -fx + hit.normal.z * -fz) > .45 ? hit : null;
      };
      const canClimb = !p.carry && !p.exhausted && p.stamina > 2;
      if (!p.climbing && jumpHeld && canClimb && f >= 0 && wallAhead(pos.y + h * .5)) { p.climbing = true; vy = 0; vel.set(0, 0, 0); }
      let usedStamina = false;

      if (p.climbing) {
        const chest = wallAhead(pos.y + h * .55), feet = wallAhead(pos.y + .006);
        if (!jumpHeld || f < 0 || !canClimb) { p.climbing = false; p.climbEnd = !jumpHeld ? 'released' : f < 0 ? 'back' : 'stamina'; vel.set(-fx * .3, 0, -fz * .3); }
        else if (!chest && feet) { // reached the top edge: pull up and over
          ch.move(0, .035, 0); ch.move(fx * .05, 0, fz * .05); p.climbing = false; p.climbEnd = 'top'; vy = 0;
        } else if (!chest && !feet) { p.climbing = false; p.climbEnd = 'lost-wall'; }
        else {
          const rx = Math.cos(yaw), rz = -Math.sin(yaw);
          const r = ch.move(rx * s * SPEED.climbSide * dt + fx * .002, SPEED.climb * dt, rz * s * SPEED.climbSide * dt + fz * .002);
          if (r.ceiling) { p.climbing = false; p.climbEnd = 'ceiling'; }
          p.stamina = Math.max(0, p.stamina - STAMINA.climb * dt); usedStamina = true;
          stepAcc += SPEED.climb * dt; if (stepAcc > .03) { stepAcc = 0; audio.patter(.08, .7); }
        }
        grounded = false;
      }

      if (!p.climbing) {
        // Sprint uses stamina; exhaustion blocks sprint until recovered.
        p.sprinting = input.isDown('sprint') && !p.crouched && !p.carry && f > 0 && !p.exhausted && p.stamina > 0 && grounded;
        if (p.sprinting) { p.stamina = Math.max(0, p.stamina - STAMINA.sprint * dt); usedStamina = true; }
        let speed = p.carry ? (p.crouched ? SPEED.carryCrouch : SPEED.carry)
          : p.crouched ? SPEED.crouch : p.sprinting ? SPEED.sprint : SPEED.walk;
        if (o.fast) speed *= 8;
        const wish = new THREE.Vector3(Math.cos(yaw) * s + fx * f, 0, -Math.sin(yaw) * s + fz * f);
        if (wish.lengthSq() > 1) wish.normalize();
        vel.lerp(wish.multiplyScalar(speed), 1 - Math.exp(-dt * (grounded ? 14 : 2.5)));

        // Jump.
        if (jumpPressed && grounded && !p.carry && p.stamina >= STAMINA.jump * .5) {
          vy = JUMP_V * (p.crouched ? .8 : 1); grounded = false;
          p.stamina = Math.max(0, p.stamina - STAMINA.jump); usedStamina = true;
          audio.patter(.12, 1.3);
        }
        vy -= GRAVITY * dt;
        const vyBefore = vy;
        const r = ch.move(vel.x * dt, vy * dt, vel.z * dt);
        if (r.ceiling && vy > 0) vy = 0;
        const wasAir = !grounded;
        grounded = r.grounded && vy <= 0;
        if (grounded) {
          if (wasAir) {
            const impact = -vyBefore;
            if (impact > 1.4) { p.impulse = Math.max(p.impulse, Math.min(5, impact * .9)); audio.play('thud', { volume: Math.min(.7, impact * .12), rate: 1.9 }); }
            if (impact > HEALTH.fallSafe && !o.fast) p.damage((impact - HEALTH.fallSafe) * HEALTH.fallDmg);
          }
          vy = 0;
        }
        const moved = Math.hypot(r.moved.x, r.moved.z);
        p.speed = moved / Math.max(dt, 1e-4);
        if (grounded) {
          stepAcc += moved;
          const stride = p.sprinting ? .07 : .045;
          if (stepAcc > stride) { stepAcc = 0; audio.patter(p.sprinting ? .3 : p.crouched ? .06 : .14, p.carry ? .6 : 1); }
        }
      }
      p.grounded = grounded;

      // ---- stamina & health over time
      if (usedStamina) staminaIdle = 0; else staminaIdle += dt;
      if (staminaIdle > STAMINA.delay) p.stamina = Math.min(STAMINA.max, p.stamina + STAMINA.regen * dt);
      if (p.stamina <= 0 && !p.exhausted) { p.exhausted = true; audio.play('breath', { volume: .35, rate: 1.5 }); breathT = 0; }
      if (p.exhausted && p.stamina >= STAMINA.recover) p.exhausted = false;
      if (p.exhausted) { breathT += dt; }
      if (sinceHurt > HEALTH.regenDelay && !o.danger && p.hp > 0) p.hp = Math.min(HEALTH.max, p.hp + HEALTH.regen * dt);

      // ---- noise (radius in metres) for cats
      p.moving = Math.min(1, p.speed / SPEED.walk);
      p.noise = p.climbing ? .35 : p.speed < .05 ? 0 : p.sprinting ? 2.4 : p.crouched ? .25 : .9;
      if (p.carry && p.speed > .05) p.noise = p.noise * 1.4 + .4;

      const targetEye = p.crouched ? EYE.crouch : EYE.stand;
      eye += (targetEye - eye) * (1 - Math.exp(-dt * 12));
      bobT += dt * (p.sprinting ? 18 : 11) * (p.climbing ? .6 : p.moving);

      lanternLight.intensity = p.lanternOn ? .1 * (1 + Math.sin(performance.now() * .023) * .06) : 0;
      paperMat.emissiveIntensity = p.lanternOn ? 1.4 : .05;
      p.place(p.climbing ? .5 : p.moving, o.shake);
    },

    /** Apply position/rotation to the camera with optional head bob. */
    place(moving, shake) {
      const k = shake ? Math.min(1, moving) : 0;
      const hurt = invuln > .5 ? (invuln - .5) * .08 : 0;
      camera.position.set(p.pos.x, p.pos.y + eye + Math.abs(Math.sin(bobT)) * .005 * k, p.pos.z);
      camera.rotation.set(pitch + Math.sin(bobT * 2) * .005 * k + (p.climbing ? -.05 : 0), yaw + hurt * Math.sin(performance.now() * .05), Math.sin(bobT) * .008 * k + hurt);
      held.position.set(Math.sin(bobT) * .002 * k, Math.abs(Math.sin(bobT)) * .002 * k, 0);
    },
  };
  return p;
}
