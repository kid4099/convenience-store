// 英雄榜：存於 localStorage，排名以「達成天數少優先，同天比現金高」，只留前 10。

export interface Score {
  name: string;
  day: number;
  cash: number;
}

const KEY = 'cvs_leaderboard_v1';
const MAX = 10;

function rank(a: Score, b: Score): number {
  return a.day - b.day || b.cash - a.cash;
}

export function loadBoard(): Score[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((s) => s && typeof s.name === 'string' && typeof s.day === 'number' && typeof s.cash === 'number')
      .sort(rank)
      .slice(0, MAX);
  } catch {
    return [];
  }
}

/** 這個成績是否打破目前最佳紀錄（榜首）？ */
export function isNewRecord(day: number, cash: number): boolean {
  const board = loadBoard();
  if (!board.length) return true;
  const best = board[0];
  return day < best.day || (day === best.day && cash > best.cash);
}

/** 加入一筆成績，回傳更新後的前 10 名（含剛加入的物件參考，便於高亮）。 */
export function addScore(score: Score): Score[] {
  const board = loadBoard();
  board.push(score);
  board.sort(rank);
  const top = board.slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(top));
  } catch {
    /* localStorage 不可用時略過 */
  }
  return top;
}
