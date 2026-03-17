"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { useConfirm } from "./ConfirmDialog";
import { CIVIL_TEMPLATES, CATEGORIES } from "@/lib/templates";

type Mode = null | "zhisu" | "document" | "analysis" | "cases";

interface CaseItem {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface DocumentItem {
  id: string;
  title: string;
  template_id: string;
  form_data: string;
  created_at: string;
}

interface AnalysisItem {
  id: string;
  input: string;
  mode: string;
  result: string;
  created_at: string;
}

type ZhijiTab = "cases" | "files";
type FileSubTab = "documents" | "analyses";

// 合并模板数据：旧模板 + 新民事起诉状模板
const OLD_TEMPLATES = [
  {
    id: "xingshi-wuru",
    name: "刑事（附带民事）自诉状（侮辱案）",
    desc: "适用于侮辱罪自诉案件，支持附带民事诉讼",
    category: "刑事自诉",
    pages: 3,
    tags: ["侮辱", "自诉", "附带民事", "网络侮辱"],
    href: "/fill",
    available: true,
  },
];

// 将所有模板统一成相同格式
const ALL_TEMPLATES = [
  ...OLD_TEMPLATES,
  ...CIVIL_TEMPLATES.map(t => ({
    id: t.id,
    name: t.name,
    desc: t.desc,
    category: t.category,
    pages: t.pages,
    tags: t.tags,
    href: `/fill-civil?id=${t.id}`,
    available: t.available,
  })),
];

const ALL_CATEGORIES = ["全部", "刑事自诉", ...CATEGORIES.filter(c => c !== "全部")];



/* ═══════════════════════════════════════════
   背景装饰
   ═══════════════════════════════════════════ */
function BgDecor() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
      {[
        { text: "诸断罪皆须具引律令格式正文", top: "8%", left: "5%", size: 18 },
        { text: "德礼为政教之本刑罚为政教之用", top: "12%", left: "88%", size: 17 },
        { text: "明德慎罚", top: "55%", left: "3%", size: 22 },
        { text: "法者天下之公器", top: "30%", left: "92%", size: 20 },
        { text: "杀人者死伤人者刑", top: "65%", left: "90%", size: 16 },
        { text: "王子犯法庶民同罪", top: "40%", left: "8%", size: 17 },
        { text: "出入人罪", top: "78%", left: "6%", size: 20 },
        { text: "五听之法", top: "20%", left: "15%", size: 19 },
      ].map((item, i) => (
        <div key={`v-${i}`} className="absolute" style={{
          top: item.top, left: item.left, writingMode: "vertical-rl",
          fontSize: `${item.size}px`, color: "var(--color-text)", opacity: 0.15,
          fontFamily: "var(--font-songti), SimSun, serif",
          letterSpacing: "0.15em", lineHeight: 1.8,
        }}>{item.text}</div>
      ))}
      {[
        { text: "中华人民共和国刑法", top: "18%", left: "20%", size: 15 },
        { text: "民事诉讼法", top: "72%", left: "75%", size: 16 },
        { text: "中华人民共和国民法典", top: "82%", left: "25%", size: 14 },
        { text: "刑事诉讼法", top: "45%", left: "70%", size: 15 },
        { text: "行政诉讼法", top: "58%", left: "18%", size: 14 },
        { text: "中华人民共和国宪法", top: "35%", left: "68%", size: 15 },
        { text: "治安管理处罚法", top: "88%", left: "60%", size: 14 },
      ].map((item, i) => (
        <div key={`h-${i}`} className="absolute" style={{
          top: item.top, left: item.left, fontSize: `${item.size}px`,
          color: "var(--color-text)", opacity: 0.12, letterSpacing: "0.3em",
          fontFamily: "var(--font-songti), SimSun, serif",
        }}>{item.text}</div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   返回按钮
   ═══════════════════════════════════════════ */
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors mb-6 cursor-pointer group"
    >
      <span className="transition-transform group-hover:-translate-x-0.5">←</span>
      返回
    </button>
  );
}

/* ═══════════════════════════════════════════
   顶层页面 — 智诉 | 智记 并列选择
   ═══════════════════════════════════════════ */
function LandingPage({ onSelect }: { onSelect: (m: Mode) => void }) {
  return (
    <div className="h-full flex flex-col px-6 fade-in relative">
      <BgDecor />
      <div className="w-full max-w-2xl mx-auto relative z-10 flex flex-col h-full">

        {/* 上部：Logo + 口号 居中偏上 */}
        <div className="flex-1 flex flex-col items-center justify-center" style={{ minHeight: 0 }}>
          {/* 法智 大 Logo */}
          <div className="flex justify-center mb-5">
            <div className="flex">
              {[["法", "#c23b22"], ["智", "#000"]].map(([char, color]) => (
                <div key={char} className="w-[140px] h-[140px] relative flex items-center justify-center -ml-[1.5px] first:ml-0" style={{ border: "1.5px solid #ccc" }}>
                  <div className="absolute left-0 right-0 top-1/2" style={{ borderTop: "1px dashed #ccc" }} />
                  <div className="absolute top-0 bottom-0 left-1/2" style={{ borderLeft: "1px dashed #ccc" }} />
                  <span className="relative z-10 text-[86px] leading-none" style={{
                    fontFamily: "var(--font-kaiti), KaiTi, 楷体, serif",
                    color, WebkitTextStroke: `1.5px ${color}`,
                  }}>{char}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 口号 */}
          <p className="text-[15px] text-[var(--color-text-muted)] tracking-[0.35em]">以法为盾，以智护权</p>
        </div>

        {/* 下部：功能面板 固定在底部 ~25% 区域 */}
        <div className="shrink-0 pb-[6vh]">

          <div className="max-w-xs mx-auto grid grid-cols-2 gap-0 border border-transparent hover:border-[var(--color-border)] divide-x divide-transparent hover:divide-[var(--color-border)] transition-colors duration-200">

            {/* 智诉 */}
            <button
              onClick={() => onSelect("zhisu")}
              className="group cursor-pointer text-center px-5 py-5 transition-colors hover:bg-[var(--color-surface-alt)]"
            >
              {/* 小田字格 */}
              <div className="flex justify-center mb-2.5">
                <div className="flex">
                  {[["智", "#000"], ["诉", "#c23b22"]].map(([char, color]) => (
                    <div key={char} className="w-[36px] h-[36px] relative flex items-center justify-center -ml-[1px] first:ml-0" style={{ border: "1px solid #ccc" }}>
                      <div className="absolute left-0 right-0 top-1/2" style={{ borderTop: "0.5px dashed #ccc" }} />
                      <div className="absolute top-0 bottom-0 left-1/2" style={{ borderLeft: "0.5px dashed #ccc" }} />
                      <span className="relative z-10 text-[22px] leading-none" style={{
                        fontFamily: "var(--font-kaiti), KaiTi, 楷体, serif",
                        color, WebkitTextStroke: `0.5px ${color}`,
                      }}>{char}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                文书生成 · 案件分析
              </p>
              <span className="block mt-2 text-[11px] text-[var(--color-accent)] opacity-0 group-hover:opacity-100 transition-opacity">进入 →</span>
            </button>

            {/* 智记 */}
            <button
              onClick={() => onSelect("cases")}
              className="group cursor-pointer text-center px-5 py-5 transition-colors hover:bg-[var(--color-surface-alt)]"
            >
              {/* 小田字格 */}
              <div className="flex justify-center mb-2.5">
                <div className="flex">
                  {[["智", "#000"], ["记", "#c23b22"]].map(([char, color]) => (
                    <div key={char} className="w-[36px] h-[36px] relative flex items-center justify-center -ml-[1px] first:ml-0" style={{ border: "1px solid #ccc" }}>
                      <div className="absolute left-0 right-0 top-1/2" style={{ borderTop: "0.5px dashed #ccc" }} />
                      <div className="absolute top-0 bottom-0 left-1/2" style={{ borderLeft: "0.5px dashed #ccc" }} />
                      <span className="relative z-10 text-[22px] leading-none" style={{
                        fontFamily: "var(--font-kaiti), KaiTi, 楷体, serif",
                        color, WebkitTextStroke: `0.5px ${color}`,
                      }}>{char}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                案件工作区管理
              </p>
              <span className="block mt-2 text-[11px] text-[var(--color-accent)] opacity-0 group-hover:opacity-100 transition-opacity">进入 →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   智诉内部 — 选择功能
   ═══════════════════════════════════════════ */
function ZhisuPage({ onSelect, onBack }: { onSelect: (m: Mode) => void; onBack: () => void }) {
  return (
    <div className="h-full overflow-auto px-6 pt-[14vh] fade-in relative">
      <BgDecor />
      <div className="w-full max-w-2xl mx-auto relative z-10">

        {/* 标题 - 田字格 */}
        <div className="flex justify-center mb-4">
          <div className="inline-block">
            <div className="flex">
              {[["智", "#000"], ["诉", "#c23b22"]].map(([char, color]) => (
                <div key={char} className="w-[90px] h-[90px] relative flex items-center justify-center -ml-[1.5px] first:ml-0" style={{ border: "1.5px solid #ccc" }}>
                  <div className="absolute left-0 right-0 top-1/2" style={{ borderTop: "1px dashed #ccc" }} />
                  <div className="absolute top-0 bottom-0 left-1/2" style={{ borderLeft: "1px dashed #ccc" }} />
                  <span className="relative z-10 text-[56px] leading-none" style={{
                    fontFamily: "var(--font-kaiti), KaiTi, 楷体, serif",
                    color, WebkitTextStroke: `1.2px ${color}`,
                  }}>{char}</span>
                </div>
              ))}
            </div>
            <div className="text-center mt-1.5">
              <span className="text-[12px] text-[var(--color-text-muted)] tracking-[0.15em]">你身边的法律助手</span>
            </div>
          </div>
        </div>

        {/* 功能列表 */}
        <div className="max-w-xs mx-auto">
          {/* 智能文书生成 */}
          <button
            onClick={() => onSelect("document")}
            className="group cursor-pointer w-full text-center px-4 py-4 transition-colors"
          >
            <h3 className="text-[15px] font-semibold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors">
              智能文书生成
            </h3>
            <div className="grid transition-all duration-300 ease-out group-hover:grid-rows-[1fr] grid-rows-[0fr]">
              <div className="overflow-hidden">
                <p className="text-[12px] text-[var(--color-text-muted)] leading-relaxed mt-2">
                  在线填写表单，一键生成规范的法律文书 PDF
                </p>
                <div className="mt-2 text-[12px] text-[var(--color-accent)]">进入 →</div>
              </div>
            </div>
          </button>

          <div className="mx-auto w-24 border-t border-[var(--color-border)]" />

          {/* 智能案件分析 */}
          <button
            onClick={() => onSelect("analysis")}
            className="group cursor-pointer w-full text-center px-4 py-4 transition-colors"
          >
            <h3 className="text-[15px] font-semibold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors">
              智能案件分析
            </h3>
            <div className="grid transition-all duration-300 ease-out group-hover:grid-rows-[1fr] grid-rows-[0fr]">
              <div className="overflow-hidden">
                <p className="text-[12px] text-[var(--color-text-muted)] leading-relaxed mt-2">
                  基于 AI 的案件分析系统，梳理案件要素、分析法律关系
                </p>
                <div className="mt-2 text-[12px] text-[var(--color-accent)]">进入 →</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   二级页面 — 智能文书生成
   ═══════════════════════════════════════════ */
function DocumentPage({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("全部");

  const filteredTemplates = useMemo(() => {
    let list = ALL_TEMPLATES;
    // 按分类筛选
    if (selectedCat !== "全部") {
      list = list.filter(t => t.category === selectedCat);
    }
    // 按搜索词
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.map(t => {
        let score = 0;
        if (t.name.toLowerCase().includes(q)) score += 10;
        if (t.desc.toLowerCase().includes(q)) score += 5;
        if (t.category.toLowerCase().includes(q)) score += 7;
        t.tags.forEach(tag => { if (tag.includes(q)) score += 3; });
        return { ...t, score };
      }).filter(t => t.score > 0).sort((a, b) => b.score - a.score);
    }
    return list;
  }, [query, selectedCat]);

  return (
    <div className="h-full overflow-auto px-6 pt-[4vh] fade-in relative">
      <BgDecor />
      <div className="w-full max-w-xl mx-auto relative z-10">
        <BackButton onClick={onBack} />

        {/* Title - 田字格 */}
        <div className="flex justify-center mb-6">
          <div className="inline-block">
            <div className="flex">
              {[["智", "#000"], ["诉", "#c23b22"]].map(([char, color]) => (
                <div key={char} className="w-[80px] h-[80px] relative flex items-center justify-center -ml-[1.5px] first:ml-0" style={{ border: "1.5px solid #ccc" }}>
                  <div className="absolute left-0 right-0 top-1/2" style={{ borderTop: "1px dashed #ccc" }} />
                  <div className="absolute top-0 bottom-0 left-1/2" style={{ borderLeft: "1px dashed #ccc" }} />
                  <span className="relative z-10 text-[50px] leading-none" style={{
                    fontFamily: "var(--font-kaiti), KaiTi, 楷体, serif",
                    color, WebkitTextStroke: `1.2px ${color}`,
                  }}>{char}</span>
                </div>
              ))}
            </div>
            <div className="text-right mt-1.5">
              <span className="text-[12px] text-[var(--color-text-muted)] tracking-[0.15em]">智能诉状生成</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <input
            className="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(232,89,12,0.08)]"
            placeholder="搜索文书类型，如「离婚」「合同」「保险」「海事」..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1 mb-4">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setSelectedCat(cat); setQuery(""); }}
              className={`px-3 py-1.5 text-[12px] cursor-pointer transition-colors ${selectedCat === cat
                  ? "bg-[var(--color-text)] text-[var(--color-bg)] font-medium"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Template list */}
        <div className="pb-10">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-10 text-[var(--color-text-muted)] text-[14px]">
              未找到匹配的模板
            </div>
          ) : (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
              {filteredTemplates.map((t, i) => (
                <a
                  key={t.id}
                  href={t.available ? t.href : "#"}
                  onClick={t.available ? undefined : (e) => e.preventDefault()}
                  className={`flex items-center gap-4 px-4 py-3 group transition-colors ${i > 0 ? "border-t border-[var(--color-border)]" : ""} ${t.available ? "hover:bg-[var(--color-surface-alt)]" : "opacity-45 cursor-not-allowed"}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-medium text-[13px] truncate ${t.available ? "text-[var(--color-text)] group-hover:text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"} transition-colors`}>
                        {t.name}
                      </h3>
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-[var(--color-bg-warm)] text-[var(--color-text-muted)]">
                        {t.category}
                      </span>
                      {!t.available && (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-[var(--color-bg-warm)] text-[var(--color-text-muted)]">即将上线</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 truncate">
                      {t.desc} · {t.pages}页
                    </p>
                  </div>
                  {t.available && (
                    <span className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors shrink-0 text-sm">›</span>
                  )}
                </a>
              ))}
            </div>
          )}
          <p className="text-center text-[11px] text-[var(--color-text-muted)] mt-3">
            共 {filteredTemplates.length} 个模板
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   二级页面 — 智能案件分析
   ═══════════════════════════════════════════ */
function AnalysisPage({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedExample, setSelectedExample] = useState<{ title: string; desc: string } | null>(null);

  const handleSubmit = async () => {
    if ((!input.trim() && !selectedExample) || loading) return;
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input.trim(),
          mode: selectedExample?.title || null,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setResult("⚠ " + data.error);
      } else {
        setResult(data.result);
      }
    } catch {
      setResult("⚠ 网络错误，请检查网络连接后重试");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = input.trim() || selectedExample;

  return (
    <div className="h-full overflow-auto px-6 pt-[6vh] fade-in relative">
      <BgDecor />
      <div className="w-full max-w-xl mx-auto relative z-10">
        <BackButton onClick={onBack} />

        {/* Title - 田字格 */}
        <div className="flex justify-center mb-8">
          <div className="inline-block">
            <div className="flex">
              {[["智", "#000"], ["析", "#c23b22"]].map(([char, color]) => (
                <div key={char} className="w-[100px] h-[100px] relative flex items-center justify-center -ml-[1.5px] first:ml-0" style={{ border: "1.5px solid #ccc" }}>
                  <div className="absolute left-0 right-0 top-1/2" style={{ borderTop: "1px dashed #ccc" }} />
                  <div className="absolute top-0 bottom-0 left-1/2" style={{ borderLeft: "1px dashed #ccc" }} />
                  <span className="relative z-10 text-[64px] leading-none" style={{
                    fontFamily: "var(--font-kaiti), KaiTi, 楷体, serif",
                    color, WebkitTextStroke: `1.2px ${color}`,
                  }}>{char}</span>
                </div>
              ))}
            </div>
            <div className="text-right mt-1.5">
              <span className="text-[13px] text-[var(--color-text-muted)] tracking-[0.15em]">智能案件分析</span>
            </div>
          </div>
        </div>

        {/* 输入区域 */}
        <div className="relative mb-4 bg-[var(--color-surface)] border border-[var(--color-border)] transition-all focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_3px_rgba(232,89,12,0.08)]">
          <textarea
            className="w-full px-4 pt-3 pb-14 bg-transparent text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none resize-none leading-relaxed"
            style={{ minHeight: "160px" }}
            placeholder={"请描述："}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && canSubmit) { e.preventDefault(); handleSubmit(); } }}
            autoFocus
          />
          {/* 底部栏：选中标签 + 发送按钮 */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 pb-3 pt-1">
            <div className="flex-1 min-w-0">
              {selectedExample && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-bg-warm)] border border-[var(--color-border)] text-[12px] text-[#c23b22] font-semibold fade-in">
                  {selectedExample.title}
                  <button
                    onClick={() => setSelectedExample(null)}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer leading-none"
                  >×</button>
                </span>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="w-8 h-8 flex items-center justify-center bg-[#c23b22] text-white cursor-pointer hover:bg-[#a83220] transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? (
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
              ) : (
                <span className="text-[16px] font-semibold leading-none" style={{ fontFamily: "var(--font-kaiti), serif" }}>解</span>
              )}
            </button>
          </div>
        </div>

        {/* 示例提示 */}
        {!result && !selectedExample && (
          <div className="max-w-xs mx-auto fade-in">
            {[
              { title: "案情梳理", desc: "自动提取关键事实" },
              { title: "法律检索", desc: "智能匹配相关法条" },
              { title: "风险评估", desc: "多维度风险分析" },
              { title: "策略建议", desc: "AI 辅助诉讼策略" },
            ].map((item, i) => (
              <div key={item.title}>
                {i > 0 && <div className="mx-auto w-20 border-t border-[var(--color-border)]" />}
                <button
                  onClick={() => setSelectedExample(item)}
                  className="group cursor-pointer w-full text-center px-3 py-2.5 transition-colors"
                >
                  <h4 className="text-[13px] font-semibold transition-colors text-[var(--color-text)] group-hover:text-[var(--color-accent)]">
                    {item.title}
                  </h4>
                  <div className="grid transition-all duration-300 ease-out group-hover:grid-rows-[1fr] grid-rows-[0fr]">
                    <div className="overflow-hidden">
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{item.desc}</p>
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 分析结果 */}
        {result && (
          <div className="mt-6 p-5 bg-[var(--color-surface)] border border-[var(--color-border)] fade-in">
            <h3 className="text-[14px] font-semibold text-[var(--color-text)] mb-3">分析结果</h3>
            <div className="prose-analysis text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   三级页面 — 智记（案件工作区）
   ═══════════════════════════════════════════ */
function CasesPage({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<ZhijiTab>("cases");
  const [fileTab, setFileTab] = useState<FileSubTab>("documents");
  const [needLogin, setNeedLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();

  // ── 案件追踪 state ──
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // ── 文件管理 state ──
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisItem[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // ── 通用 ──
  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } catch { return iso; }
  };

  // ── 案件数据 ──
  const fetchCases = useCallback(async () => {
    try {
      const res = await fetch("/api/cases");
      if (res.status === 401) { setNeedLogin(true); setLoading(false); return; }
      const data = await res.json();
      setCases(data.cases || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleCreate = async () => {
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), description: newDesc.trim() }),
      });
      if (res.ok) { setNewTitle(""); setNewDesc(""); setShowCreate(false); fetchCases(); }
    } catch { /* ignore */ } finally { setCreating(false); }
  };

  const handleDeleteCase = async (id: string) => {
    if (!(await confirm("确定删除此案件？"))) return;
    await fetch(`/api/cases/${id}`, { method: "DELETE" });
    fetchCases();
  };

  // ── 文件数据 ──
  const fetchFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      const [docRes, anaRes] = await Promise.all([
        fetch("/api/files/documents"),
        fetch("/api/files/analyses"),
      ]);
      if (docRes.ok) { const d = await docRes.json(); setDocuments(d.documents || []); }
      if (anaRes.ok) { const d = await anaRes.json(); setAnalyses(d.analyses || []); }
    } catch { /* ignore */ } finally { setFilesLoading(false); }
  }, []);

  // 切换到文件管理时加载
  useEffect(() => { if (tab === "files" && !needLogin) fetchFiles(); }, [tab, needLogin, fetchFiles]);

  const handleDeleteDoc = async (id: string) => {
    if (!(await confirm("确定删除此诉状记录？"))) return;
    await fetch(`/api/files/documents/${id}`, { method: "DELETE" });
    fetchFiles();
  };

  const handleDownloadDoc = async (d: any) => {
    if (downloadingId) return;
    setDownloadingId(d.id);
    try {
      const payload = JSON.parse(d.form_data);
      payload.docId = d.id; // 防止产生新副本
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("下载失败");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${d.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("下载失败，请重试");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteAnalysis = async (id: string) => {
    if (!(await confirm("确定删除此分析记录？"))) return;
    await fetch(`/api/files/analyses/${id}`, { method: "DELETE" });
    fetchFiles();
  };

  // ── Tab 样式 ──
  const tabCls = (active: boolean) =>
    `px-4 py-2 text-[13px] cursor-pointer transition-colors ${active
      ? "text-[var(--color-text)] border-b-2 border-[var(--color-text)] font-medium"
      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
    }`;

  const subTabCls = (active: boolean) =>
    `px-3 py-1.5 text-[12px] cursor-pointer transition-colors ${active
      ? "bg-[var(--color-text)] text-[var(--color-bg)]"
      : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
    }`;

  return (
    <div className="h-full overflow-auto px-6 pt-[4vh] fade-in relative">
      <BgDecor />
      <div className="w-full max-w-xl mx-auto relative z-10">

        {/* Title - 田字格 */}
        <div className="flex justify-center mb-6">
          <div className="inline-block">
            <div className="flex">
              {[["智", "#000"], ["记", "#c23b22"]].map(([char, color]) => (
                <div key={char} className="w-[80px] h-[80px] relative flex items-center justify-center -ml-[1.5px] first:ml-0" style={{ border: "1.5px solid #ccc" }}>
                  <div className="absolute left-0 right-0 top-1/2" style={{ borderTop: "1px dashed #ccc" }} />
                  <div className="absolute top-0 bottom-0 left-1/2" style={{ borderLeft: "1px dashed #ccc" }} />
                  <span className="relative z-10 text-[50px] leading-none" style={{
                    fontFamily: "var(--font-kaiti), KaiTi, 楷体, serif",
                    color, WebkitTextStroke: `1.2px ${color}`,
                  }}>{char}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 主 Tab ── */}
        <div className="flex justify-center gap-6 mb-6 border-b border-[var(--color-border)]">
          <button className={tabCls(tab === "cases")} onClick={() => setTab("cases")}>案件追踪</button>
          <button className={tabCls(tab === "files")} onClick={() => setTab("files")}>文件管理</button>
        </div>

        {/* 需要登录 */}
        {needLogin && (
          <div className="text-center py-16 fade-in">
            <p className="text-[14px] text-[var(--color-text-muted)] mb-4">请先登录后使用智记</p>
            <p className="text-[12px] text-[var(--color-text-muted)]">点击右上角「登录」按钮</p>
          </div>
        )}

        {/* 加载中 */}
        {loading && !needLogin && (
          <div className="text-center py-16"><span className="spinner" style={{ width: 20, height: 20 }} /></div>
        )}

        {/* ═══ 案件追踪 Tab ═══ */}
        {!loading && !needLogin && tab === "cases" && (
          <div className="fade-in">
            {/* 新建 */}
            <div className="mb-6">
              {!showCreate ? (
                <button onClick={() => setShowCreate(true)}
                  className="w-full py-3 border border-dashed border-[var(--color-border)] text-[14px] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors cursor-pointer">
                  + 新建案件
                </button>
              ) : (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 fade-in">
                  <input className="w-full px-3.5 py-2.5 bg-[var(--color-bg-warm)] border border-[var(--color-border)] text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(232,89,12,0.08)] mb-3"
                    placeholder="案件名称" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter" && newTitle.trim()) handleCreate(); }} />
                  <textarea className="w-full px-3.5 py-2.5 bg-[var(--color-bg-warm)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(232,89,12,0.08)] resize-none mb-3"
                    placeholder="案件描述（可选）" rows={2} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => { setShowCreate(false); setNewTitle(""); setNewDesc(""); }}
                      className="px-4 py-2 text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer">取消</button>
                    <button onClick={handleCreate} disabled={!newTitle.trim() || creating}
                      className="px-4 py-2 bg-[var(--color-text)] text-[var(--color-bg)] text-[13px] font-medium cursor-pointer hover:bg-[var(--color-primary-light)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      {creating ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> : "创建"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 案件列表 */}
            {cases.length === 0 ? (
              <div className="text-center py-12 text-[var(--color-text-muted)] text-[13px]">暂无案件，点击上方按钮新建</div>
            ) : (
              <div className="space-y-3">
                {cases.map((c) => (
                  <div key={c.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] px-5 py-4 group hover:border-[#d4d4cf] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[14px] font-medium text-[var(--color-text)] truncate">{c.title}</h4>
                        {c.description && <p className="text-[12px] text-[var(--color-text-muted)] mt-1 line-clamp-2">{c.description}</p>}
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`text-[11px] px-2 py-0.5 ${c.status === "active" ? "bg-green-50 text-[#2d8659]" : "bg-gray-100 text-[var(--color-text-muted)]"}`}>
                            {c.status === "active" ? "进行中" : c.status === "closed" ? "已结案" : c.status}
                          </span>
                          <span className="text-[11px] text-[var(--color-text-muted)]">{formatDate(c.created_at)}</span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteCase(c.id)}
                        className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-all cursor-pointer text-[13px] shrink-0 mt-0.5" title="删除">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ 文件管理 Tab ═══ */}
        {!loading && !needLogin && tab === "files" && (
          <div className="fade-in">
            {/* 子 Tab：诉状 / 分析 */}
            <div className="flex items-center gap-2 mb-5">
              <button className={subTabCls(fileTab === "documents")} onClick={() => setFileTab("documents")}>诉状</button>
              <button className={subTabCls(fileTab === "analyses")} onClick={() => setFileTab("analyses")}>分析</button>
            </div>

            {filesLoading && (
              <div className="text-center py-12"><span className="spinner" style={{ width: 20, height: 20 }} /></div>
            )}

            {/* 诉状列表 */}
            {!filesLoading && fileTab === "documents" && (
              documents.length === 0 ? (
                <div className="text-center py-12 text-[var(--color-text-muted)] text-[13px]">暂无诉状记录，在智诉中生成文书后自动归档</div>
              ) : (
                <div className="border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                  {documents.map((d) => (
                    <div key={d.id} className="px-4 py-3 group hover:bg-[var(--color-surface-alt)] transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 shrink-0">诉状</span>
                          <h4 className="text-[13px] text-[var(--color-text)] truncate">{d.title}</h4>
                          <span className="text-[11px] text-[var(--color-text-muted)] shrink-0">{formatDate(d.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button onClick={() => handleDownloadDoc(d)} disabled={downloadingId === d.id}
                            className="text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:underline transition-colors cursor-pointer disabled:opacity-50">
                            {downloadingId === d.id ? "生成中..." : "下载"}
                          </button>
                          <a href={`/fill?docId=${d.id}`}
                            className="text-[11px] text-[var(--color-accent)] hover:underline transition-colors">编辑</a>
                          <button onClick={() => handleDeleteDoc(d.id)}
                            className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-all cursor-pointer text-[12px]">✕</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}


            {/* 分析列表 */}
            {!filesLoading && fileTab === "analyses" && (
              analyses.length === 0 ? (
                <div className="text-center py-12 text-[var(--color-text-muted)] text-[13px]">暂无分析记录，在智诉中进行案件分析后自动归档</div>
              ) : (
                <div className="border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                  {analyses.map((a) => (
                    <div key={a.id} className="px-4 py-3 group hover:bg-[var(--color-surface-alt)] transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 shrink-0">{a.mode || "综合"}</span>
                            <p className="text-[13px] text-[var(--color-text)] truncate">{a.input || "(无输入)"}</p>
                            <span className="text-[11px] text-[var(--color-text-muted)] shrink-0">{formatDate(a.created_at)}</span>
                          </div>
                          {a.result && (
                            <p className="text-[11px] text-[var(--color-text-muted)] mt-1 line-clamp-2">{a.result.slice(0, 150)}</p>
                          )}
                        </div>
                        <button onClick={() => handleDeleteAnalysis(a.id)}
                          className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-all cursor-pointer text-[12px] shrink-0 mt-0.5">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   主页入口
   ═══════════════════════════════════════════ */
export default function HomePage() {
  const [mode, setMode] = useState<Mode>(null);

  if (mode === "document") return <DocumentPage onBack={() => setMode("zhisu")} />;
  if (mode === "analysis") return <AnalysisPage onBack={() => setMode("zhisu")} />;
  if (mode === "cases") return <CasesPage onBack={() => setMode(null)} />;
  if (mode === "zhisu") return <ZhisuPage onSelect={setMode} onBack={() => setMode(null)} />;
  return <LandingPage onSelect={setMode} />;
}
