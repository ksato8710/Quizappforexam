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

    const getDifficultyLabel = (diff: number | undefined) => {
      if (diff == null) return '-';
      const labels = {
        2: 'やさしい',
        3: 'ふつう',
        4: 'むずかしい',
        5: 'とてもむずかしい',
      };
      return labels[diff as keyof typeof labels] || `Lv.${diff}`;
    };

    const getDifficultyColor = (diff: number | undefined) => {
      if (diff == null) return 'text-gray-400';
      const colors = {
        2: 'text-green-600',
        3: 'text-blue-600',
        4: 'text-yellow-600',
        5: 'text-red-600',
      };
      return colors[diff as keyof typeof colors] || 'text-gray-600';
    };

    const getAccuracyColor = (acc: number, answers: number) => {
      if (answers === 0) return 'text-gray-400';
      if (acc >= 80) return 'text-green-600';
      if (acc >= 50) return 'text-yellow-600';
      return 'text-red-600';
    };

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
          <Card className="p-8 space-y-6 shadow-lg">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-l-4 border-indigo-500 p-5 rounded-r-lg">
              <p className="text-indigo-900 font-semibold mb-2 text-sm">問題</p>
              <p className="text-gray-900 whitespace-pre-wrap leading-relaxed text-lg">{selected.question}</p>
            </div>
            <div className="bg-green-50 border-l-4 border-green-500 p-5 rounded-r-lg">
              <p className="text-green-900 font-semibold mb-2 text-sm">解答</p>
              <p className="text-gray-900 whitespace-pre-wrap leading-relaxed font-medium">{selected.answer}</p>
            </div>
            {selected.explanation && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-lg">
                <p className="text-blue-900 font-semibold mb-2 text-sm">解説</p>
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{selected.explanation}</p>
              </div>
            )}
            {selected.type === 'multiple-choice' && selected.choices && (
              <div className="bg-purple-50 border-l-4 border-purple-500 p-5 rounded-r-lg">
                <p className="text-purple-900 font-semibold mb-2 text-sm">選択肢</p>
                <ul className="space-y-2">
                  {selected.choices.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="font-semibold text-purple-600 min-w-[1.5rem]">{String.fromCharCode(65 + i)}.</span>
                      <span className="text-gray-800">{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t pt-6 space-y-4">
              <h3 className="text-gray-900 font-semibold text-lg mb-3">クイズ情報</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600 text-sm mb-1">難易度</p>
                  <p className={`${getDifficultyColor(selected.difficulty)} font-semibold text-lg`}>
                    {getDifficultyLabel(selected.difficulty)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600 text-sm mb-1">教科</p>
                  <p className="text-indigo-700 font-semibold text-lg">{selected.subject ?? '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg col-span-2">
                  <p className="text-gray-600 text-sm mb-1">単元</p>
                  <p className="text-indigo-700 font-semibold text-lg">{selected.unit ?? '-'}</p>
                </div>
              </div>

              <h3 className="text-gray-900 font-semibold text-lg mb-3 pt-4">あなたの学習記録</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 border-2 border-indigo-200 p-4 rounded-lg">
                  <p className="text-indigo-900 text-sm mb-1">過去の回答数</p>
                  <p className="text-indigo-700 font-bold text-2xl">{s?.answers ?? 0}<span className="text-base ml-1">回</span></p>
                </div>
                <div className="bg-indigo-50 border-2 border-indigo-200 p-4 rounded-lg">
                  <p className="text-indigo-900 text-sm mb-1">正答率</p>
                  <p className={`${getAccuracyColor(accuracy, s?.answers ?? 0)} font-bold text-2xl`}>
                    {s?.answers ? `${accuracy}%` : '-'}
                  </p>
                </div>
              </div>
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
        <Card className="bg-white shadow-md p-6">
          <h2 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
            <span className="text-indigo-600">🔍</span>
            フィルター・並び替え
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <label className="text-sm text-gray-700 flex flex-col">
              <span className="mb-2 font-medium text-indigo-900">教科</span>
              <select
                aria-label="教科"
                className="border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                value={subjectFilter}
                onChange={e=>setSubjectFilter(e.target.value)}
              >
                <option value="all">すべて</option>
                {uniqueSubjects.map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
            </label>
            <label className="text-sm text-gray-700 flex flex-col">
              <span className="mb-2 font-medium text-indigo-900">単元</span>
              <select
                aria-label="単元"
                className="border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                value={unitFilter}
                onChange={e=>setUnitFilter(e.target.value)}
              >
                <option value="all">すべて</option>
                {uniqueUnits.map(u => (<option key={u} value={u}>{u}</option>))}
              </select>
            </label>
            <label className="text-sm text-gray-700 flex flex-col">
              <span className="mb-2 font-medium text-indigo-900">難易度</span>
              <select
                aria-label="難易度"
                className="border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                value={difficultyFilter}
                onChange={e=>setDifficultyFilter(e.target.value)}
              >
                <option value="all">すべて</option>
                {uniqueDifficulties.map(d => (<option key={d} value={String(d)}>Lv.{d}</option>))}
              </select>
            </label>
            <label className="text-sm text-gray-700 flex flex-col">
              <span className="mb-2 font-medium text-indigo-900">並び替え</span>
              <select
                aria-label="並び替え"
                className="border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                value={sortKey}
                onChange={e=>setSortKey(e.target.value as any)}
              >
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
              <span className="mb-2 font-medium text-indigo-900">順序</span>
              <select
                aria-label="順序"
                className="border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                value={sortOrder}
                onChange={e=>setSortOrder(e.target.value as any)}
              >
                <option value="desc">降順</option>
                <option value="asc">昇順</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {filtered.length === quizzes.length ? (
                <span>全 <span className="font-semibold text-indigo-600">{quizzes.length}</span> 件を表示</span>
              ) : (
                <span>全 {quizzes.length} 件中 <span className="font-semibold text-indigo-600">{filtered.length}</span> 件を表示</span>
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSubjectFilter('all');
                setUnitFilter('all');
                setDifficultyFilter('all');
                setSortKey('none');
                setSortOrder('desc');
              }}
            >
              フィルタークリア
            </Button>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-50 hover:to-indigo-50">
                  <TableHead className="w-[35%] font-semibold text-indigo-900">クイズ内容</TableHead>
                  <TableHead className="font-semibold text-indigo-900">難易度</TableHead>
                  <TableHead className="font-semibold text-indigo-900">教科</TableHead>
                  <TableHead className="font-semibold text-indigo-900">単元</TableHead>
                  <TableHead className="font-semibold text-indigo-900 text-center">過去の回答数</TableHead>
                  <TableHead className="font-semibold text-indigo-900 text-center">過去の正答率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      該当するクイズが見つかりませんでした
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map(({ q, s, accuracy }) => {
                    // 難易度に応じた色
                    const getDifficultyBadge = (diff: number | undefined) => {
                      if (diff == null) return <span className="text-gray-400">-</span>;
                      const colors = {
                        2: 'bg-green-100 text-green-800 border-green-200',
                        3: 'bg-blue-100 text-blue-800 border-blue-200',
                        4: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                        5: 'bg-red-100 text-red-800 border-red-200',
                      };
                      const labels = {
                        2: 'やさしい',
                        3: 'ふつう',
                        4: 'むずかしい',
                        5: 'とてもむずかしい',
                      };
                      const color = colors[diff as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
                      const label = labels[diff as keyof typeof labels] || `Lv.${diff}`;
                      return <Badge className={`${color} border font-medium`}>{label}</Badge>;
                    };

                    // 正答率に応じた色
                    const getAccuracyColor = (acc: number, answers: number) => {
                      if (answers === 0) return 'text-gray-400';
                      if (acc >= 80) return 'text-green-600 font-semibold';
                      if (acc >= 50) return 'text-yellow-600 font-semibold';
                      return 'text-red-600 font-semibold';
                    };

                    return (
                      <TableRow
                        key={q.id}
                        className="cursor-pointer hover:bg-indigo-50 transition-colors border-b border-gray-100"
                        onClick={() => setSelected(q)}
                      >
                        <TableCell>
                          <div className="text-gray-900 line-clamp-2 leading-relaxed">{q.question}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {getDifficultyBadge(q.difficulty)}
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-700">{q.subject ?? <span className="text-gray-400">-</span>}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-700 text-sm">{q.unit ?? <span className="text-gray-400">-</span>}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-gray-700 font-medium">{s?.answers ?? 0}回</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={getAccuracyColor(accuracy, s?.answers ?? 0)}>
                            {s?.answers ? `${accuracy}%` : '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  )
}
