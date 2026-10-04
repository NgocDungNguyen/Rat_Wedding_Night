// Chapter 3 · Mùng 5 · Con cá — the flooded rice field.
// Road embankment (start) → dykes between paddies (cats patrol the dykes) → water (swim; herons hunt by motion;
// ma trơi expose you) → the fish trap at the end of the channel → carry the live fish back to the road.
// Layout (metres): water surface y 0, paddy mud y -0.25, channel mud y -0.45, dyke and road tops y 0.12.
import * as THREE from 'three';

const T = (vi, en) => ({ vi, en });
const DYKE = .12, MUD = -.25, CH_MUD = -.45;

/** Live fish (~16 cm), silver with a yellow eye. */
function fishMesh() {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x9aa8a8, roughness: .3, metalness: .45 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), skin); body.scale.set(.025, .04, .08); g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.03, .05, 4), skin); tail.rotation.x = -Math.PI / 2; tail.position.z = -.095; tail.scale.set(.25, 1, 1); g.add(tail);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.007, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.3, .2) })); e.position.set(sx * .02, .012, .055); g.add(e); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.tail = tail;
  return g;
}

export default {
  id: 'ch3',
  /** @param {ReturnType<import('./kit.js').createKit>} k @param {any} api */
  build(k, api) {
    const { scene, M, world } = k;
    scene.background = new THREE.Color(0x060a12);
    scene.fog = new THREE.FogExp2(0x0e1824, .055);

    // ---------------------------------------------------------------- lights (open field: brighter moon)
    scene.add(new THREE.HemisphereLight(0x6a7aa8, 0x101418, 1.15));
    const moon = new THREE.DirectionalLight(0xb0c4f8, 2.3); moon.position.set(6, 10, -4); moon.target.position.set(0, 0, -9);
    moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 40 });
    moon.shadow.bias = -.0004; moon.shadow.normalBias = .01; scene.add(moon, moon.target);
    { const mm = new THREE.Mesh(new THREE.SphereGeometry(1.2, 20, 14), new THREE.MeshBasicMaterial({ color: 0xe8ecff, fog: false })); mm.position.set(40, 30, -60); scene.add(mm); }

    // ---------------------------------------------------------------- terrain
    k.mud(0, -8.05, 14.4, 16.7, MUD);                     // paddies
    k.mud(0, -17.45, 14.4, 2.3, CH_MUD);                  // channel (deeper)
    k.box({ x: 0, y: -.45, z: .8, w: 14.6, h: .45 + DYKE, d: 1.2, mat: M.dirt });    // road embankment, level with the dykes
    k.box({ x: 0, y: -.45, z: -19.1, w: 14.6, h: .75, d: 1.0, mat: M.grass });       // far bank, top .3
    const dyke = (x, z, w, d) => k.box({ x, y: MUD, z, w, h: DYKE - MUD, d, mat: M.grass });
    dyke(0, -8.05, .45, 16.5);            // D1 main dyke (road → channel)
    dyke(0, -6, 14.2, .4);                // D2 cross dyke
    dyke(-3.6, -12, 7.2, .4);             // D3 left cross dyke
    dyke(4.5, -11.15, .4, 10.3);          // D4 right dyke (to the trap)
    const waterMat = k.waterPlane(0, -9.6, 14.4, 20, 0);
    // Paddies + channel as swim zones (between the dykes).
    k.water(-7.1, .2, -.225, -5.8); k.water(.225, .2, 7.1, -5.8);
    k.water(-7.1, -6.2, -.225, -11.8); k.water(-7.1, -12.2, -.225, -16.3);
    k.water(.225, -6.2, 4.3, -16.3); k.water(4.7, -6.2, 7.1, -16.3);
    k.water(-7.1, -16.3, 7.1, -18.6, 0, 'channel');
    // World edges.
    k.bound(-7.3, -9, .2, 21); k.bound(7.3, -9, .2, 21); k.bound(0, 1.5, 15, .2); k.bound(0, -19.7, 15, .2);

    // Rice (hides you, even while swimming) and some open water.
    k.rice(-3.6, -3.1, 3.1, 2.4, .5, 2.6);
    k.rice(4.8, -2.3, 1.8, 1.6, .48, 2.4);
    k.rice(-3.4, -8.9, 3.0, 2.4, .52, 2.6);
    k.rice(2.2, -10.4, 1.7, 3.6, .5, 2.4);
    k.rice(5.9, -11.5, .9, 4.6, .5, 2.2);
    k.rice(-5.2, -14.2, 1.6, 1.8, .45, 2.2);
    // Grass tufts on the dykes (small hiding spots out of the water).
    k.grass(-1.3, -6, .35, .17, .28); k.grass(2.7, -6, .4, .17, .28); k.grass(0, -10.3, .19, .45, .3); k.grass(4.5, -9.2, .17, .4, .3); k.grass(-5.8, -12, .4, .17, .28);

    // Mud banks: walk out of the water (no climbing needed, works while carrying).
    const bank = (a, b, w = .3) => k.ramp(a, b, w, M.dirt, { thickness: .05 });
    bank({ x: -.95, y: MUD, z: -3 }, { x: -.2, y: DYKE, z: -3 });
    bank({ x: 2, y: MUD, z: -6.95 }, { x: 2, y: DYKE, z: -6.18 });
    bank({ x: 3.55, y: MUD, z: -13.6 }, { x: 4.3, y: DYKE, z: -13.6 });
    bank({ x: 4.5, y: CH_MUD, z: -17.3 }, { x: 4.5, y: DYKE, z: -16.25 }, .32);
    bank({ x: -3, y: MUD, z: -11.05 }, { x: -3, y: DYKE, z: -11.8 });
    bank({ x: 3, y: MUD, z: -.75 }, { x: 3, y: DYKE, z: .22 });
    bank({ x: -4, y: MUD, z: -.75 }, { x: -4, y: DYKE, z: .22 });
    bank({ x: 1.2, y: CH_MUD, z: -18.0 }, { x: 1.2, y: .3, z: -18.62 }, .3);   // up to the far bank

    // ---------------------------------------------------------------- props
    // Half-sunk basket boat (thúng chai): a resting spot in the water.
    { const r = .62; const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * .8, .32, 24, 1, true), M.weave); m.material.side = THREE.DoubleSide;
      m.position.set(-2.3, MUD + .16, -2.4); m.rotation.z = .12; m.castShadow = true; scene.add(m);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r, .02, 6, 24), M.bambooDry); rim.rotation.x = Math.PI / 2; rim.position.set(-2.3, .07, -2.4); scene.add(rim);
      const fl = new THREE.Mesh(new THREE.CircleGeometry(r * .95, 24), M.weave); fl.rotation.x = -Math.PI / 2; fl.position.set(-2.3, .055, -2.4); scene.add(fl);
      world.addCylinder({ x: -2.3, y: MUD, z: -2.4, r: r * .95, h: .055 - MUD, climb: true }); }
    // Floating planks.
    k.box({ x: 2.8, y: -.03, z: -3.6, w: .9, h: .05, d: .18, ry: .4, mat: M.wood });
    k.box({ x: -4.6, y: -.03, z: -15.2, w: .8, h: .05, d: .16, ry: -.7, mat: M.wood });
    // Scarecrow on the cross dyke.
    { const x = -2.2, z = -6; k.cyl({ x, y: DYKE, z, r: .025, h: 1.5, mat: M.bambooDry });
      k.box({ x, y: DYKE + 1.1, z, w: .9, h: .04, d: .04, mat: M.bambooDry, collide: false });
      k.box({ x, y: DYKE + .75, z, w: .55, h: .45, d: .12, mat: new THREE.MeshStandardMaterial({ color: 0x3a3a46, roughness: 1 }), collide: false });
      const head = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 10), M.straw); head.position.set(x, DYKE + 1.38, z); head.castShadow = true; scene.add(head);
      const hat = new THREE.Mesh(new THREE.ConeGeometry(.3, .16, 20), new THREE.MeshStandardMaterial({ color: 0xc8b884, roughness: .9 })); hat.position.set(x, DYKE + 1.55, z); hat.castShadow = true; scene.add(hat); }
    // Field-watch hut on stilts (chòi canh) + bamboo ladder from the left cross dyke.
    const HX = -4.2, HZ = -9, HY = .96;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cyl({ x: HX + sx * .55, y: MUD, z: HZ + sz * .55, r: .045, h: HY - MUD + .9, mat: M.bambooDry });
    k.box({ x: HX, y: HY - .06, z: HZ, w: 1.3, h: .06, d: 1.3, mat: M.bambooDry });
    for (const [x, z, w, d] of [[HX, HZ - .63, 1.3, .03], [HX - .63, HZ, .03, 1.3], [HX + .63, HZ, .03, 1.3]]) k.box({ x, y: HY, z, w, h: .35, d, mat: M.weave, sight: false });
    { const roof = new THREE.Mesh(new THREE.ConeGeometry(1.15, .7, 4), M.straw); roof.position.set(HX, HY + 1.2, HZ); roof.rotation.y = Math.PI / 4; roof.castShadow = true; scene.add(roof); }
    k.ramp({ x: HX, y: DYKE, z: -11.8 }, { x: HX, y: HY, z: HZ - .68 }, .26, M.bambooDry, { thickness: .03 });
    k.shadow(HX, HZ, .6, .6, HY); k.hideBox(HX, HZ, .55, .55, { y: HY, needCrouch: true });
    // Far bank: a kapok tree and a tiny grave with an incense stick.
    k.cyl({ x: -2.5, y: .3, z: -19.15, r: .35, rTop: .25, h: 3.5, mat: M.woodDark });
    { const crown = new THREE.Mesh(new THREE.SphereGeometry(1.8, 14, 10), new THREE.MeshLambertMaterial({ color: 0x1d2a1c })); crown.position.set(-2.5, 4.3, -19.2); crown.scale.y = .6; scene.add(crown); }
    { const grave = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.dirt); grave.position.set(1.9, .3, -19.05); scene.add(grave);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(.002, .002, .14), new THREE.MeshStandardMaterial({ color: 0x9a4a2a })); st.position.set(1.9, .37, -18.88); scene.add(st);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(.004, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1, .2) })); tip.position.set(1.9, .44, -18.88); scene.add(tip); }
    k.light(1.9, .5, -18.85, 0xff6a2a, .25, 1.5, 0);
    // Fish trap (lờ): bamboo cone lying in the shallow channel by the end of the right dyke.
    const TRAP = new THREE.Vector3(4.15, -.05, -16.75);
    const trap = new THREE.Group(); trap.position.copy(TRAP); trap.rotation.set(0, .9, 0); scene.add(trap);
    { const cone = new THREE.Mesh(new THREE.CylinderGeometry(.06, .17, .8, 14, 1, true), M.weave); cone.material.side = THREE.DoubleSide; cone.rotation.z = Math.PI / 2; cone.castShadow = true; trap.add(cone);
      for (const x of [-.3, 0, .3]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.12 - x * .15, .008, 5, 16), M.bambooDry); ring.rotation.y = Math.PI / 2; ring.position.x = x; trap.add(ring); }
      k.cyl({ x: TRAP.x + .45, y: CH_MUD, z: TRAP.z + .35, r: .02, h: .8, mat: M.bambooDry }); }
    const fishInTrap = fishMesh(); fishInTrap.position.set(.05, 0, 0); fishInTrap.rotation.y = Math.PI / 2; trap.add(fishInTrap);
    world.addCylinder({ x: TRAP.x, y: CH_MUD, z: TRAP.z, r: .18, h: .25, climb: true });
    // Pebbles and a sandal on the road (taboo: hide your shoes).
    for (const [px, pz] of [[-1.5, .7], [1.1, .9], [2.6, .5]]) k.pebble(px, pz + 0);
    k.notePaper(-2.1, DYKE, -6.25, .4);
    k.notePaper(HX + .2, HY, HZ + .1, -.3);
    k.notePaper(1.75, .3, -18.8, .2);
    k.crumbs(HX - .2, HY, HZ - .15);

    // ---------------------------------------------------------------- creatures
    const cats = [
      { id: 'dykeA', pos: [0, -3.5], y: DYKE, heading: Math.PI, fur: 0x2a241f,
        waypoints: [[0, -1.2], [0, -6], [-3.8, -6], [0, -6], [3, -6], [4.5, -6], [0, -6], [0, -3]], area: { minX: -7, maxX: 7, minZ: -16.3, maxZ: 0 } },
      { id: 'dykeB', pos: [4.5, -12], y: DYKE, heading: Math.PI, fur: 0x4a4038,
        waypoints: [[4.5, -6.6], [4.5, -11.5], [4.5, -15.9], [4.5, -11]], area: { minX: -7, maxX: 7, minZ: -16.3, maxZ: 0 } },
    ];
    const herons = [
      { id: 'heronL', pos: [-3.2, -9.5], waypoints: [[-2, -8], [-5.2, -7.4], [-5.5, -10.6], [-1.6, -10.8], [-1.3, -3.4], [-4.8, -2.2], [-1.4, -4.6]], area: { minX: -6.9, maxX: -.4, minZ: -16, maxZ: -.4 } },
      { id: 'heronR', pos: [2.2, -12], waypoints: [[1.1, -8], [3.6, -9.2], [3.7, -14.8], [1.2, -15.4], [2.4, -11.2]], area: { minX: .5, maxX: 4.1, minZ: -16.1, maxZ: -6.5 } },
    ];
    const wisps = [
      { path: [[-5, -13.5], [-2, -14.8], [-1.6, -9.4], [-5.6, -8], [-6, -11]], y: .5, speed: .3 },
      { path: [[2, -17.2], [3.8, -12.4], [1, -9.6], [.8, -14.2], [-1.5, -17.4]], y: .42, speed: .34 },
      { path: [[5.8, -2], [2, -4.6], [1.4, -1.3], [6, -4.6]], y: .6, speed: .28 },
    ];

    // ---------------------------------------------------------------- script
    const v = (x, y, z) => new THREE.Vector3(x, y, z);
    let step = 0, flopT = 4, carriedFish = null, firstSwim = false;
    const said = new Set(); const once = (key, text, ms) => { if (said.has(key)) return; said.add(key); api.hint(text, ms); };
    const OBJ = {
      trap: T('Đến cái lờ cá ở cuối mương', 'Reach the fish trap at the end of the channel'),
      open: T('Mở lờ, bắt con cá', 'Open the trap and take the fish'),
      back: T('Mang cá về đường làng', 'Carry the fish back to the village road'),
    };

    function takeFish(scripted = false) {
      api.flags.fish = true; trap.remove(fishInTrap); api.removeInteract('trap');
      carriedFish = fishMesh(); carriedFish.scale.setScalar(.75); carriedFish.rotation.set(0, Math.PI / 2, .3);
      api.player.setCarry('fish', carriedFish);
      step = 3; api.objective(OBJ.back); flopT = 3;
      if (!scripted) {
        api.soundAt('splash', TRAP, { volume: .8 }); api.noise(TRAP.clone(), 2.2);
        api.hint(T('Con cá còn sống: thỉnh thoảng nó quẫy mạnh và gây tiếng động. Mang cá thì không chạy, không nhảy, không leo được — lên bờ bằng dốc bùn.', 'The fish is alive: now and then it thrashes and makes noise. Carrying it, you can\'t run, jump or climb; use the mud banks to leave the water.'), 10000);
        setTimeout(() => api.checkpoint('fish'), 50);
      }
    }
    function setupInteracts() {
      if (!api.flags.fish) api.interact({ id: 'trap', pos: v(TRAP.x, .05, TRAP.z), r: .85, label: T('Mở lờ, bắt cá', 'Open the trap, take the fish'), onUse: () => takeFish() });
      const notes = [
        ['noteScare', v(-2.1, DYKE + .02, -6.25), T('Lá bùa giấy buộc ở chân bù nhìn', 'A paper charm tied to the scarecrow'), T(
          'Lá bùa vẽ một con mèo bị gạch chéo bằng mực đỏ.\n\nBên dưới: “Đêm mùng Một, ai ra đồng thì tắt đèn. Thấy lửa xanh thì đứng im.”',
          'The charm shows a cat crossed out in red ink.\n\nBelow it: "On the first nights, put out your lamp in the fields. If you see green fire, stand still."')],
        ['noteHut', v(HX + .2, HY + .02, HZ + .1), T('Đọc sổ đánh cá', 'Read the fisherman\'s log'), T(
          'Sổ của lão đánh cá:\n\n“Mùng 2 Tết. Đặt lờ ở mương cuối như mọi năm. Từ khi chôn con mèo trắng ở bờ mương, đêm nào lờ cũng đầy cá. Cá mắt vàng. Tôi không dám ăn.”',
          'The fisherman\'s log:\n\n"Second day of Tết. Set the trap in the last channel as every year. Since I buried the white kitten on the bank, the trap is full every night. Fish with yellow eyes. I dare not eat them."')],
        ['noteGrave', v(1.75, .32, -18.8), T('Đọc mảnh giấy cạnh nấm mộ', 'Read the paper by the little grave'), T(
          'Nét chữ trẻ con:\n\n“Con xin lỗi Bé Trắng. Không phải lỗi của con. Bố bảo mèo trắng mang xui vào nhà.”\n\nNén hương vẫn còn cháy.',
          'A child\'s handwriting:\n\n"I\'m sorry, Little White. It wasn\'t my fault. Father said white cats bring bad luck."\n\nThe incense is still burning.')],
      ];
      for (const [id, pos, label, text] of notes) api.interact({ id, pos, r: .22, label, onUse() { api.note(text); } });
      api.interact({ id: 'crumbs', pos: v(HX - .2, HY + .02, HZ - .15), r: .18, label: T('Ăn cơm vụn (+30 máu)', 'Eat rice crumbs (+30 health)'), onUse() {
        api.heal(30); api.removeInteract('crumbs'); scene.children.filter(o => o.isGroup && Math.abs(o.position.x - (HX - .2)) < .01 && Math.abs(o.position.z - (HZ - .15)) < .01).forEach(o => scene.remove(o)); } });
    }

    return {
      cats, herons, wisps,
      shadowLights: [moon],
      music: null,
      ambience: { frogs: .4, wind: .14, weddingFar: .05 },
      spawn: { pos: v(0, DYKE, .7), yaw: 0 },
      checkpoints: {
        field: { pos: v(0, DYKE, -6.65), yaw: 0 },
        fish: { pos: v(4.5, DYKE, -15.85), yaw: Math.PI },
      },
      start(cp) {
        setupInteracts();
        k.safe(0, .8, 7.2, .6);   // the road: cats won't come up onto it
        if (cp === 'fish') takeFish(true);
        else if (cp === 'field') { step = 1; api.objective(OBJ.trap); }
        else {
          step = 0; api.objective(OBJ.trap);
          api.hint(T('Ruộng ngập nước. Ngươi bơi được, nhưng bơi chậm, gây tiếng động và tốn sức. Hết sức sẽ đuối nước.', 'The fields are flooded. You can swim, but swimming is slow, noisy and tiring. Run out of stamina and you drown.'), 9000);
        }
      },
      update(dt, t) {
        waterMat.normalMap.offset.set(t * .01, t * .007);
        trap.rotation.z = Math.sin(t * .8) * .02;
        if (fishInTrap.parent) { fishInTrap.rotation.z = Math.sin(t * 6) * .2; fishInTrap.userData.tail.rotation.y = Math.sin(t * 9) * .5; }
        if (!dt) return;
        const P = api.player, p = P.pos;
        if (P.swimming && !firstSwim) { firstSwim = true; api.hint(T('Đang bơi: tốn sức. Lên bờ bằng dốc bùn hoặc giữ {jump} để leo bờ đê. Mèo không xuống nước.', 'Swimming drains stamina. Leave the water by a mud bank, or hold {jump} to climb a dyke. Cats won\'t follow you into water.'), 9000); }
        for (const h of api.herons ?? []) if (h.pos.distanceTo(p) < 3.5) once('heron', T('Con cò! Nó chỉ thấy thứ gì đang cử động. Khi nó nhìn về phía ngươi — đứng yên.', 'A heron! It only sees things that move. When it looks your way, freeze.'), 9000);
        for (const w of api.wisps ?? []) if (w.pos.distanceTo(p) < 2.5) once('wisp', T('Ma trơi! Ánh lửa xanh làm lộ ngươi trước mắt mèo. Nó còn bị ánh đèn lồng thu hút.', 'Ma trơi! Its green glow exposes you to the cats, and it is drawn to your lantern.'), 9000);
        if (step === 0 && p.z < -6.4) { step = 1; api.checkpoint('field'); }
        if (step <= 1 && Math.hypot(p.x - TRAP.x, p.z - TRAP.z) < 1.4) { step = 2; api.objective(OBJ.open); }
        if (step === 3) {
          // The live fish thrashes now and then: noise + splash + a jolt.
          flopT -= dt;
          if (carriedFish) { carriedFish.rotation.z = .3 + Math.sin(t * 3) * .08; carriedFish.userData.tail.rotation.y = Math.sin(t * 5) * .25; }
          if (flopT <= 0) {
            flopT = 3.5 + Math.random() * 4;
            api.sound(P.swimming ? 'splash' : 'splashSmall', { volume: .5, rate: 1.3 + Math.random() * .3 });
            api.noise(p.clone(), P.swimming ? 2.2 : 1.6); P.jolt(.3);
            if (carriedFish) carriedFish.userData.tail.rotation.y = 1.2;
          }
          if (p.z > .28 && p.y > .08) { step = 4; api.complete(); }
        }
      },
    };
  },
};
