import re
import os

def fix_tex_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the pairsection definition
    start_idx = content.find('\\newcommand{\\pairsection}[2]{')
    if start_idx == -1:
        print(f"Could not find pairsection in {filepath}")
        return

    # Find the end of the command block by tracking braces
    brace_depth = 0
    end_idx = -1
    for i in range(start_idx + len('\\newcommand{\\pairsection}[2]'), len(content)):
        if content[i] == '{':
            brace_depth += 1
        elif content[i] == '}':
            brace_depth -= 1
            if brace_depth == 0:
                end_idx = i + 1
                break
    
    if end_idx == -1:
        print(f"Could not find end of pairsection in {filepath}")
        return

    new_pairsection = r'''\newcommand{\pairsectionbase}[3]{%
    \begin{tcolorbox}[
        width=467.72bp, sharp corners, colback=white, colframe=inkblack, boxrule=0.5pt,
        enlarge left by=-19.28bp,
        before={\par\nointerlineskip\vspace{-0.5pt}\noindent}, after={\par},
        boxsep=0pt, left=0pt, right=0pt, top=0pt, bottom=0pt
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

    # Only replace if we haven't already inserted pairsectionbase
    if r'\newcommand{\pairsectionbase}' not in content:
        content = content[:start_idx] + new_pairsection + content[end_idx:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Fixed structure in {filepath}")

paths = [
    'templates/013_房屋买卖合同纠纷民事起诉状/013_房屋买卖合同纠纷民事起诉状.tex',
    'templates/015_金融借款合同纠纷民事起诉状/015_金融借款合同纠纷民事起诉状.tex',
    'templates/017_民间借贷纠纷民事起诉状/017_民间借贷纠纷民事起诉状.tex'
]

for p in paths:
    if os.path.exists(p):
        fix_tex_file(p)
