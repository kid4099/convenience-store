import Phaser from 'phaser';

// 像素美術工具：把「字元網格 + 調色盤」轉成 Phaser 貼圖。
// 每個字元 = 1 像素；'.' 或空白 = 透明。

export type Palette = Record<string, string>;

export function createPixelTexture(
  scene: Phaser.Scene,
  key: string,
  rows: string[],
  palette: Palette,
): void {
  if (scene.textures.exists(key)) return;
  const h = rows.length;
  const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  tex.refresh();
}
