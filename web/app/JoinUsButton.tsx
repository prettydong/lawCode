"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

export default function JoinUsButton() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="hover:text-[var(--color-text)] transition-colors cursor-pointer"
            >
                加入我们
            </button>

            {/* 弹窗 - Portal 到 body */}
            {open &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center"
                        onClick={() => setOpen(false)}
                    >
                        {/* 遮罩 */}
                        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm fade-in" />
                        {/* 弹窗内容 */}
                        <div
                            className="relative bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl px-8 py-7 max-w-sm w-full mx-4 fade-in"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-[17px] font-semibold text-[var(--color-text)] mb-3 text-center">
                                加入我们
                            </h3>
                            <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed text-center mb-5">
                                我们正在寻找对法律科技充满热情的伙伴，如果你对 AI + 法律方向感兴趣，欢迎联系我们。
                            </p>
                            <div className="flex items-center justify-center gap-2 text-[14px] text-[var(--color-text)] font-medium mb-2">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="4" width="20" height="16" rx="0" />
                                    <polyline points="22,4 12,13 2,4" />
                                </svg>
                                hfut.hzd@gmail.com
                            </div>
                            <div className="flex items-center justify-center gap-2 text-[14px] text-[var(--color-text)] font-medium mb-5">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                +86 18326128934
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="w-full py-2.5 bg-[var(--color-text)] text-[var(--color-bg)] text-[13px] font-medium cursor-pointer hover:bg-[var(--color-primary-light)] transition-colors"
                            >
                                关闭
                            </button>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}
