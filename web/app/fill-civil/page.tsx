"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { CIVIL_TEMPLATES, COMMON_SECTIONS } from "@/lib/templates";

const PdfViewer = dynamic(() => import("../PdfViewer"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center p-10 text-[var(--color-text-muted)] text-[13px]">
            <span className="spinner mr-2" style={{ width: 16, height: 16 }} /> 加载中...
        </div>
    )
});

// ============================================================
// 表单组件
// ============================================================
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="glass-card p-4 md:p-5 -mt-[1px] relative z-0 hover:z-10 focus-within:z-10 fade-in">
            <div
                className="section-title cursor-pointer justify-between group select-none transition-opacity hover:opacity-80"
                style={{
                    marginBottom: isOpen ? '16px' : '0',
                    paddingBottom: isOpen ? '12px' : '0',
                    borderBottomColor: isOpen ? 'var(--color-border)' : 'transparent'
                }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{title}</span>
                <span className={`text-[10px] text-[var(--color-text-muted)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </div>
            {isOpen && <div className="fade-in">{children}</div>}
        </div>
    );
}

function Field({ label, children, span = 1 }: { label: string; children: React.ReactNode; span?: number }) {
    return (
        <div className={span === 2 ? "md:col-span-2" : ""}>
            <label className="form-label">{label}</label>
            {children}
        </div>
    );
}

function Input({ placeholder, value, onChange }: {
    placeholder?: string; value: string; onChange: (v: string) => void;
}) {
    return (
        <input
            className="form-input"
            placeholder={placeholder || ""}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    );
}

function RadioGroup({ options, value, onChange }: {
    options: string[]; value: string; onChange: (v: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-3">
            {options.map((opt) => (
                <button
                    key={opt}
                    type="button"
                    className={`form-check ${value === opt ? "selected" : ""}`}
                    onClick={() => onChange(opt)}
                >
                    <span className={`w-4 h-4 border-2 flex items-center justify-center ${value === opt ? "border-[var(--color-accent)]" : "border-[var(--color-text-muted)]"}`}>
                        {value === opt && <span className="w-2 h-2 bg-[var(--color-accent)]" />}
                    </span>
                    {opt}
                </button>
            ))}
        </div>
    );
}

// ============================================================
// 人员信息组件
// ============================================================
function PersonFields({ data, set }: {
    data: Record<string, string>;
    set: (key: string, val: string) => void;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 gap-y-4">
            <Field label="姓名"><Input value={data["姓名"] || ""} onChange={(v) => set("姓名", v)} /></Field>
            <Field label="性别"><RadioGroup options={["男", "女"]} value={data["性别"] || ""} onChange={(v) => set("性别", v)} /></Field>
            <Field label="出生年"><Input placeholder="如：1990" value={data["出生年"] || ""} onChange={(v) => set("出生年", v)} /></Field>
            <div className="grid grid-cols-2 gap-4">
                <Field label="出生月"><Input placeholder="如：6" value={data["出生月"] || ""} onChange={(v) => set("出生月", v)} /></Field>
                <Field label="出生日"><Input placeholder="如：15" value={data["出生日"] || ""} onChange={(v) => set("出生日", v)} /></Field>
            </div>
            <Field label="民族"><Input placeholder="如：汉族" value={data["民族"] || ""} onChange={(v) => set("民族", v)} /></Field>
            <Field label="工作单位"><Input value={data["工作单位"] || ""} onChange={(v) => set("工作单位", v)} /></Field>
            <Field label="职务"><Input value={data["职务"] || ""} onChange={(v) => set("职务", v)} /></Field>
            <Field label="联系电话"><Input value={data["联系电话"] || ""} onChange={(v) => set("联系电话", v)} /></Field>
            <Field label="住所地（户籍所在地）" span={2}><Input value={data["住所地（户籍所在地）"] || ""} onChange={(v) => set("住所地（户籍所在地）", v)} /></Field>
            <Field label="经常居住地" span={2}><Input value={data["经常居住地"] || ""} onChange={(v) => set("经常居住地", v)} /></Field>
            <Field label="证件类型"><Input placeholder="如：居民身份证" value={data["证件类型"] || ""} onChange={(v) => set("证件类型", v)} /></Field>
            <Field label="证件号码" span={2}><Input value={data["证件号码"] || ""} onChange={(v) => set("证件号码", v)} /></Field>
        </div>
    );
}

// ============================================================
// 主页面内容（包裹在 Suspense 中）
// ============================================================
function FillCivilContent() {
    const searchParams = useSearchParams();
    const templateId = searchParams.get("id") || "";
    const docId = searchParams.get("docId") || "";

    const template = CIVIL_TEMPLATES.find(t => t.id === templateId);

    // 当事人信息
    const [plaintiff, setPlaintiff] = useState<Record<string, string>>({});
    const [defendant, setDefendant] = useState<Record<string, string>>({});
    const [thirdParty, setThirdParty] = useState<Record<string, string>>({});
    const setP = (k: string, v: string) => setPlaintiff(p => ({ ...p, [k]: v }));
    const setD = (k: string, v: string) => setDefendant(p => ({ ...p, [k]: v }));
    const setT = (k: string, v: string) => setThirdParty(p => ({ ...p, [k]: v }));

    // 代理人
    const [agentHas, setAgentHas] = useState("");
    const [agent, setAgent] = useState<Record<string, string>>({});
    const setA = (k: string, v: string) => setAgent(p => ({ ...p, [k]: v }));

    // 诉讼请求
    const [requestText, setRequestText] = useState("");
    // 事实与理由
    const [factText, setFactText] = useState("");

    // PDF 预览
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const buildPayload = () => ({
        docId: docId || undefined,
        templateId,
        templateName: template ? `${template.subtitle} — ${plaintiff["姓名"] || "未命名"}` : "法律文书",
        当事人信息: {
            原告: plaintiff,
            被告: defendant,
            第三人: thirdParty,
            委托诉讼代理人: { 有无: agentHas, ...agent },
        },
        诉讼请求: { _自由文本: requestText },
        事实与理由: { _自由文本: factText },
    });

    const generatePreview = async (payload?: Record<string, unknown>) => {
        setPreviewLoading(true);
        try {
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload || buildPayload()),
            });
            if (!res.ok) return;
            const blob = await res.blob();
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
            setPdfUrl(URL.createObjectURL(blob));
        } catch { /* ignore */ }
        finally { setPreviewLoading(false); }
    };

    // 编辑模式：加载已有数据
    useEffect(() => {
        if (!docId) return;
        setIsEditMode(true);
        (async () => {
            try {
                const res = await fetch(`/api/files/documents/${docId}`);
                if (!res.ok) return;
                const json = await res.json();
                const doc = json.document;
                if (!doc?.form_data) return;
                const data = JSON.parse(doc.form_data);
                const parties = data.当事人信息 || {};
                if (parties.原告) setPlaintiff(parties.原告);
                if (parties.被告) setDefendant(parties.被告);
                if (parties.第三人) setThirdParty(parties.第三人);
                if (parties.委托诉讼代理人) {
                    setAgentHas(parties.委托诉讼代理人.有无 || "");
                    const { 有无: _, ...rest } = parties.委托诉讼代理人;
                    setAgent(rest);
                }
                if (data.诉讼请求?._自由文本) setRequestText(data.诉讼请求._自由文本);
                if (data.事实与理由?._自由文本) setFactText(data.事实与理由._自由文本);
                await generatePreview(data);
            } catch { }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(buildPayload()),
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "生成失败");
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            if (isEditMode) {
                if (pdfUrl) URL.revokeObjectURL(pdfUrl);
                setPdfUrl(url);
            } else {
                const a = document.createElement("a");
                a.href = url;
                a.download = `${template?.subtitle || "法律文书"}_${plaintiff["姓名"] || "未命名"}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "未知错误");
        } finally {
            setLoading(false);
        }
    };

    if (!template) {
        return (
            <div className="h-full flex items-center justify-center text-[var(--color-text-muted)]">
                <div className="text-center">
                    <p className="text-[16px] mb-2">未找到模板</p>
                    <a href="/" className="text-[var(--color-accent)] text-[13px] hover:underline">← 返回首页</a>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-full ${isEditMode ? 'flex px-[10%] gap-6' : 'overflow-auto'}`}>
            {/* PDF 预览面板 */}
            {isEditMode && (
                <div className="w-1/2 h-full border-r border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col shrink-0">
                    <div className="shrink-0 px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between">
                        <span className="text-[12px] text-[var(--color-text-muted)]">PDF 预览</span>
                        <div className="flex items-center gap-2">
                            {pdfUrl && (
                                <a href={pdfUrl} download={`${template.subtitle}.pdf`}
                                    className="text-[11px] text-[var(--color-accent)] hover:underline">下载</a>
                            )}
                            <button
                                onClick={() => generatePreview()}
                                disabled={previewLoading}
                                className="text-[11px] px-2 py-1 border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)] transition-colors cursor-pointer disabled:opacity-40">
                                {previewLoading ? "生成中..." : "刷新预览"}
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        {previewLoading && !pdfUrl && (
                            <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-[13px]">
                                <span className="spinner mr-2" style={{ width: 16, height: 16 }} /> 正在生成预览...
                            </div>
                        )}
                        {pdfUrl && <PdfViewer url={pdfUrl} />}
                        {!pdfUrl && !previewLoading && (
                            <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-[13px]">暂无预览</div>
                        )}
                    </div>
                </div>
            )}

            {/* 表单区域 */}
            <div className={`${isEditMode ? 'flex-1 overflow-auto' : ''}`}>
                <div className="max-w-3xl mx-auto px-4 py-8">
                    <div className="text-center mb-8 fade-in">
                        <h1 className="text-2xl font-bold mb-1">民事起诉状</h1>
                        <p className="text-[13px] text-[var(--color-text-muted)]">（{template.subtitle}）</p>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{template.desc}</p>
                    </div>

                    {/* 原告 */}
                    <Section title="原告信息">
                        <PersonFields data={plaintiff} set={setP} />
                    </Section>

                    {/* 委托诉讼代理人 */}
                    <Section title="委托诉讼代理人">
                        <Field label="是否有委托诉讼代理人">
                            <RadioGroup options={["有", "无"]} value={agentHas} onChange={setAgentHas} />
                        </Field>
                        {agentHas === "有" && (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 gap-y-4">
                                <Field label="姓名"><Input value={agent["姓名"] || ""} onChange={(v) => setA("姓名", v)} /></Field>
                                <Field label="单位"><Input value={agent["单位"] || ""} onChange={(v) => setA("单位", v)} /></Field>
                                <Field label="职务"><Input value={agent["职务"] || ""} onChange={(v) => setA("职务", v)} /></Field>
                                <Field label="联系电话"><Input value={agent["联系电话"] || ""} onChange={(v) => setA("联系电话", v)} /></Field>
                                <Field label="代理权限" span={2}>
                                    <RadioGroup options={["一般授权", "特别授权"]} value={agent["代理权限"] || ""} onChange={(v) => setA("代理权限", v)} />
                                </Field>
                            </div>
                        )}
                    </Section>

                    {/* 被告 */}
                    <Section title="被告信息">
                        <PersonFields data={defendant} set={setD} />
                    </Section>

                    {/* 第三人 */}
                    <Section title="第三人信息（选填）">
                        <PersonFields data={thirdParty} set={setT} />
                    </Section>

                    {/* 诉讼请求 */}
                    <Section title="诉讼请求">
                        <Field label="自由书写诉讼请求" span={2}>
                            <textarea className="form-input form-textarea" placeholder="请填写诉讼请求..." value={requestText} onChange={(e) => setRequestText(e.target.value)} />
                        </Field>
                    </Section>

                    {/* 事实与理由 */}
                    <Section title="事实与理由">
                        <Field label="自由书写事实与理由" span={2}>
                            <textarea className="form-input form-textarea" placeholder="请详细描述纠纷涉及的事实与理由..." value={factText} onChange={(e) => setFactText(e.target.value)} />
                        </Field>
                    </Section>

                    {/* 提交 */}
                    <div className="text-center mt-8 mb-20">
                        {error && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 text-sm">
                                ❌ {error}
                            </div>
                        )}
                        <button className="btn-primary text-[15px] px-10 py-3" onClick={handleSubmit} disabled={loading}>
                            {loading ? <><span className="spinner mr-2" /> 正在生成...</> : "生成起诉状 PDF"}
                        </button>
                        <p className="text-xs text-[var(--color-text-muted)] mt-4">点击后将自动下载格式规范的 PDF 文件</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function FillCivilPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><span className="spinner" style={{ width: 20, height: 20 }} /></div>}>
            <FillCivilContent />
        </Suspense>
    );
}
