import fitz

doc = fitz.open('民事起诉状/049_侵害外观设计专利权纠纷民事起诉状_p449-457.pdf')

for page_idx in range(len(doc)):
    page = doc[page_idx]
    
    # Get all horizontal lines
    drawings = page.get_drawings()
    h_lines = []
    for d in drawings:
        for item in d['items']:
            if item[0] == 'l':
                p1, p2 = item[1], item[2]
                if abs(p1.y - p2.y) < 1: 
                    h_lines.append(p1.y)
            elif item[0] == 're':
                rect = item[1]
                h_lines.append(rect.y0)
                h_lines.append(rect.y1)
    
    h_lines = sorted(list(set([round(y, 1) for y in h_lines])))
    
    blocks = page.get_text("dict")["blocks"]
    
    for i in range(len(h_lines) - 1):
        top_l = h_lines[i]
        bot_l = h_lines[i+1]
        
        # Only consider cells that are somewhat tall
        if bot_l - top_l < 15: continue
        
        # Find text inside this cell
        cell_texts = []
        for b in blocks:
            if "lines" not in b: continue
            for l in b["lines"]:
                y_top = l['bbox'][1]
                y_bot = l['bbox'][3]
                if y_top >= top_l - 2 and y_bot <= bot_l + 2:
                    text = "".join([s["text"] for s in l["spans"]]).strip()
                    if text:
                        cell_texts.append((y_top, y_bot, text))
        
        if cell_texts:
            cell_texts.sort(key=lambda x: x[0])
            first_text_top = cell_texts[0][0]
            last_text_bot = cell_texts[-1][1]
            
            pad_top = round(first_text_top - top_l, 1)
            pad_bot = round(bot_l - last_text_bot, 1)
            cell_h = round(bot_l - top_l, 1)
            
            # Identify the cell by its first text
            left_text = cell_texts[0][2][:15]
            
            # Check if this looks like a right column cell by looking for right column content
            right_texts = [t for t in cell_texts if "□" in t[2] or "：" in t[2] or ":" in t[2] or "姓名" in t[2] or "名称" in t[2]]
            if right_texts:
                right_texts.sort(key=lambda x: x[0])
                r_first = right_texts[0][0]
                r_last = right_texts[-1][1]
                r_pad_top = round(r_first - top_l, 1)
                r_pad_bot = round(bot_l - r_last, 1)
                print(f"Pg {page_idx+1} Cell H:{cell_h} | R-PadTop:{r_pad_top} R-PadBot:{r_pad_bot} | {left_text}")

