import { DEFAULT_SOUND_EFFECT_ID, SOUND_EFFECT_PRESETS, type SoundEffectPreset } from '../constants/sound-effects';
import {
  playCorrectBase,
  playCorrectVariant1,
  playCorrectVariant2,
  playCorrectVariant3,
  playCorrectVariant4,
} from './duolingo-sounds';

type SoundEffectMap = Record<string, SoundEffectPreset>;

const SOUND_EFFECT_MAP: SoundEffectMap = SOUND_EFFECT_PRESETS.reduce<SoundEffectMap>((acc, preset) => {
  acc[preset.id] = preset;
  return acc;
}, {});

const getAudioContextConstructor = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.AudioContext || (window as any).webkitAudioContext || null;
};

let sharedAudioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  const AudioCtx = getAudioContextConstructor();
  if (!AudioCtx) {
    return null;
  }

  if (sharedAudioContext?.state === 'closed') {
    sharedAudioContext = null;
  }

  if (!sharedAudioContext) {
    try {
      sharedAudioContext = new AudioCtx();
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      return null;
    }
  }

  return sharedAudioContext;
};

export const playSoundEffect = async (effectId?: string): Promise<void> => {
  let ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  if (ctx.state === 'closed') {
    sharedAudioContext = null;
    ctx = getAudioContext();
    if (!ctx) {
      return;
    }
  }

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (error) {
      console.warn('AudioContext resume failed:', error);
      return;
    }

    if (ctx.state !== 'running') {
      return;
    }
  }

  // Duolingo風効果音の専用関数を呼び出し
  if (effectId === 'duolingo-base') {
    playCorrectBase(ctx);
    return;
  }
  if (effectId === 'duolingo-variant1') {
    playCorrectVariant1(ctx);
    return;
  }
  if (effectId === 'duolingo-variant2') {
    playCorrectVariant2(ctx);
    return;
  }
  if (effectId === 'duolingo-variant3') {
    playCorrectVariant3(ctx);
    return;
  }
  if (effectId === 'duolingo-variant4') {
    playCorrectVariant4(ctx);
    return;
  }

  // 既存の効果音システム
  const preset = SOUND_EFFECT_MAP[effectId ?? ''] ?? SOUND_EFFECT_MAP[DEFAULT_SOUND_EFFECT_ID];
  if (!preset) {
    return;
  }

  const scheduleTone = (
    frequency: number,
    offset: number,
    duration: number,
    type: OscillatorType,
    glide?: number,
    peakGain?: number,
  ) => {
    const startTime = ctx.currentTime + offset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    const glideTarget = (glide ?? 1) * frequency;
    osc.frequency.setValueAtTime(frequency, startTime);
    osc.frequency.exponentialRampToValueAtTime(glideTarget, startTime + duration * 0.6);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peakGain ?? 0.4, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  preset.tones.forEach((tone) => {
    scheduleTone(
      tone.frequency,
      tone.offset,
      tone.duration,
      tone.waveform as OscillatorType,
      tone.glide,
      tone.peakGain,
    );
  });
};

export const getSoundEffectLabel = (effectId?: string): string | undefined => {
  const preset = SOUND_EFFECT_MAP[effectId ?? ''];
  return preset?.label;
};

export const getAvailableSoundEffects = () => SOUND_EFFECT_PRESETS.map((preset) => preset.id);
