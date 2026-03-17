#!/usr/bin/env python3
"""
诉状生成器：读取模板 .tex 和前端数据 .json，生成填写完毕的法律文书 PDF。

用法:
    python3 generate.py                              # 使用默认路径
    python3 generate.py --data my_data.json           # 指定数据文件
    python3 generate.py --output output/my_case.pdf   # 指定输出路径
"""

import json
import os
import sys
import subprocess
import shutil
import tempfile
import argparse

# ============================================================
# 常量
# ============================================================
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = SCRIPT_DIR
TEMPLATE_FILE = os.path.join(TEMPLATE_DIR, "刑事附带民事自诉状_侮辱案.tex")
DEFAULT_DATA = os.path.join(SCRIPT_DIR, "mock_data.json")
DEFAULT_OUTPUT = os.path.join(SCRIPT_DIR, "output", "诉状.pdf")

# LaTeX 勾选框 —— 使用 checkmark 叠加在 square 上，显示为 ✓
CHECKED = r"\rlap{\kern0.18em\raisebox{0.17ex}{\scalebox{0.78}{$\checkmark$}}}$\square$"
UNCHECKED = r"$\square$"

# 需要插入到 preamble 中的额外宏包（scalebox 需要 graphicx，已有）
PREAMBLE_EXTRA = ""  # graphicx 已加载，无需额外包


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


# ============================================================
# 区块级替换：在模板中精确定位并替换
# ============================================================
def fill_template(tex: str, data: dict) -> str:
    """填充整个模板。使用精确字符串匹配替换。"""

    # ---------- 自诉人 ----------
    su = data.get("自诉人", {})
    if su:
        # 姓名（自诉人 section 中）
        tex = tex.replace(
            "\\pairsection{自诉人}{\n姓名：\\\\",
            f"\\pairsection{{自诉人}}{{\n姓名：{escape_latex(su.get('姓名',''))}\\\\",
            1
        )
        # 性别
        g = su.get("性别", "")
        tex = tex.replace(
            "性别：男$\\square$\\hspace{1em}女$\\square$\\\\\n出生日期：\\hspace{2em}年",
            f"性别：男{cb(g=='男')}\\hspace{{1em}}女{cb(g=='女')}\\\\\n出生日期：{su.get('出生年','')}年",
            1
        )
        # 出生日期（同行替换）
        tex = tex.replace(
            "\\hspace{2em}月\\hspace{2em}日\\\\\n民族：\\\\\n出生地：",
            f"{su.get('出生月','')}月{su.get('出生日','')}日\\\\\n民族：{escape_latex(su.get('民族',''))}\\\\\n出生地：{escape_latex(su.get('出生地',''))}",
            1
        )
        tex = tex.replace(
            "出生地：\\\\\n文化程度：",
            f"出生地：\\\\\n文化程度：{escape_latex(su.get('文化程度',''))}",
            1
        ) if f"出生地：{escape_latex(su.get('出生地',''))}" not in tex else tex
        # 文化程度
        tex = tex.replace(
            f"文化程度：{escape_latex(su.get('文化程度',''))}\\\\\n\\makebox[0.5\\linewidth][l]{{职业：}}\\makebox[0.5\\linewidth][l]{{工作单位：}}",
            f"文化程度：{escape_latex(su.get('文化程度',''))}\\\\\n\\makebox[0.5\\linewidth][l]{{职业：{escape_latex(su.get('职业',''))}}}\\makebox[0.5\\linewidth][l]{{工作单位：{escape_latex(su.get('工作单位',''))}}}",
            1
        )
        # 户籍地、住址、联系电话、证件类型
        for prev, curr in [("工作单位：", "户籍地："), ("户籍地：", "住址："),
                            ("住址：", "联系电话："), ("联系电话：", "证件类型："),
                            ("证件类型：", "证件号码：")]:
            pass  # 太复杂，换个方式

    # ---- 改用更直接的方式：逐段替换整个 section 内容 ----
    # 重新开始，使用整段替换

    # 重读原始模板
    with open(TEMPLATE_FILE, "r", encoding="utf-8") as f:
        tex = f.read()

    # ===== 替换自诉人 section（lines 182-195）=====
    su = data.get("自诉人", {})
    g = su.get("性别", "")
    old_su = """\\pairsection{自诉人}{
姓名：\\\\
性别：男$\\square$\\hspace{1em}女$\\square$\\\\
出生日期：\\hspace{2em}年\\hspace{2em}月\\hspace{2em}日\\\\
民族：\\\\
出生地：\\\\
文化程度：\\\\
\\makebox[0.5\\linewidth][l]{职业：}\\makebox[0.5\\linewidth][l]{工作单位：}\\\\
户籍地：\\\\
住址：\\\\
联系电话：\\\\
证件类型：\\\\
证件号码：
}"""
    new_su = f"""\\pairsection{{自诉人}}{{
姓名：{escape_latex(su.get('姓名',''))}\\\\
性别：男{cb(g=='男')}\\hspace{{1em}}女{cb(g=='女')}\\\\
出生日期：{su.get('出生年','')}年{su.get('出生月','')}月{su.get('出生日','')}日\\\\
民族：{escape_latex(su.get('民族',''))}\\\\
出生地：{escape_latex(su.get('出生地',''))}\\\\
文化程度：{escape_latex(su.get('文化程度',''))}\\\\
\\makebox[0.5\\linewidth][l]{{职业：{escape_latex(su.get('职业',''))}}}\\makebox[0.5\\linewidth][l]{{工作单位：{escape_latex(su.get('工作单位',''))}}}\\\\
户籍地：{escape_latex(su.get('户籍地',''))}\\\\
住址：{escape_latex(su.get('住址',''))}\\\\
联系电话：{escape_latex(su.get('联系电话',''))}\\\\
证件类型：{escape_latex(su.get('证件类型',''))}\\\\
证件号码：{escape_latex(su.get('证件号码',''))}
}}"""
    tex = tex.replace(old_su, new_su, 1)

    # ===== 替换诉讼代理人 section（lines 202-212）=====
    dl = data.get("诉讼代理人", {})
    has_dl = dl.get("有无", "无") == "有"
    old_dl = """\\pairsection{诉讼代理人}{
有$\\square$\\\\
\\hspace*{21bp}姓名：\\\\
\\hspace*{21bp}\\makebox[0.33\\linewidth][l]{单位：}\\makebox[0.33\\linewidth][l]{职务：}\\makebox[0.33\\linewidth][l]{联系电话：}\\\\
\\hspace*{21bp}（诉讼代理人为非律师的自然人，请增加填写以下信息）\\\\
\\hspace*{21bp}住址：\\\\
\\hspace*{21bp}证件类型：\\\\
\\hspace*{21bp}证件号码：\\\\
\\hspace*{21bp}与自诉人的关系：\\\\
无$\\square$
}"""
    new_dl = f"""\\pairsection{{诉讼代理人}}{{
有{cb(has_dl)}\\\\
\\hspace*{{21bp}}姓名：{escape_latex(dl.get('姓名',''))}\\\\
\\hspace*{{21bp}}\\makebox[0.33\\linewidth][l]{{单位：{escape_latex(dl.get('单位',''))}}}\\makebox[0.33\\linewidth][l]{{职务：{escape_latex(dl.get('职务',''))}}}\\makebox[0.33\\linewidth][l]{{联系电话：{escape_latex(dl.get('联系电话',''))}}}\\\\
\\hspace*{{21bp}}（诉讼代理人为非律师的自然人，请增加填写以下信息）\\\\
\\hspace*{{21bp}}住址：{escape_latex(dl.get('住址',''))}\\\\
\\hspace*{{21bp}}证件类型：{escape_latex(dl.get('证件类型',''))}\\\\
\\hspace*{{21bp}}证件号码：{escape_latex(dl.get('证件号码',''))}\\\\
\\hspace*{{21bp}}与自诉人的关系：{escape_latex(dl.get('与自诉人的关系',''))}\\\\
无{cb(not has_dl)}
}}"""
    tex = tex.replace(old_dl, new_dl, 1)

    # ===== 替换法定代理人或代为告诉人 section（lines 215-229）=====
    fd = data.get("法定代理人或代为告诉人", {})
    has_fd = fd.get("有无", "无") == "有"
    fg = fd.get("性别", "")
    old_fd = """\\pairsection{法定代理人或\\\\代为告诉人}{
有$\\square$\\\\
\\hspace*{21bp}姓名：\\\\
\\hspace*{21bp}性别：男$\\square$\\hspace{1em}女$\\square$\\\\
\\hspace*{21bp}出生日期：\\\\
\\hspace*{21bp}民族：\\\\
\\hspace*{21bp}文化程度：\\\\
\\hspace*{21bp}\\makebox[0.5\\linewidth][l]{职业：}\\makebox[0.5\\linewidth][l]{工作单位：}\\\\
\\hspace*{21bp}住址：\\\\
\\hspace*{21bp}联系电话：\\\\
\\hspace*{21bp}证件类型：\\\\
\\hspace*{21bp}证件号码：\\\\
\\hspace*{21bp}与自诉人的关系：\\\\
无$\\square$
}"""
    new_fd = f"""\\pairsection{{法定代理人或\\\\代为告诉人}}{{
有{cb(has_fd)}\\\\
\\hspace*{{21bp}}姓名：{escape_latex(fd.get('姓名',''))}\\\\
\\hspace*{{21bp}}性别：男{cb(fg=='男')}\\hspace{{1em}}女{cb(fg=='女')}\\\\
\\hspace*{{21bp}}出生日期：{escape_latex(fd.get('出生日期',''))}\\\\
\\hspace*{{21bp}}民族：{escape_latex(fd.get('民族',''))}\\\\
\\hspace*{{21bp}}文化程度：{escape_latex(fd.get('文化程度',''))}\\\\
\\hspace*{{21bp}}\\makebox[0.5\\linewidth][l]{{职业：{escape_latex(fd.get('职业',''))}}}\\makebox[0.5\\linewidth][l]{{工作单位：{escape_latex(fd.get('工作单位',''))}}}\\\\
\\hspace*{{21bp}}住址：{escape_latex(fd.get('住址',''))}\\\\
\\hspace*{{21bp}}联系电话：{escape_latex(fd.get('联系电话',''))}\\\\
\\hspace*{{21bp}}证件类型：{escape_latex(fd.get('证件类型',''))}\\\\
\\hspace*{{21bp}}证件号码：{escape_latex(fd.get('证件号码',''))}\\\\
\\hspace*{{21bp}}与自诉人的关系：{escape_latex(fd.get('与自诉人的关系',''))}\\\\
无{cb(not has_fd)}
}}"""
    tex = tex.replace(old_fd, new_fd, 1)

    # ===== 替换被告人 section（lines 232-246）=====
    bg = data.get("被告人", {})
    bgg = bg.get("性别", "")
    old_bg = """\\pairsection{被告人}{
姓名：\\\\
性别：男$\\square$\\hspace{1em}女$\\square$\\\\
出生日期：\\hspace{2em}年\\hspace{2em}月\\hspace{2em}日\\\\
民族：\\\\
出生地：\\\\
文化程度：\\\\
\\makebox[0.5\\linewidth][l]{职业：}\\makebox[0.5\\linewidth][l]{工作单位：}\\\\
户籍地：\\\\
住址：\\\\
联系电话：\\\\
证件类型：\\\\
证件号码：\\\\
发布侮辱信息的网络平台的名称及账号：
}"""
    new_bg = f"""\\pairsection{{被告人}}{{
姓名：{escape_latex(bg.get('姓名',''))}\\\\
性别：男{cb(bgg=='男')}\\hspace{{1em}}女{cb(bgg=='女')}\\\\
出生日期：{bg.get('出生年','')}年{bg.get('出生月','')}月{bg.get('出生日','')}日\\\\
民族：{escape_latex(bg.get('民族',''))}\\\\
出生地：{escape_latex(bg.get('出生地',''))}\\\\
文化程度：{escape_latex(bg.get('文化程度',''))}\\\\
\\makebox[0.5\\linewidth][l]{{职业：{escape_latex(bg.get('职业',''))}}}\\makebox[0.5\\linewidth][l]{{工作单位：{escape_latex(bg.get('工作单位',''))}}}\\\\
户籍地：{escape_latex(bg.get('户籍地',''))}\\\\
住址：{escape_latex(bg.get('住址',''))}\\\\
联系电话：{escape_latex(bg.get('联系电话',''))}\\\\
证件类型：{escape_latex(bg.get('证件类型',''))}\\\\
证件号码：{escape_latex(bg.get('证件号码',''))}\\\\
发布侮辱信息的网络平台的名称及账号：{escape_latex(bg.get('网络平台',''))}
}}"""
    tex = tex.replace(old_bg, new_bg, 1)

    # ===== 是否提起附带民事诉讼 =====
    fsms = data.get("是否提起附带民事诉讼", "")
    old_fsms = "\\makebox[0.5\\linewidth][l]{是$\\square$}\\makebox[0.5\\linewidth][l]{否$\\square$}"
    new_fsms = f"\\makebox[0.5\\linewidth][l]{{是{cb(fsms=='是')}}}\\makebox[0.5\\linewidth][l]{{否{cb(fsms=='否')}}}"
    tex = tex.replace(old_fsms, new_fsms, 1)

    # ===== 诉讼请求 =====
    sq = data.get("诉讼请求", {})
    bname = escape_latex(sq.get("被告人姓名", "×××"))
    # 被告人姓名
    tex = tex.replace("请求对被告人×××\\hspace{0.5em}", f"请求对被告人{bname}\\hspace{{0.5em}}", 1)
    tex = tex.replace("请求被告人×××\\hspace{0.5em}", f"请求被告人{bname}\\hspace{{0.5em}}", 1)
    # 是否需要公安协助
    need_help = sq.get("是否需要公安机关协助", "") == "是"
    old_help = "是$\\square$（具体事项和线索）\\rule{120bp}{0.5pt}\\\\\n否$\\square$"
    clue = escape_latex(sq.get("具体事项和线索", ""))
    new_help = f"是{cb(need_help)}（具体事项和线索）{clue}\\\\\n否{cb(not need_help)}"
    tex = tex.replace(old_help, new_help, 1)

    # ===== 事实与理由 =====
    sy = data.get("事实与理由", {})
    fact = escape_latex(sy.get("事实", ""))
    reason = escape_latex(sy.get("理由", ""))
    # 事实
    tex = tex.replace(
        "请一并写明诉讼情况）：\\\\[51bp]",
        f"请一并写明诉讼情况）：\n\n{fact}\\\\[17bp]",
        1
    )
    # 理由
    tex = tex.replace(
        "法律依据）：\\\\[51bp]",
        f"法律依据）：\n\n{reason}\\\\[17bp]",
        1
    )

    # ===== 是否同意调解 =====
    tj = data.get("是否同意调解", {})
    zibu = tj.get("自诉部分", "")
    fudai = tj.get("附带民事部分", "")
    old_3cb = "\\makebox[0.33\\linewidth][c]{同意$\\square$}\\makebox[0.33\\linewidth][c]{不同意$\\square$}\\makebox[0.33\\linewidth][c]{暂不确定$\\square$}"
    # 自诉部分（第1次出现）
    new_zibu = (f"\\makebox[0.33\\linewidth][c]{{同意{cb(zibu=='同意')}}}"
                f"\\makebox[0.33\\linewidth][c]{{不同意{cb(zibu=='不同意')}}}"
                f"\\makebox[0.33\\linewidth][c]{{暂不确定{cb(zibu=='暂不确定')}}}")
    tex = tex.replace(old_3cb, new_zibu, 1)
    # 附带民事部分（第2次出现，但第1次已被替换，所以现在是第1次）
    new_fudai = (f"\\makebox[0.33\\linewidth][c]{{同意{cb(fudai=='同意')}}}"
                 f"\\makebox[0.33\\linewidth][c]{{不同意{cb(fudai=='不同意')}}}"
                 f"\\makebox[0.33\\linewidth][c]{{暂不确定{cb(fudai=='暂不确定')}}}")
    tex = tex.replace(old_3cb, new_fudai, 1)

    return tex


# ============================================================
# 主流程
# ============================================================
def generate(data_path: str, output_path: str):
    """主生成函数。"""
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    tex = fill_template("", data)  # fill_template 内部读取模板

    # 在临时目录编译
    tmpdir = tempfile.mkdtemp(prefix="lawdoc_")
    try:
        for font in ["FZDBS.ttf", "FZSSK.ttf"]:
            src = os.path.join(TEMPLATE_DIR, font)
            if os.path.exists(src):
                shutil.copy2(src, tmpdir)

        filled_tex = os.path.join(tmpdir, "filled.tex")
        with open(filled_tex, "w", encoding="utf-8") as f:
            f.write(tex)

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
            print(f"✅ 诉状已生成: {os.path.abspath(output_path)}")
        else:
            print("❌ PDF 生成失败，查看编译日志:", file=sys.stderr)
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
    parser = argparse.ArgumentParser(description="诉状生成器")
    parser.add_argument("--data", default=DEFAULT_DATA, help="数据 JSON 文件路径")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="输出 PDF 文件路径")
    args = parser.parse_args()

    if not os.path.exists(args.data):
        print(f"❌ 数据文件不存在: {args.data}", file=sys.stderr)
        sys.exit(1)
    if not os.path.exists(TEMPLATE_FILE):
        print(f"❌ 模板文件不存在: {TEMPLATE_FILE}", file=sys.stderr)
        sys.exit(1)

    generate(args.data, args.output)


if __name__ == "__main__":
    main()
