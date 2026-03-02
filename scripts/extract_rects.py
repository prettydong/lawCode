import fitz
import sys

doc = fitz.open(sys.argv[1])
page = doc[0]

# Extract all drawings (paths) which include rectangles/lines
drawings = page.get_drawings()

print(f"Total drawings found: {len(drawings)}")
for i, d in enumerate(drawings[:20]):
    print(f"Drawing {i}: rect BBox: {d['rect']}, items: {d['items']}")
