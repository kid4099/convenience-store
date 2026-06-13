import { CONFIG, PRODUCT_TEMPLATES } from './config';
import { rollMission } from './engine';
import type { GameState, Product } from './types';

export function createInitialState(): GameState {
  const products: Product[] = PRODUCT_TEMPLATES.map((t) => ({
    ...t,
    salePrice: t.basePrice,
    stock: 0,
    soldToday: 0,
    lostSalesToday: 0,
  }));

  return {
    storeName: '', // 空字串 → 開場要求玩家命名
    reputation: CONFIG.START_REPUTATION,
    day: 1,
    cash: CONFIG.START_CASH,
    products,
    status: 'playing',
    history: [],
    todayEvent: null, // 第 1 天無事件，給玩家暖身
    todayMission: rollMission(), // 第 1 天就有任務
  };
}
