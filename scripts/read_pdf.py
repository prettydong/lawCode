import fitz
import sys

def get_first_page_text(pdf_path):
    try:
        doc = fitz.open(pdf_path)
        page = doc[0]
        blocks = page.get_text('dict')['blocks']
        
        texts = []
        for b in blocks:
            if 'lines' in b:
                for l in b['lines']:
                    for s in l['spans']:
                        t = s['text'].strip()
                        if t:
                            texts.append(f"Text: '{t}', Size: {s['size']:.1f}, Font: {s['font']}, BBox: {s['bbox']}")
        
        for t in texts[:20]:
            print(t)
    except Exception as e:
        print(f"Error: {e}")

if len(sys.argv) > 1:
    get_first_page_text(sys.argv[1])
