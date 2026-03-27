import re

with open('templates/011_买卖合同纠纷民事起诉状/011_买卖合同纠纷民事起诉状.tex', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update notesection
content = content.replace(
    'before=\\vspace*{-13.39bp}\\noindent,\n    after=\\par,',
    'before={\\par\\nointerlineskip\\vspace{-0.5pt}\\noindent},\n    after={\\par},'
)

# 2. Update subtitlesection
content = content.replace(
    'before={\\nointerlineskip\\vspace{-0.5pt}\\noindent},\n        after=\\vspace{0pt}',
    'before={\\par\\nointerlineskip\\vspace{-0.5pt}\\noindent},\n        after={\\par}'
)

# 3. Replace pairsection definition with pairsectionbase, pairsection, pairsectionleft
old_pairsection = r'''% 左右分栏
\newcommand{\pairsection}[2]{%
    \begin{tcolorbox}[
        width=467.72bp,
        sharp corners,
        colback=white,
        colframe=inkblack,
        boxrule=0.5pt,
        enlarge left by=-19.28bp,
        before={\nointerlineskip\vspace{-0.5pt}\noindent},
        after=\par,
        boxsep=0pt,
        left=0pt, right=0pt,
        top=0pt, bottom=0pt
    ]
    \begin{minipage}[c]{112.9bp}%
        \centering\songti\fontsize{10.5bp}{10.5bp}\selectfont #1%
    \end{minipage}%
    \hspace{0pt}%
    \vrule width 0.5pt%
    \hspace{4bp}%
    \begin{minipage}[c]{346.32bp}%
        \vspace{4bp}%
        \songti\mdseries\fontsize{10.5bp}{17bp}\selectfont%
        \baselineskip=17bp%
        \setlength{\parindent}{0pt}%
        \color{inkblack}%
        #2%
        \vspace{4bp}%
    \end{minipage}%
    \end{tcolorbox}%
}'''

new_pairsection = r'''% 左右分栏
\newcommand{\pairsectionbase}[3]{%
    \begin{tcolorbox}[
        width=467.72bp,
        sharp corners,
        colback=white,
        colframe=inkblack,
        boxrule=0.5pt,
        enlarge left by=-19.28bp,
        before={\par\nointerlineskip\vspace{-0.5pt}\noindent},
        after={\par},
        boxsep=0pt,
        left=0pt, right=0pt,
        top=0pt, bottom=0pt
    ]
    \begin{minipage}[c]{112.9bp}%
        \vspace{2bp}%
        \songti\fontsize{10.5bp}{12bp}\selectfont
        #1#2%
        \vspace{2bp}%
    \end{minipage}%
    \hspace{0pt}%
    \vrule width 0.5pt%
    \hspace{4bp}%
    \begin{minipage}[c]{346.32bp}%
        \vspace{2bp}%
        \songti\mdseries\fontsize{10.5bp}{17bp}\selectfont%
        \baselineskip=17bp%
        \setlength{\parindent}{0pt}%
        \color{inkblack}%
        #3%
        \vspace{2bp}%
    \end{minipage}%
    \end{tcolorbox}%
}

\newcommand{\pairsection}[2]{%
    \pairsectionbase{\centering}{#1}{#2}%
}

\newcommand{\pairsectionleft}[2]{%
    \pairsectionbase{\raggedright\fontsize{10.5bp}{10.5bp}\selectfont}{#1}{#2}%
}'''

content = content.replace(old_pairsection, new_pairsection)

# 4. Change numbered pairsections to pairsectionleft
def replace_numbered_pairsection(match):
    return match.group(0).replace(r'\pairsection{', r'\pairsectionleft{')

content = re.sub(r'\\pairsection\{\d+\..*?\}\{', replace_numbered_pairsection, content, flags=re.DOTALL)
content = re.sub(r'\\pairsection\{是否.*?\n?.*?\}\{', replace_numbered_pairsection, content, flags=re.DOTALL)

# 5. Fix gaps in the manual tcolorboxes
content = content.replace(
    'before={\\nointerlineskip\\vspace{-0.5pt}\\noindent},\n    after=\\vspace{0pt}',
    'before={\\par\\nointerlineskip\\vspace{-0.5pt}\\noindent},\n    after={\\par}'
)
content = content.replace(
    'before={\\nointerlineskip\\vspace{-0.5pt}\\noindent},\n    after=\\par,',
    'before={\\par\\nointerlineskip\\vspace{-0.5pt}\\noindent},\n    after={\\par},'
)

# 6. Add empty lines (\mbox{}) for the visual padding of party info
def add_party_padding(match):
    block = match.group(0)
    # Split by '{' and '}' to find the right argument
    # We know the structure is \pairsection{LEFT}{RIGHT}
    parts = block.split('}{')
    if len(parts) == 2:
        right_part = parts[1][:-1] # remove trailing '}'
        if not right_part.strip().startswith(r'\mbox{}\\'):
            right_part = r'\mbox{}\\' + '\n' + right_part.lstrip()
        if not right_part.strip().endswith(r'\\ \mbox{}') and not right_part.strip().endswith(r'\\\mbox{}') and not right_part.strip().endswith(r'\\'+'\n'+r'\mbox{}'):
            if right_part.endswith('\n'):
                right_part = right_part[:-1] + r'\\' + '\n' + r'\mbox{}' + '\n'
            else:
                right_part += r'\\' + '\n' + r'\mbox{}'
        return parts[0] + '}{' + right_part + '}'
    return block

party_blocks = [
    r'\\pairsection\{原告.*?\}\{.*?^\}',
    r'\\pairsection\{被告.*?\}\{.*?^\}',
    r'\\pairsection\{委托诉讼代理人\}\{.*?^\}'
]

# We need a proper parser to find the balancing braces for pairsection
def replace_party_padding(text):
    result = ""
    idx = 0
    while idx < len(text):
        m = re.search(r'\\pairsection\{((?:原告|被告|第三人|委托诉讼代理人).*?)\}\{', text[idx:], flags=re.DOTALL)
        if not m:
            result += text[idx:]
            break
        
        start = idx + m.end()
        # Find closing brace
        depth = 1
        end = start
        while end < len(text) and depth > 0:
            if text[end] == '{': depth += 1
            elif text[end] == '}': depth -= 1
            end += 1
        
        result += text[idx:start]
        
        # Now we have the right content in text[start:end-1]
        right_content = text[start:end-1]
        if '统一社会信用代码：\n' in right_content and not '类型：' in right_content:
            # This is the split 第三人 (part 1). Do not add bottom padding.
            right_content = '\\mbox{}\\\\\n' + right_content.lstrip()
        elif '类型：有限责任公司' in right_content and not '名称：' in right_content:
            # This is the split 第三人 (part 2). Do not add top padding.
            right_content = right_content.rstrip() + '\\\\\n\\mbox{}\n'
        else:
            right_content = '\\mbox{}\\\\\n' + right_content.strip() + '\\\\\n\\mbox{}\n'
        
        result += right_content + '}'
        idx = end
    return result

content = replace_party_padding(content)

with open('templates/011_买卖合同纠纷民事起诉状/011_买卖合同纠纷民事起诉状.tex', 'w', encoding='utf-8') as f:
    f.write(content)
