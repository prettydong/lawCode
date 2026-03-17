#!/usr/bin/env python3
"""
通用民事起诉状生成器：读取任意民事起诉状 .tex 模板 + JSON 表单数据，
通过字符串替换填入数据后编译生成 PDF。

用法:
    python3 generate_civil.py --template <模板目录> --data <数据JSON> --output <输出PDF>

核心思路：
  所有民事起诉状共享 \\pairsection{标签}{内容} 结构。
  generate.py 解析 JSON 中的字段数据，用精确字符串匹配替换 .tex 中的
  空白字段（如 "姓名：" → "姓名：张三"），将 $\\square$ 替换为勾选/未勾选。
"""

import json
import os
import re
import sys
import subprocess
import shutil
import tempfile
import argparse

# ============================================================
# LaTeX 常量
# ============================================================
CHECKED = r"\rlap{\kern0.18em\raisebox{0.17ex}{\scalebox{0.78}{$\checkmark$}}}$\square$"
UNCHECKED = r"$\square$"


# ============================================================
# 工具函数
# ============================================================
def escape_latex(text: str) -> str:
    """转义 LaTeX 特殊字符（保留中文标点）。"""
    if not text:
        return ""
    for char, repl in [('&', r'\&'), ('%', r'\%'), ('#', r'\#'),
                        ('_', r'\_'), ('~', r'\textasciitilde{}'),
                        ('^', r'\textasciicircum{}')]:
        text = text.replace(char, repl)
    return text


def cb(selected: bool) -> str:
    """返回勾选/未勾选 LaTeX 符号。"""
    return CHECKED if selected else UNCHECKED


def fill_field(tex: str, label: str, value: str, occurrence: int = 1) -> str:
    """
    在 tex 中找到 "label：" 后面的空白/横线，填入 value。
    支持 "姓名：" → "姓名：张三" 这种简单替换。
    occurrence: 替换第几次出现(1-based)。
    """
    if not value:
        return tex
    val = escape_latex(value)
    # 精确匹配 "label：" 后面紧跟 \\ 或换行（表示空字段）
    pattern = label + "："
    count = 0
    idx = 0
    while True:
        pos = tex.find(pattern, idx)
        if pos == -1:
            break
        count += 1
        if count == occurrence:
            end = pos + len(pattern)
            tex = tex[:end] + val + tex[end:]
            break
        idx = pos + len(pattern)
    return tex


def fill_checkbox(tex: str, label_before: str, chosen_value: str, options: list, occurrence: int = 1) -> str:
    """
    替换一组 checkbox。
    找到 label_before 附近的 options 列表中各项的 $\\square$，
    将 chosen_value 对应的替换为 CHECKED，其余替换为 UNCHECKED。
    """
    # 简单实现：在整个tex中，按序替换每个 option+$\\square$ 组合
    for opt in options:
        old = opt + "$\\square$"
        if chosen_value == opt:
            new = opt + CHECKED
        else:
            new = opt + UNCHECKED
        # 只替换 occurrence 次
        count = 0
        idx = 0
        result = tex
        while True:
            pos = result.find(old, idx)
            if pos == -1:
                break
            count += 1
            if count == occurrence:
                result = result[:pos] + new + result[pos + len(old):]
                break
            idx = pos + len(old)
        tex = result
    return tex


def fill_sections(tex: str, data: dict) -> str:
    """
    通用的 section 填充。
    
    data 结构约定：
    {
        "templateId": "009",
        "templateName": "...",
        "当事人信息": {
            "原告": {
                "姓名": "张三",
                "性别": "男",
                "出生年": "1990", "出生月": "6", "出生日": "15",
                "民族": "汉",
                "工作单位": "...", "职务": "...", "联系电话": "...",
                "住所地": "...", "经常居住地": "...",
                "证件类型": "居民身份证", "证件号码": "..."
            },
            "被告": { ... },
            "第三人": { ... },
            "委托诉讼代理人": { "有无": "有", "姓名": "...", ... }
        },
        "诉讼请求": {
            "_自由文本": "...",
            "各项": { "1": { ... }, "2": { ... } }
        },
        "事实与理由": {
            "_自由文本": "...",
            "各项": { "1": { ... } }
        },
        "签署信息": { "具状人": "张三", "日期": "2026年3月8日" },
        ...
    }
    """
    
    # ===== 1. 当事人信息 =====
    parties = data.get("当事人信息", {})
    
    for role in ["原告", "被告", "第三人"]:
        person = parties.get(role, {})
        if not person:
            continue
        
        # 查找该角色的 pairsection 并填充
        # 自然人部分
        natural = person if isinstance(person, dict) else {}
        
        # 姓名
        tex = fill_role_natural(tex, role, natural)
    
    # 委托诉讼代理人
    agent = parties.get("委托诉讼代理人", {})
    if agent:
        has = agent.get("有无", "")
        if has:
            tex = fill_agent(tex, agent)
    
    # ===== 2. 诉讼请求自由文本 =====
    sq = data.get("诉讼请求", {})
    free_text = sq.get("_自由文本", "")
    if free_text:
        tex = tex.replace(
            "相关内容请在下方要素式表格中填写）\\\\[51bp]\n\\mbox{}",
            f"相关内容请在下方要素式表格中填写）\n\n{escape_latex(free_text)}\\\\[17bp]\n\\mbox{{}}",
            1
        )
    
    # 诉讼请求各项的具体字段
    sq_items = sq.get("各项", {})
    for key, item_data in sq_items.items():
        if isinstance(item_data, dict):
            for field, value in item_data.items():
                if field.startswith("_"):
                    continue
                tex = fill_field(tex, field, str(value))
    
    # ===== 3. 事实与理由自由文本 =====
    facts = data.get("事实与理由", {})
    free_fact = facts.get("_自由文本", "")
    if free_fact:
        # 第二个 "相关内容请在下方要素式表格中填写" 出现
        old_fact_box = "相关内容请在下方要素式表格中填写）\\\\[51bp]\n\\mbox{}"
        pos = tex.find(old_fact_box)
        if pos != -1:
            pos2 = tex.find(old_fact_box, pos + 1)
            if pos2 != -1:
                tex = tex[:pos2] + f"相关内容请在下方要素式表格中填写）\n\n{escape_latex(free_fact)}\\\\[17bp]\n\\mbox{{}}" + tex[pos2 + len(old_fact_box):]
    
    # 事实各项
    fact_items = facts.get("各项", {})
    for key, item_data in fact_items.items():
        if isinstance(item_data, dict):
            for field, value in item_data.items():
                if field.startswith("_"):
                    continue
                tex = fill_field(tex, field, str(value))
    
    # ===== 5. 调解意愿 =====
    mediate = data.get("调解意愿", {})
    understand = mediate.get("是否了解", "")
    if understand:
        tex = fill_checkbox(tex, "了解", understand, ["了解", "不了解"])
    consider = mediate.get("是否考虑先行调解", "")
    if consider:
        tex = fill_checkbox(tex, "是否考虑", consider, ["是", "否", "暂不确定，想要了解更多内容"])
    
    # ===== 6. 通用字段填充 —— 遍历 data 中所有平铺字段 =====
    flat_fields = data.get("字段", {})
    for field_label, value in flat_fields.items():
        if isinstance(value, str) and value:
            tex = fill_field(tex, field_label, value)
    
    # ===== 7. 勾选框 =====
    checkboxes = data.get("勾选", {})
    for group_label, chosen in checkboxes.items():
        if isinstance(chosen, str) and chosen:
            # 性别特殊处理
            if group_label == "性别":
                tex = fill_checkbox(tex, "性别：", chosen, ["男", "女"])
    
    return tex


def fill_role_natural(tex: str, role: str, person: dict) -> str:
    """填充一个角色的自然人信息（原告/被告/第三人）。
    在对应的 \\pairsection 中逐字段替换。"""
    if not person:
        return tex
    
    # 找到该角色的 pairsection 起始位置
    # 民事起诉状一般有: \\pairsection{原告}{...} 或 \\pairsection{原告\\（自然人）}{...}
    markers = [
        f"\\pairsection{{{role}}}",
        f"\\pairsection{{{role}\\\\（自然人）}}",
    ]
    
    for marker in markers:
        pos = tex.find(marker)
        if pos == -1:
            continue
        
        # 找到这个 section 的范围（到下一个 \\pairsection 或 \\subtitlesection）
        end_markers = ["\\pairsection{", "\\subtitlesection{", "\\newpage", "\\end{tcolorbox}"]
        section_end = len(tex)
        for em in end_markers:
            ep = tex.find(em, pos + len(marker) + 10)
            if ep != -1 and ep < section_end:
                section_end = ep
        
        section = tex[pos:section_end]
        original_section = section
        
        # 填充各字段
        g = person.get("性别", "")
        if g:
            section = section.replace("男$\\square$", f"男{cb(g=='男')}")
            section = section.replace("女$\\square$", f"女{cb(g=='女')}")
        
        for label in ["姓名", "民族", "工作单位", "职务", "联系电话",
                       "住所地（户籍所在地）", "经常居住地", "证件类型", "证件号码",
                       "住所地（主要办事机构所在地）", "注册地 / 登记地",
                       "法定代表人 / 负责人", "统一社会信用代码"]:
            val = person.get(label, "")
            if val:
                old_pattern = label + "："
                idx = section.find(old_pattern)
                if idx != -1:
                    end_idx = idx + len(old_pattern)
                    section = section[:end_idx] + escape_latex(val) + section[end_idx:]
        
        # 出生日期
        by = person.get("出生年", "")
        bm = person.get("出生月", "")
        bd = person.get("出生日", "")
        if by or bm or bd:
            section = section.replace(
                "出生日期：\\hspace{2em}年\\hspace{2em}月\\hspace{2em}日",
                f"出生日期：{by}年{bm}月{bd}日"
            )
        
        tex = tex.replace(original_section, section, 1)
        break  # 只处理第一个匹配的
    
    return tex


def fill_agent(tex: str, agent: dict) -> str:
    """填充委托诉讼代理人。"""
    has = agent.get("有无", "") == "有"
    
    # 找 "委托诉讼代理人" pairsection
    marker = "\\pairsection{委托诉讼代理人}{"
    pos = tex.find(marker)
    if pos == -1:
        return tex
    
    # 找这个 section 的结束
    end_markers = ["\\pairsection{", "\\subtitlesection{", "\\newpage"]
    section_end = len(tex)
    for em in end_markers:
        ep = tex.find(em, pos + len(marker) + 10)
        if ep != -1 and ep < section_end:
            section_end = ep
    
    section = tex[pos:section_end]
    original = section
    
    # 替换 有/无 checkbox
    section = section.replace("有$\\square$", f"有{cb(has)}", 1)
    section = section.replace("无$\\square$", f"无{cb(not has)}", 1)
    
    if has:
        for label in ["姓名", "单位", "职务", "联系电话"]:
            val = agent.get(label, "")
            if val:
                old = label + "："
                idx = section.find(old)
                if idx != -1:
                    end_idx = idx + len(old)
                    # 检查后面是否有 } 或 \\ 紧跟，不要在末尾添加
                    section = section[:end_idx] + escape_latex(val) + section[end_idx:]
        
        # 代理权限
        auth = agent.get("代理权限", "")
        if auth:
            section = section.replace("一般授权$\\square$", f"一般授权{cb(auth=='一般授权')}")
            section = section.replace("特别授权$\\square$", f"特别授权{cb(auth=='特别授权')}")
    
    tex = tex.replace(original, section, 1)
    return tex


# ============================================================
# 主流程
# ============================================================
def generate(template_dir: str, data_path: str, output_path: str):
    """主生成函数。"""
    # 找到模板 .tex 文件
    tex_files = [f for f in os.listdir(template_dir) if f.endswith('.tex')]
    if not tex_files:
        print(f"❌ 模板目录中没有 .tex 文件: {template_dir}", file=sys.stderr)
        sys.exit(1)
    
    template_file = os.path.join(template_dir, tex_files[0])
    
    with open(template_file, "r", encoding="utf-8") as f:
        tex = f.read()
    
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # 填充模板
    tex = fill_sections(tex, data)
    
    # 在临时目录编译
    tmpdir = tempfile.mkdtemp(prefix="lawdoc_")
    try:
        # 复制字体
        for font in ["FZDBS.ttf", "FZSSK.ttf"]:
            src = os.path.join(template_dir, font)
            if os.path.exists(src):
                shutil.copy2(src, tmpdir)
        
        filled_tex = os.path.join(tmpdir, "filled.tex")
        with open(filled_tex, "w", encoding="utf-8") as f:
            f.write(tex)
        
        # 编译两次确保页码正确
        for i in range(2):
            result = subprocess.run(
                ["xelatex", "-interaction=nonstopmode", "filled.tex"],
                cwd=tmpdir, capture_output=True, text=True, timeout=60,
            )
            if result.returncode != 0 and i == 1:
                print("⚠ XeLaTeX 编译警告", file=sys.stderr)
                print(result.stdout[-800:], file=sys.stderr)
        
        pdf_src = os.path.join(tmpdir, "filled.pdf")
        if os.path.exists(pdf_src):
            os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
            shutil.copy2(pdf_src, output_path)
            print(f"✅ 文书已生成: {os.path.abspath(output_path)}")
        else:
            print("❌ PDF 生成失败", file=sys.stderr)
            log = os.path.join(tmpdir, "filled.log")
            if os.path.exists(log):
                with open(log) as f:
                    lines = f.readlines()
                for l in lines[-30:]:
                    print(l.rstrip(), file=sys.stderr)
            sys.exit(1)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(description="通用民事起诉状生成器")
    parser.add_argument("--template", required=True, help="模板目录路径")
    parser.add_argument("--data", required=True, help="数据 JSON 文件路径")
    parser.add_argument("--output", required=True, help="输出 PDF 文件路径")
    args = parser.parse_args()
    
    if not os.path.isdir(args.template):
        print(f"❌ 模板目录不存在: {args.template}", file=sys.stderr)
        sys.exit(1)
    if not os.path.exists(args.data):
        print(f"❌ 数据文件不存在: {args.data}", file=sys.stderr)
        sys.exit(1)
    
    generate(args.template, args.data, args.output)


if __name__ == "__main__":
    main()
