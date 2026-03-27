import fitz

doc = fitz.open('民事起诉状/049_侵害外观设计专利权纠纷民事起诉状_p449-457.pdf')
page = doc[1]

blocks = page.get_text("dict")["blocks"]

h_lines = []
for d in page.get_drawings():
    for item in d['items']:
        if item[0] == 'l' and abs(item[1].y - item[2].y) < 1: 
            h_lines.append(item[1].y)
        elif item[0] == 're':
            h_lines.append(item[1].y0)
            h_lines.append(item[1].y1)

h_lines = sorted(list(set([round(y, 1) for y in h_lines])))

for b in blocks:
    if "lines" not in b: continue
    for l in b["lines"]:
        text = "".join([s["text"] for s in l["spans"]]).strip()
        if "有□" in text: print("有□ y-top:", l['bbox'][1])
        if "无□" in text: print("无□ y-bottom:", l['bbox'][3])
        if "委托诉讼代理人" in text: print("委托诉讼代理人 y-top:", l['bbox'][1], "y-bottom:", l['bbox'][3])

print("Lines:", h_lines)
