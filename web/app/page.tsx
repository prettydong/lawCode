"use client";

import { useState, useMemo, useEffect } from "react";

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

// 只有第一个模板实际可用
const AVAILABLE_IDS = new Set(["xingshi-wuru"]);

export default function HomePage() {
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
      // 微延迟确保 DOM 先渲染再触发动画
      const t = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(t);
    } else {
      setVisible(false);
    }
  }, [hasQuery]);

  return (
    <div className="h-full overflow-auto px-6 pt-[18vh] fade-in relative">
      {/* 装饰背景 - 古代法规竖排 + 当代法规横排 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
        {/* 古代法规 - 竖排 */}
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
          <div
            key={`v-${i}`}
            className="absolute"
            style={{
              top: item.top,
              left: item.left,
              writingMode: "vertical-rl",
              fontSize: `${item.size}px`,
              color: "var(--color-text)",
              opacity: 0.15,
              fontFamily: "var(--font-songti), SimSun, serif",
              letterSpacing: "0.15em",
              lineHeight: 1.8,
            }}
          >
            {item.text}
          </div>
        ))}
        {/* 当代法规 - 横排 */}
        {[
          { text: "中华人民共和国刑法", top: "18%", left: "20%", size: 15 },
          { text: "民事诉讼法", top: "72%", left: "75%", size: 16 },
          { text: "中华人民共和国民法典", top: "82%", left: "25%", size: 14 },
          { text: "刑事诉讼法", top: "45%", left: "70%", size: 15 },
          { text: "行政诉讼法", top: "58%", left: "18%", size: 14 },
          { text: "中华人民共和国宪法", top: "35%", left: "68%", size: 15 },
          { text: "治安管理处罚法", top: "88%", left: "60%", size: 14 },
        ].map((item, i) => (
          <div
            key={`h-${i}`}
            className="absolute"
            style={{
              top: item.top,
              left: item.left,
              fontSize: `${item.size}px`,
              color: "var(--color-text)",
              opacity: 0.12,
              letterSpacing: "0.3em",
              fontFamily: "var(--font-songti), SimSun, serif",
            }}
          >
            {item.text}
          </div>
        ))}
      </div>
      <div className="w-full max-w-xl mx-auto relative z-10">
        {/* Title - 田字格 */}
        <div className="flex justify-center mb-8">
          <div className="inline-block">
            {/* 田字格行 */}
            <div className="flex">
              {[["智", "#000"], ["诉", "#c23b22"]].map(([char, color]) => (
                <div
                  key={char}
                  className="w-[100px] h-[100px] relative flex items-center justify-center -ml-[1.5px] first:ml-0"
                  style={{ border: "1.5px solid #ccc" }}
                >
                  {/* 横虚线 */}
                  <div className="absolute left-0 right-0 top-1/2" style={{ borderTop: "1px dashed #ccc" }} />
                  {/* 竖虚线 */}
                  <div className="absolute top-0 bottom-0 left-1/2" style={{ borderLeft: "1px dashed #ccc" }} />
                  {/* 字 */}
                  <span
                    className="relative z-10 text-[64px] leading-none"
                    style={{
                      fontFamily: "var(--font-kaiti), KaiTi, 楷体, serif",
                      color: color,
                      WebkitTextStroke: `1.2px ${color}`,
                    }}
                  >
                    {char}
                  </span>
                </div>
              ))}
            </div>
            {/* 功能名 - 右对齐 */}
            <div className="text-right mt-1.5">
              <span className="text-[13px] text-[var(--color-text-muted)] tracking-[0.15em]">智能诉状生成</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="7" cy="7" r="5.5" />
              <line x1="11" y1="11" x2="14.5" y2="14.5" />
            </svg>
          </div>
          <input
            className="w-full pl-11 pr-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(232,89,12,0.08)]"
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
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-sm shrink-0">
                      📄
                    </div>
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
    </div >
  );
}
