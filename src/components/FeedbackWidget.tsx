import { useState } from 'react'
import { apiClient } from '@/utils/api-client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

type FeedbackWidgetProps = {
  pageContext: string
  quizId?: string
}

export function FeedbackWidget({ pageContext, quizId }: FeedbackWidgetProps) {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!message.trim()) return

    try {
      setSubmitting(true)
      await apiClient.submitFeedback({
        type: 'other',
        message: message.trim(),
        pageContext,
        quizId,
      })
      toast.success('ご意見を送信しました。ありがとうございます。')
      setMessage('')
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      toast.error('送信に失敗しました。もう一度お試しください。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-8 max-w-3xl mx-auto">
      <Card className="bg-white shadow-xl rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 shrink-0 rounded-full border-2 border-indigo-600 text-indigo-600 flex items-center justify-center font-bold text-xl">
            💬
          </div>
          <h3 className="text-indigo-900 text-lg font-semibold">
            気付いたことがあればコメントください
          </h3>
        </div>

        <p className="text-sm text-gray-600 mb-1">
          気づいたこと、変えたいこと、知りたいことなどがあれば、ぜひ教えてください。
        </p>

        <div className="space-y-3">
          <div>
            <label htmlFor="feedback-message" className="block text-sm font-medium text-gray-700 mb-2">
              メッセージ <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
            </p>
            <Textarea
              id="feedback-message"
              placeholder="○○をもっと△△にしてほしい"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 256))}
              maxLength={256}
              rows={4}
              className="resize-none border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              disabled={submitting}
            />
            <p className="text-xs text-gray-500 text-right mt-1">
              {message.length}/256
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || !message.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
            size="lg"
          >
            {submitting ? '送信中...' : '送信'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
