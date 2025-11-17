import type { Quiz } from './api-client'

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
