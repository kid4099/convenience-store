import Phaser from 'phaser';
import type { DayReport, GameEvent, Product } from '../game/types';
import { buildAllTextures, CUSTOMER_TEX, SHELF_PRODUCTS } from './sprites';

const CHAR_SCALE = 2;
const PROD_SCALE = 2;
const FLOOR_TOP = 196;
const FEET_Y = 262;

// 事件 → 環境光（顏色, 透明度）
const AMBIENCE: Record<string, [number, number]> = {
  typhoon: [0x33415c, 0.3],
  heatwave: [0xffe066, 0.16],
  coldsnap: [0x4dabf7, 0.18],
  payday: [0xffe066, 0.1],
  concert: [0x7048e8, 0.16],
  rival: [0x868e96, 0.12],
  festival: [0xff8787, 0.12],
};

export class StoreScene extends Phaser.Scene {
  private dayText?: Phaser.GameObjects.Text;
  private eventText?: Phaser.GameObjects.Text;
  private ambience?: Phaser.GameObjects.Rectangle;
  private shelfItems: { img: Phaser.GameObjects.Image; pid: string }[] = [];

  constructor() {
    super('StoreScene');
  }

  create() {
    buildAllTextures(this);
    this.shelfItems = [];
    const w = this.scale.width;

    // 牆面與地板
    this.add.rectangle(0, 0, w, FLOOR_TOP, 0xeaf4ec).setOrigin(0, 0);
    const floor = this.add.tileSprite(0, FLOOR_TOP, w, 280 - FLOOR_TOP, 'tile_floor').setOrigin(0, 0);
    floor.tileScaleX = 2;
    floor.tileScaleY = 2;
    this.add.rectangle(0, FLOOR_TOP, w, 4, 0xc4b79a).setOrigin(0, 0);

    // 窗戶
    for (const wx of [180, 470]) {
      this.add.rectangle(wx, 96, 130, 64, 0xbfe3f5).setStrokeStyle(3, 0x9fb9c4);
      this.add.rectangle(wx, 96, 4, 64, 0x9fb9c4);
      this.add.rectangle(wx, 96, 130, 4, 0x9fb9c4);
    }

    // 自動門
    this.add.rectangle(30, 150, 52, 92, 0xcfeaf2).setStrokeStyle(3, 0x88b0bd);
    this.add.rectangle(30, 150, 4, 92, 0x88b0bd);

    // 招牌
    this.add.rectangle(w / 2, 26, 230, 38, 0x00a14b).setStrokeStyle(3, 0x00713a);
    this.add.text(w / 2, 26, 'OPEN ‧ 24H', { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);

    // 貨架（商品圖示記錄到 shelfItems，之後依庫存調整透明度）
    let pi = 0;
    for (const cx of [120, 270, 420]) {
      const top = 116;
      const unitW = 120;
      const unitH = 78;
      this.add.rectangle(cx, top + unitH / 2, unitW, unitH, 0xffffff).setStrokeStyle(2, 0xb9c4bd);
      for (let line = 0; line < 2; line++) {
        const boardY = top + 26 + line * 34;
        this.add.rectangle(cx, boardY + 2, unitW - 8, 4, 0xcdd6cf);
        for (const off of [-36, 0, 36]) {
          const key = SHELF_PRODUCTS[pi % SHELF_PRODUCTS.length];
          pi++;
          const img = this.add.image(cx + off, boardY, key).setOrigin(0.5, 1).setScale(PROD_SCALE);
          this.shelfItems.push({ img, pid: key.replace('prod_', '') });
        }
      }
    }

    // 盆栽
    this.add.image(70, FLOOR_TOP + 4, 'plant').setOrigin(0.5, 1).setScale(CHAR_SCALE);
    this.add.image(560, FLOOR_TOP + 4, 'plant').setOrigin(0.5, 1).setScale(CHAR_SCALE);

    // 兩位店員（先畫，下半身被櫃台擋住、頭與肩膀露出檯面）
    this.add.image(636, 200, 'shopkeeper').setOrigin(0.5, 1).setScale(CHAR_SCALE);
    this.add.image(690, 200, 'shopkeeper').setOrigin(0.5, 1).setScale(CHAR_SCALE).setFlipX(true);
    // 櫃台檯面（後畫，蓋住店員下半身）
    this.add.rectangle(662, 218, 116, 52, 0x00a14b).setStrokeStyle(2, 0x00713a);
    // 收銀機
    this.add.rectangle(626, 200, 26, 14, 0xf1f3f5).setStrokeStyle(1, 0x99a39b);
    this.add.text(662, 228, '櫃台', { fontFamily: 'sans-serif', fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);

    // 環境光（疊在場景之上、文字之下）
    this.ambience = this.add.rectangle(0, 0, w, 280, 0x000000, 1).setOrigin(0, 0).setAlpha(0);

    // 文字
    this.eventText = this.add
      .text(w / 2, 58, '', { fontFamily: 'sans-serif', fontSize: '15px', color: '#c2410c' })
      .setOrigin(0.5);
    this.dayText = this.add
      .text(w / 2, 78, '準備開店…', { fontFamily: 'sans-serif', fontSize: '15px', color: '#00713a' })
      .setOrigin(0.5);
  }

  /** 依事件設定環境光（天氣/氛圍）。 */
  setAmbience(event: GameEvent | null): void {
    if (!this.ambience) return;
    const a = event ? AMBIENCE[event.id] : undefined;
    if (a) {
      this.ambience.setFillStyle(a[0]);
      this.ambience.setAlpha(a[1]);
    } else {
      this.ambience.setAlpha(0);
    }
  }

  /** 貨架商品透明度隨庫存增減（缺貨＝幾乎透明）。 */
  updateShelves(products: Product[]): void {
    for (const it of this.shelfItems) {
      const p = products.find((pp) => pp.id === it.pid);
      const stock = p ? p.stock : 0;
      it.img.setAlpha(stock <= 0 ? 0.15 : 0.45 + 0.55 * Math.min(1, stock / 25));
    }
  }

  /** 營業動畫：顧客走路雙幀、部分到櫃台排隊結帳後離場。 */
  playDay(report: DayReport): void {
    this.dayText?.setText(`${report.weekday}　今日來客 ${report.customers} 人`);
    this.eventText?.setText(report.eventName ? `${report.eventEmoji} ${report.eventName}` : '');

    const w = this.scale.width;
    const n = Math.min(26, Math.max(1, Math.round(report.customers / 6)));
    const total = report.customers || 1;

    const queue: string[] = [];
    for (const seg of report.segments) {
      const share = Math.round((n * seg.count) / total);
      for (let k = 0; k < share; k++) queue.push(seg.id);
    }
    if (queue.length === 0 && report.segments.length > 0) {
      const top = [...report.segments].sort((a, b) => b.count - a.count)[0];
      queue.push(top.id);
    }

    let laneIndex = 0;
    queue.forEach((segId, i) => {
      this.time.delayedCall(i * 95, () => {
        const neutral = CUSTOMER_TEX(segId);
        const walk = `${neutral}_walk`;
        const spr = this.add.image(0, 0, neutral).setOrigin(0.5, 1).setScale(CHAR_SCALE);
        const cont = this.add.container(-20, FEET_Y, [spr]);

        // 走路雙幀切換
        let frame = false;
        const walkEv = this.time.addEvent({
          delay: 150,
          loop: true,
          callback: () => {
            frame = !frame;
            spr.setTexture(frame ? walk : neutral);
          },
        });

        const checkout = i % 4 === 3;
        const stopX = checkout ? 575 - (laneIndex++ % 5) * 18 : 90 + Math.random() * 430;
        const stayDur = checkout ? 900 : 480;

        this.tweens.chain({
          targets: cont,
          tweens: [
            { x: stopX, duration: 750, ease: 'Sine.easeOut' },
            {
              x: stopX,
              duration: stayDur,
              onStart: () => {
                walkEv.paused = true;
                spr.setTexture(neutral);
              },
              onComplete: () => {
                walkEv.paused = false;
              },
            },
            { x: w + 24, duration: 750, ease: 'Sine.easeIn' },
          ],
          onComplete: () => {
            walkEv.remove();
            cont.destroy();
          },
        });
      });
    });
  }
}
