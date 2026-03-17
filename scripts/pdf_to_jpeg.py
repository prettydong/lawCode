#!/usr/bin/env python3
"""
将 民事起诉状/ 下所有 PDF 转换为 JPEG，
输出到对应 templates/<NNN_xxxx>/temp/ 目录中。
每页一个文件，命名为 p1.jpg, p2.jpg, ...
文件夹不存在时自动创建。
"""
import os
import re
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF not installed. Run: pip install pymupdf")
    sys.exit(1)

PDF_DIR    = "/home/zdong/lawCode/民事起诉状"
TMPL_DIR   = "/home/zdong/lawCode/templates"
DPI        = 150
FMT        = "jpg"

pdf_files = sorted(f for f in os.listdir(PDF_DIR) if f.endswith(".pdf"))

for pdf_name in pdf_files:
    # 从文件名提取前缀，例如 "009_离婚纠纷民事起诉状"
    m = re.match(r"(\d{3}_[^_]+(?:_[^_p][^_]*)*)", pdf_name)
    if not m:
        print(f"[SKIP] Cannot parse prefix: {pdf_name}")
        continue
    prefix = m.group(1)

    # 找到 templates 目录中匹配的子目录
    matched = [d for d in os.listdir(TMPL_DIR)
               if os.path.isdir(os.path.join(TMPL_DIR, d)) and d.startswith(prefix)]
    if not matched:
        # 如果模板目录还不存在，就直接用 prefix 创建
        tmpl_sub = os.path.join(TMPL_DIR, prefix)
        os.makedirs(tmpl_sub, exist_ok=True)
        print(f"[NEW]  Created template dir: {prefix}")
    else:
        tmpl_sub = os.path.join(TMPL_DIR, matched[0])

    temp_dir = os.path.join(tmpl_sub, "temp")
    os.makedirs(temp_dir, exist_ok=True)

    pdf_path = os.path.join(PDF_DIR, pdf_name)
    print(f"[PROC] {pdf_name}  ->  {os.path.relpath(temp_dir, TMPL_DIR)}")

    try:
        doc = fitz.open(pdf_path)
        for i in range(doc.page_count):
            pix = doc[i].get_pixmap(dpi=DPI)
            out_path = os.path.join(temp_dir, f"p{i+1}.jpg")
            pix.save(out_path)
        # 不调用 doc.close() 以避免挂起
        print(f"         {doc.page_count} pages done.")
    except Exception as e:
        print(f"[ERR]  {pdf_name}: {e}")

print("\nAll done.")
