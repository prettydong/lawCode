import fitz
doc = fitz.open('template.pdf')
page = doc[1]
for b in page.get_text('dict')['blocks']:
    if 'lines' in b:
        for l in b['lines']:
            for s in l['spans']:
                t = s['text'].strip()
                if t == '2':
                    print(f"Page 2 Text: '{t}', Size: {s['size']}, Font: {s['font']}, BBox: {s['bbox']}")
