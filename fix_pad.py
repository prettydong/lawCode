import re
import os

with open('templates/017_民间借贷纠纷民事起诉状/017_民间借贷纠纷民事起诉状.tex', 'r', encoding='utf-8') as f:
    content = f.read()

# Add padding to all Natural Person blocks
old_nat = r'''姓名：\\
性别：男$\square$\hspace{1em}女$\square$\\
出生日期：\hspace{2em}年\hspace{2em}月\hspace{2em}日\hspace{4em}民族：\\
工作单位：\hspace{6em}职务：\hspace{4em}联系电话：\\
住所地（户籍所在地）：\\
经常居住地：\\
证件类型：\\
证件号码：
}'''
new_nat = r'''\mbox{}\\
姓名：\\
性别：男$\square$\hspace{1em}女$\square$\\
出生日期：\hspace{2em}年\hspace{2em}月\hspace{2em}日\hspace{4em}民族：\\
工作单位：\hspace{6em}职务：\hspace{4em}联系电话：\\
住所地（户籍所在地）：\\
经常居住地：\\
证件类型：\\
证件号码：\\
\mbox{}
}'''
content = content.replace(old_nat, new_nat)

# Add padding to top of Legal Person blocks
old_leg_top = r'''{
名称：\\
住所地（主要办事机构所在地）：\\'''
new_leg_top = r'''{
\mbox{}\\
名称：\\
住所地（主要办事机构所在地）：\\'''
content = content.replace(old_leg_top, new_leg_top)

# Add padding to bottom of Legal Person blocks
old_leg_bot = r'''上市公司$\square$：上市所在交易所：\\
专精特新中小企业$\square$
}'''
new_leg_bot = r'''上市公司$\square$：上市所在交易所：\\
专精特新中小企业$\square$\\
\mbox{}
}'''
content = content.replace(old_leg_bot, new_leg_bot)

with open('templates/017_民间借贷纠纷民事起诉状/017_民间借贷纠纷民事起诉状.tex', 'w', encoding='utf-8') as f:
    f.write(content)
