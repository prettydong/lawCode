"use client";

import { useState, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// 使用 CDN worker 避免 webpack 配置
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
    url: string;
}

export default function PdfViewer({ url }: PdfViewerProps) {
    const [numPages, setNumPages] = useState(0);

    const options = useMemo(() => ({
        cMapUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    }), []);


    return (
        <div className="flex flex-col items-center gap-4 py-6 px-6">
            <Document
                file={url}
                onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                options={options}
                loading={
                    <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)] text-[13px]">
                        <span className="spinner mr-2" style={{ width: 16, height: 16 }} /> 加载 PDF...
                    </div>
                }
                error={
                    <div className="text-center py-20 text-[var(--color-text-muted)] text-[13px]">
                        PDF 加载失败
                    </div>
                }
            >
                {Array.from({ length: numPages }, (_, i) => (
                    <div key={i} className="mb-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                        <Page
                            pageNumber={i + 1}
                            width={520}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                        />
                    </div>
                ))}
            </Document>
            {numPages > 0 && (
                <p className="text-[11px] text-[var(--color-text-muted)] pb-4">
                    共 {numPages} 页
                </p>
            )}
        </div>
    );
}
