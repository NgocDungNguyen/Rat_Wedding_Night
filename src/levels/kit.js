// Level kit: materials with real-world texture scale, mesh+physics helpers and prop builders.
// Everything is at real size (metres); the player is a 6 cm mouse. Static props get colliders,
// small props are dynamic rigid bodies (they can be pushed, fall, roll and make noise).
import * as THREE from 'three';
import * as L from '@trailer/lib.js';

const PI = Math.PI;

/** Box geometry whose UVs are in metres / tile size (so textures keep real scale on every face). */
function boxGeo(w, h, d, tile = [1, 1]) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, [tw, th] = tile;
  const faces = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; // +x -x +y -y +z -z
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
    const i = f * 4 + v; uv.setXY(i, uv.getX(i) * faces[f][0] / tw, uv.getY(i) * faces[f][1] / th);
  }
  return g;
}

/** Simple procedural canvas texture. */
function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Square red "gạch bát" floor tiles (0.3 m), 4×4 per texture. */
function floorTileTex() {
  return canvasTex(512, 512, (x, w) => {
    x.fillStyle = '#3a2418'; x.fillRect(0, 0, w, w);
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = .75 + Math.random() * .3;
      x.fillStyle = `rgb(${128 * v},${58 * v},${38 * v})`; x.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
      for (let k = 0; k < 60; k++) { x.fillStyle = `rgba(0,0,0,${Math.random() * .15})`; x.fillRect(i * s + Math.random() * s, j * s + Math.random() * s, 3, 3); }
    }
  });
}
/** Woven bamboo (baskets, coop). */
function weaveTex() {
  return canvasTex(256, 256, (x, w) => {
    x.fillStyle = '#3c3018'; x.fillRect(0, 0, w, w);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const v = .7 + Math.random() * .3; x.fillStyle = `rgb(${150 * v},${122 * v},${70 * v})`;
      if ((i + j) % 2) x.fillRect(i * 16 + 1, j * 16 + 3, 14, 10); else x.fillRect(i * 16 + 3, j * 16 + 1, 10, 14);
    }
  });
}
/** Grass blade cards (alpha). */
function bladeTex() {
  return canvasTex(256, 256, (x, w) => {
    x.clearRect(0, 0, w, w);
    for (let i = 0; i < 40; i++) {
      const bx = Math.random() * w, lean = (Math.random() - .5) * 60, hgt = w * (.5 + Math.random() * .5), v = .5 + Math.random() * .5;
      x.strokeStyle = `rgb(${60 * v},${88 * v},${38 * v})`; x.lineWidth = 2 + Math.random() * 3;
      x.beginPath(); x.moveTo(bx, w); x.quadraticCurveTo(bx + lean * .3, w - hgt * .6, bx + lean, w - hgt); x.stroke();
    }
  }, false);
}
/** Straw texture. */
function strawTex() {
  return canvasTex(256, 256, (x, w) => {
    x.fillStyle = '#5a4a26'; x.fillRect(0, 0, w, w);
    for (let i = 0; i < 900; i++) { const v = .6 + Math.random() * .5; x.strokeStyle = `rgba(${190 * v},${160 * v},${90 * v},.8)`; x.lineWidth = 1 + Math.random();
      const sx = Math.random() * w, sy = Math.random() * w, a = Math.random() * PI; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + Math.cos(a) * 30, sy + Math.sin(a) * 30); x.stroke(); }
  });
}
let _flame = null;
function flameTex() {
  if (_flame) return _flame;
  _flame = canvasTex(64, 128, (x) => {
    const g = x.createRadialGradient(32, 84, 2, 32, 76, 40); g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(.3, 'rgba(255,180,60,.9)'); g.addColorStop(1, 'rgba(255,80,0,0)');
    x.fillStyle = g; x.beginPath(); x.ellipse(32, 76, 18, 48, 0, 0, 7); x.fill();
  }, false);
  _flame.userData.keep = true;
  return _flame;
}

/**
 * Create a kit bound to a scene and physics world.
 * @param {THREE.Scene} scene @param {ReturnType<import('../game/world.js').createWorld>} world
 */
export function createKit(scene, world) {
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: .9, metalness: 0, ...o });
  const T = {
    plaster: L.plasterTex(), plasterDark: L.plasterTex([120, 110, 92]), brick: L.brickTex(), wood: L.woodTex(),
    dirt: L.dirtTex(), grass: L.grassDirtTex(), roof: L.tileTex(), red: L.fabricTex([140, 14, 20]),
    floor: floorTileTex(), weave: weaveTex(), blade: bladeTex(), straw: strawTex(), bambooLeaf: L.bambooLeafTex(),
  };
  // Material + texture size in metres (for boxGeo UVs).
  const M = {
    plaster: Object.assign(std({ map: T.plaster }), { userData: { tile: [2, 1] } }),
    plasterDark: Object.assign(std({ map: T.plasterDark }), { userData: { tile: [2, 1] } }),
    brick: Object.assign(std({ map: T.brick }), { userData: { tile: [2.35, 1.17] } }),
    wood: Object.assign(std({ map: T.wood, roughness: .8 }), { userData: { tile: [1.2, 2.4] } }),
    woodDark: Object.assign(std({ map: T.wood, color: 0x8a6a58, roughness: .75 }), { userData: { tile: [1.2, 2.4] } }),
    lacquer: Object.assign(std({ map: T.wood, color: 0xc03028, roughness: .35 }), { userData: { tile: [1.2, 2.4] } }),
    dirt: Object.assign(std({ map: T.dirt }), { userData: { tile: [2, 2] } }),
    grass: Object.assign(std({ map: T.grass }), { userData: { tile: [2, 2] } }),
    floor: Object.assign(std({ map: T.floor, roughness: .7 }), { userData: { tile: [1.2, 1.2] } }),
    roof: Object.assign(std({ map: T.roof, roughness: .8 }), { userData: { tile: [2.4, 2.4] } }),
    red: Object.assign(std({ map: T.red, roughness: .8 }), { userData: { tile: [.6, .6] } }),
    weave: Object.assign(std({ map: T.weave, roughness: .9 }), { userData: { tile: [.4, .4] } }),
    straw: Object.assign(std({ map: T.straw }), { userData: { tile: [.8, .8] } }),
    gold: std({ color: 0xc9a040, metalness: .75, roughness: .35 }),
    glaze: std({ color: 0x4a2c18, roughness: .25, metalness: .1 }),
    ceramic: std({ color: 0xe8e2d6, roughness: .3 }),
    bamboo: std({ color: 0x7a8040, roughness: .7 }),
    bambooDry: std({ color: 0x9a8650, roughness: .8 }),
    paper: std({ color: 0xe9dfc8, roughness: .95, side: THREE.DoubleSide }),
    dark: std({ color: 0x0c0a08 }),
    stone: std({ color: 0x6a665e, roughness: .95 }),
    water: std({ color: 0x0a1418, roughness: .05, metalness: .3 }),
    blades: new THREE.MeshLambertMaterial({ map: T.blade, alphaTest: .4, side: THREE.DoubleSide }),
    leaves: new THREE.MeshLambertMaterial({ map: T.bambooLeaf, alphaTest: .45, side: THREE.DoubleSide }),
  };

  const add = (m, cast = true, receive = true) => { m.castShadow = cast; m.receiveShadow = receive; scene.add(m); return m; };

  const k = {
    T, M, scene, world,

    /**
     * Box mesh + static collider. Centre x/z, bottom y.
     * @param {{x:number,y?:number,z:number,w:number,h:number,d:number,rx?:number,ry?:number,rz?:number,mat?:THREE.Material,
     *   collide?:boolean, climb?:boolean, sight?:boolean, cast?:boolean, parent?:THREE.Object3D}} o
     */
    box(o) {
      const mat = o.mat ?? M.plaster, y = o.y ?? 0;
      const m = new THREE.Mesh(boxGeo(o.w, o.h, o.d, mat.userData?.tile), mat);
      m.position.set(o.x, y + o.h / 2, o.z); m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
      add(m, o.cast ?? true);
      if (o.collide !== false) world.addBox({ x: o.x, y, z: o.z, w: o.w, h: o.h, d: o.d, rx: o.rx, ry: o.ry, rz: o.rz, climb: o.climb, sight: o.sight });
      return m;
    },
    /** Cylinder mesh + static collider. Bottom y. */
    cyl(o) {
      const y = o.y ?? 0;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(o.rTop ?? o.r, o.r, o.h, o.seg ?? 20), o.mat ?? M.wood);
      m.position.set(o.x, y + o.h / 2, o.z); add(m, o.cast ?? true);
      if (o.collide !== false) world.addCylinder({ x: o.x, y, z: o.z, r: Math.max(o.r, o.rTop ?? 0), h: o.h, climb: o.climb, sight: o.sight });
      return m;
    },
    /** Walkable plank/slope mesh + collider from a to b (top surface). */
    ramp(a, b, width, mat = M.wood, o = {}) {
      const r = world.addRamp(a, b, width, { thickness: o.thickness ?? .02, climb: o.climb });
      const m = new THREE.Mesh(boxGeo(width, o.thickness ?? .02, r.len, mat.userData?.tile), mat);
      m.position.copy(r.center); m.rotation.set(r.pitch, r.yaw, 0, 'YXZ'); add(m);
      return m;
    },
    /**
     * Dynamic prop. y = centre height.
     * @param {{mesh:THREE.Object3D, shape:any, x:number, y:number, z:number, ry?:number, mass:number, sound?:string, id?:string, friction?:number, restitution?:number}} o
     */
    dyn(o) { o.mesh.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); scene.add(o.mesh); return world.addDynamic(o); },

    /** Invisible boundary (not climbable, doesn't block sight). Centre x/z. */
    bound(x, z, w, d, h = 6) { world.addBox({ x, y: -.5, z, w, h, d, climb: false, sight: false }); },
    /** Large ground slab (top at y=0). */
    ground(cx, cz, w, d, mat = M.dirt) {
      const m = new THREE.Mesh(boxGeo(w, .2, d, mat.userData.tile), mat); m.position.set(cx, -.1, cz); add(m, false);
      world.addBox({ x: cx, y: -.2, z: cz, w, h: .2, d, climb: false });
      return m;
    },

    // ------------------------------------------------------------ lights
    /** Warm point light; optional light zone on the ground (cats see you better there). */
    light(x, y, z, color, intensity, dist, zoneR = 0) {
      const l = new THREE.PointLight(color, intensity, dist, 2); l.position.set(x, y, z); scene.add(l);
      if (zoneR) world.addZone({ tag: 'light', x, z, r: zoneR, y0: y - 2, y1: y + .5 });
      return l;
    },
    /** Candle with flame sprite + flickering light. Returns {light, flame, update(t)}. */
    candle(x, y, z, h = .22, light = true) {
      const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(.018, .02, h, 12), std({ color: 0xb01818, roughness: .5 })); c.position.y = h / 2; c.castShadow = true; g.add(c);
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      fl.scale.set(.03, .06, 1); fl.position.y = h + .03; g.add(fl);
      const l = light ? k.light(x, y + h + .05, z, 0xff9a40, .5, 4, 0) : null;
      return { light: l, flame: fl, update(t, i = 0) { const n = L.noise1(t * 9 + i * 7); fl.scale.set(.03, .06 * (1 + n * .2), 1); if (l) l.intensity = .5 * (1 + n * .25); } };
    },

    // ------------------------------------------------------------ zones
    hide(x, z, r, o = {}) { return world.addZone({ tag: 'hide', x, z, r, y0: (o.y ?? 0) - .05, y1: (o.y ?? 0) + (o.h ?? .3), data: { needCrouch: !!o.needCrouch } }); },
    hideBox(x, z, hx, hz, o = {}) { return world.addZone({ tag: 'hide', x, z, hx, hz, y0: (o.y ?? 0) - .05, y1: (o.y ?? 0) + (o.h ?? .3), data: { needCrouch: !!o.needCrouch } }); },
    shadow(x, z, hx, hz, y = 0) { return world.addZone({ tag: 'shadow', x, z, hx, hz, y0: y - .05, y1: y + .5 }); },
    safe(x, z, r, hz) { return hz != null ? world.addZone({ tag: 'safe', x, z, hx: r, hz }) : world.addZone({ tag: 'safe', x, z, r }); },

    // ------------------------------------------------------------ water
    /** Mud floor slab: top at y (below water). */
    mud(cx, cz, w, d, top = -.25) {
      const m = new THREE.Mesh(boxGeo(w, .2, d, M.dirt.userData.tile), std({ map: T.dirt, color: 0x5a4a38 })); m.position.set(cx, top - .1, cz); add(m, false);
      world.addBox({ x: cx, y: top - .2, z: cz, w, h: .2, d, climb: false });
    },
    /** Paddy / channel water: a water zone (swimming) with surface height. */
    water(x0, z0, x1, z1, surface = 0, tag = 'paddy') {
      return world.addZone({ tag: 'water', id: tag, x: (x0 + x1) / 2, z: (z0 + z1) / 2, hx: Math.abs(x1 - x0) / 2, hz: Math.abs(z1 - z0) / 2, y0: -2, y1: surface + .05, data: { surface } });
    },
    /** One big water surface plane (visual). Returns the material (animate its normal map offset). */
    waterPlane(cx, cz, w, d, y = 0) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x24404e, roughness: .14, metalness: .15, transparent: true, opacity: .9 });
      const nm = L.waterNormalTex(); nm.repeat.set(w * 1.5, d * 1.5); mat.normalMap = nm; mat.normalScale.set(.35, .35);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -PI / 2; m.position.set(cx, y, cz); m.receiveShadow = true; scene.add(m);
      return mat;
    },
    /** Rice plants standing in water (box area). Optionally a hide zone. */
    rice(x, z, hx, hz, h = .5, density = 3, hide = true, waterY = 0) {
      const n = Math.max(4, Math.floor(hx * hz * 4 * density));
      const geo = new THREE.PlaneGeometry(.16, h); geo.translate(0, h / 2, 0);
      const mat = new THREE.MeshLambertMaterial({ map: T.blade, alphaTest: .4, side: THREE.DoubleSide, color: 0x9ab070 });
      const mesh = new THREE.InstancedMesh(geo, mat, n * 3); const o = new THREE.Object3D();
      let i = 0;
      for (let k = 0; k < n; k++) {
        const px = x + (Math.random() * 2 - 1) * hx, pz = z + (Math.random() * 2 - 1) * hz;
        for (let j = 0; j < 3; j++) { o.position.set(px, waterY - .02, pz); o.rotation.set((Math.random() - .5) * .2, j * PI / 3 + Math.random() * .5, (Math.random() - .5) * .2);
          const sc = .7 + Math.random() * .5; o.scale.set(sc, sc, sc); o.updateMatrix(); mesh.setMatrixAt(i++, o.matrix); }
      }
      mesh.castShadow = true; scene.add(mesh);
      if (hide) world.addZone({ tag: 'hide', x, z, hx, hz, y0: -2, y1: waterY + h * .5, data: { needCrouch: false } });
      return mesh;
    },

    // ------------------------------------------------------------ props
    /** Glazed water jar (chum): slippery, not climbable. */
    jar(x, z, r = .28, h = .62) {
      const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(r * (.62 + .45 * Math.sin(t * PI * .95)) * (t > .9 ? .85 : 1), t * h)); }
      const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), M.glaze); m.position.set(x, 0, z); add(m);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(r * .62, r * .62, .02, 20), M.woodDark); lid.position.set(x, h + .01, z); add(lid);
      world.addCylinder({ x, z, r: r * .98, h: h + .02, climb: false });
    },
    /** Stack of firewood logs: climbable. */
    firewood(x, z, w = 1, h = .45, d = .4, ry = 0) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
      const lr = .055; const rows = Math.floor(h / (lr * 1.8));
      for (let r = 0; r < rows; r++) for (let i = 0; i < Math.floor(d / (lr * 2)); i++) {
        const lg = new THREE.Mesh(new THREE.CylinderGeometry(lr * (.8 + Math.random() * .3), lr, w * (.9 + Math.random() * .15), 9), M.wood);
        lg.rotation.z = PI / 2; lg.position.set((Math.random() - .5) * .05, lr + r * lr * 1.75, -d / 2 + lr + i * lr * 2 + (r % 2) * lr * .5); lg.castShadow = lg.receiveShadow = true; g.add(lg);
      }
      world.addBox({ x, z, w, h: rows * lr * 1.75 + lr * .3, d, ry });
    },
    /** Upturned bamboo basket propped on a stick: crawl under (crouch) to hide. */
    basket(x, z, r = .24) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 10, 0, PI * 2, 0, PI / 2), M.weave); m.material.side = THREE.DoubleSide;
      m.position.set(x, .05, z); m.scale.y = .75; add(m);
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .09), M.bambooDry); stick.position.set(x + r * .7, .045, z); stick.rotation.z = .4; add(stick);
      // Rim walls (gap of 5 cm at the bottom: crouch to get in) + roof.
      const n = 8; for (let i = 0; i < n; i++) { const a = i / n * PI * 2; world.addBox({ x: x + Math.cos(a) * r * .97, y: .05, z: z + Math.sin(a) * r * .97, w: .02, h: r * .6, d: r * .8, ry: -a, climb: true }); }
      world.addBox({ x, y: .05 + r * .62, z, w: r * 1.4, h: .03, d: r * 1.4, climb: false });
      k.hide(x, z, r * .85, { h: .1 });
    },
    /** Tall grass patch (box area): hides you (crouch not required), cats can't see through. */
    grass(x, z, hx, hz, h = .28, density = 1) {
      const n = Math.floor(hx * hz * 60 * density) + 4, geo = new THREE.PlaneGeometry(.22, h); geo.translate(0, h / 2, 0);
      const mesh = new THREE.InstancedMesh(geo, M.blades, n * 2); const o = new THREE.Object3D();
      for (let i = 0; i < n * 2; i++) {
        o.position.set(x + (Math.random() * 2 - 1) * hx, 0, z + (Math.random() * 2 - 1) * hz);
        o.rotation.set(0, (i % 2 ? PI / 2 : 0) + Math.random(), 0); const s = .7 + Math.random() * .5; o.scale.set(s, s, s); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
      }
      mesh.castShadow = true; scene.add(mesh);
      // Inside the patch you are hidden (cats can't see into it).
      world.addZone({ tag: 'hide', x, z, hx, hz, y0: -.05, y1: h * .8, data: { needCrouch: h < .15 } });
      return mesh;
    },
    /** Straw pile: mound you can burrow into. */
    straw(x, z, r = .5, h = .4) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, PI * 2, 0, PI / 2), M.straw); m.position.set(x, 0, z); m.scale.set(r, h, r * .9); add(m);
      world.addCylinder({ x, z, r: r * .45, h: h * .85, climb: true });
      k.hide(x, z, r * .95, { h: .2 });
    },
    /** Ox cart: hide underneath in its shadow. */
    cart(x, z, ry = 0) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
      const bed = new THREE.Mesh(boxGeo(.7, .05, 1.35, M.wood.userData.tile), M.wood); bed.position.y = .36; g.add(bed);
      for (const sx of [-1, 1]) {
        const side = new THREE.Mesh(boxGeo(.03, .18, 1.35, M.wood.userData.tile), M.wood); side.position.set(sx * .34, .47, 0); g.add(side);
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(.32, .03, 6, 20), M.woodDark); wheel.position.set(sx * .41, .34, .1); wheel.rotation.y = PI / 2; g.add(wheel);
        for (let s = 0; s < 6; s++) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, .62), M.woodDark); sp.position.copy(wheel.position); sp.rotation.set(s / 6 * PI, 0, 0); sp.rotation.order = 'YXZ'; sp.rotation.y = PI / 2; g.add(sp); }
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1.3), M.woodDark); shaft.rotation.x = PI / 2 - .3; shaft.position.set(sx * .25, .2, -1.15); g.add(shaft);
      }
      g.traverse(c => { if (c.isMesh) { c.castShadow = c.receiveShadow = true; } });
      world.addBox({ x, y: .335, z, w: .7, h: .06, d: 1.35, ry });
      for (const sx of [-1, 1]) world.addBox({ x: x + Math.cos(ry) * sx * .41 + Math.sin(ry) * .1, y: .02, z: z - Math.sin(ry) * sx * .41 + Math.cos(ry) * .1, w: .06, h: .64, d: .64, ry, climb: true });
      k.shadow(x, z, .32, .65); k.hideBox(x, z, .3, .6, { needCrouch: true, h: .3 });
    },
    /** Brick/plaster wall segment from (x0,z0) to (x1,z1). */
    wall(x0, z0, x1, z1, h, thick = .2, mat = M.brick, y = 0, cap = true) {
      const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(x1 - x0, z1 - z0) - PI / 2;
      k.box({ x: (x0 + x1) / 2, y, z: (z0 + z1) / 2, w: len, h, d: thick, ry, mat });
      if (cap) k.box({ x: (x0 + x1) / 2, y: y + h, z: (z0 + z1) / 2, w: len + .04, h: .05, d: thick + .08, ry, mat: M.roof });
    },
    /** Wooden gate leaf with a gap underneath (mouse crawls under). */
    gate(x, z, w, h, gap = .045, ry = 0, base = 0) {
      const g = new THREE.Group(); g.position.set(x, base + gap, z); g.rotation.y = ry; scene.add(g);
      const planks = Math.round(w / .12);
      for (let i = 0; i < planks; i++) { const p = new THREE.Mesh(boxGeo(w / planks - .008, h - gap, .04, M.woodDark.userData.tile), M.woodDark); p.position.set(-w / 2 + (i + .5) * w / planks, (h - gap) / 2, 0); p.castShadow = p.receiveShadow = true; g.add(p); }
      for (const yy of [.25, h - gap - .25]) { const b = new THREE.Mesh(boxGeo(w, .07, .03, M.wood.userData.tile), M.wood); b.position.set(0, yy, .035); g.add(b); }
      world.addBox({ x, y: base + gap, z, w, h: h - gap, d: .05, ry });
    },
    /** Bamboo hedge (dense, blocks sight). */
    hedge(x0, z0, x1, z1, h = 2.6, thick = .45) {
      const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(x1 - x0, z1 - z0) - PI / 2, n = Math.floor(len * 7);
      const stalk = new THREE.CylinderGeometry(.018, .022, h, 6); stalk.translate(0, h / 2, 0);
      const st = new THREE.InstancedMesh(stalk, M.bamboo, n), lf = new THREE.InstancedMesh(new THREE.PlaneGeometry(.8, 1.4), M.leaves, n * 2);
      const o = new THREE.Object3D();
      for (let i = 0; i < n; i++) {
        const t = Math.random(), off = (Math.random() - .5) * thick;
        const px = x0 + (x1 - x0) * t + Math.cos(ry) * off, pz = z0 + (z1 - z0) * t - Math.sin(ry) * off;
        o.position.set(px, 0, pz); o.rotation.set((Math.random() - .5) * .12, 0, (Math.random() - .5) * .12); o.scale.set(1, .8 + Math.random() * .4, 1); o.updateMatrix(); st.setMatrixAt(i, o.matrix);
        for (let j = 0; j < 2; j++) { o.position.set(px, h * (.45 + Math.random() * .55), pz); o.rotation.set(0, Math.random() * PI, (Math.random() - .5) * .8); o.scale.set(1, 1, 1); o.updateMatrix(); lf.setMatrixAt(i * 2 + j, o.matrix); }
      }
      st.castShadow = lf.castShadow = true; scene.add(st, lf);
      const base = new THREE.Mesh(boxGeo(len, .12, thick, M.grass.userData.tile), M.grass); base.position.set((x0 + x1) / 2, .06, (z0 + z1) / 2); base.rotation.y = ry; add(base);
      world.addBox({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: len, h, d: thick, ry, climb: true });
    },
    /** Fallen bamboo pole lying across the ground (jump over it). */
    pole(x0, z0, x1, z1, r = .04) {
      const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(x1 - x0, z1 - z0);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), M.bambooDry); m.rotation.set(PI / 2, ry, 0, 'YXZ');
      m.position.set((x0 + x1) / 2, r, (z0 + z1) / 2); add(m);
      world.addBox({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: r * 1.8, h: r * 2, d: len, ry, climb: true });
    },
    /** Incense pole with a small lit lantern: a pool of light (danger). */
    incensePole(x, z, h = 1.25) {
      k.cyl({ x, z, r: .025, h, mat: M.bambooDry });
      k.box({ x, y: h, z, w: .2, h: .02, d: .2, mat: M.wood, collide: false });
      const lan = new THREE.Mesh(new THREE.SphereGeometry(.06, 12, 10), std({ color: 0xb01818, emissive: 0xff4a10, emissiveIntensity: 2 })); lan.scale.y = 1.3; lan.position.set(x, h + .1, z); scene.add(lan);
      return k.light(x, h + .12, z, 0xff8a40, 3, 6, 1.5);
    },
    /** Paper note lying on the ground (an interactable is added by the level). */
    notePaper(x, y, z, ry = 0) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(.09, .12), std({ color: 0xe6dcc0, emissive: 0x2a2418, roughness: 1, side: THREE.DoubleSide }));
      m.rotation.set(-PI / 2, 0, ry); m.position.set(x, y + .002, z); m.receiveShadow = true; scene.add(m);
      // Faint red seal so it reads from a distance.
      const s = new THREE.Mesh(new THREE.PlaneGeometry(.02, .02), std({ color: 0x9a0e16, emissive: 0x400000 })); s.rotation.copy(m.rotation); s.position.set(x + .02, y + .003, z + .03); scene.add(s);
      return m;
    },
    /** Rice crumbs (heal). */
    crumbs(x, y, z) {
      const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
      for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(.006, 6, 4), std({ color: 0xf2eee0, roughness: .6, emissive: 0x222018 })); c.scale.set(1.6, .8, 1); c.position.set((Math.random() - .5) * .06, .004, (Math.random() - .5) * .06); g.add(c); }
      return g;
    },
    /** Small dynamic props. */
    pebble(x, z, r = .018) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), M.stone); return k.dyn({ mesh: m, shape: { type: 'ball', r }, x, y: r + .002, z, mass: 2600 * 4 / 3 * PI * r ** 3, sound: 'clack' }); },
    cup(x, y, z) {
      const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(.035, .025, .045, 16, 1, true), M.ceramic); c.material.side = THREE.DoubleSide; g.add(c);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .004, 12), M.ceramic); b.position.y = -.021; g.add(b);
      return k.dyn({ mesh: g, shape: { type: 'cyl', hh: .0225, r: .032 }, x, y: y + .0225, z, mass: .06, sound: 'clack', restitution: .2 });
    },
    sandal(x, z, ry = 0) {
      const m = new THREE.Mesh(boxGeo(.1, .015, .26, [.3, .3]), std({ color: 0x2a2018, roughness: .9 }));
      return k.dyn({ mesh: m, shape: { type: 'box', hx: .05, hy: .0075, hz: .13 }, x, y: .01, z, ry, mass: .12, sound: 'soft' });
    },
    orange(x, y, z, r = .035) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), std({ color: 0xe07818, roughness: .55 }));
      return k.dyn({ mesh: m, shape: { type: 'ball', r }, x, y: y + r, z, mass: .15, sound: 'soft', restitution: .3 });
    },
    /** Traditional chair: climb the legs/back, sit on the seat. */
    chair(x, z, ry = 0, floor = 0) {
      const g = new THREE.Group(); g.position.set(x, floor, z); g.rotation.y = ry; scene.add(g);
      const part = (w, h, d, px, py, pz) => { const m = new THREE.Mesh(boxGeo(w, h, d, M.woodDark.userData.tile), M.woodDark); m.position.set(px, py + h / 2, pz); m.castShadow = m.receiveShadow = true; g.add(m);
        const c = Math.cos(ry), s = Math.sin(ry); world.addBox({ x: x + px * c + pz * s, y: floor + py, z: z - px * s + pz * c, w, h, d, ry }); };
      for (const [lx, lz] of [[-.21, -.21], [.21, -.21], [-.21, .21], [.21, .21]]) part(.04, .43, .04, lx, 0, lz);
      part(.5, .035, .5, 0, .43, 0);                  // seat
      part(.5, .5, .035, 0, .465, -.23);              // back
      part(.04, .2, .45, -.23, .465, 0); part(.04, .2, .45, .23, .465, 0); // arms
    },
    /** Table with legs and an overhanging top (legs alone can't be climbed onto the top). */
    table(x, z, w, d, h, mat = M.woodDark, floor = 0) {
      k.box({ x, y: floor + h - .05, z, w, h: .05, d, mat });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box({ x: x + sx * (w / 2 - .06), y: floor, z: z + sz * (d / 2 - .06), w: .05, h: h - .05, d: .05, mat });
      k.box({ x, y: floor + h - .14, z: z + d / 2 - .05, w: w - .1, h: .09, d: .02, mat, climb: false }); // apron (front)
    },
    /** Upright rat NPC in clothes (folk-print style). */
    ratNPC(x, y, z, ry = 0, robe = 0x3a2a1a, hat = 0x111111) {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g);
      const fur = std({ color: 0x6a5a4a, roughness: 1 }), pink = std({ color: 0xc88a8a, roughness: .8 });
      const e = (m, sx, sy, sz, px, py, pz) => { const o = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), m); o.scale.set(sx, sy, sz); o.position.set(px, py, pz); o.castShadow = true; g.add(o); return o; };
      const robeM = new THREE.Mesh(new THREE.CylinderGeometry(.022, .036, .06, 14), std({ color: robe, roughness: .8 })); robeM.position.y = .03; robeM.castShadow = true; g.add(robeM);
      e(fur, .02, .022, .02, 0, .068, 0);
      const head = new THREE.Group(); head.position.set(0, .09, .006); g.add(head);
      const hm = new THREE.Mesh(new THREE.SphereGeometry(.016, 12, 10), fur); hm.scale.set(1, .95, 1.25); head.add(hm);
      const sn = new THREE.Mesh(new THREE.ConeGeometry(.009, .022, 10), fur); sn.rotation.x = PI / 2; sn.position.z = .022; head.add(sn);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(.003, 6, 4), pink); nose.position.z = .033; head.add(nose);
      for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.CircleGeometry(.009, 12), pink); ear.position.set(sx * .012, .013, -.002); ear.material.side = THREE.DoubleSide; head.add(ear);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(.0025, 6, 4), std({ color: 0x000000, roughness: .2 })); eye.position.set(sx * .007, .004, .015); head.add(eye); }
      const hatM = new THREE.Mesh(new THREE.CylinderGeometry(.015, .016, .008, 14), std({ color: hat })); hatM.position.y = .013; head.add(hatM);
      const tail = new THREE.Mesh(new THREE.TorusGeometry(.04, .003, 5, 20, PI * .8), pink); tail.position.set(0, .01, -.04); tail.rotation.set(PI / 2, 0, PI * .6); g.add(tail);
      // Incense stick with a glowing tip.
      const st = new THREE.Mesh(new THREE.CylinderGeometry(.0012, .0012, .07), std({ color: 0x9a4a2a })); st.position.set(.02, .08, .02); st.rotation.z = -.3; g.add(st);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(.002, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1, .2) })); tip.position.set(.031, .113, .02); g.add(tip);
      return { group: g, head };
    },
  };
  return k;
}
