// 核心模擬引擎：星期、事件、口碑、任務、聯動、顧客類型、價格彈性、單日結算
import { COMBO_TRIGGER_RATE, COMBOS, CONFIG, EVENTS, MARKETINGS, PRODUCT_TEMPLATES, SEGMENTS, WEEKDAYS } from './config';
import { money } from './format';
import type { DailyMission, DayReport, GameEvent, GameState, Marketing, Product, ProductDayLine, SegmentCount, WeekdayProfile } from './types';

/** 取得當天選定的行銷活動（null = 不做）。 */
export function getMarketing(state: GameState): Marketing | null {
  if (!state.todayMarketing) return null;
  return MARKETINGS.find((m) => m.id === state.todayMarketing) ?? null;
}

/** 由結算數據產生經營提醒（在引擎算一次，存進報告，免每次重繪重算）。 */
function computeTips(
  lines: ProductDayLine[],
  spoilageUnits: number,
  spoilageCost: number,
  netChange: number,
  comboRevenue: number,
  revenue: number,
  comboStats: { name: string; emoji: string; units: number; rev: number }[],
): string[] {
  const tips: string[] = [];

  const stockouts = lines.filter((l) => l.lost >= 5).sort((a, b) => b.lost - a.lost);
  if (stockouts.length) {
    const names = stockouts.slice(0, 3).map((l) => `${l.name}(${l.lost})`).join('、');
    tips.push(`🔴 缺貨流失：${names}，明日加大進貨量。`);
  }

  const spoils = lines.filter((l) => l.spoiled > 0).sort((a, b) => b.spoiled - a.spoiled);
  if (spoils.length) {
    const names = spoils.slice(0, 3).map((l) => `${l.name}(${l.spoiled})`).join('、');
    tips.push(`🟡 生鮮報廢：${names}，共 ${spoilageUnits} 件、損失 ${money(spoilageCost)}，明日減量進貨。`);
  }

  if (netChange < 0) {
    tips.push(`🔴 今日淨虧損 ${money(netChange)}：可能進貨過量或定價偏低。`);
  } else if (netChange >= 4000) {
    tips.push(`🟢 今日淨賺 ${money(netChange)}，節奏良好，維持策略。`);
  }

  if (!tips.length) tips.push('🟢 供需平衡、無明顯缺貨或報廢，表現穩定。');

  // 聯動組合（套餐加成）當日成效概況
  if (revenue > 0) {
    if (comboRevenue > 0) {
      const share = Math.round((comboRevenue / revenue) * 100);
      const top = [...comboStats].sort((a, b) => b.units - a.units)[0];
      tips.push(`🔗 連帶銷售 +${money(comboRevenue)}（佔營收 ${share}%）`);
      if (top && top.units > 0) {
        tips.push(`🏆 最受歡迎套餐：${top.emoji} ${top.name} — 帶動 ${top.units} 件、+${money(top.rev)}`);
      }
    } else {
      tips.push('🔗 今天沒連帶銷售：把飲料、茶葉蛋等「帶動品」備足，便當/泡麵就能帶動加賣。');
    }
  }
  return tips;
}

export function getWeekday(day: number): WeekdayProfile {
  return WEEKDAYS[(day - 1) % WEEKDAYS.length];
}

/** 隨機抽一個事件（含「無事件」機率）。 */
export function rollEvent(): GameEvent | null {
  if (Math.random() < CONFIG.EVENT_CHANCE) return null;
  return EVENTS[Math.floor(Math.random() * EVENTS.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const MISSION_CATS = [
  { key: 'drink', name: '飲料', min: 25, max: 40 },
  { key: 'food', name: '鮮食', min: 14, max: 26 },
  { key: 'snack', name: '零食', min: 12, max: 22 },
];
const MISSION_PRODUCTS = ['water', 'tea', 'coffee', 'riceball', 'bento', 'hotdog'];

/** 隨機產生每日小任務。 */
export function rollMission(): DailyMission {
  const r = Math.random();
  const reward = randInt(8, 15) * 100; // 800–1500
  if (r < 0.34) {
    const c = MISSION_CATS[randInt(0, MISSION_CATS.length - 1)];
    const target = randInt(c.min, c.max);
    return { type: 'category', key: c.key, target, reward, text: `賣出 ${target} 個${c.name}` };
  }
  if (r < 0.6) {
    const target = randInt(120, 170);
    return { type: 'customers', target, reward, text: `服務 ${target} 位客人` };
  }
  if (r < 0.82) {
    const target = randInt(6, 10) * 500; // 3000–5000
    return { type: 'profit', target, reward, text: `今日淨賺達 $${target.toLocaleString('en-US')}` };
  }
  const pid = MISSION_PRODUCTS[randInt(0, MISSION_PRODUCTS.length - 1)];
  const tpl = PRODUCT_TEMPLATES.find((p) => p.id === pid)!;
  const target = randInt(12, 22);
  return { type: 'product', key: pid, target, reward, text: `賣出 ${target} 個${tpl.name}` };
}

/** 口碑 → 來客倍率。 */
function reputationFactor(rep: number): number {
  return CONFIG.REP_FACTOR_MIN + (Math.max(0, Math.min(100, rep)) / 100) * (CONFIG.REP_FACTOR_MAX - CONFIG.REP_FACTOR_MIN);
}

/** 依星期與事件偏移計算當天正規化的客群分佈。 */
function segDistribution(state: GameState): Record<string, number> {
  const weekday = getWeekday(state.day);
  const bias = state.todayEvent?.segmentBias ?? {};
  const mkBias = getMarketing(state)?.segmentBias ?? {};
  const raw: Record<string, number> = {};
  let sum = 0;
  for (const seg of SEGMENTS) {
    const w = (weekday.segmentWeights[seg.id] ?? 0) * (bias[seg.id] ?? 1) * (mkBias[seg.id] ?? 1);
    raw[seg.id] = w;
    sum += w;
  }
  if (sum <= 0) {
    for (const seg of SEGMENTS) raw[seg.id] = 1 / SEGMENTS.length;
    return raw;
  }
  for (const seg of SEGMENTS) raw[seg.id] /= sum;
  return raw;
}

/** 當天的有效基準來客數（含星期、事件與口碑倍率，不含隨機波動）。 */
function effectiveBaseCustomers(state: GameState): number {
  const weekday = getWeekday(state.day);
  return (
    CONFIG.BASE_CUSTOMERS *
    weekday.trafficMul *
    (state.todayEvent?.trafficMul ?? 1) *
    (getMarketing(state)?.trafficMul ?? 1) *
    reputationFactor(state.reputation)
  );
}

/**
 * 價格係數：售價相對建議售價的需求調整。
 * 售價 = 建議售價 → 係數 1；漲價快速衰減、降價溫和提升（上限 FACTOR_CAP）。
 */
export function priceFactor(p: Product): number {
  const ratio = p.salePrice / p.basePrice;
  let factor: number;
  if (ratio <= 1) {
    factor = 1 + (1 - ratio) * CONFIG.ELASTICITY_DOWN;
  } else {
    factor = 1 - (ratio - 1) * CONFIG.ELASTICITY_UP;
  }
  return Math.max(0, Math.min(CONFIG.FACTOR_CAP, factor));
}

/** 商品作為「帶動品」時的預期需求加成（給建議補貨預估聯動需求用）。 */
function comboUpliftFactor(productId: string, comboBonus = 0): number {
  let f = 1;
  for (const c of COMBOS) if (c.targets.includes(productId)) f += COMBO_TRIGGER_RATE * (c.mult - 1 + comboBonus);
  return f;
}

/** 估算當天某商品的預期銷量（已考慮星期、事件、客群、價格、聯動、行銷）。 */
export function expectedDemand(state: GameState, p: Product): number {
  const base = effectiveBaseCustomers(state);
  const dist = segDistribution(state);
  const mk = getMarketing(state);
  let segPref = 0;
  for (const seg of SEGMENTS) {
    segPref += dist[seg.id] * (seg.prefs[p.category] ?? 1);
  }
  const evMul = (state.todayEvent?.categoryMul[p.category] ?? 1) * (mk?.categoryMul?.[p.category] ?? 1);
  return Math.round(
    base * p.demandWeight * segPref * priceFactor(p) * CONFIG.BASKET_SCALE * evMul * comboUpliftFactor(p.id, mk?.comboBonus ?? 0),
  );
}

/** 進貨：扣現金、加庫存。現金不足則拒絕。 */
export function restock(state: GameState, productId: string, qty: number): { ok: boolean; reason?: string } {
  const amount = Math.round(qty);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: '數量需大於 0' };
  const p = state.products.find((x) => x.id === productId);
  if (!p) return { ok: false };
  const cost = amount * p.costPrice;
  if (cost > state.cash) return { ok: false, reason: '現金不足，無法進貨' };
  state.cash -= cost;
  p.stock += amount;
  return { ok: true };
}

/** 一鍵把每項商品補到當天預期需求量，受現金限制。 */
export function suggestRestockAll(state: GameState): void {
  for (const p of state.products) {
    const target = expectedDemand(state, p);
    const need = target - p.stock;
    if (need <= 0) continue;
    const affordable = Math.floor(state.cash / p.costPrice);
    const buy = Math.min(need, affordable);
    if (buy > 0) {
      state.cash -= buy * p.costPrice;
      p.stock += buy;
    }
  }
}

/** 模擬一天營業，回傳當日結算報告，更新狀態、勝負，並抽下一天事件。 */
export function simulateDay(state: GameState): DayReport {
  const weekday = getWeekday(state.day);
  const ev = state.todayEvent;
  const mk = getMarketing(state);
  const dist = segDistribution(state);

  const variance = 1 + (Math.random() * 2 - 1) * CONFIG.CUSTOMER_VARIANCE;
  const customers = Math.max(0, Math.round(effectiveBaseCustomers(state) * variance));

  for (const p of state.products) {
    p.soldToday = 0;
    p.lostSalesToday = 0;
  }
  const factors = state.products.map(priceFactor);

  // 客群抽樣用的累積分佈
  const cum: number[] = [];
  let acc = 0;
  for (const seg of SEGMENTS) {
    acc += dist[seg.id];
    cum.push(acc);
  }
  const segCount: Record<string, number> = {};
  for (const seg of SEGMENTS) segCount[seg.id] = 0;

  const n = state.products.length;
  const idIndex = new Map(state.products.map((p, i) => [p.id, i]));
  const catMul = (cat: Product['category']) => (ev?.categoryMul[cat] ?? 1) * (mk?.categoryMul?.[cat] ?? 1);

  let revenue = 0;
  let lostRevenue = 0;
  let comboRevenue = 0;
  const comboUnits: Record<string, number> = {};
  const comboRev: Record<string, number> = {};
  for (const cmb of COMBOS) {
    comboUnits[cmb.id] = 0;
    comboRev[cmb.id] = 0;
  }
  for (let c = 0; c < customers; c++) {
    const r = Math.random();
    let si = 0;
    while (si < cum.length - 1 && r > cum[si]) si++;
    const seg = SEGMENTS[si];
    segCount[seg.id] += 1;

    const baseProb = (i: number) => {
      const p = state.products[i];
      return p.demandWeight * (seg.prefs[p.category] ?? 1) * factors[i] * CONFIG.BASKET_SCALE * catMul(p.category);
    };

    // 第一輪：基礎購買意願
    const want = new Array<boolean>(n).fill(false);
    const comboBy = new Array<string | null>(n).fill(null);
    for (let i = 0; i < n; i++) {
      if (Math.random() < baseProb(i)) want[i] = true;
    }

    // 第二輪：聯動加成（買了觸發品 → 帶動品多一次購買機會）
    for (const combo of COMBOS) {
      const hasAnchor = combo.anchors.some((id) => {
        const ai = idIndex.get(id);
        return ai !== undefined && want[ai];
      });
      if (!hasAnchor) continue;
      for (const tid of combo.targets) {
        const ti = idIndex.get(tid);
        if (ti === undefined || want[ti]) continue;
        if (Math.random() < baseProb(ti) * (combo.mult - 1 + (mk?.comboBonus ?? 0))) {
          want[ti] = true;
          comboBy[ti] = combo.id;
        }
      }
    }

    // 結帳
    for (let i = 0; i < n; i++) {
      if (!want[i]) continue;
      const p = state.products[i];
      if (p.stock > 0) {
        p.stock -= 1;
        p.soldToday += 1;
        revenue += p.salePrice;
        const by = comboBy[i];
        if (by) {
          comboRevenue += p.salePrice;
          comboUnits[by] += 1;
          comboRev[by] += p.salePrice;
        }
      } else {
        p.lostSalesToday += 1;
        lostRevenue += p.salePrice;
      }
    }
  }

  // 結算現金
  state.cash += revenue;
  state.cash -= CONFIG.DAILY_FIXED_COST;
  const marketingCost = mk?.cost ?? 0;
  state.cash -= marketingCost;

  // 生鮮報廢（逐項記錄）
  const spoiledMap: Record<string, number> = {};
  let spoilageUnits = 0;
  let spoilageCost = 0;
  for (const p of state.products) {
    if (p.perishable && p.stock > 0) {
      spoiledMap[p.id] = p.stock;
      spoilageUnits += p.stock;
      spoilageCost += p.stock * p.costPrice;
      p.stock = 0;
    }
  }

  // 每日任務結算
  const grossProfit = revenue - CONFIG.DAILY_FIXED_COST;
  const mission = state.todayMission;
  let missionDone = false;
  let missionReward = 0;
  if (mission) {
    let val = 0;
    if (mission.type === 'customers') val = customers;
    else if (mission.type === 'profit') val = grossProfit;
    else if (mission.type === 'category')
      val = state.products.filter((p) => p.category === mission.key).reduce((sum, p) => sum + p.soldToday, 0);
    else if (mission.type === 'product') val = state.products.find((p) => p.id === mission.key)?.soldToday ?? 0;
    if (val >= mission.target) {
      missionDone = true;
      missionReward = mission.reward;
      state.cash += missionReward;
    }
  }

  // 口碑更新：服務率（少缺貨）為主，亂漲價扣分、佛心價加分
  const demanded = revenue + lostRevenue;
  const servedRatio = demanded > 0 ? revenue / demanded : 1;
  let repDelta = servedRatio >= 0.95 ? 4 : servedRatio >= 0.85 ? 1 : servedRatio >= 0.7 ? -2 : -5;
  const gouging = state.products.filter((p) => p.salePrice > p.basePrice * 1.4).length;
  if (gouging >= 3) repDelta -= 3;
  else if (gouging >= 1) repDelta -= 1;
  if (state.products.filter((p) => p.salePrice <= p.basePrice).length >= 8) repDelta += 1;
  repDelta += mk?.reputationBonus ?? 0; // 社群發文等行銷加口碑
  const prevRep = state.reputation;
  state.reputation = Math.max(0, Math.min(100, prevRep + repDelta));
  const reputationDelta = state.reputation - prevRep;

  const segments: SegmentCount[] = SEGMENTS.map((s) => ({
    id: s.id,
    name: s.name,
    emoji: s.emoji,
    color: s.color,
    count: segCount[s.id],
  }));

  const lines: ProductDayLine[] = state.products.map((p) => ({
    id: p.id,
    name: p.name,
    sold: p.soldToday,
    lost: p.lostSalesToday,
    spoiled: spoiledMap[p.id] ?? 0,
    revenue: p.soldToday * p.salePrice,
  }));

  const comboStats = COMBOS.map((cmb) => ({
    name: cmb.name,
    emoji: cmb.emoji,
    units: comboUnits[cmb.id],
    rev: comboRev[cmb.id],
  }));

  const report: DayReport = {
    day: state.day,
    weekday: weekday.name,
    eventName: ev?.name ?? null,
    eventEmoji: ev?.emoji ?? null,
    customers,
    revenue,
    fixedCost: CONFIG.DAILY_FIXED_COST,
    spoilageUnits,
    spoilageCost,
    lostRevenue,
    netChange: grossProfit + missionReward - marketingCost,
    cashAfter: state.cash,
    reputationDelta,
    missionText: mission?.text ?? '',
    missionDone,
    missionReward,
    lossRate: revenue > 0 ? (spoilageCost + lostRevenue) / revenue : spoilageCost + lostRevenue > 0 ? 1 : 0,
    tips: computeTips(lines, spoilageUnits, spoilageCost, grossProfit + missionReward - marketingCost, comboRevenue, revenue, comboStats),
    comboRevenue,
    marketingName: mk?.name ?? null,
    marketingCost,
    segments,
    lines,
  };
  state.history.push(report);

  // 勝負判定與推進
  if (state.cash < 0) {
    state.status = 'lost';
  } else if (state.cash >= CONFIG.GOAL_CASH) {
    state.status = 'won';
  } else if (state.day >= CONFIG.TOTAL_DAYS) {
    state.status = 'lost';
  } else {
    state.day += 1;
    state.todayEvent = rollEvent(); // 抽下一天的事件（營業前公告）
    state.todayMission = rollMission(); // 抽下一天的任務
    state.todayMarketing = null; // 新的一天重新選行銷
  }

  return report;
}
