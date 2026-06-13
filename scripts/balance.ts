// 數值平衡（含商品聯動後）：測現行設定 + 微調掃描。
// 執行：npx tsx scripts/balance.ts
import { CONFIG } from '../src/game/config';
import { restock, simulateDay, suggestRestockAll } from '../src/game/engine';
import { createInitialState } from '../src/game/state';

interface Result { won: boolean; day: number; cash: number; bankrupt: boolean; combo: number; rev: number; }

function play(strategy: (s: ReturnType<typeof createInitialState>) => void): Result {
  const s = createInitialState();
  s.storeName = 'sim';
  while (s.status === 'playing') {
    strategy(s);
    simulateDay(s);
  }
  const combo = s.history.reduce((a, h) => a + h.comboRevenue, 0);
  const rev = s.history.reduce((a, h) => a + h.revenue, 0);
  return { won: s.status === 'won', day: s.day, cash: s.cash, bankrupt: s.cash < 0, combo, rev };
}
const smart = () => play((s) => suggestRestockAll(s));
const careless = () => play((s) => { if (Math.random() > 0.25) suggestRestockAll(s); });
const naive40 = () => play((s) => { for (const p of s.products) restock(s, p.id, 40); });

const N = 1500;
function stat(rs: Result[]): string {
  const wins = rs.filter((r) => r.won);
  const wr = (wins.length / rs.length) * 100;
  const wd = wins.map((r) => r.day).sort((a, b) => a - b);
  const avg = wd.length ? wd.reduce((a, b) => a + b, 0) / wd.length : NaN;
  const bk = (rs.filter((r) => r.bankrupt).length / rs.length) * 100;
  const comboShare = (rs.reduce((a, r) => a + r.combo, 0) / Math.max(1, rs.reduce((a, r) => a + r.rev, 0))) * 100;
  return `勝率 ${wr.toFixed(0).padStart(3)}%  達標日 ${Number.isNaN(avg) ? '-' : avg.toFixed(0)}  破產 ${bk.toFixed(0)}%  連帶占營收 ${comboShare.toFixed(0)}%`;
}

const SWEEP = [
  { name: '現行 (FIXED4500 GOAL150 START45)', o: {} },
  { name: 'FIXED5000', o: { DAILY_FIXED_COST: 5000 } },
  { name: 'FIXED5500', o: { DAILY_FIXED_COST: 5500 } },
  { name: 'FIXED5500 GOAL160', o: { DAILY_FIXED_COST: 5500, GOAL_CASH: 160000 } },
];
const DEF = { DAILY_FIXED_COST: CONFIG.DAILY_FIXED_COST, GOAL_CASH: CONFIG.GOAL_CASH };

for (const c of SWEEP) {
  Object.assign(CONFIG, DEF, c.o);
  console.log(`\n=== ${c.name} ===`);
  console.log(`  高手        : ${stat(Array.from({ length: N }, smart))}`);
  console.log(`  粗心(25%忘) : ${stat(Array.from({ length: N }, careless))}`);
  console.log(`  亂買(40)    : ${stat(Array.from({ length: N }, naive40))}`);
}
