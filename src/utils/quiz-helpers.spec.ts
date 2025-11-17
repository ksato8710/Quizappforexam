import { describe, expect, it } from 'vitest'
import type { Quiz } from './api-client'
import { limitQuizzesByCount } from './quiz-helpers'

const createQuiz = (id: number): Quiz => ({
  id: `quiz:${id}`,
  question: `Question ${id}`,
  answer: 'Answer',
  explanation: 'Explanation',
  type: 'text',
})

describe('limitQuizzesByCount', () => {
  it('returns original list when count is undefined', () => {
    const source = [createQuiz(1), createQuiz(2)]
    expect(limitQuizzesByCount(source)).toEqual(source)
  })

  it('returns original list when count is null', () => {
    const source = [createQuiz(1), createQuiz(2)]
    expect(limitQuizzesByCount(source, null)).toEqual(source)
  })

  it('returns original list when count exceeds available quizzes', () => {
    const source = [createQuiz(1), createQuiz(2)]
    expect(limitQuizzesByCount(source, 5)).toEqual(source)
  })

  it('limits the number of quizzes to the specified count', () => {
    const source = [createQuiz(1), createQuiz(2), createQuiz(3)]
    const result = limitQuizzesByCount(source, 2)

    expect(result).toHaveLength(2)
    expect(result).toEqual([source[0], source[1]])
  })
})
