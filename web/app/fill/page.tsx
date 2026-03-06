"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("../PdfViewer"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center p-10 text-[var(--color-text-muted)] text-[13px]">
            <span className="spinner mr-2" style={{ width: 16, height: 16 }} /> 加载中...
        </div>
    )
});

// ============================================================
// 表单区块组件
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
                <span className={`text-[10px] text-[var(--color-text-muted)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    ▼
                </span>
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

function Input({ name, placeholder, value, onChange }: {
    name: string; placeholder?: string; value: string; onChange: (name: string, val: string) => void;
}) {
    return (
        <input
            className="form-input"
            placeholder={placeholder || `请输入${name}`}
            value={value}
            onChange={(e) => onChange(name, e.target.value)}
        />
    );
}

function RadioGroup({ name, options, value, onChange }: {
    name: string; options: string[]; value: string; onChange: (name: string, val: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-3">
            {options.map((opt) => (
                <button
                    key={opt}
                    type="button"
                    className={`form-check ${value === opt ? "selected" : ""}`}
                    onClick={() => onChange(name, opt)}
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
function PersonFields({ data, set, showBirthFields = true, showBirthPlace = true, showHukou = true, extraFields }: {
    prefix?: string;
    data: Record<string, string>;
    set: (key: string, val: string) => void;
    showBirthFields?: boolean;
    showBirthPlace?: boolean;
    showHukou?: boolean;
    extraFields?: { key: string; label: string }[];
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 gap-y-4">
            <Field label="姓名"><Input name="姓名" value={data["姓名"] || ""} onChange={(_, v) => set("姓名", v)} /></Field>
            <Field label="性别"><RadioGroup name="性别" options={["男", "女"]} value={data["性别"] || ""} onChange={(_, v) => set("性别", v)} /></Field>
            {showBirthFields ? (
                <>
                    <Field label="出生年"><Input name="出生年" placeholder="如：1990" value={data["出生年"] || ""} onChange={(_, v) => set("出生年", v)} /></Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="出生月"><Input name="出生月" placeholder="如：6" value={data["出生月"] || ""} onChange={(_, v) => set("出生月", v)} /></Field>
                        <Field label="出生日"><Input name="出生日" placeholder="如：15" value={data["出生日"] || ""} onChange={(_, v) => set("出生日", v)} /></Field>
                    </div>
                </>
            ) : (
                <Field label="出生日期"><Input name="出生日期" placeholder="如：1990年6月15日" value={data["出生日期"] || ""} onChange={(_, v) => set("出生日期", v)} /></Field>
            )}
            <Field label="民族"><Input name="民族" placeholder="如：汉族" value={data["民族"] || ""} onChange={(_, v) => set("民族", v)} /></Field>
            {showBirthPlace && <Field label="出生地"><Input name="出生地" value={data["出生地"] || ""} onChange={(_, v) => set("出生地", v)} /></Field>}
            <Field label="文化程度"><Input name="文化程度" placeholder="如：本科" value={data["文化程度"] || ""} onChange={(_, v) => set("文化程度", v)} /></Field>
            <Field label="职业"><Input name="职业" value={data["职业"] || ""} onChange={(_, v) => set("职业", v)} /></Field>
            <Field label="工作单位"><Input name="工作单位" value={data["工作单位"] || ""} onChange={(_, v) => set("工作单位", v)} /></Field>
            {showHukou && <Field label="户籍地" span={2}><Input name="户籍地" value={data["户籍地"] || ""} onChange={(_, v) => set("户籍地", v)} /></Field>}
            <Field label="住址" span={2}><Input name="住址" value={data["住址"] || ""} onChange={(_, v) => set("住址", v)} /></Field>
            <Field label="联系电话"><Input name="联系电话" value={data["联系电话"] || ""} onChange={(_, v) => set("联系电话", v)} /></Field>
            <Field label="证件类型"><Input name="证件类型" placeholder="如：居民身份证" value={data["证件类型"] || ""} onChange={(_, v) => set("证件类型", v)} /></Field>
            <Field label="证件号码" span={2}><Input name="证件号码" value={data["证件号码"] || ""} onChange={(_, v) => set("证件号码", v)} /></Field>
            {extraFields?.map((f) => (
                <Field key={f.key} label={f.label} span={2}><Input name={f.key} value={data[f.key] || ""} onChange={(_, v) => set(f.key, v)} /></Field>
            ))}
        </div>
    );
}

// ============================================================
// 主页面
// ============================================================
export default function FillPage() {
    // 自诉人
    const [suPerson, setSuPerson] = useState<Record<string, string>>({});
    // PDF 预览
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const setSu = (k: string, v: string) => setSuPerson((p) => ({ ...p, [k]: v }));

    // 诉讼代理人
    const [dlHas, setDlHas] = useState("");
    const [dlPerson, setDlPerson] = useState<Record<string, string>>({});
    const setDl = (k: string, v: string) => setDlPerson((p) => ({ ...p, [k]: v }));

    // 法定代理人
    const [fdHas, setFdHas] = useState("");
    const [fdPerson, setFdPerson] = useState<Record<string, string>>({});
    const setFd = (k: string, v: string) => setFdPerson((p) => ({ ...p, [k]: v }));

    // 被告人
    const [bgPerson, setBgPerson] = useState<Record<string, string>>({});
    const setBg = (k: string, v: string) => setBgPerson((p) => ({ ...p, [k]: v }));

    // 附带民事
    const [fuDai, setFuDai] = useState("");
    // 公安协助
    const [gongAn, setGongAn] = useState("");
    const [gongAnClue, setGongAnClue] = useState("");
    // 事实与理由
    const [fact, setFact] = useState("");
    const [reason, setReason] = useState("");
    // 调解
    const [mediateZi, setMediateZi] = useState("");
    const [mediateFu, setMediateFu] = useState("");
    // 签署
    const [signer, setSigner] = useState("");
    const [signYear, setSignYear] = useState("");
    const [signMonth, setSignMonth] = useState("");
    const [signDay, setSignDay] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // ── 构建 payload 的工具函数 ──
    const searchParams = useSearchParams();
    const buildPayload = () => ({
        docId: searchParams.get("docId") || undefined,
        templateName: `刑事自诉状 — ${suPerson["姓名"] || "未命名"}`,
        templateId: "xingshi-wuru",
        自诉人: suPerson,
        诉讼代理人: { 有无: dlHas, ...dlPerson },
        法定代理人或代为告诉人: { 有无: fdHas, ...(fdHas === "有" ? fdPerson : {}) },
        被告人: bgPerson,
        是否提起附带民事诉讼: fuDai,
        诉讼请求: {
            被告人姓名: bgPerson["姓名"] || "",
            是否需要公安机关协助: gongAn,
            具体事项和线索: gongAnClue,
        },
        事实与理由: { 事实: fact, 理由: reason },
        是否同意调解: { 自诉部分: mediateZi, 附带民事部分: mediateFu },
        签署信息: { 具状人: signer, 日期年: signYear, 日期月: signMonth, 日期日: signDay },
    });

    // ── 生成 PDF 预览 ──
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

    // ── 从 URL docId 预填表单 ──
    const docId = searchParams.get("docId");
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
                if (data.自诉人) setSuPerson(data.自诉人);
                if (data.诉讼代理人) {
                    setDlHas(data.诉讼代理人.有无 || "");
                    const { 有无: _h, ...rest } = data.诉讼代理人;
                    setDlPerson(rest);
                }
                if (data["法定代理人或代为告诉人"]) {
                    setFdHas(data["法定代理人或代为告诉人"].有无 || "");
                    const { 有无: _h, ...rest } = data["法定代理人或代为告诉人"];
                    setFdPerson(rest);
                }
                if (data.被告人) setBgPerson(data.被告人);
                if (data.是否提起附带民事诉讼) setFuDai(data.是否提起附带民事诉讼);
                if (data.诉讼请求) {
                    setGongAn(data.诉讼请求.是否需要公安机关协助 || "");
                    setGongAnClue(data.诉讼请求.具体事项和线索 || "");
                }
                if (data.事实与理由) {
                    setFact(data.事实与理由.事实 || "");
                    setReason(data.事实与理由.理由 || "");
                }
                if (data.是否同意调解) {
                    setMediateZi(data.是否同意调解.自诉部分 || "");
                    setMediateFu(data.是否同意调解.附带民事部分 || "");
                }
                if (data.签署信息) {
                    setSigner(data.签署信息.具状人 || "");
                    setSignYear(data.签署信息.日期年 || "");
                    setSignMonth(data.签署信息.日期月 || "");
                    setSignDay(data.签署信息.日期日 || "");
                }
                // 自动生成 PDF 预览
                await generatePreview(data);
            } catch {
                // 忽略
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);



    const handleSubmit = async () => {
        setLoading(true);
        setError("");
        const payload = buildPayload();

        try {
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "生成失败");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);

            // 编辑模式下更新预览
            if (isEditMode) {
                if (pdfUrl) URL.revokeObjectURL(pdfUrl);
                setPdfUrl(url);
            } else {
                const a = document.createElement("a");
                a.href = url;
                a.download = `刑事自诉状_${suPerson["姓名"] || "未命名"}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "未知错误");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`h-full ${isEditMode ? 'flex px-[10%] gap-6' : 'overflow-auto'}`}>
            {/* PDF 预览面板 - 仅编辑模式 */}
            {isEditMode && (
                <div className="w-1/2 h-full border-r border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col shrink-0">
                    <div className="shrink-0 px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between">
                        <span className="text-[12px] text-[var(--color-text-muted)]">PDF 预览</span>
                        <div className="flex items-center gap-2">
                            {pdfUrl && (
                                <a href={pdfUrl} download={`刑事自诉状_${suPerson["姓名"] || "未命名"}.pdf`}
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
                            <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-[13px]">
                                暂无预览
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 表单区域 */}
            <div className={`${isEditMode ? 'flex-1 overflow-auto' : ''}`}>
                <div className="max-w-3xl mx-auto px-4 py-8">
                    <div className="text-center mb-8 fade-in">
                        <h1 className="text-2xl font-bold mb-1">刑事（附带民事）自诉状</h1>
                        <p className="text-[13px] text-[var(--color-text-muted)]">（侮辱案）</p>
                    </div>

                    {/* 自诉人 */}
                    <Section title="自诉人信息">
                        <PersonFields prefix="su" data={suPerson} set={setSu} />
                    </Section>

                    {/* 诉讼代理人 */}
                    <Section title="诉讼代理人">
                        <Field label="是否有诉讼代理人">
                            <RadioGroup name="dl_has" options={["有", "无"]} value={dlHas} onChange={(_, v) => setDlHas(v)} />
                        </Field>
                        {dlHas === "有" && (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 gap-y-4">
                                <Field label="姓名"><Input name="姓名" value={dlPerson["姓名"] || ""} onChange={(_, v) => setDl("姓名", v)} /></Field>
                                <Field label="单位"><Input name="单位" value={dlPerson["单位"] || ""} onChange={(_, v) => setDl("单位", v)} /></Field>
                                <Field label="职务"><Input name="职务" value={dlPerson["职务"] || ""} onChange={(_, v) => setDl("职务", v)} /></Field>
                                <Field label="联系电话"><Input name="联系电话" value={dlPerson["联系电话"] || ""} onChange={(_, v) => setDl("联系电话", v)} /></Field>
                                <Field label="住址" span={2}><Input name="住址" placeholder="非律师自然人填写" value={dlPerson["住址"] || ""} onChange={(_, v) => setDl("住址", v)} /></Field>
                                <Field label="证件类型"><Input name="证件类型" placeholder="非律师自然人填写" value={dlPerson["证件类型"] || ""} onChange={(_, v) => setDl("证件类型", v)} /></Field>
                                <Field label="证件号码"><Input name="证件号码" placeholder="非律师自然人填写" value={dlPerson["证件号码"] || ""} onChange={(_, v) => setDl("证件号码", v)} /></Field>
                                <Field label="与自诉人的关系" span={2}><Input name="与自诉人的关系" placeholder="非律师自然人填写" value={dlPerson["与自诉人的关系"] || ""} onChange={(_, v) => setDl("与自诉人的关系", v)} /></Field>
                            </div>
                        )}
                    </Section>

                    {/* 法定代理人 */}
                    <Section title="法定代理人或代为告诉人">
                        <Field label="是否有法定代理人">
                            <RadioGroup name="fd_has" options={["有", "无"]} value={fdHas} onChange={(_, v) => setFdHas(v)} />
                        </Field>
                        {fdHas === "有" && (
                            <div className="mt-4">
                                <PersonFields prefix="fd" data={fdPerson} set={setFd} showBirthFields={false} showBirthPlace={false} showHukou={false}
                                    extraFields={[{ key: "与自诉人的关系", label: "与自诉人的关系" }]} />
                            </div>
                        )}
                    </Section>

                    {/* 被告人 */}
                    <Section title="被告人信息">
                        <PersonFields prefix="bg" data={bgPerson} set={setBg}
                            extraFields={[{ key: "网络平台", label: "发布侮辱信息的网络平台名称及账号" }]} />
                    </Section>

                    {/* 附带民事 */}
                    <Section title="是否提起附带民事诉讼">
                        <RadioGroup name="fudai" options={["是", "否"]} value={fuDai} onChange={(_, v) => setFuDai(v)} />
                    </Section>

                    {/* 诉讼请求补充 */}
                    <Section title="诉讼请求补充">
                        <Field label="是否需要公安机关提供协助">
                            <RadioGroup name="gongan" options={["是", "否"]} value={gongAn} onChange={(_, v) => setGongAn(v)} />
                        </Field>
                        {gongAn === "是" && (
                            <div className="mt-4">
                                <Field label="具体事项和线索" span={2}>
                                    <input className="form-input" placeholder="如：调取某平台用户发布记录" value={gongAnClue} onChange={(e) => setGongAnClue(e.target.value)} />
                                </Field>
                            </div>
                        )}
                    </Section>

                    {/* 事实与理由 */}
                    <Section title="事实与理由">
                        <div className="space-y-4">
                            <Field label="事实（被告人实施侮辱行为的时间、地点、手段、情节、危害后果等）" span={2}>
                                <textarea className="form-input form-textarea" placeholder="请详细描述案件事实..." value={fact} onChange={(e) => setFact(e.target.value)} />
                            </Field>
                            <Field label="理由（被告人涉嫌犯罪、承担民事赔偿责任的法律依据）" span={2}>
                                <textarea className="form-input form-textarea" placeholder="请填写法律依据..." value={reason} onChange={(e) => setReason(e.target.value)} />
                            </Field>
                        </div>
                    </Section>

                    {/* 调解 */}
                    <Section title="是否同意调解">
                        <div className="space-y-4">
                            <Field label="自诉部分">
                                <RadioGroup name="mediate_zi" options={["同意", "不同意", "暂不确定"]} value={mediateZi} onChange={(_, v) => setMediateZi(v)} />
                            </Field>
                            <Field label="附带民事部分">
                                <RadioGroup name="mediate_fu" options={["同意", "不同意", "暂不确定"]} value={mediateFu} onChange={(_, v) => setMediateFu(v)} />
                            </Field>
                        </div>
                    </Section>

                    {/* 签署 */}
                    <Section title="签署信息">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 gap-y-4">
                            <Field label="具状人（签字）"><Input name="signer" placeholder="请输入姓名" value={signer} onChange={(_, v) => setSigner(v)} /></Field>
                            <div className="grid grid-cols-3 gap-3">
                                <Field label="年"><Input name="year" placeholder="2026" value={signYear} onChange={(_, v) => setSignYear(v)} /></Field>
                                <Field label="月"><Input name="month" placeholder="3" value={signMonth} onChange={(_, v) => setSignMonth(v)} /></Field>
                                <Field label="日"><Input name="day" placeholder="1" value={signDay} onChange={(_, v) => setSignDay(v)} /></Field>
                            </div>
                        </div>
                    </Section>

                    {/* 提交 */}
                    <div className="text-center mt-8 mb-20">
                        {error && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 text-sm">
                                ❌ {error}
                            </div>
                        )}
                        <button className="btn-primary text-[15px] px-10 py-3" onClick={handleSubmit} disabled={loading}>
                            {loading ? <><span className="spinner mr-2" /> 正在生成...</> : "生成诉状 PDF"}
                        </button>
                        <p className="text-xs text-[var(--color-text-muted)] mt-4">点击后将自动下载格式规范的 PDF 文件</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
