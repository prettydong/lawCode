import fitz
import sys

doc = fitz.open(sys.argv[1])
page = doc[0]

for b in page.get_text('rawdict')['blocks']:
    if b['type'] == 0:
        for l in b['lines']:
            for s in l['spans']:
                # print characters one by one with their bbox
                for c in s['chars']:
                    if c['c'] in ['刑', '事', '（', '附', '带', '民', '）', '自', '诉', '状', '侮', '辱', '案']:
                        print(f"Char: '{c['c']}', BBox: {c['bbox']}, Font: {s['font']}, Size: {s['size']:.1f}")
