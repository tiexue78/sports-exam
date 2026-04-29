'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [inputName, setInputName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const storedId = localStorage.getItem('userId')
    const storedName = localStorage.getItem('userName')
    if (storedId && storedName) {
      setUserId(storedId)
      setUserName(storedName)
    }
    if (storedName) {
      setInputName(storedName)
    }
    setLoading(false)
  }, [])

  const handleLogin = async () => {
    const name = inputName.trim()
    if (!name) {
      setError('请输入姓名')
      return
    }
    setError('')

    const { data: existing } = await supabase
      .from('users')
      .select('id, name')
      .eq('name', name)
      .single()

    if (existing) {
      setUserId(existing.id)
      setUserName(existing.name)
      localStorage.setItem('userId', existing.id)
      localStorage.setItem('userName', existing.name)
      return
    }

    const { data: created, error: insertError } = await supabase
      .from('users')
      .insert({ name })
      .select('id, name')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: existingAfterRace } = await supabase
          .from('users')
          .select('id, name')
          .eq('name', name)
          .single()

        if (existingAfterRace) {
          setUserId(existingAfterRace.id)
          setUserName(existingAfterRace.name)
          localStorage.setItem('userId', existingAfterRace.id)
          localStorage.setItem('userName', existingAfterRace.name)
          return
        }
      }
      setError('登录失败，请重试')
      return
    }

    setUserId(created.id)
    setUserName(created.name)
    localStorage.setItem('userId', created.id)
    localStorage.setItem('userName', created.name)
  }

  const handleSwitchUser = () => {
    setUserId(null)
    setUserName('')
    const lastName = localStorage.getItem('userName') || ''
    setInputName(lastName)
    setError('')
    localStorage.removeItem('userId')
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center gap-5 pt-[18vh]">
        <h1 className="text-2xl font-bold">体育知识练习</h1>
        <div className="w-full max-w-sm space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">请输入姓名</label>
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="你的名字"
              className="w-full px-4 py-3 border rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full py-3 bg-blue-500 text-white rounded-lg text-lg font-medium active:bg-blue-600"
          >
            开始练习
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">体育知识练习</h1>
        <button onClick={handleSwitchUser} className="text-sm text-gray-500">
          切换用户
        </button>
      </div>

      <div className="text-center mb-4">
        <span className="text-gray-600">当前用户：</span>
        <span className="font-medium">{userName}</span>
      </div>

      <div className="space-y-2 flex-1 content-start">
        <Link href="/learn" className="block p-3 bg-white rounded-xl shadow-sm border active:bg-gray-50">
          <div className="font-medium">学习模式</div>
          <div className="text-xs text-gray-500 mt-0.5">逐题练习，随时查看答案</div>
        </Link>

        <Link href="/exam" className="block p-3 bg-white rounded-xl shadow-sm border active:bg-gray-50">
          <div className="font-medium">考试模式</div>
          <div className="text-xs text-gray-500 mt-0.5">随机抽题，计时测试</div>
        </Link>

        <Link href="/wrong" className="block p-3 bg-white rounded-xl shadow-sm border active:bg-gray-50">
          <div className="font-medium">错题本</div>
          <div className="text-xs text-gray-500 mt-0.5">集中练习错题</div>
        </Link>

        <Link href="/history" className="block p-3 bg-white rounded-xl shadow-sm border active:bg-gray-50">
          <div className="font-medium">历史记录</div>
          <div className="text-xs text-gray-500 mt-0.5">查看考试记录</div>
        </Link>
      </div>

      <div className="text-center text-xs text-gray-400 py-2">
        初二体育与健康知识练习
      </div>
    </div>
  )
}
