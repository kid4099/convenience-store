import { CATEGORY_LABEL, COMBOS, CONFIG, SEGMENTS } from '../game/config';
import { expectedDemand, getWeekday, priceFactor } from '../game/engine';
import { money } from '../game/format';
import { addScore, loadBoard, type Score } from '../game/leaderboard';
import type { DayReport, GameState, Segment } from '../game/types';

export interface PanelCallbacks {
  onSetStoreName(name: string): void;
  onSetPrice(id: string, price: number): void;
  onRestock(id: string, qty: number): void;
  onSuggestAll(): void;
  onSimulate(): void;
  onRestart(): void;        // 遊戲結束後「再玩一次」（保留店名）
  onResumeContinue(): void; // 開場「繼續經營」
  onNewGame(): void;        // 「開新的店 / 重新開始」（清存檔、重新命名）
}

const CONFETTI_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#b983ff'];

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}

/** 損耗率 → 評級（純對應，不做字串重建）。 */
function gradeFromRate(rate: number): { label: string; emoji: string; cls: string } {
  if (rate < 0.08) return { label: '神級經營', emoji: '🏆', cls: 'g-great' };
  if (rate < 0.18) return { label: '優良', emoji: '🟢', cls: 'g-good' };
  if (rate < 0.35) return { label: '普通', emoji: '🟡', cls: 'g-ok' };
  if (rate < 0.55) return { label: '偏差', emoji: '🟠', cls: 'g-warn' };
  return { label: '嚴重失衡', emoji: '🔴', cls: 'g-bad' };
}

function gradeBadge(r: DayReport): string {
  const g = gradeFromRate(r.lossRate);
  return `<span class="grade ${g.cls}">${g.emoji} ${g.label}・損耗 ${Math.round(r.lossRate * 100)}%</span>`;
}

/** 取出某客群最想買的品類（偏好 > 1），最多 3 項。 */
function topWants(seg: Segment): string {
  const entries = Object.entries(seg.prefs)
    .filter(([, v]) => (v ?? 1) > 1)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 3)
    .map(([cat]) => CATEGORY_LABEL[cat] ?? cat);
  return entries.length ? entries.join('、') : '隨機';
}

export function createPanel(root: HTMLElement, getState: () => GameState, cb: PanelCallbacks) {
  let flashMsg = '';
  let flashTimer = 0;
  let lastEventKey = '__init__';

  let board: Score[] = loadBoard();
  let scoreSubmitted = false;
  let mySubmission: Score | null = null;
  let winRecord = false;
  let resumeInfo: { storeName: string; day: number; cash: number } | null = null;

  function setWinRecord(v: boolean) {
    winRecord = v;
  }
  function setResume(info: { storeName: string; day: number; cash: number } | null) {
    resumeInfo = info;
  }

  function goalPct(s: GameState): number {
    return Math.max(0, Math.min(100, (s.cash / CONFIG.GOAL_CASH) * 100));
  }

  function buildStars(rep: number): string {
    const n = Math.max(0, Math.min(5, Math.round(rep / 20)));
    return `<span class="on">${'★'.repeat(n)}</span><span class="off">${'☆'.repeat(5 - n)}</span>`;
  }

  function flash(msg: string) {
    flashMsg = msg;
    window.clearTimeout(flashTimer);
    render();
    flashTimer = window.setTimeout(() => {
      flashMsg = '';
      render();
    }, 2200);
  }

  function floatDelta(amount: number) {
    const cashEl = root.querySelector<HTMLElement>('.stat.cash');
    if (!cashEl) return;
    cashEl.classList.add('pulse');
    const r = cashEl.getBoundingClientRect();
    let layer = document.getElementById('fx-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'fx-layer';
      document.body.appendChild(layer);
    }
    const el = document.createElement('div');
    el.className = `float-delta ${amount >= 0 ? 'pos' : 'neg'}`;
    el.textContent = `${amount >= 0 ? '+' : ''}${money(amount)}`;
    el.style.left = `${r.left + r.width / 2}px`;
    el.style.top = `${r.top}px`;
    layer.appendChild(el);
    window.setTimeout(() => el.remove(), 1300);
  }

  function buildRows(s: GameState): string {
    return s.products
      .map((p) => {
        const exp = expectedDemand(s, p);
        const f = priceFactor(p);
        const fClass = f >= 1.05 ? 'good' : f <= 0.8 ? 'bad' : '';
        return `
          <tr>
            <td class="name">${p.emoji} ${p.name}${p.perishable ? '<span class="tag">生鮮</span>' : ''}</td>
            <td>${money(p.costPrice)}</td>
            <td>
              <input class="price" data-id="${p.id}" type="number" inputmode="numeric" pattern="[0-9]*" min="0" value="${p.salePrice}" />
              <div class="factor ${fClass}">需求 ×${f.toFixed(2)}</div>
            </td>
            <td class="${p.stock === 0 ? 'bad' : ''}">${p.stock}</td>
            <td class="col-exp"><b>${exp}</b></td>
            <td>${p.soldToday}</td>
            <td class="${p.lostSalesToday > 0 ? 'bad' : ''}">${p.lostSalesToday}</td>
            <td class="restock">
              <input class="qty" data-id="${p.id}" type="number" inputmode="numeric" pattern="[0-9]*" min="0" placeholder="數量 ↵" />
            </td>
          </tr>`;
      })
      .join('');
  }

  function renderBoard(): string {
    if (!board.length) return '';
    return `
      <div class="board">
        <h3>🏆 英雄榜 Top 10</h3>
        <div class="board-list">
          ${board
            .map(
              (sc, i) => `
            <div class="board-row ${mySubmission && sc === mySubmission ? 'me' : ''}">
              <span class="b-rank">${i + 1}</span>
              <span class="b-name">${escapeHtml(sc.name)}</span>
              <span class="b-day">第 ${sc.day} 天</span>
              <span class="b-cash">${money(sc.cash)}</span>
            </div>`,
            )
            .join('')}
        </div>
      </div>`;
  }

  function render() {
    const s = getState();
    const last = s.history[s.history.length - 1];
    const weekday = getWeekday(s.day);
    const ev = s.todayEvent;
    const mission = s.todayMission;

    const eventKey = ev?.id ?? 'none';
    const bannerEnter = eventKey !== lastEventKey ? 'enter' : '';
    lastEventKey = eventKey;

    const reportBlock = last
      ? `
        <div class="report card">
          <div class="report-head">
            <h3>第 ${last.day} 天（${last.weekday}）結算 ${last.eventName ? `· ${last.eventEmoji} ${last.eventName}` : ''}</h3>
            ${gradeBadge(last)}
          </div>
          <div class="report-grid">
            <div><span>來客數</span><b>${last.customers}</b></div>
            <div><span>營業額</span><b>${money(last.revenue)}</b></div>
            <div><span>固定成本</span><b>-${money(last.fixedCost)}</b></div>
            <div><span>報廢</span><b>${last.spoilageUnits} 件</b></div>
            <div><span>缺貨流失</span><b>${money(last.lostRevenue)}</b></div>
            <div class="good"><span>連帶銷售</span><b>+${money(last.comboRevenue)}</b></div>
            <div class="${last.reputationDelta >= 0 ? 'good' : 'bad'}">
              <span>口碑變化</span><b>${last.reputationDelta >= 0 ? '+' : ''}${last.reputationDelta} ⭐</b>
            </div>
            <div class="${last.netChange >= 0 ? 'good' : 'bad'}">
              <span>當日淨變動</span><b>${last.netChange >= 0 ? '+' : ''}${money(last.netChange)}</b>
            </div>
          </div>
          ${
            last.missionText
              ? `<div class="mission-result ${last.missionDone ? 'done' : 'fail'}">🎯 任務「${last.missionText}」：${last.missionDone ? `✅ 達成 +${money(last.missionReward)}` : '❌ 未達成'}</div>`
              : ''
          }
          <div class="seg-breakdown">
            ${last.segments
              .map(
                (sg) =>
                  `<span class="seg-chip"><span class="dot" style="background:#${sg.color.toString(16).padStart(6, '0')}"></span>${sg.emoji} ${sg.name} ${sg.count}</span>`,
              )
              .join('')}
          </div>
          <div class="tips">
            <h4>📋 經營提醒</h4>
            <ul>${last.tips.map((t) => `<li>${t}</li>`).join('')}</ul>
          </div>
        </div>`
      : `<div class="report card hint">先看下方今日公告 → 設定售價 → 點「建議補貨」進貨 → 按「營業一天」。<br/>生鮮（飯糰／便當／熱狗／茶葉蛋／關東煮）當日賣不完會報廢，別囤太多。</div>`;

    const banner = `
      <div class="banner card ${ev ? 'has-event' : ''} ${bannerEnter}">
        <div class="banner-day">📅 第 ${s.day} 天 · ${weekday.name}</div>
        ${
          ev
            ? `<div class="banner-event"><b>${ev.emoji} ${ev.name}</b><span>${ev.desc}</span></div>`
            : `<div class="banner-event calm"><span>今日無特殊事件，平穩營業。</span></div>`
        }
        ${mission ? `<div class="mission">🎯 今日任務：${mission.text}　<b>獎勵 ${money(mission.reward)}</b></div>` : ''}
      </div>`;

    const legend = `
      <div class="legend card">
        ${SEGMENTS.map(
          (seg) => `
          <div class="legend-item">
            <span class="dot" style="background:${seg.cssColor}"></span>
            <span class="legend-name">${seg.emoji} ${seg.name}</span>
            <span class="legend-want">想買：${topWants(seg)}</span>
          </div>`,
        ).join('')}
      </div>`;

    const historyBlock =
      s.history.length > 0
        ? `
        <div class="history card">
          <h3>歷史紀錄</h3>
          <div class="history-list">
            ${[...s.history]
              .reverse()
              .map(
                (h) => `
              <div class="hist-item">
                <div class="hist-row">
                  <span class="h-day">第${h.day}天 ${h.weekday}</span>
                  <span class="h-ev">${h.eventName ? `${h.eventEmoji}${h.eventName}` : '—'}</span>
                  <span class="h-cust">👥 ${h.customers}</span>
                  <span class="h-rev">${money(h.revenue)}</span>
                  <span class="h-spoil ${h.spoilageUnits > 0 ? 'bad' : ''}">🗑 ${h.spoilageUnits}</span>
                  <span class="h-net ${h.netChange >= 0 ? 'good' : 'bad'}">${h.netChange >= 0 ? '+' : ''}${money(h.netChange)}</span>
                </div>
                <div class="hist-tips">${gradeBadge(h)}　${h.tips.join('　')}</div>
              </div>`,
              )
              .join('')}
          </div>
        </div>`
        : '';

    const setupOverlay = !s.storeName
      ? `
        <div class="overlay">
          <div class="modal setup">
            <h2>🏪 新店開張</h2>
            <p>幫你的便利商店取個名字吧！</p>
            <div class="name-entry">
              <input id="store-name" maxlength="14" placeholder="例如：俊宇好鄰居" />
              <button class="btn primary" id="btn-start">開始營業</button>
            </div>
          </div>
        </div>`
      : '';

    const resumeOverlay = resumeInfo
      ? `
        <div class="overlay">
          <div class="modal">
            <h2>🏪 歡迎回來</h2>
            <p>要繼續經營「${escapeHtml(resumeInfo.storeName)}」嗎？</p>
            <p class="final">進度：第 <b>${resumeInfo.day}</b> 天 · <b>${money(resumeInfo.cash)}</b></p>
            <button class="btn primary" id="btn-resume">繼續經營</button>
            <button class="btn ghost" id="btn-resume-new">開新的店</button>
          </div>
        </div>`
      : '';

    const confetti =
      s.status === 'won'
        ? `<div class="confetti">${Array.from({ length: 26 })
            .map(
              (_, i) =>
                `<span style="left:${(i * 3.9) % 100}%;background:${CONFETTI_COLORS[i % CONFETTI_COLORS.length]};animation-delay:${(i % 6) * 0.15}s"></span>`,
            )
            .join('')}</div>`
        : '';

    const overlay =
      s.status !== 'playing'
        ? `
        <div class="overlay">
          <div class="modal ${s.status} ${s.status === 'won' && winRecord ? 'record' : ''}">
            ${confetti}
            <h2>${s.status === 'won' ? '🎉 達成目標！' : '💸 經營失敗'}</h2>
            ${s.status === 'won' && winRecord ? '<div class="record-badge">🎊 打破最佳紀錄！</div>' : ''}
            <p>${
              s.status === 'won'
                ? `恭喜！第 ${s.day} 天達到目標 ${money(CONFIG.GOAL_CASH)}。`
                : s.cash < 0
                  ? '現金見底，店倒了。'
                  : `${CONFIG.TOTAL_DAYS} 天到期仍未達標。`
            }</p>
            <p class="final">成績：第 <b>${s.day}</b> 天 · <b>${money(s.cash)}</b></p>
            ${
              s.status === 'won' && !scoreSubmitted
                ? `<div class="name-entry">
                     <input id="player-name" maxlength="12" placeholder="輸入你的名字" />
                     <button class="btn primary" id="btn-submit-score">登錄英雄榜</button>
                   </div>`
                : ''
            }
            ${renderBoard()}
            <button class="btn ghost" id="btn-restart">再玩一次</button>
          </div>
        </div>`
        : '';

    const canRestart = s.storeName && s.status === 'playing' && !resumeInfo;

    root.innerHTML = `
      <header class="topbar card">
        <div class="topline">
          <div class="brand">🏪 ${escapeHtml(s.storeName || '便利商店')}<span class="brand-sub">經營模擬</span></div>
          ${
            s.storeName
              ? `<div class="topactions">
                   <button class="btn-mini-ghost" id="btn-share">🔗 分享</button>
                   ${canRestart ? '<button class="btn-mini-ghost" id="btn-newgame">🔄 重新開始</button>' : ''}
                 </div>`
              : ''
          }
        </div>
        <div class="stats">
          <div class="stat"><span>天數</span><b>${s.day} / ${CONFIG.TOTAL_DAYS}</b></div>
          <div class="stat cash ${s.cash < 0 ? 'neg' : ''}"><span>現金</span><b>${money(s.cash)}</b></div>
          <div class="stat"><span>口碑</span><b class="stars">${buildStars(s.reputation)}</b></div>
          <div class="stat"><span>目標</span><b>${money(CONFIG.GOAL_CASH)}</b></div>
          <div class="stat"><span>每日固定成本</span><b>${money(CONFIG.DAILY_FIXED_COST)}</b></div>
        </div>
        <div class="goalbar"><div class="goalfill" style="width:${goalPct(s)}%"></div></div>
      </header>

      ${reportBlock}
      ${flashMsg ? `<div class="flash">${flashMsg}</div>` : ''}

      <div class="dash">
        <div class="col-main">
          ${banner}
          <div class="actions">
            <button class="btn suggest" id="btn-suggest">🧮 一鍵建議補貨</button>
            <button class="btn primary" id="btn-day" ${s.status !== 'playing' ? 'disabled' : ''}>▶️ 營業一天</button>
          </div>
          <div class="table-wrap card">
            <table class="grid">
              <thead>
                <tr>
                  <th>商品</th><th>進價</th><th>售價</th><th>庫存</th>
                  <th>建議量</th><th>昨日售出</th><th>缺貨</th><th>進貨 ↵</th>
                </tr>
              </thead>
              <tbody>${buildRows(s)}</tbody>
            </table>
          </div>
        </div>
        <div class="col-side">
          ${legend}
          <div class="rep-help card">
            <h3>⭐ 口碑怎麼運作</h3>
            <ul>
              <li>⭐ 口碑越高 → <b>來店人潮越多</b>（0★ 來客 ×0.7、滿星 ×1.3），所有商品都跟著更好賣。</li>
              <li>🟢 想加星：每天<b>少缺貨</b>（東西備夠）＋<b>價格公道</b>（多數商品別超過建議價）。</li>
              <li>🔴 會掉星：<b>常常缺貨</b>，或把售價<b>亂拉高</b>。</li>
            </ul>
          </div>
          <div class="combos card">
            <h3>🔗 聯動組合 <span class="combo-sub">買 A 帶動 B</span></h3>
            <div class="combo-list">
              ${COMBOS.map(
                (c) => `<div class="combo-item"><b>${c.emoji} ${c.name}</b><span>${c.hint}</span></div>`,
              ).join('')}
            </div>
          </div>
          ${historyBlock}
        </div>
      </div>

      ${overlay}
      ${setupOverlay}
      ${resumeOverlay}
    `;

    bindRows();
    bindControls();
  }

  /** 輕量更新：只重畫商品表與頂部數字（改價／進貨用，避免整頁重繪）。 */
  function patchLight() {
    const s = getState();
    const tbody = root.querySelector('table.grid tbody');
    if (!tbody) {
      render();
      return;
    }
    tbody.innerHTML = buildRows(s);
    bindRows();

    const cashStat = root.querySelector<HTMLElement>('.stat.cash');
    const cashB = root.querySelector<HTMLElement>('.stat.cash b');
    if (cashB) cashB.textContent = money(s.cash);
    cashStat?.classList.toggle('neg', s.cash < 0);
    const fill = root.querySelector<HTMLElement>('.goalfill');
    if (fill) fill.style.width = `${goalPct(s)}%`;
  }

  function bindRows() {
    root.querySelectorAll<HTMLInputElement>('input.price').forEach((inp) => {
      inp.addEventListener('change', () => cb.onSetPrice(inp.dataset.id!, Number(inp.value)));
    });
    const qtyInputs = Array.from(root.querySelectorAll<HTMLInputElement>('input.qty'));
    qtyInputs.forEach((inp, idx) => {
      inp.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const v = Number(inp.value || 0);
        if (v > 0) cb.onRestock(inp.dataset.id!, v);
        root.querySelectorAll<HTMLInputElement>('input.qty')[idx + 1]?.focus();
      });
    });
  }

  function bindControls() {
    root.querySelector('#btn-suggest')?.addEventListener('click', () => cb.onSuggestAll());
    root.querySelector('#btn-day')?.addEventListener('click', () => cb.onSimulate());

    const startGame = () => {
      const inp = root.querySelector<HTMLInputElement>('#store-name');
      const name = (inp?.value || '').trim().slice(0, 14) || '我的便利商店';
      cb.onSetStoreName(name);
    };
    root.querySelector('#btn-start')?.addEventListener('click', startGame);
    const storeInput = root.querySelector<HTMLInputElement>('#store-name');
    storeInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') startGame();
    });
    storeInput?.focus();

    // 開場繼續/開新店
    root.querySelector('#btn-resume')?.addEventListener('click', () => cb.onResumeContinue());
    root.querySelector('#btn-resume-new')?.addEventListener('click', () => cb.onNewGame());
    root.querySelector('#btn-newgame')?.addEventListener('click', () => {
      if (window.confirm('確定要放棄目前進度，重新開店嗎？')) cb.onNewGame();
    });

    // 分享：手機開原生分享、電腦複製連結
    root.querySelector('#btn-share')?.addEventListener('click', async () => {
      const url = location.hostname.endsWith('github.io')
        ? location.origin + location.pathname
        : 'https://kid4099.github.io/convenience-store/';
      try {
        if (navigator.share) {
          await navigator.share({ title: '便利商店經營模擬', text: '來玩我的便利商店！', url });
        } else {
          await navigator.clipboard.writeText(url);
          flash('已複製分享連結！貼給朋友吧 📋');
        }
      } catch {
        flash(`分享連結：${url}`);
      }
    });

    // 英雄榜登錄
    const submitScore = () => {
      const nameInp = root.querySelector<HTMLInputElement>('#player-name');
      const name = (nameInp?.value || '').trim().slice(0, 12) || '無名英雄';
      mySubmission = { name, day: getState().day, cash: Math.round(getState().cash) };
      board = addScore(mySubmission);
      scoreSubmitted = true;
      render();
    };
    root.querySelector('#btn-submit-score')?.addEventListener('click', submitScore);
    root.querySelector<HTMLInputElement>('#player-name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitScore();
    });
    root.querySelector<HTMLInputElement>('#player-name')?.focus();

    root.querySelector('#btn-restart')?.addEventListener('click', () => {
      scoreSubmitted = false;
      mySubmission = null;
      winRecord = false;
      board = loadBoard();
      cb.onRestart();
    });
  }

  return { render, patchLight, flash, floatDelta, setWinRecord, setResume };
}
