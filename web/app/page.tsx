"use client";

import { useState, useMemo, useEffect } from "react";
import ReactMarkdown from "react-markdown";

type Mode = null | "document" | "analysis";

// 模板数据（后续可从 API 获取）
const TEMPLATES = [
  {
    id: "xingshi-wuru",
    name: "刑事（附带民事）自诉状（侮辱案）",
    desc: "适用于侮辱罪自诉案件，支持附带民事诉讼",
    category: "刑事自诉",
    pages: 3,
    tags: ["侮辱", "自诉", "附带民事", "网络侮辱"],
  },
  {
    id: "xingshi-feibang",
    name: "刑事（附带民事）自诉状（诽谤案）",
    desc: "适用于诽谤罪自诉案件，支持附带民事诉讼",
    category: "刑事自诉",
    pages: 3,
    tags: ["诽谤", "自诉", "附带民事", "网络诽谤"],
  },
  {
    id: "minshi-qinquan",
    name: "民事起诉状（名誉权侵权）",
    desc: "适用于名誉权侵权纠纷的民事诉讼",
    category: "民事诉讼",
    pages: 2,
    tags: ["名誉权", "侵权", "民事", "人格权"],
  },
  {
    id: "minshi-hetong",
    name: "民事起诉状（合同纠纷）",
    desc: "适用于买卖、租赁等合同纠纷",
    category: "民事诉讼",
    pages: 2,
    tags: ["合同", "违约", "民事", "买卖", "租赁"],
  },
  {
    id: "xingshi-qinhai",
    name: "刑事（附带民事）自诉状（故意伤害案）",
    desc: "适用于轻伤害自诉案件",
    category: "刑事自诉",
    pages: 3,
    tags: ["伤害", "自诉", "轻伤", "故意伤害"],
  },
  {
    id: "laodong-zhongcai",
    name: "劳动仲裁申请书",
    desc: "适用于劳动争议仲裁",
    category: "劳动争议",
    pages: 2,
    tags: ["劳动", "仲裁", "工资", "解雇", "社保"],
  },
];

const AVAILABLE_IDS = new Set(["xingshi-wuru"]);



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
   一级页面 — 选择功能
   ═══════════════════════════════════════════ */
function ChoicePage({ onSelect }: { onSelect: (m: Mode) => void }) {
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
                <div className="mt-2 text-[12px] text-[var(--color-accent)]">
                  进入 →
                </div>
              </div>
            </div>
          </button>

          {/* 分割线 */}
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
                <div className="mt-2 text-[12px] text-[var(--color-accent)]">
                  进入 →
                </div>
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

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    const scored = TEMPLATES.map((t) => {
      let score = 0;
      if (t.name.toLowerCase().includes(q)) score += 10;
      if (t.desc.toLowerCase().includes(q)) score += 5;
      if (t.category.toLowerCase().includes(q)) score += 7;
      t.tags.forEach((tag) => { if (tag.includes(q)) score += 3; });
      return { ...t, score };
    })
      .filter((t) => t.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 3);
  }, [query]);

  const hasQuery = query.trim().length > 0;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasQuery) {
      const t = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(t);
    } else {
      setVisible(false);
    }
  }, [hasQuery]);

  return (
    <div className="h-full overflow-auto px-6 pt-[6vh] fade-in relative">
      <BgDecor />
      <div className="w-full max-w-xl mx-auto relative z-10">
        <BackButton onClick={onBack} />

        {/* Title - 田字格 */}
        <div className="flex justify-center mb-8">
          <div className="inline-block">
            <div className="flex">
              {[["智", "#000"], ["诉", "#c23b22"]].map(([char, color]) => (
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
              <span className="text-[13px] text-[var(--color-text-muted)] tracking-[0.15em]">智能诉状生成</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <input
            className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(232,89,12,0.08)]"
            placeholder="搜索文书类型，如「侮辱」「合同」「劳动」..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Results */}
        <div
          className="transition-all duration-300 ease-out overflow-hidden"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0) scaleY(1)" : "translateY(-6px) scaleY(0.97)",
            transformOrigin: "top center",
            maxHeight: visible ? "400px" : "0px",
            pointerEvents: visible ? "auto" : "none",
          }}
        >
          {results.length === 0 && query.trim() ? (
            <div className="text-center py-10 text-[var(--color-text-muted)] text-[14px]">
              未找到匹配的模板
            </div>
          ) : (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
              {results.map((t, i) => {
                const available = AVAILABLE_IDS.has(t.id);
                return (
                  <a
                    key={t.id}
                    href={available ? "/fill" : "#"}
                    onClick={available ? undefined : (e) => e.preventDefault()}
                    className={`flex items-center gap-4 px-4 py-3.5 group transition-colors ${i > 0 ? "border-t border-[var(--color-border)]" : ""} ${available ? "hover:bg-[var(--color-surface-alt)]" : "opacity-45 cursor-not-allowed"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium text-[14px] truncate ${available ? "text-[var(--color-text)] group-hover:text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"} transition-colors`}>
                          {t.name}
                        </h3>
                        {!available && (
                          <span className="shrink-0 text-[11px] px-1.5 py-0.5 rounded bg-[var(--color-bg-warm)] text-[var(--color-text-muted)]">即将上线</span>
                        )}
                      </div>
                      <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5 truncate">
                        {t.desc} · {t.pages}页
                      </p>
                    </div>
                    {available && (
                      <span className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors shrink-0 text-sm">›</span>
                    )}
                  </a>
                );
              })}
            </div>
          )}
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
        <div className="relative mb-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl transition-all focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_3px_rgba(232,89,12,0.08)]">
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
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-bg-warm)] border border-[var(--color-border)] rounded-lg text-[12px] text-[#c23b22] font-semibold fade-in">
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
              className="w-8 h-8 flex items-center justify-center bg-[#c23b22] text-white rounded-full cursor-pointer hover:bg-[#a83220] transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
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
          <div className="mt-6 p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl fade-in">
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
   主页入口
   ═══════════════════════════════════════════ */
export default function HomePage() {
  const [mode, setMode] = useState<Mode>(null);

  if (mode === "document") return <DocumentPage onBack={() => setMode(null)} />;
  if (mode === "analysis") return <AnalysisPage onBack={() => setMode(null)} />;
  return <ChoicePage onSelect={setMode} />;
}
