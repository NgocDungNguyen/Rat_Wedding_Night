// Chapter 2 · Mùng 3 · Con gà trống — the Lý house.
// Drain hole (start, safe) → front yard (2 cat scouts) → raised veranda (ramps / climb) → door gap →
// main room (sleeping cat) → climb to the altar → take the boiled chicken (plate falls: noise) → escape to the drain.
// Layout (metres): yard z 0.2 → -7.2, house floor y 0.25 from z -7.2 → -14.3, front wall z -8.0, altar z ≈ -13.65.
import * as THREE from 'three';
import * as L from '@trailer/lib.js';

const T = (vi, en) => ({ vi, en });
const FLOOR = .25, ALTAR_TOP = FLOOR + 1.1;

/** Boiled chicken mesh (golden), ~22 cm long. */
function chickenMesh() {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xe0a83a, roughness: .45, metalness: .05, emissive: 0x2a1500 });
  const e = (sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), skin); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  e(.07, .055, .1, 0, .05, 0);                       // body
  e(.03, .028, .05, 0, .07, .1).rotation.x = -.6;     // neck
  e(.022, .02, .026, 0, .1, .14);                     // head
  const comb = new THREE.Mesh(new THREE.ConeGeometry(.012, .025, 6), new THREE.MeshStandardMaterial({ color: 0xb01818 })); comb.position.set(0, .125, .14); g.add(comb);
  for (const sx of [-1, 1]) { e(.022, .02, .04, sx * .05, .035, -.06); e(.03, .025, .045, sx * .055, .05, .02); }
  return g;
}

export default {
  id: 'ch2',
  /** @param {ReturnType<import('./kit.js').createKit>} k @param {any} api */
  build(k, api) {
    const { scene, M, world } = k;
    scene.background = new THREE.Color(0x05070c);
    scene.fog = new THREE.FogExp2(0x0b1320, .05);

    // ---------------------------------------------------------------- lights
    scene.add(new THREE.HemisphereLight(0x5a6a98, 0x1a1410, 1.0));
    const moon = new THREE.DirectionalLight(0xa8bcf0, 2.0); moon.position.set(-5, 11, 6); moon.target.position.set(0, 0, -6);
    moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 40 });
    moon.shadow.bias = -.0004; moon.shadow.normalBias = .01; scene.add(moon, moon.target);
    const fill = new THREE.PointLight(0x5a6a9a, .35, 9, 2); fill.position.set(0, 2, -11); scene.add(fill);

    // ---------------------------------------------------------------- ground, fence, drain
    k.ground(0, -3.5, 10.8, 8, M.dirt);
    k.ground(-3.8, .75, 1.2, 1, M.dirt);
    k.wall(-5.2, .2, -3.95, .2, 1.5); k.wall(-3.65, .2, 5.2, .2, 1.5);
    k.box({ x: -3.8, y: .08, z: .2, w: .3, h: 1.42, d: .2, mat: M.brick });        // over the drain opening (8 cm)
    k.box({ x: -3.98, z: .7, w: .05, h: .1, d: .8, mat: M.stone }); k.box({ x: -3.62, z: .7, w: .05, h: .1, d: .8, mat: M.stone });
    k.box({ x: -3.8, y: .1, z: .7, w: .41, h: .03, d: .8, mat: M.stone });
    k.safe(-3.8, .5, .45);
    k.wall(-5.2, .2, -5.2, -7.3, 1.6); k.wall(5.2, .2, 5.2, -7.3, 1.6);
    k.bound(-5.45, -7, .2, 16); k.bound(5.45, -7, .2, 16); k.bound(-3.8, 1.25, 1, .2);
    k.bound(-4.75, .45, 1.3, .2); k.bound(.95, .45, 9, .2); k.bound(-4.05, .85, .1, .8); k.bound(-3.55, .85, .1, .8);

    // ---------------------------------------------------------------- house shell
    k.box({ x: 0, y: 0, z: -10.75, w: 10.2, h: FLOOR, d: 7.1, mat: M.floor });          // raised floor + veranda
    k.box({ x: -5.1, y: 0, z: -10.75, w: .2, h: 2.9, d: 7.1, mat: M.plaster }); k.box({ x: 5.1, y: 0, z: -10.75, w: .2, h: 2.9, d: 7.1, mat: M.plaster });
    k.box({ x: 0, y: 0, z: -14.35, w: 10.4, h: 3.1, d: .2, mat: M.plaster });
    const FW = { y: FLOOR, z: -8.0, h: 2.4, d: .15 };
    for (const [x0, x1] of [[-5, -3], [-1.8, -.7], [.7, 1.8], [3, 5]]) k.box({ x: (x0 + x1) / 2, w: x1 - x0, mat: M.plasterDark, ...FW });
    for (const [x0, x1] of [[-3, -1.8], [-.7, .7], [1.8, 3]]) k.box({ x: (x0 + x1) / 2, y: FLOOR + 2.05, z: -8.0, w: x1 - x0, h: .35, d: .15, mat: M.plasterDark });
    k.gate(0, -8.0, 1.4, 2.05, .045, 0, FLOOR);           // centre door, mouse gap
    k.gate(2.4, -8.0, 1.2, 2.05, .045, 0, FLOOR);         // right door, mouse gap
    k.gate(-2.4, -8.0, 1.2, 2.05, 0, 0, FLOOR);           // left door, shut
    for (const x of [-3.4, -1.2, 1.2, 3.4]) k.cyl({ x, y: FLOOR, z: -7.45, r: .085, h: 2.4, mat: M.woodDark });
    // Roof (visual only, casts the interior into shadow).
    for (const [z0, y0, z1, y1] of [[-6.8, 2.6, -10.75, 3.9], [-14.7, 2.75, -10.75, 3.9]]) {
      const len = Math.hypot(z1 - z0, y1 - y0), m = new THREE.Mesh(new THREE.BoxGeometry(10.8, .08, len), M.roof);
      m.position.set(0, (y0 + y1) / 2, (z0 + z1) / 2); m.rotation.x = Math.atan2(-(y1 - y0), z1 - z0); m.castShadow = m.receiveShadow = true; scene.add(m);
    }
    // Partitions between the three rooms.
    for (const x of [-1.85, 1.85]) k.box({ x, y: FLOOR, z: -9.8, w: .08, h: 2.2, d: 3.5, mat: M.woodDark });

    // ---------------------------------------------------------------- veranda access
    k.ramp({ x: -3.3, y: 0, z: -6.2 }, { x: -3.3, y: FLOOR, z: -7.22 }, .14, M.roof);
    k.ramp({ x: 3.0, y: 0, z: -6.35 }, { x: 3.0, y: FLOOR, z: -7.22 }, .12, M.wood);

    // ---------------------------------------------------------------- yard props
    k.cyl({ x: 3, z: -2.2, r: .45, h: .65, mat: M.brick });
    { const w = new THREE.Mesh(new THREE.CircleGeometry(.38, 24), M.water); w.rotation.x = -Math.PI / 2; w.position.set(3, .66, -2.2); scene.add(w); }
    k.straw(-2.6, -3.6, .75, .6);
    // Chicken coop (bamboo slats: see-through, mouse gap at the front).
    { const cx = 3.75, cz = -5.3, cw = 1.0, cd = .75, chh = .75;
      const slat = (x, z, w, d, y = 0, h = chh) => k.box({ x, y, z, w, h, d, mat: M.weave, sight: false, climb: true });
      slat(cx, cz - cd / 2, cw, .03); slat(cx - cw / 2, cz, .03, cd); slat(cx + cw / 2, cz, .03, cd); slat(cx, cz + cd / 2, cw, .03, .05, chh - .05);
      k.box({ x: cx, y: chh, z: cz, w: cw + .1, h: .03, d: cd + .1, mat: M.straw });
      k.shadow(cx, cz, cw / 2 - .05, cd / 2 - .05);
      for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(.04, .015), M.paper); f.rotation.set(-Math.PI / 2, 0, Math.random() * 3); f.position.set(cx + (Math.random() - .5) * .8, .003, cz + (Math.random() - .5) * .6); scene.add(f); } }
    k.jar(-4.6, -1.4, .28, .6); k.jar(-4.65, -2.15, .22, .5);
    k.grass(-4.7, -5.2, .35, .8, .32); k.grass(4.7, -1.2, .35, .7, .32); k.grass(-3.0, -.6, .45, .3, .3); k.grass(.6, -3.4, .3, .3, .3);
    k.sandal(.9, -6.9, .3); k.sandal(1.05, -6.95, .5); k.sandal(-1.6, -6.85, -.2);
    for (const [px, pz] of [[-2.2, -1.2], [1.2, -2.6], [-.6, -5.4], [2.2, -6.2], [-4, -4]]) k.pebble(px, pz);

    // ---------------------------------------------------------------- main room
    k.table(0, -13.65, 1.6, .6, 1.1, M.lacquer, FLOOR);                                         // altar
    k.box({ x: 0, y: FLOOR, z: -13.33, w: .5, h: 1.1, d: .012, mat: M.red, climb: true });      // altar cloth (climb it)
    k.box({ x: 0, y: FLOOR + 1.0, z: -13.33, w: .52, h: .1, d: .016, mat: M.gold, collide: false });
    k.cyl({ x: 0, y: ALTAR_TOP, z: -13.82, r: .08, h: .09, mat: M.gold });                        // incense bowl
    k.box({ x: 0, y: ALTAR_TOP, z: -13.92, w: .14, h: .26, d: .05, mat: M.lacquer });             // ancestor tablet
    k.box({ x: .62, y: ALTAR_TOP, z: -13.55, w: .16, h: .08, d: .16, mat: new THREE.MeshStandardMaterial({ color: 0x3f6a2e, roughness: .9 }) }); // bánh chưng
    k.cyl({ x: -.38, y: ALTAR_TOP, z: -13.62, r: .15, h: .02, mat: M.gold });                    // fruit tray
    k.orange(-.42, ALTAR_TOP + .02, -13.62); k.orange(-.33, ALTAR_TOP + .02, -13.58); k.orange(-.38, ALTAR_TOP + .02, -13.7); k.orange(-.3, ALTAR_TOP + .02, -13.68);
    k.orange(-.4, ALTAR_TOP + .07, -13.64, .06);
    const candles = [k.candle(-.68, ALTAR_TOP, -13.78, .24), k.candle(.68, ALTAR_TOP, -13.78, .24)];
    world.addZone({ tag: 'light', x: 0, z: -13.6, hx: .85, hz: .35, y0: ALTAR_TOP - .05, y1: ALTAR_TOP + .3 });
    world.addZone({ tag: 'light', x: 0, z: -12.9, r: 1.1, y0: 0, y1: FLOOR + .3 });
    // Portraits above the altar (trailer texture).
    [-.45, .45].forEach((x, i) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(.32, .42), new THREE.MeshStandardMaterial({ map: L.portraitTex(i + 3), roughness: .6 })); p.position.set(x, 2.05, -14.24); scene.add(p); });
    { const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .3), new THREE.MeshStandardMaterial({ map: L.textTex(['PHÚC'], { w: 512, h: 128, font: '700 96px "Cormorant Garamond"', border: '#c9a040' }) }));
      sign.position.set(0, 2.55, -14.24); scene.add(sign); }

    // Chicken on a plate (the plate is a real rigid body: it slides off and smashes when the chicken is taken).
    const plateMesh = new THREE.Group();
    { const pm = new THREE.Mesh(new THREE.CylinderGeometry(.12, .1, .012, 24), M.ceramic); plateMesh.add(pm);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(.115, .005, 6, 24), new THREE.MeshStandardMaterial({ color: 0x2a4a8a })); rim.rotation.x = Math.PI / 2; rim.position.y = .006; plateMesh.add(rim); }
    const chicken = chickenMesh(); chicken.position.y = .006; plateMesh.add(chicken);
    const plate = k.dyn({ mesh: plateMesh, shape: { type: 'cyl', hh: .006, r: .12 }, x: .3, y: ALTAR_TOP + .007, z: -13.55, mass: .45, sound: 'clack', friction: .5 });

    // Low table, chairs, cups, ramps up.
    k.table(0, -12.1, 1.5, 1.0, .45, M.woodDark, FLOOR);
    const LT = FLOOR + .45;
    for (const [x, z] of [[.35, -12.0], [.45, -12.2], [.25, -12.25]]) k.cup(x, LT, z);
    { const tp = new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 12), M.ceramic); tp.scale.y = .8; tp.position.set(.55, LT + .055, -11.85); tp.castShadow = true; scene.add(tp); world.addCylinder({ x: .55, y: LT, z: -11.85, r: .07, h: .11, climb: false }); }
    k.chair(-1.25, -12.1, Math.PI / 2, FLOOR); k.chair(1.25, -12.1, -Math.PI / 2, FLOOR);
    k.ramp({ x: -.25, y: FLOOR, z: -10.7 }, { x: -.25, y: LT, z: -11.62 }, .1, M.wood);          // plank: floor → low table
    k.ramp({ x: .4, y: LT, z: -12.58 }, { x: .4, y: ALTAR_TOP, z: -13.34 }, .06, M.bambooDry);    // broom handle: low table → altar
    { const br = new THREE.Mesh(new THREE.ConeGeometry(.08, .25, 10), M.straw); br.position.set(.4, LT + .02, -12.45); br.rotation.x = -1.2; scene.add(br); }

    // ---------------------------------------------------------------- side rooms
    k.box({ x: -3.5, y: FLOOR + .35, z: -12.6, w: 1.9, h: .06, d: 1.3, mat: M.wood });           // plank bed (phản)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box({ x: -3.5 + sx * .85, y: FLOOR, z: -12.6 + sz * .55, w: .08, h: .35, d: .08, mat: M.wood });
    k.shadow(-3.5, -12.6, .9, .6, FLOOR); k.hideBox(-3.5, -12.6, .85, .55, { y: FLOOR, needCrouch: true });
    k.box({ x: -4.7, y: FLOOR, z: -9.2, w: .5, h: 1.6, d: 1.0, mat: M.woodDark });                // wardrobe
    for (const [x, z] of [[3.6, -12.9], [4.1, -12.7], [3.85, -13.4]]) k.box({ x, y: FLOOR, z, w: .4, h: .5, d: .32, ry: Math.random() * .4, mat: M.straw });   // rice sacks
    k.straw(4.2, -9.3, .45, .32);
    k.cup(3.2, FLOOR, -10.8);

    // ---------------------------------------------------------------- notes + food
    k.notePaper(-3.2, FLOOR, -9.6, .5);
    k.notePaper(-.4, LT, -12.0, -.2);
    k.crumbs(3.4, FLOOR, -10.2); k.crumbs(-2.9, 0, -.2);

    // ---------------------------------------------------------------- cats
    const cats = [
      { id: 'yardA', pos: [2, -4], heading: 0, fur: 0x4a4540, waypoints: [[2, -4], [1.4, -1.4], [3, -1.1], [4.4, -2.6], [4.3, -4.3], [2.4, -6.2], [.6, -5]], area: { minX: -4.9, maxX: 4.9, minZ: -6.95, maxZ: -.4 } },
      { id: 'yardB', pos: [-3.6, -6.5], heading: Math.PI / 2, fur: 0x231e1a, waypoints: [[-3.9, -6.55], [-.4, -6.6], [3.8, -6.55], [.4, -6.4]], area: { minX: -4.9, maxX: 4.9, minZ: -6.95, maxZ: -.4 } },
      { id: 'house', pos: [-1.2, -13.2], y: FLOOR, heading: .8, sleep: true, fur: 0x15120f,
        waypoints: [[-1.2, -13], [-3.5, -11.2], [-3.4, -8.8], [0, -8.9], [3.4, -9.2], [3.4, -11.6], [1.2, -13.1]], area: { minX: -4.8, maxX: 4.8, minZ: -13.95, maxZ: -8.3 } },
    ];

    // ---------------------------------------------------------------- script
    const v = (x, y, z) => new THREE.Vector3(x, y, z);
    let step = 0;
    const said = new Set(); const once = (key, text, ms) => { if (said.has(key)) return; said.add(key); api.hint(text, ms); };
    const OBJ = {
      enter: T('Lẻn vào nhà họ Lý', 'Sneak into the Lý house'),
      chicken: T('Lấy con gà luộc trên bàn thờ', 'Take the boiled chicken from the altar'),
      back: T('Mang gà về lỗ cống', 'Carry the chicken back to the drain'),
    };
    const carried = () => { const m = chickenMesh(); m.scale.setScalar(.24); m.rotation.set(0, Math.PI, 0); return m; };

    function takeChicken(scripted = false) {
      api.flags.chicken = true;
      plateMesh.remove(chicken);
      api.player.setCarry('chicken', carried());
      api.removeInteract('chicken');
      step = 3; api.objective(OBJ.back);
      if (!scripted) {
        // The plate tips and slides off the altar: a real fall, and the clatter wakes the house cat.
        // Push it backwards (away from the mouse): it skids off the back edge and smashes behind the altar.
        plate.body.applyImpulse({ x: .08, y: .1, z: -1.3 }, true);
        plate.body.applyTorqueImpulse({ x: -.002, y: .001, z: .001 }, true);
        api.noise(v(.3, ALTAR_TOP, -13.5), 3, false);
        api.hint(T('Gà nặng: không chạy, không nhảy, không leo được. Nhảy từ trên cao xuống sẽ mất máu.', 'The chicken is heavy: no running, jumping or climbing. Dropping from high up hurts.'), 9000);
        setTimeout(() => api.checkpoint('chicken'), 50);
      }
    }

    function setupInteracts() {
      if (!api.flags.chicken) api.interact({ id: 'chicken', pos: v(.3, ALTAR_TOP + .06, -13.55), r: .22, label: T('Lấy con gà luộc', 'Take the boiled chicken'), onUse: () => takeChicken() });
      api.interact({ id: 'noteA', pos: v(-3.2, FLOOR + .02, -9.6), r: .2, label: T('Xem tranh vẽ', 'Look at the drawing'), onUse() { api.note(T(
        'Tranh vẽ bằng than của một đứa trẻ: một con mèo nhỏ lông trắng, và nhiều người cầm gậy.\n\nBên dưới, nét chữ run run: “con xin lỗi”.',
        'A child\'s charcoal drawing: a small white cat, and many people holding sticks.\n\nUnderneath, in shaky letters: "I\'m sorry".')); } });
      api.interact({ id: 'noteB', pos: v(-.4, LT + .02, -12.0), r: .2, label: T('Đọc sổ', 'Read the ledger'), onUse() { api.note(T(
        'Sổ ghi của nhà họ Lý, ngày 27 tháng Chạp:\n\n“Đêm qua cả xóm dưới không còn ai. Cửa vẫn cài then từ bên trong. Chỉ có dấu chân mèo… to bằng bàn tay người.”',
        'The Lý family ledger, 27th of the last month:\n\n"Last night the whole lower hamlet was gone. Doors still barred from the inside. Only cat prints… as big as a man\'s hand."')); } });
      for (const [id, x, y, z] of [['crumbsA', 3.4, FLOOR, -10.2], ['crumbsB', -2.9, 0, -.2]]) api.interact({ id, pos: v(x, y + .02, z), r: .16, label: T('Ăn bánh vụn (+30 máu)', 'Eat cake crumbs (+30 health)'), onUse() {
        api.heal(30); api.removeInteract(id); scene.children.filter(o => o.isGroup && Math.abs(o.position.x - x) < .01 && Math.abs(o.position.z - z) < .01).forEach(o => scene.remove(o)); } });
    }

    return {
      cats,
      shadowLights: [moon],
      music: null,
      ambience: { wind: .28, gecko: .14, weddingFar: .1 },
      spawn: { pos: v(-3.8, 0, .55), yaw: 0 },
      checkpoints: {
        inside: { pos: v(0, FLOOR, -8.35), yaw: 0 },
        chicken: { pos: v(.15, ALTAR_TOP, -13.5), yaw: Math.PI },
      },
      start(cp) {
        setupInteracts();
        if (cp === 'chicken') {
          takeChicken(true);
          plate.body.setTranslation({ x: .3, y: FLOOR + .02, z: -13.0 }, true);
          const house = api.cat('house'); house.reset(false, v(-1.6, FLOOR, -12.4)); house.alert(v(.3, FLOOR, -13.1));
        } else if (cp === 'inside') { step = 2; api.objective(OBJ.chicken); }
        else {
          step = 0; api.objective(OBJ.enter);
          api.hint(T('Hai con mèo canh sân. Đi men theo bóng tối, trốn trong rơm và cỏ.', 'Two cats guard the yard. Keep to the shadows, hide in straw and grass.'), 8000);
        }
      },
      update(dt, t) {
        candles.forEach((c, i) => c.update(t, i));
        if (!dt) return;
        const p = api.player.pos;
        if (step === 0 && p.z < -5.8) { step = 1; once('veranda', T('Nền nhà cao. Đi lên theo tấm ngói đổ hoặc tấm ván, hay giữ {jump} để leo.', 'The floor is raised. Walk up the fallen roof tile or the plank, or hold {jump} to climb.'), 8000); }
        if (step <= 1 && p.y > FLOOR - .02 && p.z < -7.6) once('door', T('Cửa đóng. Cúi ({crouch}) để chui qua khe dưới cửa.', 'The doors are shut. Crouch ({crouch}) to crawl through the gap under them.'));
        if (step <= 1 && p.z < -8.15 && p.y > .2) { step = 2; api.objective(OBJ.chicken); api.checkpoint('inside');
          api.hint(T('Một con mèo đang ngủ cạnh bàn thờ. Đi chậm, cúi người. Tiếng động sẽ đánh thức nó.', 'A cat sleeps by the altar. Move slowly, crouch. Noise will wake it.'), 9000); }
        if (step === 2 && api.near(0, -12.6, 1.4)) once('altar', T('Leo khăn thờ (giữ {jump}), hoặc đi theo tấm ván lên bàn nước rồi cán chổi lên bàn thờ.', 'Climb the altar cloth (hold {jump}), or walk the plank to the tea table, then the broom handle to the altar.'), 9000);
        if (step === 3 && api.player.carry && api.near(-3.8, .5, .45)) { step = 4; api.complete(); }
      },
    };
  },
};
