import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { QuizList } from './QuizList'

vi.mock('@/utils/api-client', () => {
  const quizzes = [
    { id: 'q1', question: '江戸幕府を開いた将軍は？', answer: '徳川家康', explanation: '関ヶ原の戦いの後、1603年に征夷大将軍に任命。', type: 'text', subject: '社会', unit: '江戸時代', difficulty: 2 },
    { id: 'q2', question: '参勤交代の目的は？', answer: '大名統制', explanation: '', type: 'text', subject: '社会', unit: '江戸時代', difficulty: 3 },
  ]
  const history = [
    { quizId: 'q1', isCorrect: true },
    { quizId: 'q1', isCorrect: false },
    { quizId: 'q2', isCorrect: true },
  ]
  return {
    apiClient: {
      getQuizzes: vi.fn().mockResolvedValue({ quizzes }),
      getHistory: vi.fn().mockResolvedValue({ history }),
    },
  }
})

describe('QuizList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('一覧にクイズと指標（過去回答数・正答率）を表示する', async () => {
    render(<QuizList onBack={() => {}} />)

    // クイズ内容の一部と列が表示される
    expect(await screen.findByText('江戸幕府を開いた将軍は？')).toBeInTheDocument()
    expect(screen.getByText('参勤交代の目的は？')).toBeInTheDocument()

    // 過去回答数/正答率の集計（q1: 2回/50%、q2: 1回/100%）
    const rows = screen.getAllByRole('row').slice(1) // skip header row
    const row1 = rows.find(r => within(r).queryByText(/江戸幕府/))!
    expect(within(row1).getByText('2')).toBeInTheDocument()
    expect(within(row1).getByText('50%')).toBeInTheDocument()

    const row2 = rows.find(r => within(r).queryByText(/参勤交代/))!
    expect(within(row2).getByText('1')).toBeInTheDocument()
    expect(within(row2).getByText('100%')).toBeInTheDocument()
  })

  it('行クリックで詳細画面を表示する', async () => {
    render(<QuizList onBack={() => {}} />)
    const target = await screen.findByText('江戸幕府を開いた将軍は？')
    target.click()

    await waitFor(() => {
      expect(screen.getByText('クイズ詳細')).toBeInTheDocument()
    })
    expect(screen.getByText('問題')).toBeInTheDocument()
    expect(screen.getByText('解答')).toBeInTheDocument()
    expect(screen.getByText('徳川家康')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '一覧へ戻る' })).toBeInTheDocument()
  })
})
