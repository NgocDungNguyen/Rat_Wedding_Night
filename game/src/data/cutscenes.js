// Cut-scenes as data: each panel = a Đông Hồ-style still + bilingual line + voice slot (TODO: voice files).
// Names are placeholders until confirmed: Tý (servant), cô Út (bride), cậu Cả nhà Thử (groom),
// ông Trưởng làng (elder), Thầy Cúng (ritual-teller).
import * as D from '../art/dongho.js';
const { C } = D;

/** @typedef {{draw:(ctx:CanvasRenderingContext2D)=>void, text:{vi:string,en:string}, voice?:string|null}} Panel */

/** @type {Record<string, Panel[]>} */
export const CUTSCENES = {
  ch1_intro: [
    { text: { vi: 'Tết. Làng người đã chết từ lâu. Chỉ còn gốc đa già… và làng chuột bên dưới.', en: 'Tết. The human village died long ago. Only the old banyan remains… and the rat village beneath it.' },
      draw(x) { D.paper(x); D.night(x, .6); D.moon(x, 1320, 170, 70); D.house(x, 380, 640, .8); D.house(x, 1220, 650, .6); D.banyan(x, 800, 760, 1.1); D.ground(x, 760, '#4a4a3a');
        for (let i = 0; i < 5; i++) D.lantern(x, 640 + i * 70, 560 + (i % 2) * 20, .45); D.frame(x); D.inscription(x, 'Mùng Một'); } },
    { text: { vi: 'Ta là Tý, gia nhân nhà ông Trưởng làng. Ta thương cô Út — con gái út của ông.', en: 'I am Tý, a servant of the village elder. I love cô Út, his youngest daughter.' },
      draw(x) { D.paper(x); D.ground(x, 720, '#a08a5a'); D.rat(x, 470, 720, 1.5, 1, { robe: C.brown, hat: 'none' }); D.rat(x, 1100, 720, 1.5, -1, { robe: C.red, hat: 'bride', fur: '#a09080' });
        x.save(); x.fillStyle = C.red; x.font = '700 120px serif'; x.fillText('♡', 740, 420); x.restore(); D.frame(x); D.inscription(x, 'Tý · cô Út'); } },
    { text: { vi: 'Nhưng đêm nay, nàng được hứa gả cho cậu Cả nhà họ Thử.', en: 'But tonight she is promised to cậu Cả of the Thử family.' },
      draw(x) { D.paper(x); D.ground(x, 730, '#a08a5a'); D.rat(x, 380, 730, 1.3, 1, { robe: C.indigo, hat: 'khan', hold: 'fan' }); D.rat(x, 640, 730, 1.3, 1, { robe: C.red, hat: 'bride', fur: '#a09080', bow: .15 });
        D.rat(x, 1000, 730, 1.4, -1, { robe: C.yellow, hat: 'groom' }); D.rat(x, 1260, 730, 1.2, -1, { robe: C.green, hat: 'khan' }); D.rat(x, 1460, 760, .8, -1, { robe: C.brown, hat: 'none', bow: .3 });
        D.frame(x); D.inscription(x, 'Lễ hứa hôn'); } },
    { text: { vi: 'Theo lệ, trước đám cưới phải dâng lễ cho Mèo, để Mèo tha cho đám cưới. Ông Trưởng làng sai ta đi tìm lễ vật.', en: 'By custom, tribute must be paid to the Cats before the wedding, so they leave it in peace. The elder sends me to find it.' },
      draw(x) { D.paper(x); D.ground(x, 730, '#a08a5a'); D.rat(x, 520, 730, 1.6, 1, { robe: C.indigo, hat: 'khan', hold: 'list' }); D.rat(x, 900, 760, 1.1, -1, { robe: C.brown, hat: 'none', kneel: true, bow: .35 });
        D.tributeList(x, 1150, 260); D.frame(x); D.inscription(x, 'Lễ vật'); } },
    { text: { vi: '“Đến miếu làng. Thầy Cúng sẽ chỉ cho mày phải lấy những gì.” Ngoài kia, đèn đã tắt.', en: '"Go to the village shrine. The ritual master will tell you what to take." Outside, the lamps are out.' },
      draw(x) { D.paper(x); D.night(x, .5); D.moon(x, 1340, 160, 60); D.ground(x, 740, '#5a5640'); D.shrine(x, 1050, 740, 1.3); D.rat(x, 1050, 740, .9, -1, { robe: '#3a2a1a', hat: 'khan', hold: 'incense' });
        D.rat(x, 380, 760, .8, 1, { robe: C.brown }); D.frame(x); D.inscription(x, 'Miếu làng'); } },
  ],
  ch1_outro: [
    { text: { vi: 'Thầy Cúng đã chờ sẵn, như thể biết ta sẽ đến.', en: 'The ritual master is already waiting, as if he knew I would come.' },
      draw(x) { D.paper(x); D.night(x, .45); D.ground(x, 740, '#5a5640'); D.shrine(x, 800, 740, 1.6); D.rat(x, 800, 760, 1.4, -1, { robe: '#3a2a1a', hat: 'khan', hold: 'incense' }); D.frame(x); D.inscription(x, 'Thầy Cúng'); } },
    { text: { vi: '“Bốn lễ vật: gà, cá, trầu, rượu. Thiếu một thứ, Mèo sẽ ăn cả đám cưới.”', en: '"Four tributes: chicken, fish, betel, wine. Miss one, and the Cats will eat the whole wedding."' },
      draw(x) { D.paper(x); D.tributeList(x, 260, 230); D.chicken(x, 820, 470, 1.2); D.fish(x, 1200, 380, 1.2); D.frame(x); D.inscription(x, 'Bốn lễ vật', 70, 70, true); } },
    { text: { vi: '“Đêm mùng Ba, lấy con gà trên bàn thờ nhà họ Lý. Người chết rồi, đâu cần ăn nữa.”', en: '"On the third night, take the chicken from the Lý family altar. The dead don\'t need to eat."' },
      draw(x) { D.paper(x); D.night(x, .35); D.altar(x, 800, 760, 1.4); D.frame(x); D.inscription(x, 'Nhà họ Lý'); } },
    { text: { vi: 'Đâu đó ngoài bụi tre, có tiếng kèn đám ma. Đêm Tết, ai lại thổi kèn đám ma?', en: 'Somewhere past the bamboo, a funeral horn plays. Who plays funeral horns at Tết?' },
      draw(x) { D.paper(x); D.night(x, .7); D.moon(x, 300, 180, 50); D.ground(x, 760, '#3a3a30'); D.cat(x, 1150, 760, 1.1, -1, { fangs: false }); D.frame(x); D.inscription(x, '…', 70, 70, true); } },
  ],
  ch2_intro: [
    { text: { vi: 'Mùng Ba. Nhà họ Lý — ngôi nhà ba gian cuối làng.', en: 'The third night. The Lý house, three rooms wide, at the end of the village.' },
      draw(x) { D.paper(x); D.night(x, .6); D.moon(x, 1300, 170, 64); D.ground(x, 740, '#4a4636'); D.house(x, 800, 740, 1.4, false); D.frame(x); D.inscription(x, 'Mùng Ba'); } },
    { text: { vi: 'Bàn thờ vẫn còn mâm cỗ ngày Tết: gà luộc, bánh chưng, nến vẫn cháy.', en: 'The altar still holds the Tết feast: boiled chicken, bánh chưng, candles still burning.' },
      draw(x) { D.paper(x); D.night(x, .3); D.altar(x, 800, 800, 1.6); D.frame(x); D.inscription(x, 'Bàn thờ'); } },
    { text: { vi: 'Nhà không còn ai. Vậy ai đã thắp nến?', en: 'No one lives here any more. So who lit the candles?' },
      draw(x) { D.paper(x); D.night(x, .75); D.altar(x, 800, 800, 1.6); D.frame(x); D.inscription(x, '?', 70, 70, true); } },
    { text: { vi: 'Mèo canh ngoài sân. Một con ngủ trong nhà. Đừng làm rơi thứ gì.', en: 'Cats guard the yard. One sleeps inside. Don\'t knock anything over.' },
      draw(x) { D.paper(x); D.night(x, .5); D.ground(x, 760, '#5a5640'); D.cat(x, 520, 760, .9, 1); D.cat(x, 1180, 760, .9, -1, { fur: '#4a4038' }); D.rat(x, 850, 780, .6, 1, { robe: C.brown }); D.frame(x); D.inscription(x, 'Sân nhà'); } },
  ],
  ch2_outro: [
    { text: { vi: 'Ta kéo con gà về đến gốc đa khi trời gần sáng.', en: 'I drag the chicken back to the banyan just before dawn.' },
      draw(x) { D.paper(x, .95); D.banyan(x, 1150, 770, .9); D.ground(x, 770, '#8a7a52'); D.chicken(x, 620, 760, .9); D.rat(x, 470, 770, 1, 1, { robe: C.brown, bow: .4 }); D.frame(x); D.inscription(x, 'Rạng sáng'); } },
    { text: { vi: 'Cô Út nhìn ta. Nàng không nói gì. Nhưng nàng đã nhìn ta.', en: 'Cô Út looks at me. She says nothing. But she looked at me.' },
      draw(x) { D.paper(x); D.ground(x, 720, '#a08a5a'); D.rat(x, 800, 740, 1.8, -1, { robe: C.red, hat: 'bride', fur: '#a09080' }); D.frame(x); D.inscription(x, 'Cô Út'); } },
    { text: { vi: 'Thầy Cúng buộc một sợi chỉ đỏ quanh cổ con gà. “Lễ thứ nhất,” lão nói.', en: 'The ritual master ties a red thread around the chicken\'s neck. "The first offering," he says.' },
      draw(x) { D.paper(x); D.night(x, .25); D.chicken(x, 900, 620, 2.2, true); D.rat(x, 520, 760, 1.3, 1, { robe: '#3a2a1a', hat: 'khan', hold: 'incense' }); D.frame(x); D.inscription(x, 'Chỉ đỏ'); } },
    { text: { vi: 'Đêm mùng Năm: cá.', en: 'The fifth night: the fish.' },
      draw(x) { D.paper(x); D.night(x, .55); D.fish(x, 800, 450, 2.2); D.frame(x); D.inscription(x, 'Mùng Năm'); } },
  ],
};
