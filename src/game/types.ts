// 資料模型：所有遊戲狀態的型別定義

export type Category = 'drink' | 'food' | 'snack' | 'tobacco' | 'daily';

export interface Product {
  id: string;
  name: string;
  emoji: string;
  category: Category;
  costPrice: number;    // 進價（成本）
  basePrice: number;    // 建議售價（價格彈性的基準）
  salePrice: number;    // 玩家設定的售價
  stock: number;        // 目前庫存
  demandWeight: number; // 需求權重 0–1
  perishable: boolean;  // 生鮮：當日未售出報廢

  // 每日計數器（營業後更新）
  soldToday: number;
  lostSalesToday: number; // 因缺貨流失的銷售
}

/** 顧客類型：不同客群對各品類的偏好倍率不同。 */
export interface Segment {
  id: string;
  name: string;
  emoji: string;
  color: number;   // Phaser 用十六進位色
  cssColor: string; // 圖例用 CSS 色
  prefs: Partial<Record<Category, number>>; // 品類偏好倍率（未列＝1）
}

/** 星期設定：影響來客量與客群組成。 */
export interface WeekdayProfile {
  name: string;  // 週一
  short: string; // 一
  trafficMul: number;
  segmentWeights: Record<string, number>; // 各 segment id 的權重
}

/** 商品聯動（套餐加成）：買了 anchors 任一項，targets 的購買機率 ×mult。 */
export interface Combo {
  id: string;
  name: string;
  emoji: string;
  anchors: string[]; // 觸發品 id
  targets: string[]; // 帶動品 id
  mult: number;
  hint: string; // 小朋友懂的說法
}

/** 每日小任務：達成給現金獎勵。 */
export interface DailyMission {
  type: 'category' | 'customers' | 'profit' | 'product';
  key?: string; // 品類或商品 id
  target: number;
  reward: number;
  text: string;
}

/** 特殊事件：營業前公告，改變來客量與品類需求。 */
export interface GameEvent {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  trafficMul: number;
  categoryMul: Partial<Record<Category, number>>;
  segmentBias?: Partial<Record<string, number>>; // 客群組成偏移
}

export interface ProductDayLine {
  id: string;
  name: string;
  sold: number;
  lost: number;
  spoiled: number;
  revenue: number;
}

export interface SegmentCount {
  id: string;
  name: string;
  emoji: string;
  color: number;
  count: number;
}

export interface DayReport {
  day: number;
  weekday: string;
  eventName: string | null;
  eventEmoji: string | null;
  customers: number;
  revenue: number;       // 當日營業額
  fixedCost: number;     // 固定成本
  spoilageUnits: number; // 報廢件數
  spoilageCost: number;  // 報廢成本（已於進貨時付出）
  lostRevenue: number;   // 缺貨流失的潛在營收
  netChange: number;     // 當日現金淨變動 = 營業額 − 固定成本 + 任務獎勵
  cashAfter: number;
  reputationDelta: number; // 口碑變化
  missionText: string;     // 當日任務描述
  missionDone: boolean;    // 是否達成
  missionReward: number;   // 任務獎勵
  lossRate: number;        // 損耗率 =(報廢+缺貨流失)/營業額（預算，免重算）
  tips: string[];          // 經營提醒（預算，免重算）
  comboRevenue: number;    // 連帶銷售（聯動帶動的營收）
  segments: SegmentCount[];
  lines: ProductDayLine[];
}

export interface GameState {
  storeName: string;
  reputation: number; // 口碑 0–100
  day: number;
  cash: number;
  products: Product[];
  status: 'playing' | 'won' | 'lost';
  history: DayReport[];
  todayEvent: GameEvent | null;      // 今天（即將營業的這天）的事件
  todayMission: DailyMission | null; // 今天的小任務
}
