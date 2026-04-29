'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type ExamRecord = {
  id: string
  question_count: number
  correct_count: number
  elapsed_seconds: number
  category: string | null
  question_type: string | null
  started_at: string
  completed_at: string | null
  is_completed: boolean
}

export default function HistoryPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [records, setRecords] = useState<ExamRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = localStorage.getItem('userId')
    if (!id) {
      window.location.href = '/'
      return
    }
    setUserId(id)
  }, [])

  const loadHistory = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('exam_records')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', true)
      .order('completed_at', { ascending: false })

    if (data) setRecords(data as ExamRecord[])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    loadHistory()
  }, [userId, loadHistory])

  const handleDelete = async (id: string) => {
    // 先删除关联的 answers，再删除 exam_record
    await supabase.from('answers').delete().eq('exam_record_id', id)
    await supabase.from('exam_records').delete().eq('id', id)
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}分${s}秒`
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>
  }

  return (
    <div className="flex flex-col min-h-screen pt-3">
      <div className="flex items-center mb-4">
        <Link href="/" className="text-blue-500">返回</Link>
        <h1 className="text-xl font-bold mx-auto">历史记录</h1>
      </div>

      {records.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">暂无考试记录</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          {records.map((r) => {
            const score = r.question_count > 0 ? Math.round((r.correct_count / r.question_count) * 100) : 0
            const typeLabel = r.question_type === 'choice' ? '选择题' : r.question_type === 'judge' ? '判断题' : '混合'
            const catLabel = r.category || '全部'

            return (
              <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {catLabel} · {typeLabel}
                    </span>
                  </div>
                  <div className={`text-2xl font-bold ${score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {score}
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>答对 {r.correct_count}/{r.question_count}</span>
                  <span>用时 {formatTime(r.elapsed_seconds)}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {r.completed_at ? formatDate(r.completed_at) : ''}
                </div>
                <div className="mt-2 text-right">
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-xs text-red-400 active:text-red-600"
                  >
                    删除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
