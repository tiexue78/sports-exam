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
- P0: `.eq('col', null)` 改为空字符串匹配
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

### 7. 手机端适配验证 ✓
- 重构为三段式布局：顶部固定 + 中间可滚动 + 底部导航固定
- 修复竖屏下底部按钮溢出屏幕问题
- 登录表单位置优化，居中偏上
- 适配移动端触摸操作，按钮尺寸、间距优化
- 本地 WiFi 下手机访问测试通过

### 8. 部署配置完成 ✓
- 配置 Next.js 静态导出（`output: 'export'`），支持所有静态部署平台
- Vercel 部署成功（状态 Ready）
- Cloudflare Pages 部署配置方案确认

---

## 待完成

### 9. 绑定自定义域名（进行中）
- 等待腾讯云域名购买完成
- 绑定域名到 Vercel/Cloudflare Pages，配置国内可访问的解析
- 上线后公网测试

---

## 问题记录

### 部署相关问题
1. **Vercel 域名屏蔽**：Vercel 默认分配的 `.vercel.app` 二级域名在国内大部分地区被运营商屏蔽，无法直接访问，必须绑定自定义域名
2. **Cloudflare Pages 构建冲突**：Cloudflare 自动识别 Next.js 项目时会默认使用 OpenNext 适配器，与纯客户端静态导出模式冲突，需要手动设置 Framework preset 为 `None`，自定义构建命令为 `npx next build`，输出目录为 `out`
3. **国内访问限制**：国外部署平台的默认域名普遍存在访问限制，必须绑定自定义域名才能稳定使用

### 其他问题
1. **内网穿透工具源问题**：常用穿透工具 cpolar 不在 npm 官方源，国内使用可选择 `localtunnel` 或飞书/钉钉等国内穿透工具
2. **跨网络访问**：不在同一 WiFi 下访问需要公网穿透或自定义域名方案

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
│       ├── page.tsx                  # 首页/登录
│       ├── learn/page.tsx            # 学习模式
│       ├── exam/page.tsx             # 考试模式
│       ├── wrong/page.tsx            # 错题本
│       └── history/page.tsx          # 历史记录
├── .env.local                        # Supabase 连接信息（本地配置，不提交）
├── CLAUDE.md
├── README.md
└── PROGRESS.md                       # 本文件
```

*最后更新：2026-04-29*
