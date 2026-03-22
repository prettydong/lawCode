# 模板系统重构计划

> 先以 009（离婚纠纷）、011（买卖合同纠纷）、013（房屋买卖合同纠纷） 为试点，验证通过后推广到全部 33 个模板。

---

## 一、LaTeX 层重构（方向 A）

### 目标
- 消除 ~120 行重复前导码（每个 .tex 几乎一样）
- 字体文件集中管理，不再每目录复制一份

### 具体方案

#### 1.1 创建 `templates/common/preamble.tex`
所有模板共享的前导码：
- `\documentclass`、`\usepackage` 列表
- `\definecolor{inkblack}`
- `\geometry`
- `\fancyhdr` 页脚配置
- `\newCJKfontfamily`（路径改为 `../common/fonts/`）
- `\AtBeginDocument{\color{inkblack}}`
- `\lawtitle`、`\notesection`、`\lawpar`、`\subtitlesection`
- `\pairsectionbase` / `\pairsection` / `\pairsectionleft` 命令

#### 1.2 创建 `templates/common/fonts/`
```
移动字体到统一目录：
  templates/common/fonts/FZDBS.ttf
  templates/common/fonts/FZSSK.ttf
```

#### 1.3 创建 `templates/common/notesection.tex`
所有模板共享的「说明框」内容。少量措辞差异用 `\newcommand{\notedesc}{...}` 各模板覆盖。

#### 1.4 创建 `templates/common/mediation.tex`
所有模板底部共享的「对纠纷解决方式的意愿」+ 具状人签字日期。

#### 1.5 重构后的模板结构
```latex
\input{../common/preamble}
\begin{document}
\lawtitle{民事起诉状}{（离婚纠纷）}
\input{../common/notesection}

\subtitlesection{当事人信息}
% ...当事人（模板差异化部分）

\subtitlesection{诉讼请求}
% ...模板特有诉讼请求字段

\subtitlesection{事实与理由}
% ...模板特有事实字段

\input{../common/mediation}
\end{document}
```

每个模板从 **400-630 行缩减到 ~100-300 行**。

---

## 二、数据驱动模板 Schema（方向 C）

### 2.1 schema.json 结构

```json
{
  "id": "009",
  "name": "离婚纠纷民事起诉状",
  "subtitle": "离婚纠纷",
  "partyType": "natural",
  "hasThirdParty": false,
  "sections": [
    {
      "id": "parties",
      "title": "当事人信息",
      "type": "builtin_parties"
    },
    {
      "id": "claims",
      "title": "诉讼请求",
      "hasFreeText": true,
      "fields": [
        { "id": "claim_1", "label": "1. 解除婚姻关系", "type": "textarea" },
        {
          "id": "claim_2", "label": "2. 夫妻共同财产", "type": "group",
          "fields": [
            { "id": "has_property", "label": "有无财产", "type": "radio", "options": ["有财产", "无财产"] },
            { "id": "house_detail", "label": "房屋明细", "type": "text" },
            { "id": "house_belong", "label": "房屋归属", "type": "radio", "options": ["原告", "被告", "其他"] }
          ]
        }
      ]
    },
    {
      "id": "facts",
      "title": "事实与理由",
      "hasFreeText": true,
      "fields": [...]
    },
    { "id": "preservation", "title": "诉前保全", "type": "builtin_preservation" },
    { "id": "mediation", "title": "调解意愿", "type": "builtin_mediation" }
  ]
}
```

### 2.2 三个试点模板差异对照

| 维度 | 009 离婚 | 011 买卖合同 | 013 房屋买卖合同 |
|------|---------|-------------|----------------|
| **当事人类型** | 仅自然人 | 自然人 + 法人 | 自然人 + 法人 |
| **有第三人** | ❌ | ✅ | ✅ |
| **诉讼请求字段数** | 9 项 | 10 项 | ~10 项 |
| **事实与理由字段数** | 8 项 | 24 项 | ~20 项 |
| **有约定管辖** | ❌ | ✅ | ✅ |
| **调解意愿** | ✅ | ✅ | ✅ |

### 2.3 改造 Python 生成器
- `generate_v2.py`：读取 `schema.json` + `.tex` + JSON 数据
- 根据 schema field id 自动匹配 `.tex` 中对应位置
- 保留 `generate_civil.py` 兼容未迁移模板

---

## 三、前端 Schema 驱动表单（方向 B）

### 3.1 共享组件抽取 → `components/form/`

| 组件 | 说明 |
|------|------|
| `Section.tsx` | 可折叠区块 |
| `Field.tsx` | 标签 + 输入容器 |
| `Input.tsx` | 文本输入 |
| `TextArea.tsx` | 多行输入 |
| `RadioGroup.tsx` | 单选组 |
| `PersonFields.tsx` | 自然人信息 |
| `OrgFields.tsx` | 法人组织信息 |
| `AgentFields.tsx` | 委托代理人 |
| `MediationFields.tsx` | 调解意愿 |

### 3.2 统一 `/fill` 页面
```
/fill?id=009  → 加载 009/schema.json → 自动渲染表单
/fill?id=011  → 加载 011/schema.json → 自动渲染表单
```
废弃 `/fill-civil` 页面，合并到统一的 `/fill`。

### 3.3 渲染逻辑
```tsx
function renderField(field: SchemaField, data, setData) {
  switch (field.type) {
    case "text":     return <Input ... />;
    case "textarea": return <TextArea ... />;
    case "radio":    return <RadioGroup ... />;
    case "group":    return <GroupFields ... />;
  }
}
```

---

## 四、文件结构变更

```
templates/
├── common/                         ← 【新建】
│   ├── preamble.tex                ← 共享前导码
│   ├── notesection.tex             ← 共享说明框
│   ├── mediation.tex               ← 共享调解意愿+签名
│   └── fonts/
│       ├── FZDBS.ttf
│       └── FZSSK.ttf
├── 009_离婚纠纷.../
│   ├── 009_xxx.tex                 ← 重构后（仅特有内容）
│   └── schema.json                 ← 【新建】
├── 011_买卖合同.../
│   ├── ...
│   └── schema.json                 ← 【新建】
├── 013_房屋买卖.../
│   └── schema.json                 ← 【新建】
├── generate_civil.py               ← 保留兼容
└── generate_v2.py                  ← 【新建】

web/app/
├── components/form/                ← 【新建】共享组件
├── fill/page.tsx                   ← 重构：统一入口
└── fill-civil/                     ← 废弃
```

---

## 五、执行顺序

| 阶段 | 内容 | 依赖 |
|------|------|------|
| **P1** | LaTeX 公共文件抽取（common/） | 无 |
| **P2** | 重构 009 .tex 使用 `\input` | P1 |
| **P3** | 编译验证 009 PDF 无差异 | P2 |
| **P4** | 创建 009 schema.json | 无 |
| **P5** | 创建 generate_v2.py（schema 驱动） | P4 |
| **P6** | 用 009 验证新生成器 | P2+P5 |
| **P7** | 重构 011、013 的 .tex + schema | P1+P6 |
| **P8** | 前端组件抽取 | 无 |
| **P9** | 统一 /fill 页面（schema 驱动表单） | P4+P8 |
| **P10** | 集成测试 + 旧页面迁移 | P7+P9 |
