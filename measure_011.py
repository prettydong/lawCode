import fitz

doc = fitz.open('民事起诉状/011_买卖合同纠纷民事起诉状_p71-76.pdf')

for page_idx in range(len(doc)):
    page = doc[page_idx]
    
    drawings = page.get_drawings()
    h_lines = []
    for d in drawings:
        for item in d['items']:
            if item[0] == 'l' and abs(item[1].y - item[2].y) < 1: 
                h_lines.append(item[1].y)
            elif item[0] == 're':
                h_lines.append(item[1].y0)
                h_lines.append(item[1].y1)
    
    h_lines = sorted(list(set([round(y, 1) for y in h_lines])))
    blocks = page.get_text("dict")["blocks"]
    
    print(f"\n--- Page {page_idx+1} ---")
    for i in range(len(h_lines) - 1):
        top_l = h_lines[i]
        bot_l = h_lines[i+1]
        if bot_l - top_l < 15: continue
        
        cell_texts = []
        for b in blocks:
            if "lines" not in b: continue
            for l in b["lines"]:
                y_top = l['bbox'][1]
                y_bot = l['bbox'][3]
                if y_top >= top_l - 2 and y_bot <= bot_l + 2:
                    text = "".join([s["text"] for s in l["spans"]]).strip()
                    if text: cell_texts.append((y_top, y_bot, text))
        
        if cell_texts:
            cell_texts.sort(key=lambda x: x[0])
            first_text_top = cell_texts[0][0]
            last_text_bot = cell_texts[-1][1]
            pad_top = round(first_text_top - top_l, 1)
            pad_bot = round(bot_l - last_text_bot, 1)
            cell_h = round(bot_l - top_l, 1)
            
            left_text = cell_texts[0][2][:20]
            
            right_texts = [t for t in cell_texts if "□" in t[2] or "：" in t[2] or ":" in t[2] or "姓名" in t[2] or "名称" in t[2] or "元" in t[2]]
            if right_texts:
                right_texts.sort(key=lambda x: x[0])
                r_first = right_texts[0][0]
                r_last = right_texts[-1][1]
                r_pad_top = round(r_first - top_l, 1)
                r_pad_bot = round(bot_l - r_last, 1)
                print(f"Cell H:{cell_h} | R-PadTop:{r_pad_top} R-PadBot:{r_pad_bot} | {left_text}")
            else:
                print(f"Cell H:{cell_h} | L-PadTop:{pad_top} L-PadBot:{pad_bot} | {left_text}")

