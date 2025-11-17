import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QuizList } from './QuizList'

vi.mock('@/utils/api-client', () => {
  const quizzes = [
    { id: 'q1', question: 'Q1', answer: 'A1', explanation: '', type: 'text' },
  ]
  // Include nulls and malformed entries to simulate production
  const history = [null, undefined, { quizId: 'q1', isCorrect: true }, { foo: 'bar' }]
  return {
    apiClient: {
      getQuizzes: vi.fn().mockResolvedValue({ quizzes }),
      getHistory: vi.fn().mockResolvedValue({ history }),
    },
  }
})

describe('QuizList with null/malformed history entries', () => {
  it('does not crash and renders list', async () => {
    render(<QuizList onBack={() => {}} />)
    expect(await screen.findByText('クイズ一覧')).toBeInTheDocument()
    const occurrences = screen.getAllByText('Q1')
    expect(occurrences.length).toBeGreaterThan(0)
  })
})
