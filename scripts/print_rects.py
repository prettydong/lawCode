import fitz
import sys

try:
    doc = fitz.open(sys.argv[1])
    page = doc[0]
    drawings = page.get_drawings()
    print(f"Total drawings found: {len(drawings)}")
    for i, d in enumerate(drawings[:20]):
        print(f"Drawing {i}: rect BBox: {d['rect']}")
except Exception as e:
    print(e)
