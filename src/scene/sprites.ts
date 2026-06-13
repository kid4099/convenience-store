import Phaser from 'phaser';
import { createPixelTexture, type Palette } from './pixelArt';

// ---- 人物（10×14）----
// o 外框 / e 眼 / h 髮(或帽) / s 膚 / B 衣(=客群色) / A 配件 / P 褲
const PERSON: string[] = [
  '...oooo...',
  '..ohhhho..',
  '.ohhhhhho.',
  '.ohssssho.',
  '.ohesseho.',
  '..hssssh..',
  '...ssss...',
  '..oBBBBo..',
  '.oBBBBBBo.',
  '.oBBAABBo.',
  '.oBBBBBBo.',
  '..oBBBBo..',
  '..PP..PP..',
  '..oo..oo..',
];

// 店員（戴帽 C）
const PERSON_CAP: string[] = [
  '...CCCC...',
  '..CCCCCC..',
  '.CCCCCCCC.',
  '.ohssssho.',
  '.ohesseho.',
  '..hssssh..',
  '...ssss...',
  '..oBBBBo..',
  '.oBBBBBBo.',
  '.oBBAABBo.',
  '.oBBBBBBo.',
  '..oBBBBo..',
  '..PP..PP..',
  '..oo..oo..',
];

interface PersonStyle {
  hair: string;
  skin: string;
  body: string;
  acc: string;
  pants: string;
}

// 衣服色 = 圖例顏色，一眼對得上客群
const PERSON_STYLES: Record<string, PersonStyle> = {
  office:  { hair: '#3a3a3a', skin: '#f1c9a5', body: '#4d96ff', acc: '#c0392b', pants: '#22324a' },
  student: { hair: '#6a3d1f', skin: '#f1c9a5', body: '#ff9f40', acc: '#ffd93d', pants: '#3b5bdb' },
  family:  { hair: '#5a3a1a', skin: '#f1c9a5', body: '#6bcb77', acc: '#ffffff', pants: '#7a5230' },
  tourist: { hair: '#e67e22', skin: '#f1c9a5', body: '#b983ff', acc: '#ffffff', pants: '#8e44ad' },
  senior:  { hair: '#e3e3e3', skin: '#e8c4a0', body: '#9aa0a6', acc: '#7f8c8d', pants: '#5d6d7e' },
};

function personPalette(s: PersonStyle): Palette {
  return { o: '#2b2b2b', e: '#222222', h: s.hair, s: s.skin, B: s.body, A: s.acc, P: s.pants };
}

// 走路第二幀：雙腳張開（與站姿交替＝走路動畫）
const PERSON_WALK: string[] = PERSON.map((r, i) => (i === 12 ? '.PP....PP.' : i === 13 ? '.oo....oo.' : r));

// ---- 商品圖示（8×8）----
interface Sprite {
  rows: string[];
  palette: Palette;
}

const PRODUCTS: Record<string, Sprite> = {
  water: {
    rows: ['..aa....', '..aa....', '.bbbb...', '.bllb...', '.bbbb...', '.bllb...', '.bbbb...', '.bbbb...'],
    palette: { a: '#adb5bd', b: '#74c0fc', l: '#ffffff' },
  },
  tea: {
    rows: ['..aa....', '..aa....', '.gggg...', '.gwwg...', '.gggg...', '.gwwg...', '.gggg...', '.gggg...'],
    palette: { a: '#adb5bd', g: '#2f9e44', w: '#ffffff' },
  },
  coffee: {
    rows: ['........', '.LLLLL..', '.wwwww..', '.wsssw..', '.wsssw..', '.wsssw..', '..www...', '........'],
    palette: { L: '#a0522d', w: '#f1f3f5', s: '#8b5a2b' },
  },
  riceball: {
    rows: ['........', '...tt...', '..tttt..', '.tttttt.', '.tnnnnt.', 'tnnnnnnt', '........', '........'],
    palette: { t: '#f8f9fa', n: '#2b3a2b' },
  },
  bento: {
    rows: ['........', '.oooooo.', '.oRRRRo.', '.oRYGRo.', '.oRRRRo.', '.oooooo.', '........', '........'],
    palette: { o: '#8b5a2b', R: '#f1f3f5', Y: '#f59f00', G: '#37b24d' },
  },
  chips: {
    rows: ['.bbbbbb.', '.bLLLLb.', '.bLccLb.', '.bLccLb.', '.bLLLLb.', '.bbbbbb.', '........', '........'],
    palette: { b: '#f59f00', L: '#ffe066', c: '#e8590c' },
  },
  noodle: {
    rows: ['.cccccc.', '.cwwwwc.', '.cwwwwc.', '.cwwwwc.', '..cccc..', '..cccc..', '........', '........'],
    palette: { c: '#e64980', w: '#ffe8cc' },
  },
  cigar: {
    rows: ['........', '.pppppp.', '.pwwwwp.', '.pwwwwp.', '.pwwwwp.', '.pppppp.', '........', '........'],
    palette: { p: '#495057', w: '#ced4da' },
  },
  tissue: {
    rows: ['........', '.wwwwww.', '.wbbbbw.', '.wwwwww.', '.wwwwww.', '.wwwwww.', '........', '........'],
    palette: { w: '#a5d8ff', b: '#ffffff' },
  },
  hotdog: {
    rows: ['........', '........', '..dddd..', '.ssssss.', '.dddddd.', '........', '........', '........'],
    palette: { d: '#e8a23d', s: '#c0392b' },
  },
  jelly: {
    rows: ['........', '..jjjj..', '.jjjjjj.', '.jjjjjj.', '.pppppp.', '........', '........', '........'],
    palette: { j: '#ffa94d', p: '#ced4da' },
  },
  teaegg: {
    rows: ['........', '...ee...', '..eeee..', '.eecee..', '.eeeece.', '..eeee..', '........', '........'],
    palette: { e: '#8b5a2b', c: '#caa472' },
  },
  radish: {
    rows: ['..gg....', '.g.g....', '...w....', '..www...', '..www...', '..www...', '...w....', '........'],
    palette: { g: '#37b24d', w: '#f1f3f5' },
  },
  fishcake: {
    rows: ['........', '.wwwww..', '.wpppw..', '.wpwpw..', '.wpppw..', '.wwwww..', '........', '........'],
    palette: { w: '#f8f9fa', p: '#ff8fab' },
  },
  corn: {
    rows: ['..yy....', '.yyyy...', '.yyyy...', '.yyyy...', '.gyyg...', '..gg....', '........', '........'],
    palette: { y: '#fcc419', g: '#37b24d' },
  },
  riceblood: {
    rows: ['........', '.dddd...', '.dddd...', '.dddd...', '.dddd...', '.dddd...', '........', '........'],
    palette: { d: '#8b2e2e' },
  },
};

// 商品在貨架上的擺放順序
export const SHELF_PRODUCTS: string[] = [
  'prod_water', 'prod_tea', 'prod_coffee',
  'prod_riceball', 'prod_bento', 'prod_hotdog',
  'prod_teaegg', 'prod_radish', 'prod_fishcake',
  'prod_corn', 'prod_riceblood', 'prod_chips',
  'prod_noodle', 'prod_jelly', 'prod_cigar',
  'prod_tissue', 'prod_water', 'prod_corn',
];

// ---- 地板磚（8×8，含磁磚縫）----
const FLOOR_TILE: string[] = [
  'GGGGGGGG',
  'GtttGttt',
  'GtttGttt',
  'GtttGttt',
  'GGGGGGGG',
  'GtttGttt',
  'GtttGttt',
  'GtttGttt',
];
const FLOOR_PAL: Palette = { t: '#e7e2d6', G: '#c9bda1' };

// ---- 盆栽（8×8）----
const PLANT: string[] = [
  '..g..g..', '.gFgFg..', '.gggggg.', '..gggg..',
  '...pp...', '...pp...', '..pppp..', '..pppp..',
];
const PLANT_PAL: Palette = { g: '#2f9e44', F: '#69db7c', p: '#a0522d' };

export const CUSTOMER_TEX = (segId: string) => `cust_${segId}`;

/** 一次建立所有貼圖（在 scene.create 中呼叫）。 */
export function buildAllTextures(scene: Phaser.Scene): void {
  for (const [id, style] of Object.entries(PERSON_STYLES)) {
    createPixelTexture(scene, CUSTOMER_TEX(id), PERSON, personPalette(style));
    createPixelTexture(scene, `${CUSTOMER_TEX(id)}_walk`, PERSON_WALK, personPalette(style));
  }
  createPixelTexture(scene, 'shopkeeper', PERSON_CAP, {
    o: '#2b2b2b', e: '#222222', C: '#00713a', h: '#3a3a3a', s: '#f1c9a5', B: '#00a14b', A: '#ffd43b', P: '#34495e',
  });
  for (const [key, def] of Object.entries(PRODUCTS)) {
    createPixelTexture(scene, `prod_${key}`, def.rows, def.palette);
  }
  createPixelTexture(scene, 'tile_floor', FLOOR_TILE, FLOOR_PAL);
  createPixelTexture(scene, 'plant', PLANT, PLANT_PAL);
}
