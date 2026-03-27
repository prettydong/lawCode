import re
import os
import glob

def fix_tex_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update notesection
    content = content.replace(
        'before=\\vspace*{-13.39bp}\\noindent,\n    after=\\par,',
        'before={\\par\\nointerlineskip\\vspace{-0.5pt}\\noindent},\n    after={\\par},'
    )
    
    # Also handle variants of notesection gap styles if present
    content = content.replace(
        'before=\\vspace*{-13.39bp}\\noindent,\n        after=\\par,',
        'before={\\par\\nointerlineskip\\vspace{-0.5pt}\\noindent},\n        after={\\par},'
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

    if old_pairsection in content:
        content = content.replace(old_pairsection, new_pairsection)

    # 4. Change numbered pairsections to pairsectionleft
    def replace_numbered_pairsection(match):
        return match.group(0).replace(r'\pairsection{', r'\pairsectionleft{')

    content = re.sub(r'\\pairsection\{\d+\..*?\}\{', replace_numbered_pairsection, content, flags=re.DOTALL)
    content = re.sub(r'\\pairsection\{是否.*?\n?.*?\}\{', replace_numbered_pairsection, content, flags=re.DOTALL)

    # 5. Fix gaps in the manual tcolorboxes for subtitles
    content = content.replace(
        'before={\\nointerlineskip\\vspace{-0.5pt}\\noindent},\n    after=\\vspace{0pt}',
        'before={\\par\\nointerlineskip\\vspace{-0.5pt}\\noindent},\n    after={\\par}'
    )
    content = content.replace(
        'before={\\nointerlineskip\\vspace{-0.5pt}\\noindent},\n    after=\\par,',
        'before={\\par\\nointerlineskip\\vspace{-0.5pt}\\noindent},\n    after={\\par},'
    )
    
    # Inline inline macro blocks if they exist
    content = content.replace(
        'before={\\nointerlineskip\\vspace{-0.5pt}\\noindent}, after=\\vspace{0pt}',
        'before={\\par\\nointerlineskip\\vspace{-0.5pt}\\noindent}, after={\\par}'
    )
    content = content.replace(
        'before={\\nointerlineskip\\vspace{-0.5pt}\\noindent}, after=\\par,',
        'before={\\par\\nointerlineskip\\vspace{-0.5pt}\\noindent}, after={\\par},'
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Fixed {filepath}")

# Paths to process
paths = [
    'templates/013_房屋买卖合同纠纷民事起诉状/013_房屋买卖合同纠纷民事起诉状.tex',
    'templates/015_金融借款合同纠纷民事起诉状/015_金融借款合同纠纷民事起诉状.tex',
    'templates/017_民间借贷纠纷民事起诉状/017_民间借贷纠纷民事起诉状.tex'
]

for p in paths:
    if os.path.exists(p):
        fix_tex_file(p)
