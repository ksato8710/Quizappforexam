type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle';

export type ToneStep = {
  frequency: number;
  offset: number;
  duration: number;
  waveform: Waveform;
  glide?: number;
  peakGain?: number;
};

export type SoundEffectPreset = {
  id: string;
  label: string;
  tones: ToneStep[];
};

export const SOUND_EFFECT_PRESETS: SoundEffectPreset[] = [
  // SFX 01 - シンプル2音チャイム (C5 → E5)
  {
    id: 'simple-chime',
    label: 'シンプルチャイム',
    tones: [
      { frequency: 523, offset: 0, duration: 0.2, waveform: 'sine', peakGain: 0.35 },
      { frequency: 659, offset: 0.15, duration: 0.25, waveform: 'sine', peakGain: 0.35 },
    ],
  },
  // SFX 02 - 3音の素早いアルペジオ (C5 → E5 → G5)
  {
    id: 'quick-arpeggio',
    label: 'クイックアルペジオ',
    tones: [
      { frequency: 523, offset: 0, duration: 0.12, waveform: 'square', peakGain: 0.3 },
      { frequency: 659, offset: 0.08, duration: 0.12, waveform: 'square', peakGain: 0.3 },
      { frequency: 784, offset: 0.16, duration: 0.18, waveform: 'square', peakGain: 0.3 },
    ],
  },
  // SFX 03 - 3音＋小さなきらめき (E5 → G5 → A5 + キラッ)
  {
    id: 'sparkle-bells',
    label: 'きらめきベル',
    tones: [
      { frequency: 659, offset: 0, duration: 0.14, waveform: 'sine', peakGain: 0.35 },
      { frequency: 784, offset: 0.1, duration: 0.14, waveform: 'sine', peakGain: 0.35 },
      { frequency: 880, offset: 0.2, duration: 0.16, waveform: 'triangle', peakGain: 0.35 },
      { frequency: 1760, offset: 0.3, duration: 0.08, waveform: 'sine', peakGain: 0.15 },
    ],
  },
  // SFX 04 - 上昇してから少し降りる「スマイル型」(G4 → C5 → A4)
  {
    id: 'smile-marimba',
    label: 'スマイルマリンバ',
    tones: [
      { frequency: 392, offset: 0, duration: 0.16, waveform: 'triangle', peakGain: 0.35 },
      { frequency: 523, offset: 0.12, duration: 0.18, waveform: 'triangle', peakGain: 0.38 },
      { frequency: 440, offset: 0.26, duration: 0.2, waveform: 'triangle', peakGain: 0.35 },
    ],
  },
  // SFX 05 - 高めで軽いピン音 (A5 → C6 → E6)
  {
    id: 'bright-ping',
    label: 'ブライトピン',
    tones: [
      { frequency: 880, offset: 0, duration: 0.12, waveform: 'sine', peakGain: 0.32 },
      { frequency: 1047, offset: 0.08, duration: 0.12, waveform: 'square', peakGain: 0.28 },
      { frequency: 1319, offset: 0.16, duration: 0.14, waveform: 'sine', peakGain: 0.32 },
    ],
  },
  // SFX 06 - 4音のクイックラン (C5 → D5 → E5 → G5)
  {
    id: 'quick-run',
    label: 'クイックラン',
    tones: [
      { frequency: 523, offset: 0, duration: 0.1, waveform: 'triangle', peakGain: 0.3 },
      { frequency: 587, offset: 0.07, duration: 0.1, waveform: 'triangle', peakGain: 0.3 },
      { frequency: 659, offset: 0.14, duration: 0.1, waveform: 'triangle', peakGain: 0.3 },
      { frequency: 784, offset: 0.21, duration: 0.2, waveform: 'triangle', peakGain: 0.38 },
    ],
  },
  // SFX 07 - 少し低めの「どっしり正解」(C4 → G4 with chord)
  {
    id: 'solid-correct',
    label: 'どっしり正解',
    tones: [
      { frequency: 262, offset: 0, duration: 0.08, waveform: 'square', peakGain: 0.2 },
      { frequency: 330, offset: 0, duration: 0.08, waveform: 'square', peakGain: 0.18 },
      { frequency: 262, offset: 0.06, duration: 0.22, waveform: 'square', peakGain: 0.32 },
      { frequency: 392, offset: 0.2, duration: 0.25, waveform: 'square', peakGain: 0.35 },
    ],
  },
  // SFX 08 - きらめくチャイム (E5 → G5 → C6 with octave layer)
  {
    id: 'shimmer-chime',
    label: 'きらめきチャイム',
    tones: [
      { frequency: 659, offset: 0, duration: 0.15, waveform: 'sine', peakGain: 0.35 },
      { frequency: 1318, offset: 0, duration: 0.15, waveform: 'sine', peakGain: 0.15 },
      { frequency: 784, offset: 0.11, duration: 0.16, waveform: 'sine', peakGain: 0.35 },
      { frequency: 1568, offset: 0.11, duration: 0.16, waveform: 'sine', peakGain: 0.15 },
      { frequency: 1047, offset: 0.23, duration: 0.2, waveform: 'sine', peakGain: 0.38 },
      { frequency: 2094, offset: 0.23, duration: 0.2, waveform: 'sine', peakGain: 0.12 },
    ],
  },
  // SFX 09 - コイン獲得風の正解音 (C5 → C6 with pitch bend)
  {
    id: 'coin-get',
    label: 'コインゲット',
    tones: [
      { frequency: 523, offset: 0, duration: 0.14, waveform: 'square', peakGain: 0.35 },
      { frequency: 1047, offset: 0.1, duration: 0.22, waveform: 'square', glide: 1.08, peakGain: 0.38 },
    ],
  },
  // SFX 10 - やさしいソフトバージョン (D5 → E5 → G5)
  {
    id: 'soft-gentle',
    label: 'ソフトジェントル',
    tones: [
      { frequency: 587, offset: 0, duration: 0.18, waveform: 'sine', peakGain: 0.25 },
      { frequency: 659, offset: 0.14, duration: 0.18, waveform: 'sine', peakGain: 0.25 },
      { frequency: 784, offset: 0.28, duration: 0.22, waveform: 'sine', peakGain: 0.28 },
    ],
  },
  // ⭐ Duolingo風効果音シリーズ (専用関数で実装)
  {
    id: 'duolingo-base',
    label: 'Duolingoベース',
    tones: [], // 専用関数で実装
  },
  {
    id: 'duolingo-variant1',
    label: 'Duolingo高音',
    tones: [], // 専用関数で実装
  },
  {
    id: 'duolingo-variant2',
    label: 'Duolingoレベルアップ',
    tones: [], // 専用関数で実装
  },
  {
    id: 'duolingo-variant3',
    label: 'Duolingoシンプル',
    tones: [], // 専用関数で実装
  },
  {
    id: 'duolingo-variant4',
    label: 'Duolingoスマイル',
    tones: [], // 専用関数で実装
  },
];

export const DEFAULT_SOUND_EFFECT_ID = SOUND_EFFECT_PRESETS[0].id;
