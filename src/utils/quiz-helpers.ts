import type { Quiz } from './api-client'

type QuizFilterConfig = {
  subject?: string
  unit?: string
  difficulty?: number | null
}

export function filterQuizzesByConfig<T extends QuizFilterConfig>(
  quizzes: Quiz[],
  config?: T | null,
): Quiz[] {
  if (!config) {
    return quizzes
  }

  return quizzes.filter((quiz) => {
    if (config.subject && quiz.subject !== config.subject) {
      return false
    }

    if (config.unit && quiz.unit !== config.unit) {
      return false
    }

    if (config.difficulty !== undefined && config.difficulty !== null) {
      return quiz.difficulty === config.difficulty
    }

    return true
  })
}

export function uniqueQuizzesById(quizzes: Quiz[]): Quiz[] {
  const seen = new Set<string>()
  const result: Quiz[] = []
  for (const quiz of quizzes) {
    if (!quiz?.id) {
      continue
    }
    if (seen.has(quiz.id)) {
      continue
    }
    seen.add(quiz.id)
    result.push(quiz)
  }
  return result
}

export function shuffleQuizzes(quizzes: Quiz[]): Quiz[] {
  const shuffled = [...quizzes]
  const randomValues = (() => {
    const cryptoApi = typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined
    if (cryptoApi?.getRandomValues) {
      const arr = new Uint32Array(shuffled.length)
      cryptoApi.getRandomValues(arr)
      return Array.from(arr, (value) => value / 0xffffffff)
    }
    return shuffled.map(() => Math.random())
  })()

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const rand = randomValues[i] ?? Math.random()
    const j = Math.floor(rand * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Ensures the quiz list respects the requested count from the settings screen.
 * The backend may return more quizzes than requested, so we defensively limit here.
 */
export function limitQuizzesByCount(quizzes: Quiz[], count?: number | null): Quiz[] {
  if (count == null || count <= 0) {
    return quizzes
  }

  if (quizzes.length <= count) {
    return quizzes
  }

  return quizzes.slice(0, count)
}
