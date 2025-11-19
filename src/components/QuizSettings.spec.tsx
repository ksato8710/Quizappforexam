import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { QuizSettings, buildQuizConfig } from './QuizSettings';
import { DEFAULT_SOUND_EFFECT_ID } from '../constants/sound-effects';

vi.mock('../utils/api-client', () => ({
  apiClient: {
    getQuizzes: vi.fn().mockResolvedValue({ quizzes: [] }),
    getStats: vi.fn(),
  },
}));

vi.mock('../utils/sound-effects', () => ({
  playSoundEffect: vi.fn(),
}));

describe('buildQuizConfig', () => {
  it('filters optional fields when "all" or "mix" is selected', () => {
    const config = buildQuizConfig({
      subject: 'all',
      unit: 'all',
      count: '10',
      historyFilter: 'all',
      soundEffect: DEFAULT_SOUND_EFFECT_ID,
    });

    expect(config).toEqual({
      subject: undefined,
      unit: undefined,
      difficulty: null,
      count: 10,
      historyFilter: undefined,
      soundEffect: DEFAULT_SOUND_EFFECT_ID,
    });
  });

  it('returns explicit selections as typed quiz config', () => {
    const config = buildQuizConfig({
      subject: '社会',
      unit: '国を閉ざした日本',
      count: '5',
      historyFilter: 'unanswered',
      soundEffect: 'default',
    });

    expect(config).toEqual({
      subject: '社会',
      unit: '国を閉ざした日本',
      difficulty: null,
      count: 5,
      historyFilter: 'unanswered',
      soundEffect: 'default',
    });
  });
});

describe('QuizSettings UI', () => {
  it('allows selecting subject options via button click', async () => {
    render(<QuizSettings onStart={vi.fn()} />);

    const subjectButtons = screen.getAllByRole('button', { name: '社会' });
    fireEvent.click(subjectButtons[0]);

    await waitFor(() => {
      expect(subjectButtons.some((btn) => btn.getAttribute('aria-pressed') === 'true')).toBe(true);
    });
  });

  it('shows default selections for steps after selecting subject', () => {
    render(<QuizSettings onStart={vi.fn()} />);

    const expectSelected = (label: string) => {
      const buttons = screen.getAllByRole('button', { name: label });
      expect(buttons.some((btn) => btn.getAttribute('aria-pressed') === 'true')).toBe(true);
    };

    // 教科選択後に単元/履歴/問題数の初期状態を確認
    const socialButton = screen.getAllByRole('button', { name: '社会' })[0];
    fireEvent.click(socialButton);

    expectSelected('全単元');
    expectSelected('すべての問題');
    expectSelected('10問');
  });
});
