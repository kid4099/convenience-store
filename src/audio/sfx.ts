// 用 WebAudio 合成簡單音效，免外部音檔。
// AudioContext 在第一次使用者點擊後才建立，符合瀏覽器自動播放政策。

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    }
    return ctx;
  } catch {
    return null;
  }
}

function beep(freq: number, t0: number, dur: number, type: OscillatorType = 'sine', vol = 0.07): void {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(c.destination);
  const t = c.currentTime + t0;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** 營業：開門鈴 + 收銀機聲。 */
export function day(): void {
  beep(1318, 0, 0.12, 'sine', 0.05); // 門鈴叮
  beep(1046, 0.09, 0.16, 'sine', 0.05); // 門鈴咚
  beep(880, 0.3, 0.05, 'square', 0.04); // 收銀
  beep(1175, 0.36, 0.06, 'square', 0.04);
}

/** 達標：上行琶音。 */
export function win(): void {
  [523, 659, 784, 1046].forEach((f, i) => beep(f, i * 0.12, 0.2, 'triangle', 0.07));
}

/** 破最佳紀錄：更盛大的上行音階＋高音閃爍。 */
export function record(): void {
  [523, 587, 659, 784, 880, 1046].forEach((f, i) => beep(f, i * 0.1, 0.24, 'triangle', 0.07));
  beep(1568, 0.62, 0.4, 'triangle', 0.06);
  beep(2093, 0.74, 0.5, 'sine', 0.05);
}
