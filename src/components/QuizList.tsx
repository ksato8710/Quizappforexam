import { useEffect, useMemo, useState } from 'react'
import { apiClient, Quiz } from '@/utils/api-client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

type HistoryItem = {
  quizId?: string
  quiz_id?: string
  isCorrect?: boolean
  is_correct?: boolean
}

function getQuizId(h: HistoryItem): string | undefined {
  return (h.quizId as string) ?? (h.quiz_id as string)
}

function getIsCorrect(h: HistoryItem): boolean | undefined {
  if (typeof h.isCorrect === 'boolean') return h.isCorrect
  if (typeof h.is_correct === 'boolean') return h.is_correct
  return undefined
}

export function QuizList({ onBack }: { onBack: () => void }) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selected, setSelected] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const [{ quizzes }, hist] = await Promise.all([
          apiClient.getQuizzes(),
          apiClient.getHistory().catch(() => ({ history: [] })),
        ])
        if (!isMounted) return
        setQuizzes(Array.isArray(quizzes) ? quizzes.filter(Boolean) : [])
        const items = Array.isArray((hist as any)?.history) ? (hist as any).history : Array.isArray(hist) ? hist : []
        setHistory(items as HistoryItem[])
      } catch (e) {
        console.error('Failed to load quizzes/history', e)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => { isMounted = false }
  }, [])

  const statsByQuiz = useMemo(() => {
    const map = new Map<string, { answers: number; correct: number }>()
    for (const h of history) {
      const id = getQuizId(h)
      if (!id) continue
      const correct = !!getIsCorrect(h)
      const s = map.get(id) ?? { answers: 0, correct: 0 }
      s.answers += 1
      if (correct) s.correct += 1
      map.set(id, s)
    }
    return map
  }, [history])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-indigo-600">読み込み中...</div>
      </div>
    )
  }

  if (selected) {
    const s = statsByQuiz.get(selected.id)
    const accuracy = s && s.answers > 0 ? Math.round((s.correct / s.answers) * 100) : 0
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-indigo-900">クイズ詳細</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>一覧へ戻る</Button>
              <Button variant="outline" onClick={onBack}>統計へ戻る</Button>
            </div>
          </div>
          <Card className="p-6 space-y-4">
            <div>
              <p className="text-gray-600 mb-1">問題</p>
              <p className="text-indigo-900 whitespace-pre-wrap">{selected.question}</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">解答</p>
              <p className="text-gray-800 whitespace-pre-wrap">{selected.answer}</p>
            </div>
            {selected.explanation && (
              <div>
                <p className="text-gray-600 mb-1">解説</p>
                <p className="text-gray-800 whitespace-pre-wrap">{selected.explanation}</p>
              </div>
            )}
            {selected.type === 'multiple-choice' && selected.choices && (
              <div>
                <p className="text-gray-600 mb-1">選択肢</p>
                <ul className="list-disc list-inside text-gray-800">
                  {selected.choices.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-gray-700">難易度: <span className="text-indigo-700">{selected.difficulty ?? '-'}</span></div>
              <div className="text-gray-700">教科: <span className="text-indigo-700">{selected.subject ?? '-'}</span></div>
              <div className="text-gray-700">単元: <span className="text-indigo-700">{selected.unit ?? '-'}</span></div>
              <div className="text-gray-700">順序: <span className="text-indigo-700">{selected.order ?? '-'}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-gray-700">過去の回答数: <span className="text-indigo-700">{s?.answers ?? 0}</span></div>
              <div className="text-gray-700">正答率: <span className="text-indigo-700">{accuracy}%</span></div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-indigo-900">クイズ一覧</h1>
          <Button variant="outline" onClick={onBack}>統計へ戻る</Button>
        </div>
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">クイズ内容</TableHead>
                <TableHead>教科</TableHead>
                <TableHead>単元</TableHead>
                <TableHead>難易度</TableHead>
                <TableHead>過去の回答数</TableHead>
                <TableHead>正答率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quizzes.map((q) => {
                const s = statsByQuiz.get(q.id)
                const accuracy = s && s.answers > 0 ? Math.round((s.correct / s.answers) * 100) : 0
                return (
                  <TableRow key={q.id} className="cursor-pointer hover:bg-indigo-50" onClick={() => setSelected(q)}>
                    <TableCell>
                      <div className="text-indigo-900 line-clamp-2">{q.question}</div>
                    </TableCell>
                    <TableCell>{q.subject ?? '-'}</TableCell>
                    <TableCell>{q.unit ?? '-'}</TableCell>
                    <TableCell>{q.difficulty != null ? <Badge variant="secondary">Lv.{q.difficulty}</Badge> : '-'}</TableCell>
                    <TableCell>{s?.answers ?? 0}</TableCell>
                    <TableCell>{accuracy}%</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  )
}
