import fitz
import os

pdf_path = '/home/zdong/lawCode/clearOCR/word/202506221742_01.pdf'
output_dir = '/home/zdong/lawCode/clearOCR'

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

doc = fitz.open(pdf_path)
toc = doc.get_toc()

# toc format: [level, title, page, ...]
print(f"Total TOC items: {len(toc)}")

contracts = []
for i, entry in enumerate(toc):
    level, title, page = entry[0], entry[1], entry[2]
    if '合同' in title:
        # Determine end page:
        # If there's a next entry at the same or higher level, the contract ends before it.
        # Otherwise, it ends at the end of the PDF.
        end_page = doc.page_count
        for j in range(i + 1, len(toc)):
            if toc[j][0] <= level:
                end_page = toc[j][2] - 1
                break
        
        # Ensure end_page is valid
        if end_page < page:
            end_page = page
            
        contracts.append({
            'title': title.replace('/', '_').replace('\\', '_'),
            'start': page,
            'end': end_page
        })

print(f"Found {len(contracts)} contracts:")
for c in contracts:
    print(f"- {c['title']}: p{c['start']}-p{c['end']}")
    
    # Create sub-pdf
    new_doc = fitz.open()
    # page numbers in fitz are 0-indexed, TOC pages are 1-indexed (usually)
    new_doc.insert_pdf(doc, from_page=c['start']-1, to_page=c['end']-1)
    
    out_name = f"{c['title']}.pdf"
    out_path = os.path.join(output_dir, out_name)
    new_doc.save(out_path)
    new_doc.close()
    print(f"  Saved to {out_path}")

doc.close()
