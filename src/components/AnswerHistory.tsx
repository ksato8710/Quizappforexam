import { useEffect, useState } from 'react'
import { apiClient } from '@/utils/api-client'
import { FeedbackWidget } from '@/components/FeedbackWidget'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type AnswerHistoryItem = {
  id: string
  quizId?: string
  userAnswer: string
  isCorrect: boolean
  answeredAt: string
  question?: string
  correctAnswer?: string
  explanation?: string
}

type AnswerHistoryProps = {
  onBack: () => void
}

export function AnswerHistory({ onBack }: AnswerHistoryProps) {
  const [history, setHistory] = useState<AnswerHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCorrect, setFilterCorrect] = useState<'all' | 'correct' | 'incorrect'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [showToast])

  async function loadHistory() {
    try {
      setLoading(true)
      const { history: data } = await apiClient.getHistory()
      setHistory(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load answer history:', error)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(answerId: string) {
    try {
      setDeletingId(answerId)
      await apiClient.deleteAnswer(answerId)
      setHistory(prev => prev.filter(item => item.id !== answerId))
      setShowToast(true)
    } catch (error) {
      console.error('Failed to delete answer:', error)
      alert('削除に失敗しました。もう一度お試しください。')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = history.filter(item => {
    if (filterCorrect === 'correct') return item.isCorrect
    if (filterCorrect === 'incorrect') return !item.isCorrect
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-indigo-600">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      {/* Toast notification */}
      {showToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <span className="text-xl">✓</span>
            <span className="font-medium">回答を削除しました</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-indigo-900">これまでした回答</h1>
            <Button variant="outline" onClick={onBack}>
              統計へ戻る
            </Button>
          </div>

          <Card className="bg-white shadow-md p-6">
            <h2 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
              <span className="text-indigo-600">🔍</span>
              フィルター
            </h2>
            <div className="flex gap-4 items-center">
              <label className="text-sm text-gray-700 flex flex-col">
                <span className="mb-2 font-medium text-indigo-900">判定</span>
                <select
                  aria-label="判定フィルター"
                  className="border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                  value={filterCorrect}
                  onChange={(e) => setFilterCorrect(e.target.value as typeof filterCorrect)}
                >
                  <option value="all">すべて</option>
                  <option value="correct">正解のみ</option>
                  <option value="incorrect">不正解のみ</option>
                </select>
              </label>
              <div className="text-sm text-gray-600 pt-6">
                {filtered.length === history.length ? (
                  <span>
                    全 <span className="font-semibold text-indigo-600">{history.length}</span> 件を表示
                  </span>
                ) : (
                  <span>
                    全 {history.length} 件中 <span className="font-semibold text-indigo-600">{filtered.length}</span> 件を表示
                  </span>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-indigo-50">
                    <TableHead className="w-[15%] min-w-[140px] text-indigo-900 font-semibold px-4 py-4">回答日時</TableHead>
                    <TableHead className="w-[30%] min-w-[200px] text-indigo-900 font-semibold px-4 py-4">問題</TableHead>
                    <TableHead className="w-[15%] min-w-[120px] text-indigo-900 font-semibold px-4 py-4">あなたの回答</TableHead>
                    <TableHead className="w-[15%] min-w-[120px] text-indigo-900 font-semibold px-4 py-4">正解</TableHead>
                    <TableHead className="w-[10%] min-w-[90px] text-indigo-900 font-semibold px-4 py-4 text-center">判定</TableHead>
                    <TableHead className="w-[15%] min-w-[100px] text-indigo-900 font-semibold px-4 py-4 text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow key="empty-row">
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        {filterCorrect === 'all' ? '回答履歴がありません' : '該当する回答が見つかりませんでした'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((item) => {
                      const formatDate = (dateStr: string) => {
                        const date = new Date(dateStr)
                        const year = date.getFullYear()
                        const month = String(date.getMonth() + 1).padStart(2, '0')
                        const day = String(date.getDate()).padStart(2, '0')
                        const hours = String(date.getHours()).padStart(2, '0')
                        const minutes = String(date.getMinutes()).padStart(2, '0')
                        return `${year}/${month}/${day} ${hours}:${minutes}`
                      }

                      return (
                        <TableRow
                          key={item.id}
                          className="hover:bg-indigo-50 transition-colors border-b border-gray-100"
                        >
                          <TableCell className="px-4 py-6 whitespace-nowrap text-sm text-gray-700">
                            {formatDate(item.answeredAt)}
                          </TableCell>
                          <TableCell className="px-4 py-6 whitespace-normal">
                            <div className="text-gray-900 leading-relaxed break-words">
                              {item.question || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-6 whitespace-normal">
                            <span className={`${item.isCorrect ? 'text-gray-700' : 'text-red-600'} break-words`}>
                              {item.userAnswer}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-6 whitespace-normal">
                            <span className="text-green-700 break-words font-medium">
                              {item.correctAnswer || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-6 text-center whitespace-nowrap">
                            {item.isCorrect ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-green-100 text-green-700 font-medium text-sm">
                                ✅ 正解
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-100 text-red-700 font-medium text-sm">
                                ❌ 不正解
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-6 text-center whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed w-20"
                            >
                              {deletingId === item.id ? '削除中...' : '削除'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        <FeedbackWidget pageContext="回答履歴画面" />
      </div>
    </div>
  )
}
