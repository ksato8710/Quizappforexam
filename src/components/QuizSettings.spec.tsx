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
  it('allows selecting radio options via label click', async () => {
    render(<QuizSettings onStart={vi.fn()} />);

    const subjectRadio = screen.getAllByLabelText('社会')[0];
    fireEvent.click(subjectRadio);

    await waitFor(() => {
      expect(subjectRadio).toBeChecked();
    });
  });

  it('shows default selections for each radio group', () => {
    render(<QuizSettings onStart={vi.fn()} />);

    expect(screen.getAllByLabelText('全教科')[0]).toHaveAttribute('checked');
    expect(screen.getAllByLabelText('全単元')[0]).toHaveAttribute('checked');
    expect(screen.getAllByLabelText('10問')[0]).toHaveAttribute('checked');
  });
});
