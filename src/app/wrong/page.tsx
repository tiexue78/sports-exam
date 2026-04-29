'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import Link from 'next/link'

type Question = Database['public']['Tables']['questions']['Row']

export default function WrongPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [loading, setLoading] = useState(true)
  const [practiceMode, setPracticeMode] = useState(false)

  useEffect(() => {
    const id = localStorage.getItem('userId')
    if (!id) {
      window.location.href = '/'
      return
    }
    setUserId(id)
  }, [])

  useEffect(() => {
    if (!userId) return
    loadWrongQuestions()
  }, [userId])

  const loadWrongQuestions = async () => {
    if (!userId) return
    const { data: wrongList } = await supabase
      .from('wrong_questions')
      .select('question_id, error_count, last_wrong_at')
      .eq('user_id', userId)
      .order('last_wrong_at', { ascending: false })

    if (!wrongList || wrongList.length === 0) {
      setQuestions([])
      setLoading(false)
      return
    }

    const ids = wrongList.map((w) => w.question_id)
    const { data: qs } = await supabase.from('questions').select('*').in('id', ids)

    // 按 ids 顺序手动重排，确保与 wrongList 顺序一致
    if (qs) {
      const sorted = ids.map(id => qs.find(q => q.id === id)).filter(Boolean) as Question[]
      setQuestions(sorted)
    }
    setLoading(false)
  }

  const recordAnswer = async (q: Question, userAnswer: string) => {
    if (!userId) return
    const isCorrect = userAnswer === q.answer

    // 记录作答到 answers 表
    await supabase.from('answers').insert({
      user_id: userId,
      question_id: q.id,
      mode: 'learn',
      user_answer: userAnswer,
      is_correct: isCorrect,
    })

    if (isCorrect) {
      // 答对：从错题本移除
      await supabase
        .from('wrong_questions')
        .delete()
        .eq('user_id', userId)
        .eq('question_id', q.id)
    } else {
      // 答错：调用 RPC 原子性更新错题记录
      await supabase.rpc('increment_error_count', { p_user_id: userId, p_question_id: q.id })
    }
  }

  const handleAnswer = async (answer: string) => {
    if (showResult) return
    setSelectedAnswer(answer)
    setShowResult(true)
    const q = questions[currentIndex]
    if (q) await recordAnswer(q, answer)
  }

  const handleShowAnswer = () => {
    if (showResult) return
    setShowResult(true)
    // 不选择答案，只查看，不记录到数据库
  }

  const handleNext = () => {
    const next = currentIndex + 1
    if (next < questions.length) {
      setCurrentIndex(next)
      setSelectedAnswer(null)
      setShowResult(false)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setSelectedAnswer(null)
      setShowResult(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col min-h-screen pt-3">
        <div className="flex items-center mb-4">
          <Link href="/" className="text-blue-500">返回</Link>
          <h1 className="text-xl font-bold mx-auto">错题本</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">暂无错题，继续加油！</p>
        </div>
      </div>
    )
  }

  if (!practiceMode) {
    return (
      <div className="flex flex-col min-h-screen pt-3">
        <div className="flex items-center mb-4">
          <Link href="/" className="text-blue-500">返回</Link>
          <h1 className="text-xl font-bold mx-auto">错题本</h1>
        </div>
        <p className="text-sm text-gray-500 mb-4">共 {questions.length} 道错题</p>
        <button
          onClick={() => setPracticeMode(true)}
          className="w-full py-3 bg-blue-500 text-white rounded-lg text-lg font-medium mb-4"
        >
          开始练习错题
        </button>
        <div className="space-y-2 flex-1">
          {questions.map((q, i) => (
            <div key={q.id} className="p-3 bg-white rounded-lg border">
              <div className="flex items-start gap-2">
                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded shrink-0">
                  {q.type === 'choice' ? '选择' : '判断'}
                </span>
                <span className="text-sm">{q.question.length > 50 ? q.question.slice(0, 50) + '...' : q.question}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const q = questions[currentIndex]

  return (
    <div className="flex flex-col h-[100dvh] pt-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setPracticeMode(false)} className="text-blue-500 text-sm">
          退出练习
        </button>
        <span className="text-sm text-gray-500">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded mb-2">
          {q.category} · {q.type === 'choice' ? '选择题' : '判断题'}
        </span>

        <div className="bg-white rounded-xl p-3 shadow-sm border mb-3">
          <p className="leading-relaxed">{q.question}</p>
        </div>

        <div className="space-y-2">
          {q.type === 'choice' && q.options ? (
            q.options.map((opt, i) => {
              const letter = String.fromCharCode(65 + i)
              const isSelected = selectedAnswer === letter
              const isCorrect = letter === q.answer
              let bgClass = 'bg-white border'
              if (showResult) {
                if (isCorrect) bgClass = 'bg-green-50 border-green-500'
                else if (isSelected) bgClass = 'bg-red-50 border-red-500'
              } else if (isSelected) {
                bgClass = 'bg-blue-50 border-blue-500'
              }
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(letter)}
                  disabled={showResult}
                  className={`w-full text-left p-3 rounded-lg border ${bgClass}`}
                >
                  <span className="font-medium mr-2">{letter}.</span>
                  {opt}
                  {showResult && isCorrect && <span className="float-right text-green-500">✓</span>}
                  {showResult && isSelected && !isCorrect && <span className="float-right text-red-500">✗</span>}
                </button>
              )
            })
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => handleAnswer('√')}
                disabled={showResult}
                className={`flex-1 py-3 rounded-lg border text-lg font-medium ${
                  showResult
                    ? q.answer === '√' ? 'bg-green-50 border-green-500' : selectedAnswer === '√' ? 'bg-red-50 border-red-500' : 'bg-white border'
                    : 'bg-white border active:bg-gray-50'
                }`}
              >
                √ 正确
              </button>
              <button
                onClick={() => handleAnswer('×')}
                disabled={showResult}
                className={`flex-1 py-3 rounded-lg border text-lg font-medium ${
                  showResult
                    ? q.answer === '×' ? 'bg-green-50 border-green-500' : selectedAnswer === '×' ? 'bg-red-50 border-red-500' : 'bg-white border'
                    : 'bg-white border active:bg-gray-50'
                }`}
              >
                × 错误
              </button>
            </div>
          )}
        </div>

        {!showResult && (
          <button
            onClick={handleShowAnswer}
            className="w-full py-2.5 mt-3 border border-blue-500 text-blue-500 rounded-lg font-medium"
          >
            查看答案
          </button>
        )}

        {showResult && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
            正确答案：{q.type === 'choice' ? `${q.answer}. ${q.options?.[q.answer.charCodeAt(0) - 65]}` : q.answer}
          </div>
        )}
      </div>

      {/* Fixed bottom navigation */}
      <div className="flex gap-3 pt-3 pb-1 border-t bg-gray-50">
        <button onClick={handlePrev} disabled={currentIndex === 0} className="flex-1 py-2.5 border rounded-lg disabled:opacity-30">
          上一题
        </button>
        <button onClick={handleNext} disabled={currentIndex >= questions.length - 1} className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg disabled:opacity-30">
          下一题
        </button>
      </div>
    </div>
  )
}
