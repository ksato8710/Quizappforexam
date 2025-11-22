import { useState, useEffect } from 'react'
import { apiClient } from '@/utils/api-client'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'

type FeedbackType = 'bug' | 'feature' | 'improvement' | 'other'

type FeedbackWidgetProps = {
  pageContext: string
  quizId?: string
}

export function FeedbackWidget({ pageContext, quizId }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('bug')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [showToast])

  const handleSubmit = async () => {
    if (!message.trim()) {
      alert('メッセージを入力してください。')
      return
    }

    try {
      setSubmitting(true)
      await apiClient.submitFeedback({
        type,
        subject: subject.trim() || undefined,
        message: message.trim(),
        pageContext,
        quizId,
      })

      setShowToast(true)
      setMessage('')
      setSubject('')
      setType('bug')

      // Auto-close after 2 seconds
      setTimeout(() => {
        setOpen(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      alert('送信に失敗しました。もう一度お試しください。')
    } finally {
      setSubmitting(false)
    }
  }

  const typeOptions = [
    { value: 'bug', label: '🐛 バグ報告', description: '不具合や動作のおかしい点' },
    { value: 'feature', label: '✨ 機能リクエスト', description: '新しい機能の提案' },
    { value: 'improvement', label: '💡 改善提案', description: '使いやすさの向上など' },
    { value: 'other', label: '💬 その他', description: 'その他のご意見・ご要望' },
  ] as const

  return (
    <>
      {/* Toast notification */}
      {showToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-2">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <span className="text-xl">✓</span>
            <span className="font-medium">フィードバックを送信しました</span>
          </div>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className="fixed bottom-6 right-6 z-50 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            aria-label="フィードバックを送信"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
              <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
            </svg>
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-indigo-900">フィードバック</SheetTitle>
            <SheetDescription>
              お気づきの点やご要望をお聞かせください
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Feedback type selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-900">種類</label>
              <div className="grid grid-cols-1 gap-2">
                {typeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      type === option.value
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-indigo-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-600 mt-1">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject (optional) */}
            <div className="space-y-2">
              <label htmlFor="subject" className="text-sm font-medium text-gray-900">
                件名 <span className="text-gray-500 text-xs">(任意)</span>
              </label>
              <Input
                id="subject"
                type="text"
                placeholder="例: クイズ一覧の表示が遅い"
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, 100))}
                maxLength={100}
                className="border-gray-200 focus:border-indigo-500 focus:ring-indigo-200"
              />
              <p className="text-xs text-gray-500 text-right">{subject.length}/100</p>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium text-gray-900">
                内容 <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="message"
                placeholder="詳しく教えてください..."
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                maxLength={500}
                rows={6}
                className="border-gray-200 focus:border-indigo-500 focus:ring-indigo-200 resize-none"
              />
              <p className="text-xs text-gray-500 text-right">{message.length}/500</p>
            </div>

            {/* Context info */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600">
                <span className="font-medium">現在のページ:</span> {pageContext}
              </p>
              {quizId && (
                <p className="text-xs text-gray-600 mt-1">
                  <span className="font-medium">クイズID:</span> {quizId}
                </p>
              )}
            </div>

            {/* Submit button */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !message.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '送信中...' : '送信'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
