// The six chapters, one per night of Tết leading to the wedding (Mùng 10).
// Chapters 1–2 are built (src/levels/ch1.js, ch2.js). TODO: chapters 3–6 levels; texts are placeholders until the story is final.

/**
 * @typedef {{vi:string, en:string}} Text
 * @typedef {{id:number, night:Text, title:Text, objective:Text, intro:Text, level:string, requires:number|null, cutIn?:string, cutOut?:string}} Chapter
 */

/** @type {Chapter[]} */
export const CHAPTERS = [
  { id: 1, night: { vi: 'Mùng 1', en: 'Night 1' }, title: { vi: 'Lời hứa hôn', en: 'The Betrothal' },
    objective: { vi: 'Đến miếu làng', en: 'Reach the village shrine' },
    intro: { vi: 'Nàng đã được hứa gả cho kẻ khác. Còn ta bị sai đi tìm lễ vật dâng mèo.', en: 'She has been promised to another. I am sent to find the tribute for the cats.' },
    level: 'ch1', cutIn: 'ch1_intro', cutOut: 'ch1_outro', requires: null },
  { id: 2, night: { vi: 'Mùng 3', en: 'Night 3' }, title: { vi: 'Con gà trống', en: 'The Rooster' },
    objective: { vi: 'Lấy con gà luộc trên bàn thờ nhà họ Lý', en: 'Take the boiled chicken from the Lý family altar' },
    intro: { vi: 'Lễ vật đầu tiên.', en: 'The first tribute.' }, level: 'ch2', cutIn: 'ch2_intro', cutOut: 'ch2_outro', requires: 1 },
  { id: 3, night: { vi: 'Mùng 5', en: 'Night 5' }, title: { vi: 'Con cá', en: 'The Fish' },
    objective: { vi: 'Lấy một con cá ở ruộng ngập', en: 'Take a fish from the flooded field' },
    intro: { vi: 'Nước lạnh. Đồng ruộng im phăng phắc.', en: 'Cold water. Silent fields.' }, level: 'placeholder', requires: 2 },
  { id: 4, night: { vi: 'Mùng 7', en: 'Night 7' }, title: { vi: 'Trầu và rượu', en: 'Betel and Wine' },
    objective: { vi: 'Tìm trầu cau và rượu', en: 'Gather betel and wine' },
    intro: { vi: 'Có thứ gì đó đang săn ta.', en: 'Something is hunting me.' }, level: 'placeholder', requires: 3 },
  { id: 5, night: { vi: 'Mùng 9', en: 'Night 9' }, title: { vi: 'Phản bội', en: 'Betrayal' },
    objective: { vi: 'Phá đám cưới', en: 'Sabotage the wedding' },
    intro: { vi: 'Đám cưới là một cái bẫy.', en: 'The wedding is a trap.' }, level: 'placeholder', requires: 4 },
  { id: 6, night: { vi: 'Mùng 10', en: 'Night 10' }, title: { vi: 'Đêm cưới', en: 'The Wedding Night' },
    objective: { vi: 'Đối mặt Ông Mèo', en: 'Face Ông Mèo' },
    intro: { vi: 'Kèn đám ma thổi trong đêm cưới.', en: 'Funeral horns play on the wedding night.' }, level: 'placeholder', requires: 5 },
];

/** @param {number} id */
export const getChapter = (id) => CHAPTERS.find(c => c.id === id);
