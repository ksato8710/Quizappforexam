import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { QuizList } from './QuizList'

vi.mock('@/utils/api-client', () => {
  const quizzes = [
    { id: 'q1', question: '江戸幕府を開いた将軍は？', answer: '徳川家康', explanation: '', type: 'text', subject: '社会', unit: '江戸時代', difficulty: 2 },
    { id: 'q2', question: '参勤交代の目的は？', answer: '大名統制', explanation: '', type: 'text', subject: '社会', unit: '江戸時代', difficulty: 3 },
    { id: 'q3', question: '電流の単位は？', answer: 'アンペア', explanation: '', type: 'text', subject: '理科', unit: '電気', difficulty: 1 },
  ]
  const history = [
    { quizId: 'q1', isCorrect: true },
    { quizId: 'q1', isCorrect: false }, // 50%
    { quizId: 'q2', isCorrect: true },
    { quizId: 'q2', isCorrect: true },
    { quizId: 'q2', isCorrect: true }, // 100%
    { quizId: 'q3', isCorrect: false }, // 0%
  ]
  return {
    apiClient: {
      getQuizzes: vi.fn().mockResolvedValue({ quizzes }),
      getHistory: vi.fn().mockResolvedValue({ history }),
      getUnits: vi.fn().mockImplementation(({ subject }) => {
        const unitMap: Record<string, string[]> = {
          社会: ['江戸時代'],
          理科: ['電気'],
        }
        return Promise.resolve({
          units: (unitMap[subject] ?? []).map((name) => ({ id: name, subject, name })),
        })
      }),
    },
  }
})

describe('QuizList filters and sorting', () => {
  it('filters by subject and sorts by accuracy', async () => {
    render(<QuizList onBack={() => {}} />)

    // Initially show all three questions
    expect(await screen.findAllByText('江戸幕府を開いた将軍は？')).not.toHaveLength(0)
    expect(screen.getAllByText('参勤交代の目的は？')).not.toHaveLength(0)
    expect(screen.getAllByText('電流の単位は？')).not.toHaveLength(0)

    // Filter subject to 社会
    const subjectSelect = screen.getByLabelText('教科') as HTMLSelectElement
    fireEvent.change(subjectSelect, { target: { value: '社会' } })

    // 理科の行が消える
    expect(screen.queryAllByText('電流の単位は？')).toHaveLength(0)

    // Sort by accuracy desc -> q2 (100%) should be first, then q1 (50%)
    const sortSelect = screen.getByLabelText('並び替え') as HTMLSelectElement
    fireEvent.change(sortSelect, { target: { value: 'accuracy' } })

    // Find rows and assert order
    const rows = screen.getAllByRole('row').slice(1) // skip header
    const firstRow = rows[0]
    expect(within(firstRow).getByText('参勤交代の目的は？')).toBeInTheDocument()
  })
})
