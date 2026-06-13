// 產生分享圖卡 public/og.png（1200×630）。
// 執行：npx tsx scripts/gen-og.ts
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

mkdirSync('public', { recursive: true });

const FONT = "'Microsoft JhengHei','PingFang TC','Noto Sans CJK TC','Microsoft YaHei',sans-serif";
const shelfColors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#b983ff', '#ff9f40'];

// 貨架（含 2 排彩色商品方塊）
function shelf(x: number, y: number): string {
  let s = `<rect x="${x}" y="${y}" width="150" height="118" rx="6" fill="#f6f9f7" stroke="#cdd6cf" stroke-width="2"/>`;
  for (let r = 0; r < 2; r++) {
    const ry = y + 18 + r * 50;
    s += `<rect x="${x + 10}" y="${ry + 30}" width="130" height="5" fill="#dfe6e0"/>`;
    for (let c = 0; c < 3; c++) {
      const col = shelfColors[(r * 3 + c) % shelfColors.length];
      s += `<rect x="${x + 18 + c * 44}" y="${ry}" width="26" height="30" rx="3" fill="${col}"/>`;
    }
  }
  return s;
}

// 像素顧客（小圓＋頭）
function customer(x: number, color: string): string {
  return `<circle cx="${x}" cy="488" r="13" fill="${color}" stroke="#2b2b2b" stroke-width="2"/><circle cx="${x}" cy="466" r="9" fill="#f1c9a5" stroke="#2b2b2b" stroke-width="2"/>`;
}

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#eef6f0"/><stop offset="1" stop-color="#e0ebe4"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="14" fill="#00a14b"/>

  <!-- 左側文字 -->
  <text x="70" y="205" font-family="${FONT}" font-size="98" font-weight="800" fill="#00713a">便利商店</text>
  <text x="70" y="320" font-family="${FONT}" font-size="98" font-weight="800" fill="#00713a">經營模擬</text>
  <text x="74" y="398" font-family="${FONT}" font-size="40" font-weight="700" fill="#1f2a24">經營你的超商，30 天賺到目標！</text>
  <text x="74" y="452" font-family="${FONT}" font-size="31" fill="#5b6a62">像素風經營遊戲 · 手機/電腦都能玩 · 免費</text>

  <!-- 網址膠囊 -->
  <rect x="74" y="520" width="560" height="56" rx="28" fill="#00a14b"/>
  <text x="354" y="557" font-family="${FONT}" font-size="28" font-weight="700" fill="#ffffff" text-anchor="middle">kid4099.github.io/convenience-store</text>

  <!-- 右側像素店面 -->
  <rect x="700" y="120" width="440" height="400" rx="18" fill="#ffffff" stroke="#d8e0db" stroke-width="3"/>
  <rect x="715" y="135" width="410" height="250" fill="#dff3e3"/>
  <rect x="715" y="385" width="410" height="120" fill="#e7e2d6"/>
  <!-- 招牌 -->
  <rect x="830" y="150" width="180" height="48" rx="8" fill="#00a14b" stroke="#00713a" stroke-width="3"/>
  <text x="920" y="183" font-family="monospace" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">OPEN 24H</text>
  <!-- 貨架 -->
  ${shelf(745, 225)}
  ${shelf(915, 225)}
  <!-- 櫃台 + 店員頭 -->
  <rect x="1030" y="420" width="90" height="60" rx="6" fill="#00a14b" stroke="#00713a" stroke-width="2"/>
  <circle cx="1075" cy="415" r="11" fill="#f1c9a5" stroke="#2b2b2b" stroke-width="2"/>
  <!-- 顧客 -->
  ${customer(770, '#4d96ff')}
  ${customer(835, '#ff9f40')}
  ${customer(905, '#b983ff')}
  ${customer(970, '#6bcb77')}
</svg>`;

await sharp(Buffer.from(svg)).png().toFile('public/og.png');
console.log('done → public/og.png');
