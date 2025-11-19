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

    const subjectButton = screen.getByRole('button', { name: '社会' });
    fireEvent.click(subjectButton);

    await waitFor(() => {
      expect(subjectButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('shows default selections for each step', () => {
    render(<QuizSettings onStart={vi.fn()} />);

    const expectSelected = (label: string) => {
      const buttons = screen.getAllByRole('button', { name: label });
      expect(buttons.some((btn) => btn.getAttribute('aria-pressed') === 'true')).toBe(true);
    };

    expectSelected('全教科');
    expectSelected('全単元');
    expectSelected('すべての問題');
    expectSelected('10問');
  });
});
