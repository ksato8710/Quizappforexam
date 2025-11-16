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

function getQuizId(h: any): string | undefined {
  return (h?.quizId as string) ?? (h?.quiz_id as string)
}

function getIsCorrect(h: any): boolean | undefined {
  const v = (h?.isCorrect ?? h?.is_correct)
  return typeof v === 'boolean' ? v : undefined
}

export function QuizList({ onBack }: { onBack: () => void }) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selected, setSelected] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [unitFilter, setUnitFilter] = useState<string>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<'none'|'question'|'subject'|'unit'|'difficulty'|'answers'|'accuracy'|'order'>('none')
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('desc')

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
        setHistory(((items as any[]) || []).filter(Boolean) as HistoryItem[])
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
      if (!h) continue;
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

  const uniqueSubjects = Array.from(new Set(quizzes.map(q => q.subject).filter(Boolean))) as string[]
  const uniqueUnits = Array.from(new Set(quizzes.map(q => q.unit).filter(Boolean))) as string[]
  const uniqueDifficulties = Array.from(new Set(quizzes.map(q => q.difficulty).filter((v): v is number => v != null))).sort((a,b)=>a-b)

  const prepared = quizzes.map((q, index) => {
    const s = statsByQuiz.get(q.id) || { answers: 0, correct: 0 }
    const accuracy = s.answers > 0 ? Math.round((s.correct / s.answers) * 100) : 0
    return { q, s, accuracy, index }
  })

  const filtered = prepared.filter(({ q }) => {
    if (subjectFilter !== 'all' && q.subject !== subjectFilter) return false
    if (unitFilter !== 'all' && q.unit !== unitFilter) return false
    if (difficultyFilter !== 'all' && String(q.difficulty ?? '') !== difficultyFilter) return false
    return true
  })

  const sorted = [...filtered].sort((a,b) => {
    const dir = sortOrder === 'asc' ? 1 : -1
    switch (sortKey) {
      case 'question': return dir * String(a.q.question ?? '').localeCompare(String(b.q.question ?? ''))
      case 'subject': return dir * String(a.q.subject ?? '').localeCompare(String(b.q.subject ?? ''))
      case 'unit': return dir * String(a.q.unit ?? '').localeCompare(String(b.q.unit ?? ''))
      case 'difficulty': return dir * ((a.q.difficulty ?? -1) - (b.q.difficulty ?? -1))
      case 'answers': return dir * ((a.s.answers ?? 0) - (b.s.answers ?? 0))
      case 'accuracy': return dir * (a.accuracy - b.accuracy)
      case 'order': return dir * ((a.q.order ?? Number.MAX_SAFE_INTEGER) - (b.q.order ?? Number.MAX_SAFE_INTEGER))
      case 'none':
      default: return a.index - b.index
    }
  })
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
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <label className="text-sm text-gray-700 flex flex-col">
              <span className="mb-1">教科</span>
              <select aria-label="教科" className="border rounded-md px-2 py-1" value={subjectFilter} onChange={e=>setSubjectFilter(e.target.value)}>
                <option value="all">すべて</option>
                {uniqueSubjects.map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
            </label>
            <label className="text-sm text-gray-700 flex flex-col">
              <span className="mb-1">単元</span>
              <select aria-label="単元" className="border rounded-md px-2 py-1" value={unitFilter} onChange={e=>setUnitFilter(e.target.value)}>
                <option value="all">すべて</option>
                {uniqueUnits.map(u => (<option key={u} value={u}>{u}</option>))}
              </select>
            </label>
            <label className="text-sm text-gray-700 flex flex-col">
              <span className="mb-1">難易度</span>
              <select aria-label="難易度" className="border rounded-md px-2 py-1" value={difficultyFilter} onChange={e=>setDifficultyFilter(e.target.value)}>
                <option value="all">すべて</option>
                {uniqueDifficulties.map(d => (<option key={d} value={String(d)}>Lv.{d}</option>))}
              </select>
            </label>
            <label className="text-sm text-gray-700 flex flex-col">
              <span className="mb-1">並び替え</span>
              <select aria-label="並び替え" className="border rounded-md px-2 py-1" value={sortKey} onChange={e=>setSortKey(e.target.value as any)}>
                <option value="none">なし</option>
                <option value="answers">過去の回答数</option>
                <option value="accuracy">正答率</option>
                <option value="difficulty">難易度</option>
                <option value="subject">教科</option>
                <option value="unit">単元</option>
                <option value="question">クイズ内容</option>
                <option value="order">順序</option>
              </select>
            </label>
            <label className="text-sm text-gray-700 flex flex-col">
              <span className="mb-1">順序</span>
              <select aria-label="順序" className="border rounded-md px-2 py-1" value={sortOrder} onChange={e=>setSortOrder(e.target.value as any)}>
                <option value="desc">降順</option>
                <option value="asc">昇順</option>
              </select>
            </label>
          </div>
          <div className="mt-3">
            <Button variant="outline" onClick={() => { setSubjectFilter('all'); setUnitFilter('all'); setDifficultyFilter('all'); setSortKey('none'); setSortOrder('desc'); }}>クリア</Button>
          </div>
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
              {sorted.map(({ q, s, accuracy }) => {
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
