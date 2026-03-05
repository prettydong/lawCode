import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

import JoinUsButton from "./JoinUsButton";
import UserButton from "./UserButton";

const wenkai = localFont({
  src: [
    { path: "../public/fonts/LXGWWenKai-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/LXGWWenKai-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/LXGWWenKai-Medium.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/LXGWWenKai-Medium.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-wenkai",
  display: "swap",
});

const kaiti = localFont({
  src: [{ path: "../public/fonts/FandolKai-Regular.otf", weight: "400", style: "normal" }],
  variable: "--font-kaiti",
  display: "swap",
});

const songti = localFont({
  src: [{ path: "../public/fonts/NotoSerifSC-Regular.ttf", weight: "400", style: "normal" }],
  variable: "--font-songti",
  display: "swap",
});

export const metadata: Metadata = {
  title: "法智 — 以法为盾，以智护权",
  description: "AI 智能法律服务平台，提供法律文书生成、案件分析与案件管理",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${wenkai.variable} ${kaiti.variable} ${songti.variable}`}>
      <head />
      <body className="flex flex-col h-screen overflow-hidden">
        <nav className="shrink-0 bg-[var(--color-bg)]/90 backdrop-blur-md border-b border-[var(--color-border-light)]">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 group">
              {/* Logo - 迷你田字格：法智 */}
              <div className="flex">
                {[["法", "#c23b22"], ["智", "#000"]].map(([char, color]) => (
                  <div key={char} className="w-[28px] h-[28px] relative flex items-center justify-center -ml-[0.75px] first:ml-0" style={{ border: "1.5px solid #ccc" }}>
                    <div className="absolute left-0 right-0 top-1/2" style={{ borderTop: "0.5px dashed #ccc" }} />
                    <div className="absolute top-0 bottom-0 left-1/2" style={{ borderLeft: "0.5px dashed #ccc" }} />
                    <span className="relative z-10 text-[18px] leading-none" style={{ fontFamily: "var(--font-kaiti), serif", color, WebkitTextStroke: `0.5px ${color}` }}>{char}</span>
                  </div>
                ))}
              </div>

            </a>
            <div className="flex items-center gap-5 text-[13px] text-[var(--color-text-muted)]">
              <a href="/" className="hover:text-[var(--color-text)] transition-colors">首页</a>
              <JoinUsButton />
              <UserButton />
            </div>
          </div>
        </nav>
        <main className="flex-1 overflow-auto">{children}</main>
        <footer className="shrink-0 border-t border-[var(--color-border-light)] py-3 text-center text-[11px] text-[var(--color-text-muted)]">
          <span>© 2026 智诉科技 All Rights Reserved.</span>
          <span className="mx-2">|</span>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-text)] transition-colors">京ICP备2026XXXXXX号-1</a>
          <span className="mx-2">|</span>
          <span>京公网安备 110XXXXXXXXXXX号</span>
        </footer>
      </body>
    </html>
  );
}
