'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Database } from '@/lib/database.types'

type Question = Database['public']['Tables']['questions']['Row']

const CATEGORIES = ['全部', '健康教育', '体育文化', '体育精神'] as const
const TYPES = [
  { value: '', label: '全部题型' },
  { value: 'choice', label: '选择题' },
  { value: 'judge', label: '判断题' },
] as const

export default function ExamPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [phase, setPhase] = useState<'setup' | 'exam' | 'result'>('setup')
  const [category, setCategory] = useState<string>('全部')
  const [questionType, setQuestionType] = useState<string>('')
  const [questionCount, setQuestionCount] = useState(20)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [examRecordId, setExamRecordId] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [hasPendingExam, setHasPendingExam] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedSecondsRef = useRef(0)

  useEffect(() => {
    const id = localStorage.getItem('userId')
    if (!id) {
      window.location.href = '/'
      return
    }
    setUserId(id)
    // 检查是否有未完成考试
    supabase
      .from('exam_records')
      .select('id')
      .eq('user_id', id)
      .eq('is_completed', false)
      .limit(1)
      .then(({ data }) => setHasPendingExam(!!data && data.length > 0))
  }, [])

  // Timer
  useEffect(() => {
    if (phase === 'exam' && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => {
          const next = s + 1
          elapsedSecondsRef.current = next
          return next
        })
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase, isPaused])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const startExam = async () => {
    if (!userId) return

    // 取消之前所有暂停的考试
    await supabase
      .from('exam_records')
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_completed', false)
    setHasPendingExam(false)

    // Fetch eligible questions
    let query = supabase.from('questions').select('*').order('id')
    if (category !== '全部') query = query.eq('category', category)
    if (questionType) query = query.eq('type', questionType as 'choice' | 'judge')

    const { data: allQuestions } = await query
    if (!allQuestions || allQuestions.length === 0) return

    // Shuffle and pick
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5)
    const picked = shuffled.slice(0, Math.min(questionCount, shuffled.length)) as Question[]

    // Create exam record
    const { data: record } = await supabase
      .from('exam_records')
      .insert({
        user_id: userId,
        category: category === '全部' ? '' : category,
        question_type: questionType || '',
        question_count: picked.length,
        question_ids: picked.map((q) => q.id),
      })
      .select('id')
      .single()

    setQuestions(picked)
    setExamRecordId(record?.id ?? null)
    setCurrentIndex(0)
    setAnswers({})
    setElapsedSeconds(0)
    elapsedSecondsRef.current = 0
    setIsPaused(false)
    setPhase('exam')
  }

  const resumeExam = async () => {
    if (!userId) return
    const { data: record } = await supabase
      .from('exam_records')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!record) {
      startExam()
      return
    }

    // Load questions for this exam
    const { data: qs } = await supabase
      .from('questions')
      .select('*')
      .in('id', record.question_ids)

    if (!qs) return

    // Reorder to match question_ids order
    const ordered = record.question_ids
      .map((id: number) => qs.find((q) => q.id === id))
      .filter(Boolean) as Question[]

    // Load existing answers
    const { data: existingAnswers } = await supabase
      .from('answers')
      .select('question_id, user_answer')
      .eq('exam_record_id', record.id)

    const answerMap: Record<number, string> = {}
    existingAnswers?.forEach((a) => {
      answerMap[a.question_id] = a.user_answer
    })

    setQuestions(ordered)
    setExamRecordId(record.id)
    setCurrentIndex(record.current_index)
    setAnswers(answerMap)
    setElapsedSeconds(record.elapsed_seconds)
    elapsedSecondsRef.current = record.elapsed_seconds
    setIsPaused(false)
    setPhase('exam')
  }

  const updateExamProgress = async (index: number) => {
    if (!examRecordId) return
    await supabase
      .from('exam_records')
      .update({
        current_index: index,
        elapsed_seconds: elapsedSecondsRef.current,
      })
      .eq('id', examRecordId)
  }

  const handleAnswer = async (answer: string) => {
    if (!userId || !examRecordId) return
    const q = questions[currentIndex]
    if (!q) return

    const isCorrect = answer === q.answer
    const newAnswers = { ...answers, [q.id]: answer }
    setAnswers(newAnswers)

    // Delete existing answer for this question in this exam record, then insert new one
    await supabase
      .from('answers')
      .delete()
      .eq('exam_record_id', examRecordId)
      .eq('question_id', q.id)

    await supabase.from('answers').insert({
      user_id: userId,
      question_id: q.id,
      exam_record_id: examRecordId,
      mode: 'exam',
      user_answer: answer,
      is_correct: isCorrect,
    })

    // Update wrong questions
    if (!isCorrect) {
      await supabase.rpc('increment_error_count', { p_user_id: userId, p_question_id: q.id })
    }

    // Auto advance after short delay
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        const next = currentIndex + 1
        setCurrentIndex(next)
        updateExamProgress(next)
      }
    }, 300)
  }

  const handlePause = async () => {
    setIsPaused(true)
    if (timerRef.current) clearInterval(timerRef.current)
    await updateExamProgress(currentIndex)
    // 短暂延迟让用户看到暂停状态
    setTimeout(() => router.push('/'), 500)
  }

  const handleResume = () => {
    setIsPaused(false)
  }

  const handleFinish = async () => {
    if (!examRecordId) return

    // Calculate results
    let correct = 0
    questions.forEach((q) => {
      if (answers[q.id] === q.answer) correct++
    })

    await supabase
      .from('exam_records')
      .update({
        is_completed: true,
        correct_count: correct,
        elapsed_seconds: elapsedSecondsRef.current,
        completed_at: new Date().toISOString(),
      })
      .eq('id', examRecordId)

    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('result')
  }

  const goToQuestion = (index: number) => {
    setCurrentIndex(index)
    setIsPaused(false)
  }

  // Conditional truncation: only add ellipsis when text exceeds max length
  const truncateQuestion = (text: string, maxLen: number) => {
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
  }

  // Setup phase
  if (phase === 'setup') {
    return (
      <div className="flex flex-col min-h-screen pt-3">
        <div className="flex items-center mb-4">
          <Link href="/" className="text-blue-500">返回</Link>
          <h1 className="text-xl font-bold mx-auto">考试模式</h1>
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

          <div>
            <label className="block text-sm text-gray-600 mb-2">题目数量</label>
            <div className="flex flex-wrap gap-2">
              {[10, 20, 30, 50, 100].map((n) => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    questionCount === n ? 'bg-blue-500 text-white' : 'bg-white border'
                  }`}
                >
                  {n}题
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={resumeExam}
            disabled={!hasPendingExam}
            className="w-full py-3 border border-blue-500 text-blue-500 rounded-lg text-lg font-medium mt-4 disabled:opacity-30 disabled:border-gray-300 disabled:text-gray-400"
          >
            继续上次考试
          </button>

          <button
            onClick={startExam}
            className="w-full py-3 bg-blue-500 text-white rounded-lg text-lg font-medium"
          >
            开始新考试
          </button>
        </div>
      </div>
    )
  }

  // Result phase
  if (phase === 'result') {
    const correct = questions.filter((q) => answers[q.id] === q.answer).length
    const score = Math.round((correct / questions.length) * 100)

    return (
      <div className="flex flex-col h-[100dvh] pt-3">
        <div className="text-center py-4">
          <div className="text-5xl font-bold text-blue-500 mb-2">{score}</div>
          <div className="text-gray-500">分</div>
        </div>

        <div className="flex justify-around mb-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-500">{correct}</div>
            <div className="text-sm text-gray-500">答对</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-500">{questions.length - correct}</div>
            <div className="text-sm text-gray-500">答错</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{formatTime(elapsedSeconds)}</div>
            <div className="text-sm text-gray-500">用时</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {questions.map((q, i) => {
            const userAns = answers[q.id]
            const isCorrect = userAns === q.answer
            return (
              <div key={q.id} className={`p-3 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex justify-between items-start">
                  <span className="text-sm">{i + 1}. {truncateQuestion(q.question, 40)}</span>
                  <span className={isCorrect ? 'text-green-500' : 'text-red-500'}>
                    {isCorrect ? '✓' : '✗'}
                  </span>
                </div>
                {!isCorrect && (
                  <div className="text-xs text-gray-500 mt-1">
                    你的答案：{userAns || '未作答'} | 正确答案：{q.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-3 pt-3 pb-1 border-t bg-gray-50">
          <Link href="/" className="flex-1 py-2.5 border rounded-lg text-center">
            返回首页
          </Link>
          <button
            onClick={() => setPhase('setup')}
            className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg"
          >
            再考一次
          </button>
        </div>
      </div>
    )
  }

  // Exam phase
  const q = questions[currentIndex]
  if (!q) return null

  return (
    <div className="flex flex-col h-[100dvh] pt-3">
      {/* Header with timer */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={handlePause}
          className="text-blue-500 text-sm"
        >
          暂停
        </button>
        <div className="text-lg font-mono font-bold">{formatTime(elapsedSeconds)}</div>
        <span className="text-sm text-gray-500">
          {currentIndex + 1}/{questions.length}
        </span>
      </div>

      {/* Question nav dots - scrollable */}
      <div className="flex flex-wrap gap-1 mb-3">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => goToQuestion(i)}
            className={`w-6 h-6 rounded text-xs ${
              i === currentIndex
                ? 'bg-blue-500 text-white'
                : answers[questions[i].id]
                ? 'bg-gray-300'
                : 'bg-gray-100'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
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
              const isAnswered = answers[q.id] === letter
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(letter)}
                  className={`w-full text-left p-3 rounded-lg border ${
                    isAnswered ? 'bg-blue-50 border-blue-500' : 'bg-white border active:bg-gray-50'
                  }`}
                >
                  <span className="font-medium mr-2">{letter}.</span>
                  {opt}
                </button>
              )
            })
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => handleAnswer('√')}
                className={`flex-1 py-3 rounded-lg border text-lg font-medium ${
                  answers[q.id] === '√' ? 'bg-blue-50 border-blue-500' : 'bg-white border active:bg-gray-50'
                }`}
              >
                √ 正确
              </button>
              <button
                onClick={() => handleAnswer('×')}
                className={`flex-1 py-3 rounded-lg border text-lg font-medium ${
                  answers[q.id] === '×' ? 'bg-blue-50 border-blue-500' : 'bg-white border active:bg-gray-50'
                }`}
              >
                × 错误
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom navigation */}
      <div className="flex gap-3 pt-3 pb-1 border-t bg-gray-50">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="flex-1 py-2.5 border rounded-lg disabled:opacity-30"
        >
          上一题
        </button>
        <button
          onClick={handleFinish}
          className="flex-1 py-2.5 bg-green-500 text-white rounded-lg"
        >
          交卷
        </button>
        <button
          onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
          disabled={currentIndex >= questions.length - 1}
          className="flex-1 py-2.5 border rounded-lg disabled:opacity-30"
        >
          下一题
        </button>
      </div>

      {/* Pause overlay */}
      {isPaused && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 mx-4 w-full max-w-xs text-center space-y-4">
            <h2 className="text-xl font-bold">考试已暂停</h2>
            <p className="text-gray-500">已用时：{formatTime(elapsedSeconds)}</p>
            <div className="space-y-2">
              <button
                onClick={handleResume}
                className="w-full py-3 bg-blue-500 text-white rounded-lg"
              >
                继续考试
              </button>
              <button
                onClick={handleFinish}
                className="w-full py-3 border border-red-500 text-red-500 rounded-lg"
              >
                交卷结束
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
