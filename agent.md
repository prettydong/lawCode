# 法智 (lawCode) — 项目维护手册

## 项目简介

AI 驱动的中国法律文书智能生成平台。用户通过 Web 表单填入案件信息，系统基于 LaTeX 模板生成规范的法律文书 PDF；同时提供 AI 案件分析（接入 Kimi API）。

品牌：**法智** — 以法为盾，以智护权

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4 |
| 后端 | Next.js API Routes (Node.js) |
| 数据库 | SQLite (better-sqlite3, WAL 模式) |
| 认证 | JWT (jose) + httpOnly Cookie, bcryptjs 密码哈希 |
| 文书生成 | Python 3 + XeLaTeX (xelatex 二次编译) |
| AI 分析 | Kimi API (Moonshot AI, k2-0905 模型) |
| PDF 预览 | react-pdf (客户端 Canvas 渲染) |

---

## 目录结构

```
lawCode/
├── web/                          # Next.js Web 应用
│   ├── app/                      # App Router 页面 & API
│   │   ├── page.tsx              # 首页（智诉 + 智记 两大模块）
│   │   ├── fill/                 # 刑事模板填写页
│   │   ├── fill-civil/           # 民事模板填写页
│   │   ├── api/
│   │   │   ├── generate/         # PDF 生成（调用 Python）
│   │   │   ├── analyze/          # AI 案件分析（调用 Kimi）
│   │   │   ├── auth/             # 认证: login, register, logout, me, usage
│   │   │   ├── cases/            # 案件 CRUD
│   │   │   └── files/            # 文件管理: documents, analyses
│   │   ├── AuthModal.tsx         # 登录/注册弹窗
│   │   ├── UserButton.tsx        # 用户菜单
│   │   ├── PdfViewer.tsx         # PDF 预览组件
│   │   └── ConfirmDialog.tsx     # 确认对话框
│   ├── lib/
│   │   ├── db.ts                 # SQLite 数据层（users, cases, documents, analyses）
│   │   ├── auth.ts               # JWT 签发/验证/Cookie 管理
│   │   └── templates.ts          # 民事模板注册表（33 个模板元数据 + 通用表单 schema）
│   ├── data/app.db               # SQLite 数据库文件（自动创建）
│   ├── public/fonts/             # Web 字体 (霞鹜文楷, FandolKai, NotoSerifSC)
│   └── .env                      # 环境变量 (JWT_SECRET)
│
├── templates/                    # LaTeX 模板集合
│   ├── generate_civil.py         # 通用民事模板生成器（核心）
│   ├── 009_离婚纠纷民事起诉状/   # 各模板目录，内含:
│   │   ├── *.tex                 #   LaTeX 模板文件
│   │   ├── FZDBS.ttf, FZSSK.ttf  #   方正大标宋 / 方正小标宋 字体
│   │   └── temp/                 #   预览 JPEG 图片
│   ├── 011_买卖合同纠纷民事起诉状/
│   ├── ... (共 33 个民事模板)
│   └── 刑事附带民事自诉状_侮辱案/  # 刑事模板（独立 generate.py）
│
├── 民事起诉状/                    # 原始 PDF 参考文件（源模板扫描件）
├── scripts/                      # 工具脚本（PDF 转 JPEG、PDF 拆分等）
├── clearOCR/                     # OCR 测试素材
├── .agents/workflows/            # AI Agent 工作流文档
│   └── pdf-to-tex.md             # PDF → LaTeX 模板转换流程
└── agent.md                      # 本文件
```

---

## 核心流程

### 文书生成 (端到端)

```
用户填写表单 → POST /api/generate (JSON)
    → Node.js 调用 Python 子进程
    → generate_civil.py 加载 .tex 模板
    → 字段替换 (fill_field / fill_checkbox / fill_role_natural / fill_agent)
    → LaTeX 特殊字符转义 (& % # _ ~ ^)
    → xelatex 编译两次 (第二次修正页码)
    → 返回 PDF 二进制
    → 已登录用户自动存入 documents 表
    → 前端下载或预览
```

### AI 案件分析

```
用户输入案情 → POST /api/analyze
    → 选择分析模式 (案情梳理 / 法律检索 / 风险评估 / 策略建议)
    → 调用 Kimi API (k2-0905)
    → 已登录用户自动存入 analyses 表
    → 前端 Markdown 渲染
```

---

## 数据库 Schema

```sql
users       (id, email, password, name, created_at, updated_at)
cases       (id, user_id, title, description, status, created_at, updated_at)
documents   (id, user_id, title, template_id, form_data, created_at)
analyses    (id, user_id, input, mode, result, created_at)
```

- ID 格式: `c{timestamp_base36}{random}` (cuid-like)
- 位置: `web/data/app.db`，首次运行自动创建
- WAL 模式，开发环境 db 实例挂在 globalThis 避免热重载重复创建

---

## 模板系统

### 模板分类 (34 个)

| 分类 | 数量 | 编号范围 |
|------|------|----------|
| 婚姻家庭 | 1 | 009 |
| 合同纠纷 | 10 | 011-029 |
| 证券保险 | 6 | 031-041 |
| 知识产权 | 9 | 043-059 |
| 海事海商 | 4 | 073-079 |
| 环境公益 | 3 | 081-085 |
| 刑事 (独立) | 1 | 刑事附带民事自诉状_侮辱案 |

### 新增民事模板步骤

1. 准备原始 PDF → 放入 `民事起诉状/` 目录
2. 按 `.agents/workflows/pdf-to-tex.md` 流程：PDF → PNG → 逐页分析 → 编写 .tex
3. 在 `templates/<编号>_<名称>/` 目录下放入 `.tex` + 字体文件
4. 在 `web/lib/templates.ts` 的 `CIVIL_TEMPLATES` 数组中注册
5. `generate_civil.py` 通用处理，无需修改（除非新模板有特殊字段结构）

### LaTeX 模板关键组件

- `\lawtitle{主标题}{（副标题）}` — 标题
- `\begin{notesection}...\end{notesection}` — 说明框
- `\subtitlesection{标题}` — 区块标题
- `\pairsection{左栏}{右栏}` — 左右分栏表单
- `$\square$` — 勾选框（生成时替换为 ✓ 或 □）
- `\newpage` — 分页

### generate_civil.py 关键函数

| 函数 | 用途 |
|------|------|
| `fill_field(tex, label, value)` | 填充 "标签：" → "标签：值" |
| `fill_checkbox(tex, label, checked)` | 勾选 □ → ✓□ |
| `fill_role_natural(tex, section, data)` | 填充当事人自然人信息 |
| `fill_agent(tex, data)` | 填充委托代理人信息 |
| `escape_latex(text)` | 转义 LaTeX 特殊字符 |

---

## 开发指南

### 环境准备

```bash
# Web 应用
cd web && npm install && npm run dev  # http://localhost:3000

# Python 依赖 (文书生成)
pip install pymupdf  # fitz, 用于 PDF/图片处理

# LaTeX (XeLaTeX 编译)
sudo apt install texlive-xetex texlive-lang-chinese
```

### 环境变量 (`web/.env`)

```
JWT_SECRET="<生产环境必须更换>"
```

> Kimi API key 目前硬编码在 `web/app/api/analyze/route.ts`，后续应迁至 .env

### 常用命令

```bash
# 开发
cd web && npm run dev

# 构建
cd web && npm run build

# 手动编译单个模板验证
cd templates/009_离婚纠纷民事起诉状
xelatex -interaction=nonstopmode 009_离婚纠纷民事起诉状.tex

# PDF 转 JPEG 预览图
python3 scripts/pdf_to_jpeg.py
```

---

## 前端页面结构

### 首页 (`app/page.tsx`) — 模式导航

```
首页 → 智诉 (zhisu)
       ├── 智能文书生成 (document) — 模板列表 → /fill-civil?id=XXX
       └── 智能案件分析 (analysis) — AI 对话
     → 智记 (zhiji) [需登录]
       ├── 案件追踪 (cases) — 案件 CRUD
       └── 文件管理 (files)
           ├── 诉状 (documents) — 查看/编辑/下载已生成文书
           └── 分析 (analyses) — 查看已保存分析
```

### 填写页 (`app/fill-civil/page.tsx`)

- URL: `/fill-civil?id=009` (新建) 或 `/fill-civil?id=009&docId=xxx` (编辑)
- 左右分屏：表单 + PDF 预览
- 支持"刷新预览" 实时重新生成

---

## 认证系统

- 注册: bcrypt 哈希密码 → 存 users 表 → 签发 JWT
- 登录: 验证密码 → 签发 JWT → 写入 httpOnly Cookie (7天)
- 鉴权: 各 API Route 调用 `getCurrentUser()` 读取 Cookie
- 登出: 清除 Cookie

---

## 已知待办 / 改进方向

### 安全
- [ ] Kimi API key 迁至环境变量
- [ ] API 接口添加 rate limiting
- [ ] 生产环境更换 JWT_SECRET

### 功能
- [ ] OCR 识别现有文书自动填表
- [ ] 导出 DOCX 格式
- [ ] AI 辅助表单填写（根据案情描述自动提取字段）
- [ ] 模板预览缩略图（temp/ 目录已有 JPEG）
- [ ] 法人/组织当事人支持（当前仅自然人）

### 工程
- [ ] Docker 容器化部署
- [ ] CI/CD 流水线
- [ ] 生产环境迁移 PostgreSQL
- [ ] API 输入校验 (zod)
- [ ] 错误监控 (Sentry)
- [ ] 日志系统

---

## 关键文件速查

| 文件 | 行数 | 说明 |
|------|------|------|
| `web/app/page.tsx` | ~890 | 首页全部逻辑（智诉+智记） |
| `web/app/fill-civil/page.tsx` | — | 民事模板填写页 |
| `web/app/api/generate/route.ts` | — | PDF 生成 API |
| `web/app/api/analyze/route.ts` | — | AI 分析 API |
| `web/lib/db.ts` | ~273 | 数据库 Schema + CRUD |
| `web/lib/auth.ts` | ~67 | JWT 认证工具 |
| `web/lib/templates.ts` | ~132 | 模板注册表 |
| `templates/generate_civil.py` | ~419 | 通用民事文书生成器 |
| `.agents/workflows/pdf-to-tex.md` | ~92 | PDF 转 LaTeX 工作流 |
