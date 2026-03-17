---
description: 将民事起诉状 PDF 转换为 LaTeX 模板的完整流程
---

# PDF → LaTeX 模板转换流程

## 1. 复制 PDF 到 /tmp（避免中文路径问题）
// turbo
```bash
cp /home/zdong/lawCode/民事起诉状/<PDF文件名>.pdf /tmp/<编号>.pdf
```

## 2. 用 fitz 将 PDF 转为 PNG 图片
// turbo
```bash
timeout 30 python3 -c "
import fitz
doc = fitz.open('/tmp/<编号>.pdf')
print(f'Pages: {doc.page_count}')
for i in range(doc.page_count):
    page = doc[i]
    pix = page.get_pixmap(dpi=150)
    pix.save(f'/tmp/<编号>_p{i+1}.png')
    print(f'Saved page {i+1}')
doc.close()
print('ALL DONE')
"
```
⚠️ 注意：fitz 命令可能会卡住不返回输出，但实际已执行完成。10秒后直接检查 `/tmp/<编号>_p*.png` 是否存在即可。

## 3. 查看所有 PNG 图片
用 `view_file` 工具逐页查看 PNG 图片，仔细分析文档结构：
- 标题（主标题 + 副标题）
- 说明框内容
- 各个 section 的分区（subtitlesection）
- 每个 pairsection 的左栏标签和右栏表单内容
- 勾选项（$\square$）
- 签字区域

## 4. 创建模板目录并复制字体
// turbo
```bash
mkdir -p /home/zdong/lawCode/templates/<编号>_<模板名称>
cp /home/zdong/lawCode/templates/刑事附带民事自诉状_侮辱案/FZDBS.ttf \
   /home/zdong/lawCode/templates/刑事附带民事自诉状_侮辱案/FZSSK.ttf \
   /home/zdong/lawCode/templates/<编号>_<模板名称>/
```

## 5. 编写 .tex 文件
参考模板：`templates/刑事附带民事自诉状_侮辱案/刑事附带民事自诉状_侮辱案.tex`

关键组件：
- `\lawtitle{主标题}{（副标题）}` — 文档标题
- `\begin{notesection}...\end{notesection}` — 说明框（第一页顶部）
- `\subtitlesection{标题}` — 区块副标题（如"当事人信息"、"诉讼请求"等）
- `\pairsection{左栏标签}{右栏内容}` — 左右分栏表单（如"原告"、"被告"等）
- 独立 tcolorbox — 不需要左右分栏的内容框
- 勾选框用 `$\square$`
- 页面分隔用 `\newpage`
- 最后的签字区：`\fzdbs\fontsize{15bp}{22bp}\selectfont 具状人（签字、盖章）：`

## 6. 编译验证
// turbo
```bash
cd /home/zdong/lawCode/templates/<编号>_<模板名称> && \
timeout 60 xelatex -interaction=nonstopmode <编号>_<模板名称>.tex 2>&1 | tail -5
```
确认输出 "Output written on ... (N pages)." 即为成功。Overfull hbox 警告可忽略。

## 7. 转换输出 PDF 为 PNG 供视觉对比
// turbo
```bash
timeout 30 python3 -c "
import fitz
doc = fitz.open('/home/zdong/lawCode/templates/<编号>_<模板名称>/<编号>_<模板名称>.pdf')
for i in range(doc.page_count):
    page = doc[i]
    pix = page.get_pixmap(dpi=150)
    pix.save(f'/tmp/<编号>_out_p{i+1}.png')
    print(f'Saved page {i+1}')
doc.close()
print('ALL DONE')
"
```
同样注意 fitz 可能不返回输出，直接检查文件是否存在。

## 8. 视觉对比
用 `view_file` 查看 `/tmp/<编号>_out_p*.png` 与 `/tmp/<编号>_p*.png` 逐页对比，确认内容和布局一致。

## 9. 通知用户核对
将生成的 tex 文件路径给用户，请用户核对后再继续下一个模板。
