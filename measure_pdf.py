import fitz

doc = fitz.open('民事起诉状/049_侵害外观设计专利权纠纷民事起诉状_p449-457.pdf')
page = doc[1] # Page 2

# Get all drawings (lines/rectangles)
drawings = page.get_drawings()
h_lines = []
for d in drawings:
    for item in d['items']:
        if item[0] == 'l':
            p1, p2 = item[1], item[2]
            if abs(p1.y - p2.y) < 1: # Horizontal line
                h_lines.append(p1.y)
        elif item[0] == 're':
            rect = item[1]
            h_lines.append(rect.y0)
            h_lines.append(rect.y1)

h_lines = sorted(list(set([round(y, 1) for y in h_lines])))
print("Horizontal lines Y:", h_lines)

# Get all text
blocks = page.get_text("dict")["blocks"]
for b in blocks:
    if "lines" in b:
        for l in b["lines"]:
            text = "".join([s["text"] for s in l["spans"]])
            print(f"Text: {text[:20]:<20} | Y-top: {round(l['bbox'][1], 1)} | Y-bottom: {round(l['bbox'][3], 1)}")
