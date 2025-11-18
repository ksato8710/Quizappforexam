import { describe, expect, it } from 'vitest';
import { buildQuizConfig } from './QuizSettings';

describe('buildQuizConfig', () => {
  it('filters optional fields when "all" or "mix" is selected', () => {
    const config = buildQuizConfig({
      subject: 'all',
      unit: 'all',
      difficulty: 'mix',
      count: '10',
    });

    expect(config).toEqual({
      subject: undefined,
      unit: undefined,
      difficulty: null,
      count: 10,
    });
  });

  it('returns explicit selections as typed quiz config', () => {
    const config = buildQuizConfig({
      subject: '社会',
      unit: '国を閉ざした日本',
      difficulty: '4',
      count: '5',
    });

    expect(config).toEqual({
      subject: '社会',
      unit: '国を閉ざした日本',
      difficulty: 4,
      count: 5,
    });
  });
});
