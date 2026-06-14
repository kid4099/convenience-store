// 平衡檢查：行銷活動對難度的影響。
// 執行：npx tsx scripts/balance.ts
import { simulateDay, suggestRestockAll } from '../src/game/engine';
import { createInitialState } from '../src/game/state';

interface Result { won: boolean; day: number; cash: number; }
function playMk(id: string | null): Result {
  const s = createInitialState();
  s.storeName = 'sim';
  while (s.status === 'playing') {
    s.todayMarketing = id; // 高手：每天都做同一種行銷，並依此補貨
    suggestRestockAll(s);
    simulateDay(s);
  }
  return { won: s.status === 'won', day: s.day, cash: s.cash };
}

const N = 2000;
function stat(rs: Result[]): string {
  const wins = rs.filter((r) => r.won);
  const wr = (wins.length / rs.length) * 100;
  const wd = wins.map((r) => r.day).sort((a, b) => a - b);
  const avg = wd.length ? wd.reduce((a, b) => a + b, 0) / wd.length : NaN;
  const avgCash = Math.round(rs.reduce((a, r) => a + r.cash, 0) / rs.length);
  return `勝率 ${wr.toFixed(0).padStart(3)}%  平均達標日 ${Number.isNaN(avg) ? '-' : avg.toFixed(1)}  平均結束現金 ${avgCash.toLocaleString('en-US')}`;
}

for (const [label, id] of [
  ['不做行銷    ', null],
  ['每天發傳單  ', 'flyer'],
  ['每天試吃    ', 'sampling'],
  ['每天社群發文', 'social'],
  ['每天買就送  ', 'gift'],
] as [string, string | null][]) {
  console.log(`${label}: ${stat(Array.from({ length: N }, () => playMk(id)))}`);
}
