# 项目进度与后续计划

## 已完成

### 1. 题目数据解析 ✓
- 从 PDF 和 DOCX 提取了全部 200 道题（选择 100 + 判断 100）
- 生成结构化 JSON：`questions.json`
- 修正了 ID 186 分类错误（乒乓球规则题从"体育精神"改为"体育文化"）

### 2. Next.js 项目初始化 ✓
- Next.js 16 + TypeScript + Tailwind CSS + App Router
- 移动端优先布局

### 3. Supabase 配置与建表 ✓
- 项目 URL: `https://lryjsmbfhayohngrbbdl.supabase.co`
- 执行 `schema.sql` 建表（6 张表 + 索引 + RLS + RPC 函数）
- 导入 200 道题目数据
- options 字段为 JSONB 数组（已修复双重序列化问题）

### 4. 代码 Bug 修复 ✓
- P0: RLS 策略改为 USING(true)（无 Supabase Auth 场景）
- P0: .eq('col', null) 改为空字符串匹配
- P0: NULL 在 UNIQUE 约束中失效 → category/question_type 默认值改为空字符串
- P1: error_count 递增改为原子性 RPC 函数 `increment_error_count`
- P1: 考试重复作答改为先删后插
- P1: 错题练习增加数据库写入（答对移除、答错递增）
- P1: 计时器闭包问题改用 useRef
- P1: 导航离开进度丢失改用 async/await + router.push
- P2: 登录竞态条件修复（23505 时重新 select）
- P2: 错题顺序手动重排
- P2: 除零防御、截断逻辑、类型统一等

### 5. 功能调整 ✓
- 登录始终显示登录界面，预填上次姓名，必须点"开始练习"才进入
- 错题练习增加"查看答案"按钮（样式与学习模式一致）
- 历史记录每行增加删除按钮
- 考试模式"继续上次考试"仅在存在暂停考试时可用
- 开始新考试时自动取消之前的暂停考试
- 暂停考试后延迟 500ms 跳转，避免太快
- 题目数量选项增加 100 题

### 6. 构建与测试 ✓
- TypeScript 类型检查通过
- Production build 通过
- API 端到端测试通过
- 电脑端浏览器功能测试通过

---

## 待完成

### 7. 手机端适配验证
- 在手机浏览器上测试所有功能
- 确保按钮大小、间距、字体可用
- 触摸交互验证

### 8. 部署到 Vercel
- 推送代码到 Git 仓库
- Vercel 部署
- 配置环境变量（NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY）
- 上线后手机端实测

---

## 各分类题目数量（修正后）

| 分类 | 选择题 | 判断题 | 合计 |
|------|--------|--------|------|
| 健康教育 | 61 | 70 | 131 |
| 体育文化 | 22 | 16 | 38 |
| 体育精神 | 17 | 14 | 31 |
| **合计** | **100** | **100** | **200** |

---

## 文件清单

```
sports-exam/
├── questions.json                    # 200道结构化题目数据
├── supabase/
│   ├── schema.sql                    # 建表+RLS+索引+RPC函数
│   └── seed.ts                       # 数据导入脚本（已通过REST API完成导入）
├── src/
│   ├── lib/
│   │   ├── supabase.ts               # Supabase 客户端
│   │   └── database.types.ts         # TypeScript 类型定义（含RPC）
│   └── app/
│       ├── layout.tsx                # 根布局
│       ├── globals.css               # 全局样式
│       ├── page.tsx                  # 首页/登录（始终显示登录表单）
│       ├── learn/page.tsx            # 学习模式
│       ├── exam/page.tsx             # 考试模式
│       ├── wrong/page.tsx            # 错题本
│       └── history/page.tsx          # 历史记录
├── .env.local                        # Supabase 连接信息（已配置）
├── CLAUDE.md
├── README.md
└── PROGRESS.md                       # 本文件
```

*最后更新：2026-04-29*
