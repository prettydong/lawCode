import re

with open('templates/017_民间借贷纠纷民事起诉状/017_民间借贷纠纷民事起诉状.tex', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Merge 第三人（法人、非法人组织） and move \newpage before it
part1_pattern = r'\\pairsection\{第三人\\\\（法人、非法人组织）\}\{\n名称：.*?统一社会信用代码：\n\}'
part2_pattern = r'\\pairsection\{第三人\\\\（法人、非法人组织）\}\{\n类型：有限责任公司.*?所有制性质：国有.*?\\rule\{60bp\}\{0\.5pt\}\n\}'

# We'll just replace the whole section from part 1 to part 2
full_pattern = r'\\pairsection\{第三人\\\\（法人、非法人组织）\}\{\n名称：.*?\n统一社会信用代码：\n\}\n\n\\newpage\n% ===== 第 3 页 =====\n\n\\pairsection\{第三人\\\\（法人、非法人组织）\}\{\n类型：有限责任公司.*?所有制性质：国有.*?\\rule\{60bp\}\{0\.5pt\}\n\}'

new_combined = r'''\newpage
% ===== 第 3 页 =====

\pairsection{第三人\\（法人、非法人组织）}{
\mbox{}\\
名称：\\
住所地（主要办事机构所在地）：\\
注册地 / 登记地：\\
法定代表人 / 负责人：\hspace{4em}职务：\hspace{4em}联系电话：\\
统一社会信用代码：\\
类型：有限责任公司$\square$\hspace{1em}股份有限公司$\square$\hspace{1em}上市公司$\square$\\
\hspace*{36bp}其他企业法人$\square$\hspace{1em}事业单位$\square$\hspace{1em}社会团体$\square$\hspace{1em}基金会$\square$\\
\hspace*{36bp}社会服务机构$\square$\hspace{1em}机关法人$\square$\hspace{1em}农村集体经济组织法人$\square$\\
\hspace*{36bp}城镇农村的合作经济组织法人$\square$\hspace{1em}基层群众性自治组织法人$\square$\\
\hspace*{36bp}个人独资企业$\square$\hspace{1em}合伙企业$\square$\hspace{1em}不具有法人资格的专业服务机构$\square$\\
所有制性质：国有$\square$（控股$\square$\hspace{1em}参股$\square$）\hspace{1em}民营$\square$\hspace{1em}其他\rule{60bp}{0.5pt}\\
\mbox{}
}'''

content = re.sub(full_pattern, new_combined, content, flags=re.DOTALL)

# 2. Add padding to the blocks on page 2 and page 1
# 原告自然人
content = content.replace(r'''\pairsection{原告\\（自然人）}{
姓名：\\
性别：男$\square$\hspace{1em}女$\square$\\
出生日期：\hspace{2em}年\hspace{2em}月\hspace{2em}日\hspace{4em}民族：\\
工作单位：\hspace{6em}职务：\hspace{4em}联系电话：\\
住所地（户籍所在地）：\\
经常居住地：\\
证件类型：\\
证件号码：
}''', r'''\pairsection{原告\\（自然人）}{
\mbox{}\\
姓名：\\
性别：男$\square$\hspace{1em}女$\square$\\
出生日期：\hspace{2em}年\hspace{2em}月\hspace{2em}日\hspace{4em}民族：\\
工作单位：\hspace{6em}职务：\hspace{4em}联系电话：\\
住所地（户籍所在地）：\\
经常居住地：\\
证件类型：\\
证件号码：\\
\mbox{}
}''')

# 原告法人
content = re.sub(r'\\pairsection\{原告\\\\（法人、非法人组织）\}\{\n名称：.*?\n所有制性质：国有.*?\\rule\{60bp\}\{0\.5pt\}\n.*?\}', 
                 lambda m: m.group(0).replace('名称：', '\\mbox{}\\\\\n名称：').replace('}\n\n\\newpage', '\\\\\n\\mbox{}\n}\n\n\\newpage').replace('专精特新中小企业$\\square$\n}', '专精特新中小企业$\\square$\\\\\n\\mbox{}\n}'), 
                 content, flags=re.DOTALL)

# 委托诉讼代理人
content = content.replace(r'''\pairsection{委托诉讼代理人}{
有$\square$\\
\hspace*{21bp}姓名：\\
\hspace*{21bp}\makebox[0.33\linewidth][l]{单位：}\makebox[0.33\linewidth][l]{职务：}\makebox[0.33\linewidth][l]{联系电话：}\\
\hspace*{21bp}代理权限：一般授权$\square$\hspace{1em}特别授权$\square$\hspace{1em}\rule{80bp}{0.5pt}\\
无$\square$
}''', r'''\pairsection{委托诉讼代理人}{
\mbox{}\\
有$\square$\\
\hspace*{21bp}姓名：\\
\hspace*{21bp}\makebox[0.33\linewidth][l]{单位：}\makebox[0.33\linewidth][l]{职务：}\makebox[0.33\linewidth][l]{联系电话：}\\
\hspace*{21bp}代理权限：一般授权$\square$\hspace{1em}特别授权$\square$\hspace{1em}\rule{80bp}{0.5pt}\\
无$\square$\\
\mbox{}
}''')

# 被告自然人
content = content.replace(r'''\pairsection{被告\\（自然人）}{
姓名：\\
性别：男$\square$\hspace{1em}女$\square$\\
出生日期：\hspace{2em}年\hspace{2em}月\hspace{2em}日\hspace{4em}民族：\\
工作单位：\hspace{6em}职务：\hspace{4em}联系电话：\\
住所地（户籍所在地）：\\
经常居住地：\\
证件类型：\\
证件号码：
}''', r'''\pairsection{被告\\（自然人）}{
\mbox{}\\
姓名：\\
性别：男$\square$\hspace{1em}女$\square$\\
出生日期：\hspace{2em}年\hspace{2em}月\hspace{2em}日\hspace{4em}民族：\\
工作单位：\hspace{6em}职务：\hspace{4em}联系电话：\\
住所地（户籍所在地）：\\
经常居住地：\\
证件类型：\\
证件号码：\\
\mbox{}
}''')

# 被告法人
content = re.sub(r'\\pairsection\{被告\\\\（法人、非法人组织）\}\{\n名称：.*?\n所有制性质：国有.*?\\rule\{60bp\}\{0\.5pt\}\n.*?\}', 
                 lambda m: m.group(0).replace('名称：', '\\mbox{}\\\\\n名称：').replace('专精特新中小企业$\\square$\n}', '专精特新中小企业$\\square$\\\\\n\\mbox{}\n}'), 
                 content, flags=re.DOTALL)

# 第三人自然人
content = content.replace(r'''\pairsection{第三人\\（自然人）}{
姓名：\\
性别：男$\square$\hspace{1em}女$\square$\\
出生日期：\hspace{2em}年\hspace{2em}月\hspace{2em}日\hspace{4em}民族：\\
工作单位：\hspace{6em}职务：\hspace{4em}联系电话：\\
住所地（户籍所在地）：\\
经常居住地：\\
证件类型：\\
证件号码：
}''', r'''\pairsection{第三人\\（自然人）}{
\mbox{}\\
姓名：\\
性别：男$\square$\hspace{1em}女$\square$\\
出生日期：\hspace{2em}年\hspace{2em}月\hspace{2em}日\hspace{4em}民族：\\
工作单位：\hspace{6em}职务：\hspace{4em}联系电话：\\
住所地（户籍所在地）：\\
经常居住地：\\
证件类型：\\
证件号码：\\
\mbox{}
}''')

with open('templates/017_民间借贷纠纷民事起诉状/017_民间借贷纠纷民事起诉状.tex', 'w', encoding='utf-8') as f:
    f.write(content)
