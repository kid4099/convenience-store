// 遊戲存檔：將整個 GameState 序列化到 localStorage（只在進行中存檔）。
import type { GameState } from './types';

const KEY = 'cvs_savegame_v1';
const VERSION = 1;

function isValidState(s: unknown): s is GameState {
  if (!s || typeof s !== 'object') return false;
  const g = s as Record<string, unknown>;
  return (
    typeof g.storeName === 'string' &&
    typeof g.reputation === 'number' &&
    typeof g.day === 'number' &&
    typeof g.cash === 'number' &&
    Array.isArray(g.products) &&
    Array.isArray(g.history) &&
    (g.status === 'playing' || g.status === 'won' || g.status === 'lost')
  );
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, state }));
  } catch {
    /* localStorage 不可用時略過 */
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || o.v !== VERSION) return null;
    return isValidState(o.state) ? o.state : null;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
