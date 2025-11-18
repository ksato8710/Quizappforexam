import { describe, expect, it } from 'vitest'
import type { Quiz } from './api-client'
import { filterQuizzesByConfig, limitQuizzesByCount, shuffleQuizzes, uniqueQuizzesById } from './quiz-helpers'

const createQuiz = (id: number, overrides: Partial<Quiz> = {}): Quiz => ({
  id: `quiz:${id}`,
  question: `Question ${id}`,
  answer: 'Answer',
  explanation: 'Explanation',
  type: 'text',
  ...overrides,
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

describe('filterQuizzesByConfig', () => {
  const quizzes: Quiz[] = [
    createQuiz(1, { subject: '社会', unit: '国を閉ざした日本', difficulty: 3 }),
    createQuiz(2, { subject: '社会', unit: '強かな支配の中で生きた人々', difficulty: 2 }),
    createQuiz(3, { subject: '理科', unit: '太陽', difficulty: 4 }),
  ]

  it('returns all quizzes when no config is provided', () => {
    expect(filterQuizzesByConfig(quizzes)).toEqual(quizzes)
  })

  it('filters by subject', () => {
    const result = filterQuizzesByConfig(quizzes, { subject: '理科' })
    expect(result).toEqual([quizzes[2]])
  })

  it('filters by unit', () => {
    const result = filterQuizzesByConfig(quizzes, { unit: '国を閉ざした日本' })
    expect(result).toEqual([quizzes[0]])
  })

  it('filters by difficulty', () => {
    const result = filterQuizzesByConfig(quizzes, { difficulty: 2 })
    expect(result).toEqual([quizzes[1]])
  })

  it('filters by combined criteria', () => {
    const result = filterQuizzesByConfig(quizzes, {
      subject: '社会',
      unit: '国を閉ざした日本',
      difficulty: 3,
    })
    expect(result).toEqual([quizzes[0]])
  })

  it('ignores difficulty when null (mix)', () => {
    const result = filterQuizzesByConfig(quizzes, { difficulty: null, subject: '社会' })
    expect(result).toHaveLength(2)
  })
})

describe('uniqueQuizzesById', () => {
  it('removes quizzes with duplicate ids', () => {
    const duplicated = [
      createQuiz(1),
      createQuiz(2),
      createQuiz(1, { question: 'Duplicate' }),
    ]

    const result = uniqueQuizzesById(duplicated)
    expect(result).toHaveLength(2)
    expect(result.map((quiz) => quiz.id)).toEqual(['quiz:1', 'quiz:2'])
  })
})

describe('shuffleQuizzes', () => {
  it('returns a new array instance with the same items', () => {
    const source = [createQuiz(1), createQuiz(2), createQuiz(3)]
    const shuffled = shuffleQuizzes(source)
    expect(shuffled).toHaveLength(source.length)
    expect(shuffled).not.toBe(source)
    expect(shuffled.sort((a, b) => a.id.localeCompare(b.id))).toEqual(source)
  })
})
