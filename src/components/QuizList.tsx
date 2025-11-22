import { useEffect, useMemo, useState } from 'react'
import { apiClient, Quiz } from '@/utils/api-client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'

type HistoryItem = {
  quizId?: string
  quiz_id?: string
  isCorrect?: boolean
  is_correct?: boolean
}

type QuizListProps = {
  onBack?: () => void
  onOpenSettings?: () => void
  layout?: 'full' | 'embedded'
}

function getQuizId(h: HistoryItem): string | undefined {
  return (h?.quizId as string) ?? (h?.quiz_id as string)
}

function getIsCorrect(h: HistoryItem): boolean | undefined {
  const v = h?.isCorrect ?? h?.is_correct
  return typeof v === 'boolean' ? v : undefined
}

export function QuizList({ onBack, onOpenSettings, layout = 'full' }: QuizListProps) {
  const isEmbedded = layout === 'embedded'
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selected, setSelected] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [unitFilter, setUnitFilter] = useState<string>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [historyFilter, setHistoryFilter] = useState<'all' | 'unanswered' | 'uncorrected'>('all')
  const [sortKey, setSortKey] = useState<'none' | 'question' | 'subject' | 'unit' | 'difficulty' | 'answers' | 'accuracy' | 'order'>('none')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [availableUnits, setAvailableUnits] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
      } catch (error) {
        console.error('Failed to load quizzes/history', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  // Fetch units when subject filter changes
  useEffect(() => {
    if (subjectFilter === 'all') {
      setAvailableUnits([])
      setUnitFilter('all')
      return
    }

    const fetchUnits = async () => {
      try {
        const { units } = await apiClient.getUnits({ subject: subjectFilter })
        setAvailableUnits(units.map((u) => u.name))
        setUnitFilter('all')
      } catch (error) {
        console.error('Failed to fetch units:', error)
        setAvailableUnits([])
      }
    }

    void fetchUnits()
  }, [subjectFilter])

  const statsByQuiz = useMemo(() => {
    const map = new Map<string, { answers: number; correct: number }>()
    for (const h of history) {
      if (!h) continue
      const id = getQuizId(h)
      if (!id) continue
      const correct = !!getIsCorrect(h)
      const stat = map.get(id) ?? { answers: 0, correct: 0 }
      stat.answers += 1
      if (correct) stat.correct += 1
      map.set(id, stat)
    }
    return map
  }, [history])

  const uniqueSubjects = Array.from(new Set(quizzes.map((q) => q.subject).filter(Boolean))) as string[]
  const uniqueDifficulties = Array.from(
    new Set(quizzes.map((q) => q.difficulty).filter((v): v is number => v != null)),
  ).sort((a, b) => a - b)

  const prepared = quizzes.map((q, index) => {
    const stat = statsByQuiz.get(q.id) || { answers: 0, correct: 0 }
    const accuracy = stat.answers > 0 ? Math.round((stat.correct / stat.answers) * 100) : 0
    return { q, s: stat, accuracy, index }
  })

  const filtered = prepared.filter(({ q, s }) => {
    if (subjectFilter !== 'all' && q.subject !== subjectFilter) return false
    if (unitFilter !== 'all' && q.unit !== unitFilter) return false
    if (difficultyFilter !== 'all' && String(q.difficulty ?? '') !== difficultyFilter) return false
    if (historyFilter === 'unanswered' && (s.answers ?? 0) > 0) return false
    if (historyFilter === 'uncorrected' && (s.correct ?? 0) > 0) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortOrder === 'asc' ? 1 : -1
    switch (sortKey) {
      case 'question':
        return dir * String(a.q.question ?? '').localeCompare(String(b.q.question ?? ''))
      case 'subject':
        return dir * String(a.q.subject ?? '').localeCompare(String(b.q.subject ?? ''))
      case 'unit':
        return dir * String(a.q.unit ?? '').localeCompare(String(b.q.unit ?? ''))
      case 'difficulty':
        return dir * ((a.q.difficulty ?? -1) - (b.q.difficulty ?? -1))
      case 'answers':
        return dir * ((a.s.answers ?? 0) - (b.s.answers ?? 0))
      case 'accuracy':
        return dir * (a.accuracy - b.accuracy)
      case 'order':
        return dir * ((a.q.order ?? Number.MAX_SAFE_INTEGER) - (b.q.order ?? Number.MAX_SAFE_INTEGER))
      case 'none':
      default:
        return a.index - b.index
    }
  })

  if (loading) {
    if (isEmbedded) {
      return (
        <Card className="bg-white shadow-md p-6">
          <div className="text-indigo-600">読み込み中...</div>
        </Card>
      )
    }
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
      if (diff == null) return '-'
      const labels = {
        2: 'やさしい',
        3: 'ふつう',
        4: 'むずかしい',
        5: 'とてもむずかしい',
      }
      return labels[diff as keyof typeof labels] || `Lv.${diff}`
    }
    const getDifficultyColor = (diff: number | undefined) => {
      if (diff == null) return 'text-gray-400'
      const colors = {
        2: 'text-green-600',
        3: 'text-blue-600',
        4: 'text-yellow-600',
        5: 'text-red-600',
      }
      return colors[diff as keyof typeof colors] || 'text-gray-600'
    }
    const getAccuracyColor = (acc: number, answers: number) => {
      if (answers === 0) return 'text-gray-400'
      if (acc >= 80) return 'text-green-600'
      if (acc >= 50) return 'text-yellow-600'
      return 'text-red-600'
    }
    const handleDelete = async () => {
      if (!selected) return

      setIsDeleting(true)
      try {
        await apiClient.deleteQuiz(selected.id)
        const { quizzes: refreshed } = await apiClient.getQuizzes()
        setQuizzes(Array.isArray(refreshed) ? refreshed.filter(Boolean) : [])
        setShowDeleteConfirm(false)
        setSelected(null)
        toast.success('クイズを削除しました')
      } catch (error) {
        console.error('[QuizList] Failed to delete quiz:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)

        if (errorMessage.includes('Unauthorized') || errorMessage.includes('401') || errorMessage.includes('403')) {
          toast.error('認証エラーが発生しました。再度ログインしてください。')
          localStorage.removeItem('accessToken')
          window.location.reload()
        } else {
          toast.error('クイズの削除に失敗しました。時間をおいて再試行してください。')
        }
      } finally {
        setIsDeleting(false)
      }
    }

    // 削除確認画面
    if (showDeleteConfirm) {
      const deleteConfirmContent = (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className={`text-red-600 font-bold ${isEmbedded ? 'text-xl' : 'text-2xl'}`}>クイズを削除</h1>
          </div>
          <Card className="p-8 space-y-6 shadow-lg border-2 border-red-200">
            <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-r-lg">
              <p className="text-red-900 font-semibold mb-3 text-lg">本当にこのクイズを削除しますか？</p>
              <p className="text-gray-700 mb-4">この操作は取り消せません。削除後は復元できません。</p>
              <div className="bg-white p-4 rounded border border-red-200">
                <p className="text-sm text-gray-600 mb-2">削除するクイズ:</p>
                <p className="text-gray-900 font-medium">{selected.question}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end flex-wrap">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? '削除中...' : '削除する'}
              </Button>
            </div>
          </Card>
        </>
      )

      if (isEmbedded) {
        return <div className="space-y-6">{deleteConfirmContent}</div>
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
          <div className="max-w-3xl mx-auto space-y-6">{deleteConfirmContent}</div>
        </div>
      )
    }

    // クイズ詳細画面
    const detailContent = (
      <>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className={`text-indigo-900 ${isEmbedded ? 'text-xl' : ''}`}>クイズ詳細</h1>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              クイズを削除
            </Button>
            <Button variant="outline" onClick={() => setSelected(null)}>
              一覧へ戻る
            </Button>
            {!isEmbedded && onBack && (
              <Button variant="outline" onClick={onBack}>
                統計へ戻る
              </Button>
            )}
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
                {selected.choices.map((choice, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="font-semibold text-purple-600 min-w-[1.5rem]">{String.fromCharCode(65 + index)}.</span>
                    <span className="text-gray-800">{choice}</span>
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
                <p className="text-indigo-700 font-bold text-2xl">
                  {s?.answers ?? 0}
                  <span className="text-base ml-1">回</span>
                </p>
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
      </>
    )

    if (isEmbedded) {
      return <div className="space-y-6">{detailContent}</div>
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-6">{detailContent}</div>
      </div>
    )
  }

  const listHeader = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className={`text-indigo-900 ${isEmbedded ? 'text-xl' : ''}`}>クイズ一覧</h1>
      {!isEmbedded && (
        <div className="flex gap-2 flex-wrap">
          {onOpenSettings && (
            <Button variant="outline" onClick={onOpenSettings}>
              クイズ設定へ
            </Button>
          )}
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              統計へ戻る
            </Button>
          )}
        </div>
      )}
    </div>
  )

  const listContent = (
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
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="all">すべて</option>
            {uniqueSubjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-700 flex flex-col">
          <span className="mb-2 font-medium text-indigo-900">単元</span>
          <select
            aria-label="単元"
            className={`border-2 rounded-lg px-3 py-2 transition-all ${
              subjectFilter === 'all'
                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
            }`}
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            disabled={subjectFilter === 'all'}
          >
            <option value="all">{subjectFilter === 'all' ? '教科を選択してください' : 'すべて'}</option>
            {availableUnits.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-700 flex flex-col">
          <span className="mb-2 font-medium text-indigo-900">難易度</span>
          <select
            aria-label="難易度"
            className="border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
          >
            <option value="all">すべて</option>
            {uniqueDifficulties.map((difficulty) => {
              const labels: Record<number, string> = {
                2: 'やさしい',
                3: 'ふつう',
                4: 'むずかしい',
                5: 'とてもむずかしい',
              }
              return (
                <option key={difficulty} value={String(difficulty)}>
                  {labels[difficulty] || `Lv.${difficulty}`}
                </option>
              )
            })}
          </select>
        </label>
        <label className="text-sm text-gray-700 flex flex-col">
          <span className="mb-2 font-medium text-indigo-900">並び替え</span>
          <select
            aria-label="並び替え"
            className="border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
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
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
          >
            <option value="desc">降順</option>
            <option value="asc">昇順</option>
          </select>
        </label>
        <label className="text-sm text-gray-700 flex flex-col">
          <span className="mb-2 font-medium text-indigo-900">履歴フィルタ</span>
          <select
            aria-label="履歴フィルタ"
            className="border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
            value={historyFilter}
            onChange={(e) => setHistoryFilter(e.target.value as typeof historyFilter)}
          >
            <option value="all">履歴フィルタなし</option>
            <option value="unanswered">未回答のみ</option>
            <option value="uncorrected">正解したことがない問題のみ</option>
          </select>
        </label>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {filtered.length === quizzes.length ? (
            <span>
              全 <span className="font-semibold text-indigo-600">{quizzes.length}</span> 件を表示
            </span>
          ) : (
            <span>
              全 {quizzes.length} 件中 <span className="font-semibold text-indigo-600">{filtered.length}</span> 件を表示
            </span>
          )}
        </p>
        <Button
          variant="ghost"
          className="text-sm text-indigo-600"
          onClick={() => {
            setSubjectFilter('all')
            setUnitFilter('all')
            setDifficultyFilter('all')
            setHistoryFilter('all')
            setSortKey('none')
            setSortOrder('desc')
          }}
        >
          フィルタをリセット
        </Button>
      </div>
      <div className="mt-6 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-indigo-50">
              <TableHead className="w-[23%] min-w-[170px] text-indigo-900 font-semibold px-4 py-4">問題</TableHead>
              <TableHead className="w-[12%] min-w-[110px] text-indigo-900 font-semibold px-4 py-4">難易度</TableHead>
              <TableHead className="w-[15%] min-w-[110px] text-indigo-900 font-semibold px-4 py-4">教科</TableHead>
              <TableHead className="w-[32%] min-w-[240px] text-indigo-900 font-semibold px-4 py-4">単元</TableHead>
              <TableHead className="w-[9%] min-w-[80px] text-indigo-900 font-semibold px-4 py-4 text-center">回答数</TableHead>
              <TableHead className="w-[9%] min-w-[80px] text-indigo-900 font-semibold px-4 py-4 text-center">正答率</TableHead>
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
                const getDifficultyBadge = (diff: number | undefined) => {
                  if (diff == null) return <span className="text-gray-400">-</span>
                  const configs = {
                    2: { stars: '⭐', label: 'やさしい', bg: 'bg-green-100', text: 'text-green-700' },
                    3: { stars: '⭐⭐', label: 'ふつう', bg: 'bg-blue-100', text: 'text-blue-700' },
                    4: { stars: '⭐⭐⭐', label: 'むずかしい', bg: 'bg-orange-100', text: 'text-orange-700' },
                    5: { stars: '⭐⭐⭐⭐', label: 'とてもむずかしい', bg: 'bg-red-100', text: 'text-red-700' },
                  }
                  const config =
                    configs[diff as keyof typeof configs] || { stars: '⭐', label: `Lv.${diff}`, bg: 'bg-gray-100', text: 'text-gray-700' }
                  return (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md ${config.bg} ${config.text} font-medium text-sm`}>
                      <span>{config.stars}</span>
                      <span>{config.label}</span>
                    </div>
                  )
                }
                const getAccuracyColor = (acc: number, answers: number) => {
                  if (answers === 0) return 'text-gray-400'
                  if (acc >= 80) return 'text-green-600 font-semibold'
                  if (acc >= 50) return 'text-yellow-600 font-semibold'
                  return 'text-red-600 font-semibold'
                }
                return (
                  <TableRow
                    key={q.id}
                    className="cursor-pointer hover:bg-indigo-50 transition-colors border-b border-gray-100"
                    onClick={() => setSelected(q)}
                  >
                    <TableCell className="w-[23%] min-w-[170px] px-4 py-6 whitespace-normal">
                      <div className="text-gray-900 leading-relaxed break-words">{q.question}</div>
                    </TableCell>
                    <TableCell className="w-[12%] min-w-[110px] px-4 py-6">{getDifficultyBadge(q.difficulty)}</TableCell>
                    <TableCell className="w-[15%] min-w-[110px] px-4 py-6 whitespace-normal">
                      <span className="text-gray-700 break-words">{q.subject ?? <span className="text-gray-400">-</span>}</span>
                    </TableCell>
                    <TableCell className="w-[32%] min-w-[240px] px-4 py-6 whitespace-normal">
                      <span className="text-gray-700 break-words">{q.unit ?? <span className="text-gray-400">-</span>}</span>
                    </TableCell>
                    <TableCell className="w-[9%] min-w-[80px] px-4 py-6 text-center whitespace-nowrap">
                      <span className="text-gray-700 font-medium">{s?.answers ?? 0}回</span>
                    </TableCell>
                    <TableCell className="w-[9%] min-w-[80px] px-4 py-6 text-center whitespace-nowrap">
                      <span className={getAccuracyColor(accuracy, s?.answers ?? 0)}>{s?.answers ? `${accuracy}%` : '-'}</span>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )

  const combinedContent = (
    <>
      {listHeader}
      {listContent}
    </>
  )

  if (isEmbedded) {
    return <div className="space-y-4">{combinedContent}</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">{combinedContent}</div>
    </div>
  )
}
