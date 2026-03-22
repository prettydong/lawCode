# LaTeX 模板编写规范

## 1. `\mbox{}` 使用规则

**规则**：`\mbox{}` 用于 `\pairsection` / `\pairsectionleft` 内容区底部，防止极短内容导致 minipage 高度不足。

**使用原则**：
- **有内容的 section**：底部放一个 `\mbox{}`，与 `pairsectionbase` 内置的 `\vspace{2bp}` 配合提供底部留白
- **空白占位 section**：放两个 `\mbox{}`（成对出现），确保框有最小高度
- **不要在内容区顶部加 `\mbox{}`**：顶部留白已由 `pairsectionbase` 的 `\vspace{2bp}` 提供，额外的 `\mbox{}\\` 会增加一整行高度（~17bp），破坏分页精确布局

**正确示例**：

```latex
% 有内容的 section —— 底部一个 \mbox{}
\pairsection{原告}{
姓名：\\
性别：男$\square$\hspace{1em}女$\square$\\
证件号码：\\
\mbox{}
}

% 空白占位 section —— 两个 \mbox{} 成对
\pairsectionleft{9. 其他请求}{
\mbox{}
\mbox{}
}
```

**错误示例**：

```latex
% ❌ 顶部加 \mbox{}\\ 会增加行高，破坏分页
\pairsection{原告}{
\mbox{}\\
姓名：\\
\mbox{}
}
```

---

## 2. 框与框之间必须紧密相连、无缝隙

**规则**：所有基于 `tcolorbox` 的命令（`notesection`、`subtitlesection`、`pairsection`、`pairsectionleft`、自由文本框）必须保证上下紧密相连，不出现任何缝隙。

**实现方式（已在 preamble.tex 中完成）**：

### a) 全局禁止段间距拉伸
```latex
\setlength{\parskip}{0pt}
```
ctexart 默认 `\parskip` 有 `plus 1pt` 弹性，会被 LaTeX 拉伸填充页面，导致框之间出现微小缝隙。

### b) 每个 tcolorbox 的 before/after 参数
```latex
before={\par\nointerlineskip\vspace{-0.5pt}\noindent},
after={\par}
```

- `\par`：结束当前段落，让 `\nointerlineskip` 生效
- `\nointerlineskip`：禁止行间距
- `\vspace{-0.5pt}`：消除边框线（0.5pt）造成的重叠间隙
- `\noindent`：防止缩进偏移

**⚠️ 常见错误**：漏掉 `\par` 会导致 `\nointerlineskip` 失效，框之间出现可见缝隙。

---

## 3. 重构后不要照搬原版 `\newpage`

**规则**：重构后的 `preamble.tex` 中 `pairsectionbase` 使用 `\vspace{2bp}`，而原版模板使用 `\vspace{4bp}`。每个框的上下间距差 4bp（上下各 2bp），一页十几个框累积可省出 **~60bp（约 2cm）**，导致一页能多放 1-2 个框。

**因此**：原版中精心安排的 `\newpage` 位置，在重构后不再适用。

**正确做法**：
- **默认不加 `\newpage`**，让 LaTeX 自然分页
- 只在明确需要的地方（如当事人信息区和诉讼请求区之间的逻辑分界）使用 `\newpage`
- 编译后检查 PDF，确认没有"一个框孤零零占一整页"的情况

**错误示例**：

```latex
% ❌ 照搬原版的 \newpage，导致 item 12 孤占一整页、下方大片空白
\pairsectionleft{12. 租赁物情况}{...}

\newpage

\pairsectionleft{13. 租金支付情况}{...}
```

**正确示例**：

```latex
% ✅ 去掉 \newpage，让内容自然流动
\pairsectionleft{12. 租赁物情况}{...}

\pairsectionleft{13. 租金支付情况}{...}
```

