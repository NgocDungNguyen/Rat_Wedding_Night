// Chapter 1 · Mùng 1 · Lời hứa hôn — burrow → back yard (tutorial) → gate → bamboo lane (one cat scout) → shrine.
// Layout (metres): burrow at z≈0.3, yard z 0 → -9.2, gate at z -9.2, lane z -9.3 → -27, shrine plaza z -27 → -32.5.
import * as THREE from 'three';

const T = (vi, en) => ({ vi, en });

export default {
  id: 'ch1',
  /** @param {ReturnType<import('./kit.js').createKit>} k @param {any} api */
  build(k, api) {
    const { scene, M } = k;
    scene.background = new THREE.Color(0x05070c);
    scene.fog = new THREE.FogExp2(0x0b1320, .06);

    // ---------------------------------------------------------------- lights
    const hemi = new THREE.HemisphereLight(0x5a6a98, 0x1a1410, 1.1); scene.add(hemi);
    const moon = new THREE.DirectionalLight(0xa8bcf0, 2.0); moon.position.set(6, 12, 4); moon.target.position.set(0, 0, -14);
    moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 40 });
    moon.shadow.bias = -.0004; moon.shadow.normalBias = .01; scene.add(moon, moon.target);

    // ---------------------------------------------------------------- ground + house back wall + burrow
    k.ground(0, -5, 10, 12, M.dirt);
    k.ground(0, -21, 4, 20, M.dirt);
    k.ground(0, -30, 6, 6, M.grass);
    k.box({ x: 0, y: 0, z: .65, w: 8, h: 3, d: .3, mat: M.plaster });            // house back wall
    k.box({ x: 0, y: 3, z: .2, w: 8.4, h: .08, d: 1.2, mat: M.roof, collide: false });   // eave
    // Back step with a mouse burrow under it (7.5 cm high channel).
    k.box({ x: 0, y: .075, z: .3, w: 1.6, h: .11, d: .4, mat: M.brick });
    k.box({ x: -.46, y: 0, z: .3, w: .68, h: .075, d: .4, mat: M.brick });
    k.box({ x: .46, y: 0, z: .3, w: .68, h: .075, d: .4, mat: M.brick });
    k.box({ x: 0, y: 0, z: .52, w: .24, h: .075, d: .04, mat: M.dark });
    k.safe(0, .3, .35);

    // ---------------------------------------------------------------- yard walls
    k.wall(-3.1, .5, -3.1, -9.3, 1.6); k.wall(3.1, .5, 3.1, -9.3, 1.6);
    k.wall(-3.2, -9.2, -.85, -9.2, 1.6); k.wall(.85, -9.2, 3.2, -9.2, 1.6);
    for (const px of [-.85, .85]) k.box({ x: px, z: -9.2, w: .26, h: 1.9, d: .26, mat: M.brick });
    k.gate(0, -9.2, 1.44, 1.5, .045);

    // ---------------------------------------------------------------- yard props
    k.pole(-3.02, -1.25, 3.02, -1.35, .04);                    // jump over
    k.jar(-2.35, -2.6, .3, .64); k.jar(-2.55, -3.45, .22, .5); k.jar(-1.75, -2.25, .2, .45);
    k.firewood(1.9, -2.6, 1.0, .45, .42, .08);                // climb
    k.basket(-1.1, -6.2, .24);
    k.grass(2.45, -7.9, .5, .9, .3);
    k.grass(-2.6, -8.3, .35, .6, .3);
    k.straw(2.3, -5, .45, .35);
    k.sandal(.8, -4.2, .4); k.sandal(.95, -4.35, .6);
    for (const [px, pz] of [[-.3, -3], [.5, -5.6], [-.6, -7.4], [1.2, -8.4], [-1.9, -5]]) k.pebble(px, pz);
    k.cup(1.75, .45, -2.55);                                   // on the woodpile: knock it off = noise
    k.notePaper(-1.4, 0, -3.1, .3);
    k.crumbs(-1.12, 0, -6.2);

    // Lantern on top of the woodpile.
    const lantern = new THREE.Group();
    { const p = new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 10), new THREE.MeshStandardMaterial({ color: 0xc02018, emissive: 0x501008, roughness: .8 })); p.scale.y = 1.25; p.position.y = .04; lantern.add(p);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .01, 10), M.woodDark); c.position.y = .08; lantern.add(c); }
    lantern.position.set(2.05, .40, -2.6); scene.add(lantern);

    // ---------------------------------------------------------------- world bounds
    k.bound(-3.35, -4.3, .2, 10.4); k.bound(3.35, -4.3, .2, 10.4); k.bound(0, 1, 7, .2);
    k.bound(-2.6, -9.5, 1.5, .2); k.bound(2.6, -9.5, 1.5, .2);
    k.bound(-2.0, -18.4, .2, 18.2); k.bound(2.0, -18.4, .2, 18.2);
    k.bound(-3.3, -30.1, .2, 5.8); k.bound(3.3, -30.1, .2, 5.8); k.bound(0, -32.95, 7, .2);
    k.bound(-2.65, -27.35, 1.3, .2); k.bound(2.65, -27.35, 1.3, .2);

    // ---------------------------------------------------------------- lane
    k.hedge(-1.7, -9.1, -1.7, -27.2); k.hedge(1.7, -9.1, 1.7, -27.2);
    k.grass(1.2, -13, .32, 2.0, .32); k.grass(1.2, -19.3, .32, 1.8, .32); k.grass(-1.2, -23.8, .32, 1.3, .32); k.grass(-1.25, -11.2, .25, .8, .3);
    k.cart(-.85, -14.2, .05);
    k.straw(-1.0, -18.8, .5, .42);
    const pole = k.incensePole(1.15, -16.5);
    for (const [px, pz] of [[.3, -12], [-.2, -15.8], [.5, -20.5], [-.4, -22.6], [0, -25]]) k.pebble(px, pz);
    k.notePaper(-.9, 0, -14.4, -.4);
    k.box({ x: .7, z: -21.8, w: .3, h: .22, d: .3, ry: .5, mat: M.brick });   // broken brick stack
    k.box({ x: -1.15, z: -16.2, w: .5, h: .12, d: .25, ry: -.3, mat: M.stone });
    // Cats stay in the lane (cat-only walls at both ends).
    k.world.addCatWall({ x: 0, z: -9.6, w: 3.4, h: 1, d: .1 });
    k.world.addCatWall({ x: 0, z: -26.9, w: 3.4, h: 1, d: .1 });

    // ---------------------------------------------------------------- shrine plaza (safe: cats avoid the incense)
    k.hedge(-1.7, -27.2, -3, -27.4); k.hedge(1.7, -27.2, 3, -27.4); k.hedge(-3, -27.4, -3, -32.6); k.hedge(3, -27.4, 3, -32.6); k.hedge(-3, -32.6, 3, -32.6);
    k.safe(0, -29.9, 2.6, 2.6);
    k.box({ x: 0, z: -31.5, w: 1.6, h: .22, d: 1.2, mat: M.brick });
    k.box({ x: 0, y: .22, z: -31.75, w: 1.1, h: 1.0, d: .7, mat: M.plaster });
    k.box({ x: 0, y: 1.22, z: -31.65, w: 1.5, h: .1, d: 1.05, mat: M.roof });
    k.box({ x: 0, y: .3, z: -31.38, w: .5, h: .6, d: .02, mat: M.red, collide: false });
    k.cyl({ x: 0, y: .22, z: -31.2, r: .08, h: .07, mat: M.gold });
    const shrineL = k.light(0, .5, -31, 0xff6a2a, 1.6, 5, 0);
    k.candle(-.35, .22, -31.25, .14); k.candle(.35, .22, -31.25, .14);
    const npc = k.ratNPC(0, 0, -30.35, 0, 0x3a2a1a);
    k.crumbs(.5, 0, -29.6);

    // ---------------------------------------------------------------- cat scout
    const cats = [{
      id: 'scout', pos: [0, -24], heading: Math.PI, fur: 0x1d1a17,
      waypoints: [[0, -24], [.35, -19.5], [-.25, -15.5], [.3, -11.3], [-.1, -14.8], [.2, -21.5]],
      area: { minX: -1.35, maxX: 1.35, minZ: -26.6, maxZ: -10 },
    }];

    // ---------------------------------------------------------------- script
    const v = (x, y, z) => new THREE.Vector3(x, y, z);
    let step = 0, hintT = 0, sawCat = false;
    const said = new Set();
    const once = (key, text, ms) => { if (said.has(key)) return; said.add(key); api.hint(text, ms); };

    const OBJ = {
      leave: T('Ra khỏi hang', 'Leave the burrow'),
      lantern: T('Lấy đèn lồng trên đống củi', 'Get the lantern on top of the woodpile'),
      gate: T('Chui qua khe cổng', 'Crawl under the gate'),
      shrine: T('Đến miếu làng. Tránh con mèo.', 'Reach the village shrine. Avoid the cat.'),
    };

    function setupInteracts() {
      if (!api.flags.lantern) api.interact({ id: 'lantern', pos: v(2.05, .46, -2.6), r: .2, label: T('Lấy đèn lồng', 'Take the lantern'), onUse() {
        api.flags.lantern = true; lantern.visible = false; api.player.setLantern(true, true); api.removeInteract('lantern');
        api.hint(T('Nhấn {lantern} để bật/tắt đèn. Mèo thấy ánh đèn từ rất xa — tắt đèn khi gần chúng.', 'Press {lantern} to switch the lantern. Cats see its light from far away: turn it off near them.'), 8000);
        step = 2; api.objective(OBJ.gate);
      } });
      api.interact({ id: 'note1', pos: v(-1.4, .03, -3.1), r: .2, label: T('Đọc giấy', 'Read the paper'), onUse() { api.note(T(
        'Mảnh giấy dán trên chum nước, chữ đã nhoè:\n\n“Tết này nhà mình không giết gà. Thầy bảo phải kiêng, kẻo Ông ấy về.”',
        'A paper stuck to the water jar, the ink has run:\n\n"No killing chickens this Tết. The master says we must abstain, or He will come back."')); } });
      api.interact({ id: 'note2', pos: v(-.9, .03, -14.4), r: .2, label: T('Đọc thư', 'Read the letter'), onUse() { api.note(T(
        'Một lá thư viết dở:\n\n“…mấy đứa nhỏ đập chết con mèo con lông trắng ở bờ ao. Từ hôm đó, đêm nào cũng có tiếng mèo khóc ngoài bụi tre. Mẹ bảo đừng ra ngoài sau khi tắt đèn…”',
        'An unfinished letter:\n\n"…the children beat a little white kitten to death by the pond. Every night since, a cat cries in the bamboo. Mother says not to go out after the lamps are out…"')); } });
      for (const [id, x, z] of [['crumbs1', -1.12, -6.2], ['crumbs2', .5, -29.6]]) api.interact({ id, pos: v(x, .02, z), r: .16, label: T('Ăn cơm vụn (+30 máu)', 'Eat rice crumbs (+30 health)'), onUse() {
        api.heal(30); api.removeInteract(id); scene.children.filter(o => o.isGroup && Math.abs(o.position.x - x) < .01 && Math.abs(o.position.z - z) < .01).forEach(o => scene.remove(o)); } });
    }

    return {
      cats,
      shadowLights: [moon],
      music: null,
      ambience: { wind: .35, gecko: .12 },
      spawn: { pos: v(0, 0, .38), yaw: 0 },
      checkpoints: { lane: { pos: v(0, 0, -9.7), yaw: 0 } },
      start(cp) {
        setupInteracts();
        if (api.flags.lantern) lantern.visible = false;
        if (cp === 'lane') { step = 3; api.objective(OBJ.shrine); }
        else {
          step = 0; api.objective(OBJ.leave);
          api.hint(T('{forward} {left} {back} {right} để đi · chuột để nhìn', '{forward} {left} {back} {right} to move · mouse to look'), 7000);
        }
      },
      update(dt, t) {
        pole.intensity = 3 * (1 + Math.sin(t * 7) * .05 + (Math.sin(t * 23) > .97 ? -.4 : 0));
        shrineL.intensity = 1.6 * (1 + Math.sin(t * 9) * .1);
        npc.head.rotation.y = Math.sin(t * .6) * .3;
        lantern.rotation.y = t * .5;
        if (!dt) return;
        const p = api.player.pos;
        hintT += dt;
        if (step === 0 && p.z < -.2) { step = 1; api.objective(OBJ.lantern); }
        if (step >= 1 && p.z < -.9 && p.z > -1.6) once('jump', T('Nhấn {jump} để nhảy qua cây tre.', 'Press {jump} to jump over the bamboo pole.'));
        if (step === 1 && api.near(1.9, -2.6, .7)) once('climb', T('Giữ {jump} khi áp sát đống củi để leo lên. Leo tốn sức (thanh vàng).', 'Hold {jump} against the woodpile to climb it. Climbing uses stamina (gold bar).'), 8000);
        if (step >= 1 && p.z < -3.5) once('sprint', T('Giữ {sprint} để chạy — tốn sức. Hết sức thì phải nghỉ.', 'Hold {sprint} to run. It drains stamina; when it runs out you must rest.'));
        if (api.near(-1.1, -6.2, .7)) once('hide', T('Cúi ({crouch}) để chui vào gầm rổ. Trong rổ, cỏ cao hay rơm, mèo không thấy ngươi.', 'Crouch ({crouch}) to crawl under the basket. In baskets, tall grass or straw, cats can\'t see you.'), 8000);
        if (api.near(1.75, -2.55, .5, .45)) once('noise', T('Cẩn thận: đồ vật rơi sẽ gây tiếng động. Mèo nghe được.', 'Careful: things that fall make noise. Cats can hear it.'));
        if (step === 2 && p.z < -8.3) once('crouch', T('Giữ {crouch} để cúi và chui qua khe cổng.', 'Hold {crouch} to crouch and crawl under the gate.'));
        if (step < 3 && p.z < -9.55) {
          step = 3; api.objective(OBJ.shrine); api.checkpoint('lane');
          if (!api.flags.lantern) api.hint(T('Ngươi chưa có đèn lồng. Cứ đi trong bóng tối.', 'You have no lantern. Stay in the dark.'));
        }
        if (step === 3 && !sawCat) {
          const c = api.cat('scout');
          if (c && c.pos.distanceTo(p) < 5) { sawCat = true; api.hint(T('Mèo! Tránh tầm mắt nó. Trốn trong cỏ, dưới xe bò, trong rơm. Mèo cào sẽ mất máu.', 'A cat! Stay out of its sight. Hide in grass, under the cart, in straw. Its claws hurt.'), 9000); }
        }
        if (step === 3 && p.z < -27.3) once('safe', T('Hương miếu làm mèo tránh xa. Ở đây an toàn.', 'Cats keep away from the shrine incense. You are safe here.'));
        if (step === 3 && api.near(0, -30.35, .3)) { step = 4; api.complete(); }
      },
    };
  },
};
