// 所有可調數值集中於此，方便數值平衡時調整
import type { Combo, GameEvent, Product, Segment, WeekdayProfile } from './types';

export const CONFIG = {
  START_CASH: 45000,       // 起始資金（數值平衡校準）
  GOAL_CASH: 150000,       // 勝利門檻
  TOTAL_DAYS: 30,          // 經營天數上限
  DAILY_FIXED_COST: 4000,  // 每日固定成本（租金＋水電）— 對小朋友友善的校準值
  BASE_CUSTOMERS: 120,     // 基準來客數（平日基準，乘上星期／事件倍率）
  CUSTOMER_VARIANCE: 0.15, // 來客數隨機波動 ±15%
  BASKET_SCALE: 0.45,      // 購物籃係數：控制每位顧客平均購買件數
  ELASTICITY_UP: 1.4,      // 漲價時的需求衰減幅度
  ELASTICITY_DOWN: 0.4,    // 降價時的需求提升幅度
  FACTOR_CAP: 1.3,         // 需求係數上限
  EVENT_CHANCE: 0.5,       // 每天發生特殊事件的機率
  START_REPUTATION: 50,    // 起始口碑（0–100，50＝2.5★）
  REP_FACTOR_MIN: 0.7,     // 口碑 0 時的來客倍率
  REP_FACTOR_MAX: 1.3,     // 口碑 100 時的來客倍率
} as const;

export const CATEGORY_LABEL: Record<string, string> = {
  drink: '飲料',
  food: '鮮食',
  snack: '零食',
  tobacco: '菸',
  daily: '日用',
};

export type ProductTemplate = Pick<
  Product,
  'id' | 'name' | 'emoji' | 'category' | 'costPrice' | 'basePrice' | 'demandWeight' | 'perishable'
>;

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  { id: 'water',    name: '礦泉水', emoji: '💧', category: 'drink',   costPrice: 8,  basePrice: 20,  demandWeight: 0.90, perishable: false },
  { id: 'tea',      name: '茶飲料', emoji: '🍵', category: 'drink',   costPrice: 12, basePrice: 25,  demandWeight: 0.85, perishable: false },
  { id: 'coffee',   name: '咖啡',   emoji: '☕', category: 'drink',   costPrice: 15, basePrice: 40,  demandWeight: 0.65, perishable: false },
  { id: 'riceball', name: '御飯糰', emoji: '🍙', category: 'food',    costPrice: 18, basePrice: 30,  demandWeight: 0.60, perishable: true  },
  { id: 'bento',    name: '便當',   emoji: '🍱', category: 'food',    costPrice: 45, basePrice: 75,  demandWeight: 0.50, perishable: true  },
  { id: 'hotdog',   name: '熱狗',   emoji: '🌭', category: 'food',    costPrice: 25, basePrice: 45,  demandWeight: 0.45, perishable: true  },
  { id: 'teaegg',    name: '茶葉蛋', emoji: '🥚', category: 'food',    costPrice: 6,  basePrice: 13,  demandWeight: 0.55, perishable: true  },
  { id: 'radish',    name: '蘿蔔',   emoji: '🥬', category: 'food',    costPrice: 8,  basePrice: 18,  demandWeight: 0.42, perishable: true  },
  { id: 'fishcake',  name: '魚板',   emoji: '🍥', category: 'food',    costPrice: 10, basePrice: 20,  demandWeight: 0.40, perishable: true  },
  { id: 'corn',      name: '玉米',   emoji: '🌽', category: 'food',    costPrice: 12, basePrice: 25,  demandWeight: 0.45, perishable: true  },
  { id: 'riceblood', name: '米血糕', emoji: '🍘', category: 'food',    costPrice: 9,  basePrice: 20,  demandWeight: 0.38, perishable: true  },
  { id: 'chips',     name: '洋芋片', emoji: '🥔', category: 'snack',   costPrice: 20, basePrice: 35,  demandWeight: 0.50, perishable: false },
  { id: 'noodle',   name: '泡麵',   emoji: '🍜', category: 'snack',   costPrice: 18, basePrice: 32,  demandWeight: 0.50, perishable: false },
  { id: 'jelly',    name: '果凍',   emoji: '🍮', category: 'snack',   costPrice: 10, basePrice: 22,  demandWeight: 0.40, perishable: false },
  { id: 'cigar',    name: '香菸',   emoji: '🚬', category: 'tobacco', costPrice: 70, basePrice: 100, demandWeight: 0.40, perishable: false },
  { id: 'tissue',   name: '衛生紙', emoji: '🧻', category: 'daily',   costPrice: 30, basePrice: 55,  demandWeight: 0.25, perishable: false },
];

// 顧客類型：偏好倍率未列出的品類預設 1
export const SEGMENTS: Segment[] = [
  { id: 'office',  name: '上班族', emoji: '👔', color: 0x4d96ff, cssColor: '#4d96ff',
    prefs: { drink: 1.2, food: 1.3, snack: 0.7, tobacco: 1.5, daily: 0.6 } },
  { id: 'student', name: '學生',   emoji: '🎒', color: 0xff9f40, cssColor: '#ff9f40',
    prefs: { drink: 1.1, food: 0.8, snack: 1.7, tobacco: 0.2, daily: 0.5 } },
  { id: 'family',  name: '家庭',   emoji: '🛒', color: 0x6bcb77, cssColor: '#6bcb77',
    prefs: { drink: 0.8, food: 1.2, snack: 0.9, tobacco: 0.3, daily: 1.9 } },
  { id: 'tourist', name: '觀光客', emoji: '🧳', color: 0xb983ff, cssColor: '#b983ff',
    prefs: { drink: 1.4, food: 1.0, snack: 1.5, tobacco: 0.4, daily: 0.3 } },
  { id: 'senior',  name: '銀髮族', emoji: '🧓', color: 0x9aa0a6, cssColor: '#9aa0a6',
    prefs: { drink: 1.0, food: 0.9, snack: 0.5, tobacco: 0.6, daily: 1.4 } },
];

const wd = (
  name: string,
  short: string,
  trafficMul: number,
  segmentWeights: Record<string, number>,
): WeekdayProfile => ({ name, short, trafficMul, segmentWeights });

// 第 1 天 = 週一，循環
export const WEEKDAYS: WeekdayProfile[] = [
  wd('週一', '一', 0.95, { office: 0.38, student: 0.25, family: 0.14, tourist: 0.08, senior: 0.15 }),
  wd('週二', '二', 0.95, { office: 0.38, student: 0.25, family: 0.14, tourist: 0.08, senior: 0.15 }),
  wd('週三', '三', 1.00, { office: 0.37, student: 0.25, family: 0.15, tourist: 0.08, senior: 0.15 }),
  wd('週四', '四', 1.00, { office: 0.37, student: 0.25, family: 0.15, tourist: 0.09, senior: 0.14 }),
  wd('週五', '五', 1.20, { office: 0.40, student: 0.26, family: 0.12, tourist: 0.12, senior: 0.10 }),
  wd('週六', '六', 1.45, { office: 0.10, student: 0.22, family: 0.30, tourist: 0.28, senior: 0.10 }),
  wd('週日', '日', 1.35, { office: 0.08, student: 0.15, family: 0.35, tourist: 0.27, senior: 0.15 }),
];

export const EVENTS: GameEvent[] = [
  { id: 'typhoon', name: '颱風天', emoji: '🌀',
    desc: '颱風來襲！泡麵、礦泉水、麵包等民生物資被掃空，但出門的人變少了。',
    trafficMul: 0.7, categoryMul: { drink: 1.4, food: 1.5, snack: 1.5, daily: 1.6 } },
  { id: 'heatwave', name: '熱浪來襲', emoji: '☀️',
    desc: '高溫 38 度！飲料需求爆發，街上人潮也變多。',
    trafficMul: 1.1, categoryMul: { drink: 1.9, snack: 1.2 },
    segmentBias: { tourist: 1.3, student: 1.2 } },
  { id: 'coldsnap', name: '寒流', emoji: '❄️',
    desc: '強烈冷氣團！熱咖啡、泡麵、熱食賣翻天。',
    trafficMul: 1.0, categoryMul: { drink: 1.5, food: 1.4, snack: 1.5 } },
  { id: 'payday', name: '發薪日', emoji: '💰',
    desc: '發薪日到！大家出手闊綽，便當、香菸、飲料都旺。',
    trafficMul: 1.15, categoryMul: { food: 1.4, tobacco: 1.6, drink: 1.2 },
    segmentBias: { office: 1.4 } },
  { id: 'concert', name: '附近演唱會', emoji: '🎤',
    desc: '附近開演唱會，年輕人與觀光客湧入，飲料零食狂銷！',
    trafficMul: 1.6, categoryMul: { drink: 1.6, snack: 1.7 },
    segmentBias: { student: 1.7, tourist: 1.5, office: 0.6, family: 0.5, senior: 0.4 } },
  { id: 'rival', name: '對手開幕', emoji: '🏪',
    desc: '隔壁新開一家便利商店搶客，來客驟減——降價或靠口碑撐住！',
    trafficMul: 0.72, categoryMul: {} },
  { id: 'festival', name: '社區廟會', emoji: '🎏',
    desc: '社區辦廟會活動，家庭與觀光客變多，飲料零食鮮食都熱賣。',
    trafficMul: 1.35, categoryMul: { drink: 1.4, snack: 1.5, food: 1.2 },
    segmentBias: { family: 1.4, tourist: 1.4 } },
];

// 商品聯動（套餐加成）：買了 anchors 任一項，targets 的購買機率 ×mult
export const COMBO_TRIGGER_RATE = 0.35; // 估算「有買觸發品」的比例（給建議補貨預估用）
export const COMBOS: Combo[] = [
  { id: 'meal-drink',   name: '正餐配飲料',   emoji: '🍱', anchors: ['bento', 'riceball', 'hotdog'], targets: ['water', 'tea', 'coffee'], mult: 1.4, hint: '吃便當/飯糰/熱狗 → 想配飲料' },
  { id: 'noodle-egg',   name: '泡麵加蛋',     emoji: '🍜', anchors: ['noodle'], targets: ['teaegg'], mult: 2.0, hint: '買泡麵 → 加顆茶葉蛋' },
  { id: 'oden-platter', name: '關東煮拼盤',   emoji: '🍢', anchors: ['radish', 'fishcake', 'corn', 'riceblood'], targets: ['radish', 'fishcake', 'corn', 'riceblood'], mult: 1.6, hint: '夾一樣關東煮 → 想多夾幾樣' },
  { id: 'snack-drink',  name: '追劇零食組',   emoji: '🥔', anchors: ['chips', 'jelly'], targets: ['water', 'tea', 'coffee'], mult: 1.3, hint: '吃零食 → 想配飲料' },
  { id: 'breakfast',    name: '早餐組',       emoji: '☕', anchors: ['coffee'], targets: ['riceball'], mult: 1.5, hint: '買咖啡 → 配個飯糰' },
];
