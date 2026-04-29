# 项目进度与后续计划

## 已完成

### 1. 题目数据解析 ✅
- 从PDF和DOCX提取了全部200道题（选择100 + 判断100）
- 生成结构化JSON：`questions.json`
- 修正了ID 186分类错误（乒乓球规则题从"体育精神"改为"体育文化"）

### 2. Next.js项目初始化 ✅
- Next.js 16 + TypeScript + Tailwind CSS + App Router
- 移动端优先布局

### 3. Supabase配置与建表 ✅
- 项目URL: `https://lryjsmbfhayohngrbbdl.supabase.co`
- 执行 `schema.sql` 建表（6张表 + 索引 + RLS + RPC函数）
- 导入200道题目数据
- options字段为JSONB数组（已修复双重序列化问题）

### 4. 代码Bug修复 ✅
- P0: RLS策略改为USING(true)（无Supabase Auth场景）
- P0: `.eq('col', null)` 改为空字符串匹配
- P0: NULL在UNIQUE约束中失效 → category/question_type默认值改为空字符串
- P1: error_count递增改为原子性RPC函数 `increment_error_count`
- P1: 考试重复作答改为先删后插
- P1: 错题练习增加数据库写入（答对移除、答错递增）
- P1: 计时器闭包问题改用useRef
- P1: 导航离开进度丢失改用async/await + router.push
- P2: 登录竞态条件修复（23505时重新select）
- P2: 错题顺序手动重排
- P2: 除零防御、截断逻辑、类型统一等

### 5. 功能调整 ✅
- 登录始终显示登录界面，预填上次姓名，必须点"开始练习"才进入
- 错题练习增加"查看答案"按钮（样式与学习模式一致）
- 历史记录每行增加删除按钮
- 考试模式"继续上次考试"仅在存在暂停考试时可用
- 开始新考试时自动取消之前的暂停考试
- 暂停考试后延迟500ms跳转，避免太快
- 题目数量选项增加100题

### 6. 构建与测试 ✅
- TypeScript类型检查通过
- Production build通过
- API端到端测试通过
- 电脑端浏览器功能测试通过

### 7. 手机端适配验证 ✅
- 重构为三段式布局：顶部固定 + 中间可滚动 + 底部导航固定
- 修复竖屏下底部按钮溢出屏幕问题
- 登录表单位置优化，居中偏上
- 适配移动端触摸操作，按钮尺寸、间距优化
- 本地WiFi下手机访问测试通过

### 8. 部署配置完成 ✅
- 配置Next.js静态导出（`output: 'export'`），支持所有静态部署平台
- Vercel部署成功（状态Ready）
- Cloudflare Pages部署配置方案确认

### 9. 自定义域名与双平台部署配置 ✅
- 域名`tiexue78.cn`已完成备案，成功托管到Cloudflare，DNS服务器切换完成
- 主站配置：`tiyu.tiexue78.cn` 指向Cloudflare Pages，已开启CDN加速与HTTPS，待DNS全球生效
- 备站配置：`tiyu1.tiexue78.cn` 指向Vercel，已完成验证，双平台均绑定GitHub自动构建
- SSL/TLS配置完成，加密模式设为Flexible，适配静态站点访问需求

## 待完成
### 10. 上线验证
- 等待DNS生效后，测试双域名公网访问可用性
- 验证所有功能（登录、学习模式、考试、错题本）在两个平台均正常运行

---

## 问题记录
### 部署相关问题
1. **Vercel域名屏蔽**：Vercel默认分配的 `.vercel.app` 二级域名在国内大部分地区被运营商屏蔽，无法直接访问，必须绑定自定义域名
2. **Cloudflare Pages构建冲突**：Cloudflare自动识别Next.js项目时会默认使用OpenNext适配器，与纯客户端静态导出模式冲突，需要手动设置Framework preset为 `None`，自定义构建命令为 `npx next build`，输出目录为 `out`
3. **国内访问限制**：国外部署平台的默认域名普遍存在访问限制，必须绑定自定义域名才能稳定使用

### 其他问题
1. **内网穿透工具源问题**：常用穿透工具cpolar不在npm官方源，国内使用可选择 `localtunnel` 或飞书/钉钉等国内穿透工具
2. **跨网络访问**：不在同一WiFi下访问需要公网穿透或自定义域名方案

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
│   │   ├── supabase.ts               # Supabase客户端
│   │   └── database.types.ts         # TypeScript类型定义（含RPC）
│   └── app/
│       ├── layout.tsx                # 根布局
│       ├── globals.css               # 全局样式
│       ├── page.tsx                  # 首页/登录
│       ├── learn/page.tsx            # 学习模式
│       ├── exam/page.tsx             # 考试模式
│       ├── wrong/page.tsx            # 错题本
│       └── history/page.tsx          # 历史记录
├── .env.local                        # Supabase连接信息（本地配置，不提交）
├── CLAUDE.md
├── README.md
└── PROGRESS.md                       # 本文件
```

*最后更新：2026-04-29*