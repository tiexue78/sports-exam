'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import Link from 'next/link'

type Question = Database['public']['Tables']['questions']['Row']

const CATEGORIES = ['全部', '健康教育', '体育文化', '体育精神'] as const
const TYPES = [
  { value: '', label: '全部题型' },
  { value: 'choice', label: '选择题' },
  { value: 'judge', label: '判断题' },
] as const

export default function LearnPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [category, setCategory] = useState<string>('全部')
  const [questionType, setQuestionType] = useState<string>('')
  const [showSettings, setShowSettings] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = localStorage.getItem('userId')
    if (!id) {
      window.location.href = '/'
      return
    }
    setUserId(id)
  }, [])

  const loadQuestions = useCallback(async () => {
    let query = supabase.from('questions').select('*').order('id')
    if (category !== '全部') query = query.eq('category', category)
    if (questionType) query = query.eq('type', questionType as 'choice' | 'judge')

    const { data } = await query
    if (data) setQuestions(data as Question[])
  }, [category, questionType])

  const loadProgress = useCallback(async () => {
    if (!userId) return
    let query = supabase
      .from('practice_progress')
      .select('*')
      .eq('user_id', userId)
    if (category !== '全部') query = query.eq('category', category)
    else query = query.eq('category', '')
    if (questionType) query = query.eq('question_type', questionType)
    else query = query.eq('question_type', '')

    const { data } = await query.maybeSingle()

    if (data) {
      setCurrentIndex(data.current_index)
    } else {
      setCurrentIndex(0)
    }
    setLoading(false)
  }, [userId, category, questionType])

  useEffect(() => {
    if (userId) {
      loadQuestions()
    }
  }, [userId, loadQuestions])

  useEffect(() => {
    if (questions.length > 0) {
      loadProgress()
    }
  }, [questions, loadProgress])

  const saveProgress = async (index: number) => {
    if (!userId) return
    await supabase
      .from('practice_progress')
      .upsert(
        {
          user_id: userId,
          category: category === '全部' ? '' : category,
          question_type: questionType || '',
          current_index: index,
          total_count: questions.length,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,category,question_type' }
      )
  }

  const recordAnswer = async (q: Question, userAnswer: string) => {
    if (!userId) return
    const isCorrect = userAnswer === q.answer

    await supabase.from('answers').insert({
      user_id: userId,
      question_id: q.id,
      mode: 'learn',
      user_answer: userAnswer,
      is_correct: isCorrect,
    })

    if (!isCorrect) {
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

  const handleNext = () => {
    const next = currentIndex + 1
    if (next < questions.length) {
      setCurrentIndex(next)
      setSelectedAnswer(null)
      setShowResult(false)
      saveProgress(next)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setSelectedAnswer(null)
      setShowResult(false)
      saveProgress(currentIndex - 1)
    }
  }

  const startLearning = () => {
    setShowSettings(false)
  }

  if (loading || !userId) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>
  }

  if (showSettings) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex items-center mb-6">
          <Link href="/" className="text-blue-500">返回</Link>
          <h1 className="text-xl font-bold mx-auto">学习模式</h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">选择分类</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    category === cat ? 'bg-blue-500 text-white' : 'bg-white border'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">选择题型</label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setQuestionType(t.value)}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    questionType === t.value ? 'bg-blue-500 text-white' : 'bg-white border'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startLearning}
            className="w-full py-3 bg-blue-500 text-white rounded-lg text-lg font-medium mt-6"
          >
            开始学习
          </button>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500">没有找到题目</p>
        <button onClick={() => setShowSettings(true)} className="text-blue-500">
          重新选择
        </button>
      </div>
    )
  }

  const q = questions[currentIndex]

  return (
    <div className="flex flex-col h-[100dvh] pt-3">
      {/* Fixed header */}
      <div className="flex items-center justify-between mb-2">
        <Link href="/" className="text-blue-500 text-sm">返回</Link>
        <span className="text-sm text-gray-500">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Category tag */}
        <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded mb-2">
          {q.category} · {q.type === 'choice' ? '选择题' : '判断题'}
        </span>

        {/* Question */}
        <div className="bg-white rounded-xl p-3 shadow-sm border mb-3">
          <p className="leading-relaxed">{q.question}</p>
        </div>

        {/* Options */}
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
                  className={`w-full text-left p-3 rounded-lg border ${bgClass} ${
                    showResult ? '' : 'active:bg-gray-50'
                  }`}
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
                    ? q.answer === '√'
                      ? 'bg-green-50 border-green-500'
                      : selectedAnswer === '√'
                      ? 'bg-red-50 border-red-500'
                      : 'bg-white border'
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
                    ? q.answer === '×'
                      ? 'bg-green-50 border-green-500'
                      : selectedAnswer === '×'
                      ? 'bg-red-50 border-red-500'
                      : 'bg-white border'
                    : 'bg-white border active:bg-gray-50'
                }`}
              >
                × 错误
              </button>
            </div>
          )}
        </div>

        {/* Show answer / result */}
        {!showResult && (
          <button
            onClick={() => setShowResult(true)}
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
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex-1 py-2.5 border rounded-lg disabled:opacity-30"
        >
          上一题
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex >= questions.length - 1}
          className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg disabled:opacity-30"
        >
          下一题
        </button>
      </div>
    </div>
  )
}
