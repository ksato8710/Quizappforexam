/**
 * Duolingo風の正解効果音
 *
 * すべての関数は既存のAudioContextを受け取り、
 * 明るく軽快な正解音を再生します。
 */

/**
 * 音を鳴らすヘルパー関数
 * @param ctx - AudioContext
 * @param frequency - 周波数 (Hz)
 * @param startTime - 開始時刻 (秒)
 * @param duration - 音の長さ (秒)
 * @param waveType - 波形タイプ
 * @param peakGain - ピークゲイン (0.0-1.0)
 * @param pitchBend - ピッチベンド倍率 (省略可、1.0 = ベンドなし)
 */
function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  waveType: OscillatorType = 'sine',
  peakGain: number = 0.3,
  pitchBend?: number
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = waveType;
  osc.frequency.setValueAtTime(frequency, startTime);

  // ピッチベンドがある場合
  if (pitchBend && pitchBend !== 1.0) {
    osc.frequency.linearRampToValueAtTime(
      frequency * pitchBend,
      startTime + duration * 0.6
    );
  }

  // エンベロープ: 高速アタック → 減衰
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.005); // 5ms attack
  gain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * Duolingo風ベース正解音
 * 3音の上昇アルペジオ (C5 → E5 → G5 のメジャーコード)
 * 三角波＋1オクターブ上のサイン波で柔らかいベル／マレット系
 */
export function playCorrectBase(ctx: AudioContext): void {
  const now = ctx.currentTime;

  // メロディ: Cメジャーコード (C5 - E5 - G5)
  const notes = [
    { freq: 523.25, offset: 0.0, duration: 0.15 },    // C5
    { freq: 659.25, offset: 0.08, duration: 0.16 },   // E5
    { freq: 783.99, offset: 0.16, duration: 0.25 },   // G5 (最後の音を長め)
  ];

  notes.forEach((note, i) => {
    const peakGain = i === notes.length - 1 ? 0.35 : 0.3; // 最後の音は少し大きめ

    // メイン音色: 三角波
    playTone(
      ctx,
      note.freq,
      now + note.offset,
      note.duration,
      'triangle',
      peakGain
    );

    // きらめき: 1オクターブ上のサイン波 (小音量)
    playTone(
      ctx,
      note.freq * 2,
      now + note.offset,
      note.duration * 0.7,
      'sine',
      peakGain * 0.35
    );
  });
}

/**
 * バリエーション1: 高めのキー (Dメジャー)
 * 短・短・長のリズムで最後の音をハッキリさせる
 */
export function playCorrectVariant1(ctx: AudioContext): void {
  const now = ctx.currentTime;

  // メロディ: Dメジャーコード (D5 - F#5 - A5)
  const notes = [
    { freq: 587.33, offset: 0.0, duration: 0.12 },    // D5 (短)
    { freq: 739.99, offset: 0.07, duration: 0.12 },   // F#5 (短)
    { freq: 880.0, offset: 0.14, duration: 0.28 },    // A5 (長)
  ];

  notes.forEach((note, i) => {
    const peakGain = i === notes.length - 1 ? 0.38 : 0.3;

    // 三角波
    playTone(
      ctx,
      note.freq,
      now + note.offset,
      note.duration,
      'triangle',
      peakGain
    );

    // きらめき
    playTone(
      ctx,
      note.freq * 2,
      now + note.offset,
      note.duration * 0.6,
      'sine',
      peakGain * 0.3
    );
  });
}

/**
 * バリエーション2: 4音の階段上昇 (C5 → D5 → E5 → G5)
 * 軽快なレベルアップ感
 */
export function playCorrectVariant2(ctx: AudioContext): void {
  const now = ctx.currentTime;

  // メロディ: Cメジャースケールの階段
  const notes = [
    { freq: 523.25, offset: 0.0, duration: 0.1 },     // C5
    { freq: 587.33, offset: 0.06, duration: 0.1 },    // D5
    { freq: 659.25, offset: 0.12, duration: 0.1 },    // E5
    { freq: 783.99, offset: 0.18, duration: 0.22 },   // G5 (長め)
  ];

  notes.forEach((note, i) => {
    const peakGain = i === notes.length - 1 ? 0.36 : 0.28;

    // サイン波＋三角波ミックス
    playTone(
      ctx,
      note.freq,
      now + note.offset,
      note.duration,
      'sine',
      peakGain
    );

    // ハーモニック強化用の三角波
    playTone(
      ctx,
      note.freq,
      now + note.offset,
      note.duration * 0.8,
      'triangle',
      peakGain * 0.4
    );

    // 高音きらめき
    if (i >= 2) {
      playTone(
        ctx,
        note.freq * 2,
        now + note.offset,
        note.duration * 0.5,
        'sine',
        peakGain * 0.25
      );
    }
  });
}

/**
 * バリエーション3: 2音のシンプル完全5度 (C5 → G5)
 * 2音目にわずかなピッチベンド
 */
export function playCorrectVariant3(ctx: AudioContext): void {
  const now = ctx.currentTime;

  // メロディ: C5 → G5 (完全5度)
  const notes = [
    { freq: 523.25, offset: 0.0, duration: 0.14, bend: 1.0 },     // C5
    { freq: 783.99, offset: 0.1, duration: 0.25, bend: 1.03 },    // G5 (わずかに上にベンド)
  ];

  notes.forEach((note, i) => {
    const peakGain = i === 0 ? 0.32 : 0.36;

    // サイン波
    playTone(
      ctx,
      note.freq,
      now + note.offset,
      note.duration,
      'sine',
      peakGain,
      note.bend
    );

    // きらめき
    playTone(
      ctx,
      note.freq * 2,
      now + note.offset,
      note.duration * 0.65,
      'sine',
      peakGain * 0.3,
      note.bend
    );
  });
}

/**
 * バリエーション4: スマイル型 (G4 → C5 → A4)
 * 上→少し下のマレット系、落ち着いた柔らかさ
 */
export function playCorrectVariant4(ctx: AudioContext): void {
  const now = ctx.currentTime;

  // メロディ: G4 → C5 → A4 (上がって下がる)
  const notes = [
    { freq: 392.0, offset: 0.0, duration: 0.16 },     // G4
    { freq: 523.25, offset: 0.12, duration: 0.18 },   // C5 (ピーク)
    { freq: 440.0, offset: 0.26, duration: 0.22 },    // A4 (着地)
  ];

  notes.forEach((note, i) => {
    const peakGain = i === 1 ? 0.35 : 0.32; // 真ん中の音を少し強調

    // 三角波 (マレット風)
    playTone(
      ctx,
      note.freq,
      now + note.offset,
      note.duration,
      'triangle',
      peakGain
    );

    // やわらかい倍音
    playTone(
      ctx,
      note.freq * 2,
      now + note.offset,
      note.duration * 0.5,
      'sine',
      peakGain * 0.25
    );
  });
}
