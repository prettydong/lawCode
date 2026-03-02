import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

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
  title: "智诉 — 法律文书智能生成",
  description: "在线填写表单，一键生成规范的法律文书 PDF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${wenkai.variable} ${kaiti.variable} ${songti.variable}`}>
      <head />
      <body className="flex flex-col h-screen overflow-hidden">
        <nav className="shrink-0 bg-[var(--color-bg)]/90 backdrop-blur-md border-b border-[var(--color-border-light)]">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 group">
              {/* Logo - 迷你田字格 */}
              <div className="w-[28px] h-[28px] relative flex items-center justify-center" style={{ border: "1.5px solid #ccc" }}>
                <div className="absolute left-0 right-0 top-1/2" style={{ borderTop: "0.5px dashed #ccc" }} />
                <div className="absolute top-0 bottom-0 left-1/2" style={{ borderLeft: "0.5px dashed #ccc" }} />
                <span className="relative z-10 text-[18px] leading-none" style={{ fontFamily: "var(--font-kaiti), serif", color: "#000", WebkitTextStroke: "0.5px #000" }}>智</span>
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-[var(--color-text)]">智诉</span>
            </a>
            <div className="flex items-center gap-5 text-[13px] text-[var(--color-text-muted)]">
              <a href="/" className="hover:text-[var(--color-text)] transition-colors">首页</a>
              <a href="/fill" className="hover:text-[var(--color-text)] transition-colors">填写文书</a>
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
