import Phaser from 'phaser';
import './style.css';
import { createInitialState } from './game/state';
import { restock, simulateDay, suggestRestockAll } from './game/engine';
import { createPanel } from './ui/panel';
import { StoreScene } from './scene/StoreScene';
import { isNewRecord } from './game/leaderboard';
import { clearSave, loadGame, saveGame } from './game/save';
import * as sfx from './audio/sfx';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="shell">
    <div id="store-canvas" class="store-canvas"></div>
    <div id="panel-root"></div>
  </div>
`;

let state = loadGame() ?? createInitialState();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'store-canvas',
  width: 720,
  height: 280,
  pixelArt: true,
  backgroundColor: '#bfe3c6',
  scene: [StoreScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
});

function getScene(): StoreScene | null {
  return (game.scene.getScene('StoreScene') as StoreScene) ?? null;
}

function syncScene(): void {
  const sc = getScene();
  sc?.setAmbience(state.todayEvent);
  sc?.updateShelves(state.products);
}

/** 已命名且進行中才存檔；未命名或已結束則清檔（下次開啟＝全新一局）。 */
function persist(): void {
  if (state.status === 'playing' && state.storeName) saveGame(state);
  else clearSave();
}

const panelRoot = document.querySelector<HTMLDivElement>('#panel-root')!;

const panel = createPanel(panelRoot, () => state, {
  onSetStoreName(name) {
    state.storeName = name;
    refresh();
  },
  onSetMarketing(id) {
    if (state.status !== 'playing') return;
    state.todayMarketing = id;
    refresh();
  },
  onSetPrice(id, price) {
    const p = state.products.find((x) => x.id === id);
    if (p) p.salePrice = Math.max(0, Math.round(price));
    refreshLight();
  },
  onRestock(id, qty) {
    if (state.status !== 'playing') return;
    const res = restock(state, id, qty);
    if (!res.ok && res.reason) panel.flash(res.reason);
    refreshLight();
  },
  onSuggestAll() {
    if (state.status !== 'playing') return;
    suggestRestockAll(state);
    refreshLight();
  },
  onSimulate() {
    if (state.status !== 'playing') return;
    const report = simulateDay(state);
    let record = false;
    if ((state.status as string) === 'won') {
      record = isNewRecord(state.day, state.cash);
      panel.setWinRecord(record);
    }
    refresh();
    getScene()?.playDay(report); // 顧客進場動畫
    panel.floatDelta(report.netChange);
    sfx.day();
    if ((state.status as string) === 'won') {
      if (record) sfx.record();
      else sfx.win();
    }
  },
  onRestart() {
    const name = state.storeName; // 再玩一次保留店名
    state = createInitialState();
    state.storeName = name;
    refresh();
  },
  onResumeContinue() {
    panel.setResume(null);
    refresh();
  },
  onNewGame() {
    clearSave();
    state = createInitialState(); // storeName 空 → 重新命名
    panel.setResume(null);
    refresh();
  },
});

function refresh(): void {
  persist();
  panel.render();
  syncScene();
}

/** 改價／進貨：只輕量更新表格與數字，不整頁重繪。 */
function refreshLight(): void {
  persist();
  panel.patchLight();
  syncScene();
}

// 啟動：若有進行中的存檔（已命名且玩過至少一天），先問要不要繼續
if (state.status === 'playing' && state.storeName && state.history.length > 0) {
  panel.setResume({ storeName: state.storeName, day: state.day, cash: state.cash });
}

refresh();
game.events.once('ready', syncScene);
