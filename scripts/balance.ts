// 數值平衡：掃較低的固定成本，挑對小朋友更友善的值。
// 執行：npx tsx scripts/balance.ts
import { CONFIG } from '../src/game/config';
import { restock, simulateDay, suggestRestockAll } from '../src/game/engine';
import { createInitialState } from '../src/game/state';

interface Result { won: boolean; day: number; cash: number; bankrupt: boolean; }
function play(strategy: (s: ReturnType<typeof createInitialState>) => void): Result {
  const s = createInitialState();
  s.storeName = 'sim';
  while (s.status === 'playing') { strategy(s); simulateDay(s); }
  return { won: s.status === 'won', day: s.day, cash: s.cash, bankrupt: s.cash < 0 };
}
const smart = () => play((s) => suggestRestockAll(s));
const careless = () => play((s) => { if (Math.random() > 0.25) suggestRestockAll(s); });
const naive40 = () => play((s) => { for (const p of s.products) restock(s, p.id, 40); });

const N = 2000;
function stat(rs: Result[]): string {
  const wins = rs.filter((r) => r.won);
  const wr = (wins.length / rs.length) * 100;
  const wd = wins.map((r) => r.day).sort((a, b) => a - b);
  const avg = wd.length ? wd.reduce((a, b) => a + b, 0) / wd.length : NaN;
  const bk = (rs.filter((r) => r.bankrupt).length / rs.length) * 100;
  return `勝率 ${wr.toFixed(0).padStart(3)}%  平均達標日 ${Number.isNaN(avg) ? '-' : avg.toFixed(0)}  破產 ${bk.toFixed(0)}%`;
}

for (const fixed of [3000, 3500, 4000, 4500, 5500]) {
  Object.assign(CONFIG, { DAILY_FIXED_COST: fixed });
  console.log(`\n=== 固定成本 ${fixed}${fixed === 5500 ? '（目前）' : ''} ===`);
  console.log(`  高手(建議補貨) : ${stat(Array.from({ length: N }, smart))}`);
  console.log(`  粗心(25%忘補)  : ${stat(Array.from({ length: N }, careless))}`);
  console.log(`  亂買(每項40)   : ${stat(Array.from({ length: N }, naive40))}`);
}
