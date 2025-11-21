import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { QuizSettings, buildQuizConfig } from './QuizSettings';
import { DEFAULT_SOUND_EFFECT_ID } from '../constants/sound-effects';

const { mockGetUnits } = vi.hoisted(() => ({
  mockGetUnits: vi.fn().mockResolvedValue({
    units: [
      { id: 'unit-all', subject: '社会', name: '全単元' },
      { id: 'unit-1', subject: '社会', name: '国を閉ざした日本' },
    ],
  }),
}));

vi.mock('../utils/api-client', () => ({
  apiClient: {
    getQuizzes: vi.fn().mockResolvedValue({ quizzes: [] }),
    getStats: vi.fn(),
    getUnits: mockGetUnits,
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

  it('loads unit options after selecting a subject', async () => {
    render(<QuizSettings onStart={vi.fn()} />);

    const socialButton = screen.getAllByRole('button', { name: '社会' })[0];
    fireEvent.click(socialButton);

    await waitFor(() => {
      expect(mockGetUnits).toHaveBeenCalledWith({ subject: '社会' });
    });
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '全単元' }).length).toBeGreaterThan(0);
    });
  });
});
