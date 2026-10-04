// Physics world (Rapier) for mouse-scale levels.
// - Static boxes/ramps: houses, walls, furniture (climbable unless marked otherwise).
// - Dynamic props: cups, bowls, fruit, pebbles… pushed by the player, fall, and make noise on impact.
// - Character controllers: the player mouse and cats (capsules).
// - Zones (plain JS): hide / safe / light / trigger areas.
// Units are metres. Box `y` is its bottom, so a box with y > 0 leaves a gap underneath (door gaps).
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export const initPhysics = () => RAPIER.init();

// Collision groups: membership << 16 | filter.
const G = { STATIC: 1, DYN: 2, PLAYER: 4, CAT: 8, CATWALL: 16 };
const groups = (member, filter) => (member << 16) | filter;
const GROUPS = {
  static: groups(G.STATIC, 0xffff),
  dyn: groups(G.DYN, G.STATIC | G.DYN | G.PLAYER | G.CAT),
  player: groups(G.PLAYER, G.STATIC | G.DYN),
  cat: groups(G.CAT, G.STATIC | G.DYN | G.CATWALL),
  catwall: groups(G.CATWALL, G.CAT),
};
const EX_SENS_KIN = RAPIER.QueryFilterFlags.EXCLUDE_SENSORS | RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC;

/**
 * @typedef {{climb:boolean, sight:boolean, tag?:string, dynamic?:any}} Meta
 * @typedef {{x:number, z:number, r?:number, hx?:number, hz?:number, y0:number, y1:number, tag:string, id?:string, data?:any}} Zone
 */

export function createWorld() {
  const pw = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  pw.lengthUnit = .1; // objects here are ~10 cm, so scale the solver tolerances down
  const events = new RAPIER.EventQueue(true);
  /** @type {Map<number, Meta>} */ const meta = new Map();
  /** @type {Zone[]} */ const zones = [];
  /** @type {any[]} */ const dynamics = [];
  /** @type {((p:THREE.Vector3, loud:number, prop:any)=>void)[]} */ const impactFns = [];
  const q = new THREE.Quaternion(), e = new THREE.Euler();

  const fixedBody = (x, y, z, rx = 0, ry = 0, rz = 0, order = 'XYZ') => {
    q.setFromEuler(e.set(rx, ry, rz, order));
    return pw.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }));
  };

  const world = {
    zones, dynamics, raw: pw,

    /**
     * Static box. Centre x/z, bottom y.
     * @param {{x:number, y?:number, z:number, w:number, h:number, d:number, rx?:number, ry?:number, rz?:number,
     *   climb?:boolean, sight?:boolean, catOnly?:boolean, friction?:number, tag?:string}} o
     */
    addBox(o) {
      const y = o.y ?? 0;
      const body = fixedBody(o.x, y + o.h / 2, o.z, o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
      const c = pw.createCollider(RAPIER.ColliderDesc.cuboid(o.w / 2, o.h / 2, o.d / 2)
        .setFriction(o.friction ?? .9).setCollisionGroups(o.catOnly ? GROUPS.catwall : GROUPS.static), body);
      meta.set(c.handle, { climb: o.climb ?? !o.catOnly, sight: o.sight ?? !o.catOnly, tag: o.tag });
      return c;
    },

    /** Static cylinder (jars, wells, posts). Bottom y. */
    addCylinder(o) {
      const y = o.y ?? 0;
      const body = fixedBody(o.x, y + o.h / 2, o.z);
      const c = pw.createCollider(RAPIER.ColliderDesc.cylinder(o.h / 2, o.r).setFriction(o.friction ?? .9).setCollisionGroups(GROUPS.static), body);
      meta.set(c.handle, { climb: o.climb ?? true, sight: o.sight ?? true, tag: o.tag });
      return c;
    },

    /** Walkable slope from a to b (top surface along the centre line), `width` wide. */
    addRamp(a, b, width, o = {}) {
      const th = o.thickness ?? .02, dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, hl = Math.hypot(dx, dz);
      const yaw = Math.atan2(dx, dz), pitch = -Math.atan2(dy, hl), len = Math.hypot(hl, dy);
      // Centre sits half a thickness below the top surface.
      const n = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
      const cx = (a.x + b.x) / 2 - n.x * th / 2, cy = (a.y + b.y) / 2 - n.y * th / 2, cz = (a.z + b.z) / 2 - n.z * th / 2;
      const body = fixedBody(cx, cy, cz, pitch, yaw, 0, 'YXZ');
      const c = pw.createCollider(RAPIER.ColliderDesc.cuboid(width / 2, th / 2, len / 2).setFriction(1).setCollisionGroups(GROUPS.static), body);
      meta.set(c.handle, { climb: o.climb ?? true, sight: o.sight ?? false, tag: o.tag });
      return { center: new THREE.Vector3(cx, cy, cz), yaw, pitch, len };
    },

    /**
     * Dynamic prop with a mesh that follows the body.
     * @param {{mesh:THREE.Object3D, shape:{type:'box',hx:number,hy:number,hz:number}|{type:'cyl',hh:number,r:number}|{type:'ball',r:number},
     *   x:number, y:number, z:number, ry?:number, mass:number, friction?:number, restitution?:number, sound?:'clack'|'soft'|'wood', id?:string}} o
     *   (y = centre height)
     */
    addDynamic(o) {
      q.setFromEuler(e.set(0, o.ry ?? 0, 0));
      const body = pw.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(o.x, o.y, o.z)
        .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }).setCcdEnabled(true).setLinearDamping(.05).setAngularDamping(.2));
      const s = o.shape;
      const desc = s.type === 'box' ? RAPIER.ColliderDesc.cuboid(s.hx, s.hy, s.hz)
        : s.type === 'cyl' ? RAPIER.ColliderDesc.cylinder(s.hh, s.r) : RAPIER.ColliderDesc.ball(s.r);
      const c = pw.createCollider(desc.setMass(o.mass).setFriction(o.friction ?? .6).setRestitution(o.restitution ?? .15)
        .setCollisionGroups(GROUPS.dyn).setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
        .setContactForceEventThreshold(o.mass * 9.81 * 4), body);
      const prop = { id: o.id, body, collider: c, mesh: o.mesh, mass: o.mass, sound: o.sound ?? 'clack', lastHit: 0, enabled: true };
      meta.set(c.handle, { climb: false, sight: false, dynamic: prop });
      dynamics.push(prop);
      return prop;
    },
    /** Remove a dynamic prop from the simulation (e.g. picked up). */
    removeDynamic(prop) {
      if (!prop.enabled) return;
      prop.enabled = false; meta.delete(prop.collider.handle); pw.removeRigidBody(prop.body);
    },

    /** Cat-only invisible wall (keeps cats in their area). */
    addCatWall(o) { return world.addBox({ ...o, catOnly: true }); },

    /** Circle zone (r) or box zone (hx/hz), active between y0 and y1. */
    addZone(o) { const z = { y0: -1, y1: 99, ...o }; zones.push(z); return z; },
    zonesAt(x, y, z, tag) {
      return zones.filter(zn => {
        if (tag && zn.tag !== tag) return false;
        if (y < zn.y0 || y > zn.y1) return false;
        if (zn.r != null) return Math.hypot(x - zn.x, z - zn.z) <= zn.r;
        return Math.abs(x - zn.x) <= zn.hx && Math.abs(z - zn.z) <= zn.hz;
      });
    },
    inZone(x, y, z, tag) { return world.zonesAt(x, y, z, tag).length > 0; },

    /**
     * Capsule character (player or cat) driven by Rapier's kinematic character controller.
     * @param {{kind:'player'|'cat', radius:number, height:number, pos:THREE.Vector3, step:number, mass:number}} o
     */
    createCharacter(o) {
      const r = o.radius; let hh = Math.max(.0005, (o.height - 2 * r) / 2);
      const feet = o.pos.clone();
      const body = pw.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(feet.x, feet.y + hh + r, feet.z));
      const collider = pw.createCollider(RAPIER.ColliderDesc.capsule(hh, r).setCollisionGroups(o.kind === 'cat' ? GROUPS.cat : GROUPS.player), body);
      const ctrl = pw.createCharacterController(r * .08);
      ctrl.setUp({ x: 0, y: 1, z: 0 });
      ctrl.enableAutostep(o.step, r * .5, false);
      ctrl.enableSnapToGround(o.step);
      ctrl.setMaxSlopeClimbAngle(THREE.MathUtils.degToRad(58));
      ctrl.setMinSlopeSlideAngle(THREE.MathUtils.degToRad(62));
      ctrl.setApplyImpulsesToDynamicBodies(true);
      ctrl.setCharacterMass(o.mass);
      const filterGroups = o.kind === 'cat' ? GROUPS.cat : GROUPS.player;
      const center = () => ({ x: feet.x, y: feet.y + hh + r, z: feet.z });

      return {
        feet, collider,
        get height() { return 2 * (hh + r); },
        /** Move by delta; returns contact info. */
        move(dx, dy, dz) {
          ctrl.computeColliderMovement(collider, { x: dx, y: dy, z: dz }, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, filterGroups);
          const m = ctrl.computedMovement();
          feet.x += m.x; feet.y += m.y; feet.z += m.z;
          body.setNextKinematicTranslation(center());
          let wall = null, ceiling = false;
          for (let i = 0; i < ctrl.numComputedCollisions(); i++) {
            const c = ctrl.computedCollision(i); if (!c) continue;
            if (c.normal1.y < -.7) ceiling = true;
            else if (Math.abs(c.normal1.y) < .5) wall = { nx: c.normal1.x, nz: c.normal1.z, collider: c.collider };
          }
          return { grounded: ctrl.computedGrounded(), wall, ceiling, moved: m };
        },
        /** Change capsule height keeping the feet in place. */
        setHeight(h) {
          const nh = Math.max(.0005, (h - 2 * r) / 2); if (Math.abs(nh - hh) < 1e-5) return;
          hh = nh; collider.setHalfHeight(hh); body.setTranslation(center(), true);
        },
        teleport(p) { feet.copy(p); body.setTranslation(center(), true); },
        dispose() { pw.removeCharacterController(ctrl); pw.removeRigidBody(body); },
      };
    },

    /** Ray against static + dynamic geometry. Returns {toi, normal, meta} or null. */
    ray(origin, dir, maxDist, ignoreDynamic = false) {
      const hit = pw.castRayAndGetNormal(new RAPIER.Ray(origin, dir), maxDist, true,
        EX_SENS_KIN | (ignoreDynamic ? RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC : 0), undefined, undefined, undefined,
        (c) => meta.has(c.handle));
      if (!hit) return null;
      return { toi: hit.timeOfImpact, normal: hit.normal, meta: meta.get(hit.collider.handle) };
    },

    /** Line of sight between two points (ignores characters, small props and see-through colliders). */
    sightBlocked(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz);
      if (d < 1e-4) return false;
      const hit = pw.castRay(new RAPIER.Ray(a, { x: dx / d, y: dy / d, z: dz / d }), d, true,
        EX_SENS_KIN | RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC, undefined, undefined, undefined,
        (c) => meta.get(c.handle)?.sight === true);
      return !!hit;
    },

    /** Subscribe to loud impacts of dynamic props. */
    onImpact(fn) { impactFns.push(fn); },

    /** Advance physics and sync prop meshes. */
    step(dt) {
      pw.timestep = Math.min(1 / 30, Math.max(1 / 240, dt));
      pw.step(events);
      const now = performance.now();
      events.drainContactForceEvents((ev) => {
        for (const h of [ev.collider1(), ev.collider2()]) {
          const p = meta.get(h)?.dynamic; if (!p || now - p.lastHit < 180) continue;
          const loud = ev.totalForceMagnitude() / (p.mass * 9.81);
          if (loud < 6) continue;
          p.lastHit = now;
          const t = p.body.translation();
          impactFns.forEach(fn => fn(new THREE.Vector3(t.x, t.y, t.z), loud, p));
        }
      });
      for (const p of dynamics) {
        if (!p.enabled) continue;
        const t = p.body.translation(), r = p.body.rotation();
        p.mesh.position.set(t.x, t.y, t.z); p.mesh.quaternion.set(r.x, r.y, r.z, r.w);
      }
    },

    dispose() { pw.free(); events.free(); },
  };
  return world;
}
