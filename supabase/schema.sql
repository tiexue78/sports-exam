-- Supabase 建表脚本

-- 题目表
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('choice', 'judge')),
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB, -- 选择题: ["A选项", "B选项", "C选项"], 判断题: null
  answer TEXT NOT NULL -- 选择题: "A"/"B"/"C", 判断题: "√"/"×"
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 学习进度表
-- 注意: category 和 question_type 使用空字符串表示"全部"，避免 NULL 在 UNIQUE 约束中失效
CREATE TABLE IF NOT EXISTS practice_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT '', -- 空字符串表示全部
  question_type TEXT NOT NULL DEFAULT '', -- 空字符串表示混合, 'choice'/'judge'
  current_index INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category, question_type)
);

-- 考试记录表
CREATE TABLE IF NOT EXISTS exam_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT '', -- 空字符串表示全部
  question_type TEXT NOT NULL DEFAULT '', -- 空字符串表示混合
  question_count INTEGER NOT NULL,
  question_ids INTEGER[] NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  current_index INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 作答记录表
CREATE TABLE IF NOT EXISTS answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id),
  exam_record_id UUID REFERENCES exam_records(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('learn', 'exam')),
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 错题表
CREATE TABLE IF NOT EXISTS wrong_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id),
  error_count INTEGER NOT NULL DEFAULT 1,
  last_wrong_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- 原子递增错题计数的 RPC 函数
CREATE OR REPLACE FUNCTION increment_error_count(p_user_id UUID, p_question_id INTEGER)
RETURNS void AS $$
BEGIN
  INSERT INTO wrong_questions (user_id, question_id, error_count, last_wrong_at)
  VALUES (p_user_id, p_question_id, 1, NOW())
  ON CONFLICT (user_id, question_id)
  DO UPDATE SET error_count = wrong_questions.error_count + 1, last_wrong_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 索引
CREATE INDEX IF NOT EXISTS idx_answers_user_id ON answers(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_exam_record_id ON answers(exam_record_id);
CREATE INDEX IF NOT EXISTS idx_exam_records_user_id ON exam_records(user_id);
CREATE INDEX IF NOT EXISTS idx_wrong_questions_user_id ON wrong_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_progress_user_id ON practice_progress(user_id);

-- RLS 策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrong_questions ENABLE ROW LEVEL SECURITY;

-- 题目公开可读
CREATE POLICY "Questions are publicly readable" ON questions FOR SELECT USING (true);

-- 不使用 Supabase Auth，RLS 放开读写（安全由应用层控制）
CREATE POLICY "Users read" ON users FOR SELECT USING (true);
CREATE POLICY "Users insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users update" ON users FOR UPDATE USING (true);
CREATE POLICY "Users delete" ON users FOR DELETE USING (true);

CREATE POLICY "Practice progress all" ON practice_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Exam records all" ON exam_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Answers all" ON answers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Wrong questions all" ON wrong_questions FOR ALL USING (true) WITH CHECK (true);
