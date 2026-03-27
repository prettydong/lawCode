"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CIVIL_TEMPLATES } from "@/lib/templates";
import type { TemplateSchema, SchemaField } from "@/lib/templateSchema";
import { useBreadcrumb } from "../Breadcrumb";

const PdfViewer = dynamic(() => import("../PdfViewer"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center p-10 text-[var(--color-text-muted)] text-[13px]">
            <span className="spinner mr-2" style={{ width: 16, height: 16 }} /> 加载中...
        </div>
    ),
});

type PrimitiveValue = string | boolean;
type SectionValue = Record<string, unknown>;

interface SchemaTemplateResponse {
    template: {
        id: string;
        dirName: string;
        name: string;
        subtitle: string;
        desc: string;
        category: string;
        tags: string[];
        pages: number;
        available: boolean;
    };
    schema: TemplateSchema;
}

interface PartyFormEntity {
    variantId: string;
    values: Record<string, PrimitiveValue>;
}

function cleanText(value: string) {
    return value.replace(/\\\\/g, " ").replace(/\s+/g, " ").trim();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="glass-card p-4 md:p-5 -mt-[1px] relative z-0 hover:z-10 focus-within:z-10 fade-in">
            <div
                className="section-title cursor-pointer justify-between group select-none transition-opacity hover:opacity-80"
                style={{
                    marginBottom: isOpen ? "16px" : "0",
                    paddingBottom: isOpen ? "12px" : "0",
                    borderBottomColor: isOpen ? "var(--color-border)" : "transparent",
                }}
                onClick={() => setIsOpen((prev) => !prev)}
            >
                <span>{cleanText(title)}</span>
                <span className={`text-[10px] text-[var(--color-text-muted)] transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>▼</span>
            </div>
            {isOpen && <div className="fade-in">{children}</div>}
        </div>
    );
}

function Field({ label, children, span = 1 }: { label: string; children: React.ReactNode; span?: number }) {
    return (
        <div className={span === 2 ? "md:col-span-2" : ""}>
            <label className="form-label">{cleanText(label)}</label>
            {children}
        </div>
    );
}

function Input({
    value,
    onChange,
    placeholder,
    type = "text",
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: "text" | "date";
}) {
    return <input className="form-input" type={type} value={value} placeholder={placeholder || ""} onChange={(e) => onChange(e.target.value)} />;
}

function TextArea({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) {
    return <textarea className="form-input form-textarea" value={value} placeholder={placeholder || ""} onChange={(e) => onChange(e.target.value)} />;
}

function RadioGroup({
    options,
    value,
    onChange,
}: {
    options: string[];
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-3">
            {options.map((option) => (
                <button
                    key={option}
                    type="button"
                    className={`form-check ${value === option ? "selected" : ""}`}
                    onClick={() => onChange(option)}
                >
                    <span className={`w-4 h-4 border-2 flex items-center justify-center ${value === option ? "border-[var(--color-accent)]" : "border-[var(--color-text-muted)]"}`}>
                        {value === option && <span className="w-2 h-2 bg-[var(--color-accent)]" />}
                    </span>
                    {cleanText(option)}
                </button>
            ))}
        </div>
    );
}

function CheckboxField({
    checked,
    onChange,
    label,
}: {
    checked: boolean;
    onChange: (value: boolean) => void;
    label: string;
}) {
    return (
        <button
            type="button"
            className={`form-check ${checked ? "selected" : ""}`}
            onClick={() => onChange(!checked)}
        >
            <span className={`w-4 h-4 border-2 flex items-center justify-center ${checked ? "border-[var(--color-accent)]" : "border-[var(--color-text-muted)]"}`}>
                {checked && <span className="w-2 h-2 bg-[var(--color-accent)]" />}
            </span>
            {cleanText(label)}
        </button>
    );
}

function getNestedValue(source: Record<string, unknown>, path: string[]) {
    let current: unknown = source;
    for (const segment of path) {
        if (!current || typeof current !== "object" || !(segment in current)) {
            return undefined;
        }
        current = (current as Record<string, unknown>)[segment];
    }
    return current;
}

function setNestedValue(source: Record<string, unknown>, path: string[], value: unknown) {
    const next = { ...source };
    let cursor: Record<string, unknown> = next;

    for (let index = 0; index < path.length - 1; index += 1) {
        const segment = path[index];
        const existing = cursor[segment];
        cursor[segment] = existing && typeof existing === "object" && !Array.isArray(existing) ? { ...(existing as Record<string, unknown>) } : {};
        cursor = cursor[segment] as Record<string, unknown>;
    }

    cursor[path[path.length - 1]] = value;
    return next;
}

function pickVariant(groupField: SchemaField, variantId?: string) {
    return groupField.fields?.find((field) => field.id === variantId) || groupField.fields?.[0];
}

function createEntity(groupField: SchemaField, variantId?: string): PartyFormEntity {
    const variant = pickVariant(groupField, variantId);
    return { variantId: variant?.id || "natural", values: {} };
}

function buildInitialPartyState(schema: TemplateSchema) {
    const state: Record<string, PartyFormEntity[]> = {};
    const partiesSection = schema.sections.find((section) => section.type === "builtin_parties");
    if (!partiesSection) return state;

    for (const field of partiesSection.fields) {
        if (field.type !== "group" || field.id === "agent") continue;
        const isOptionalRole = field.id === "third_party";
        state[field.id] = isOptionalRole ? [] : [createEntity(field)];
    }
    return state;
}

function buildInitialSectionState(schema: TemplateSchema) {
    const state: Record<string, SectionValue> = {};
    for (const section of schema.sections) {
        if (section.type === "builtin_parties") continue;
        state[section.id] = section.hasFreeText ? { _freeText: "" } : {};
    }
    return state;
}

function importFieldValues(fields: SchemaField[], raw: Record<string, unknown>) {
    const values: Record<string, PrimitiveValue> = {};
    for (const field of fields) {
        if (!field.label) continue;
        const rawValue = raw[field.id] ?? raw[field.label];
        if (typeof rawValue === "string" || typeof rawValue === "boolean") {
            values[field.id] = rawValue;
        }
    }
    return values;
}

function importPartiesFromPayload(schema: TemplateSchema, payload: Record<string, unknown>) {
    const next = buildInitialPartyState(schema);
    const partiesSection = schema.sections.find((section) => section.type === "builtin_parties");
    const rawParties = payload["当事人信息"];
    if (!partiesSection || !rawParties || typeof rawParties !== "object") return { parties: next, agent: {} as Record<string, PrimitiveValue> };

    const parties = rawParties as Record<string, unknown>;
    let agentValues: Record<string, PrimitiveValue> = {};

    for (const field of partiesSection.fields) {
        if (field.id === "agent") {
            const rawAgent = parties["委托诉讼代理人"];
            if (rawAgent && typeof rawAgent === "object") {
                agentValues = importFieldValues(field.fields || [], rawAgent as Record<string, unknown>);
            }
            continue;
        }

        if (field.type !== "group") continue;
        const roleLabel = cleanText(field.title || "");
        const rawRole = parties[roleLabel];
        const sourceList = Array.isArray(rawRole) ? rawRole : rawRole && typeof rawRole === "object" ? [rawRole] : [];

        next[field.id] = sourceList
            .map((item) => {
                if (!item || typeof item !== "object") return null;
                const rawItem = item as Record<string, unknown>;
                const isOrganization = rawItem["_类型"] === "组织" || ("名称" in rawItem && !("姓名" in rawItem));
                const variant = pickVariant(field, isOrganization ? "organization" : "natural");
                if (!variant) return null;
                return {
                    variantId: variant.id,
                    values: importFieldValues(variant.fields || [], rawItem),
                };
            })
            .filter(Boolean) as PartyFormEntity[];
    }

    return { parties: next, agent: agentValues };
}

function importSectionData(fields: SchemaField[], raw: Record<string, unknown>) {
    const result: Record<string, unknown> = {};

    for (const field of fields) {
        if (field.type === "group" && field.fields) {
            const groupRaw = raw[field.id] ?? (field.label ? raw[field.label] : undefined);
            if (groupRaw && typeof groupRaw === "object" && !Array.isArray(groupRaw)) {
                result[field.id] = importSectionData(field.fields, groupRaw as Record<string, unknown>);
            }
            continue;
        }

        const rawValue = raw[field.id] ?? (field.label ? raw[field.label] : undefined);
        if (typeof rawValue === "string" || typeof rawValue === "boolean") {
            result[field.id] = rawValue;
        }
    }

    return result;
}

function exportLabelMap(fields: SchemaField[], data: Record<string, unknown>) {
    const result: Record<string, unknown> = {};

    for (const field of fields) {
        if (field.type === "group" && field.fields) {
            const nested = data[field.id];
            if (nested && typeof nested === "object" && !Array.isArray(nested)) {
                result[field.label || field.title || field.id] = exportLabelMap(field.fields, nested as Record<string, unknown>);
            }
            continue;
        }

        const value = data[field.id];
        if (value === undefined || value === "") continue;
        result[field.label || field.title || field.id] = value;
    }

    return result;
}

function renderSchemaField(
    field: SchemaField,
    sectionData: SectionValue,
    onChange: (path: string[], value: unknown) => void,
    path: string[] = []
): React.ReactNode {
    const currentPath = [...path, field.id];
    const value = getNestedValue(sectionData, currentPath);
    const label = cleanText(field.label || field.title || "");

    if (field.type === "group" && field.fields) {
        return (
            <div key={currentPath.join(".")} className="md:col-span-2 border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
                <div className="text-[12px] font-medium text-[var(--color-text)] mb-3">{label || cleanText(field.id)}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 gap-y-4">
                    {field.fields.map((child) => renderSchemaField(child, sectionData, onChange, currentPath))}
                </div>
            </div>
        );
    }

    if (field.type === "checkbox") {
        return (
            <Field key={currentPath.join(".")} label={label || cleanText(field.id)} span={2}>
                <CheckboxField checked={Boolean(value)} onChange={(next) => onChange(currentPath, next)} label={label || cleanText(field.id)} />
            </Field>
        );
    }

    if (field.type === "radio") {
        return (
            <Field key={currentPath.join(".")} label={label || cleanText(field.id)} span={2}>
                <RadioGroup options={field.options || []} value={typeof value === "string" ? value : ""} onChange={(next) => onChange(currentPath, next)} />
            </Field>
        );
    }

    if (field.type === "textarea") {
        return (
            <Field key={currentPath.join(".")} label={label || cleanText(field.id)} span={2}>
                <TextArea value={typeof value === "string" ? value : ""} placeholder={field.placeholder || `请输入${label || cleanText(field.id)}`} onChange={(next) => onChange(currentPath, next)} />
            </Field>
        );
    }

    return (
        <Field key={currentPath.join(".")} label={label || cleanText(field.id)} span={field.type === "date" ? 1 : 1}>
            <Input
                type={field.type === "date" ? "date" : "text"}
                value={typeof value === "string" ? value : ""}
                placeholder={field.placeholder || `请输入${label || cleanText(field.id)}`}
                onChange={(next) => onChange(currentPath, next)}
            />
        </Field>
    );
}

function EntityCard({
    roleField,
    entity,
    index,
    total,
    allowRemove,
    onUpdate,
    onRemove,
}: {
    roleField: SchemaField;
    entity: PartyFormEntity;
    index: number;
    total: number;
    allowRemove: boolean;
    onUpdate: (fieldId: string, value: PrimitiveValue) => void;
    onRemove: () => void;
}) {
    const variant = pickVariant(roleField, entity.variantId);
    if (!variant) return null;

    const nameField = variant.fields?.find((field) => field.label === "姓名" || field.label === "名称");
    const displayName = nameField ? String(entity.values[nameField.id] || "（未填写）") : "（未填写）";
    const variantLabel = cleanText(variant.title || variant.label || variant.id);

    return (
        <div className="border border-[var(--color-border)] bg-[var(--color-surface-alt)] mb-3 fade-in">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border-light)]">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-[var(--color-text)] text-[var(--color-bg)]">
                        {index + 1}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium border border-[var(--color-border)] text-[var(--color-text-muted)]">
                        {variantLabel}
                    </span>
                    <span className="text-[12px] text-[var(--color-text-muted)]">{displayName}</span>
                </div>
                <button
                    type="button"
                    disabled={!allowRemove}
                    onClick={onRemove}
                    className={`text-[11px] px-2 py-1 border transition-colors cursor-pointer ${allowRemove ? "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:border-[var(--color-error)]" : "border-transparent text-[var(--color-text-muted)] opacity-30 cursor-not-allowed"}`}
                    title={allowRemove ? "删除此实体" : "当前角色至少保留一个实体"}
                >
                    ✕ 删除
                </button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 gap-y-4">
                {(variant.fields || []).map((field) => {
                    const fieldLabel = cleanText(field.label || field.id);
                    const fieldValue = entity.values[field.id];

                    if (field.type === "radio") {
                        return (
                            <Field key={`${entity.variantId}-${field.id}`} label={fieldLabel} span={2}>
                                <RadioGroup options={field.options || []} value={typeof fieldValue === "string" ? fieldValue : ""} onChange={(next) => onUpdate(field.id, next)} />
                            </Field>
                        );
                    }

                    return (
                        <Field key={`${entity.variantId}-${field.id}`} label={fieldLabel} span={field.label?.includes("住所地") || field.label?.includes("证件号码") ? 2 : 1}>
                            <Input value={typeof fieldValue === "string" ? fieldValue : ""} placeholder={`请输入${fieldLabel}`} onChange={(next) => onUpdate(field.id, next)} />
                        </Field>
                    );
                })}
            </div>
            {total > 1 && <div className="px-4 pb-2 text-[11px] text-[var(--color-text-muted)]">共 {total} 个实体</div>}
        </div>
    );
}

function PartyRoleSection({
    field,
    entities,
    onChange,
}: {
    field: SchemaField;
    entities: PartyFormEntity[];
    onChange: (entities: PartyFormEntity[]) => void;
}) {
    const optional = field.id === "third_party";

    const addEntity = (variantId: string) => {
        onChange([...entities, createEntity(field, variantId)]);
    };

    const updateEntity = (index: number, fieldId: string, value: PrimitiveValue) => {
        onChange(
            entities.map((entity, entityIndex) =>
                entityIndex === index ? { ...entity, values: { ...entity.values, [fieldId]: value } } : entity
            )
        );
    };

    const removeEntity = (index: number) => {
        onChange(entities.filter((_, entityIndex) => entityIndex !== index));
    };

    return (
        <Section title={`${cleanText(field.title || "")}${optional ? "（选填）" : ""}`}>
            {entities.length === 0 && (
                <div className="text-[12px] text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] p-4 mb-3">
                    当前未添加实体
                </div>
            )}

            {entities.map((entity, index) => (
                <EntityCard
                    key={`${field.id}-${index}`}
                    roleField={field}
                    entity={entity}
                    index={index}
                    total={entities.length}
                    allowRemove={optional || entities.length > 1}
                    onUpdate={(fieldId, value) => updateEntity(index, fieldId, value)}
                    onRemove={() => removeEntity(index)}
                />
            ))}

            <div className="flex items-center gap-2 mt-3 flex-wrap">
                {(field.fields || []).map((variant) => (
                    <button
                        key={variant.id}
                        type="button"
                        onClick={() => addEntity(variant.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
                    >
                        + 添加{cleanText(variant.title || variant.label || variant.id)}
                    </button>
                ))}
                <span className="text-[11px] text-[var(--color-text-muted)] ml-1">共 {entities.length} 个实体</span>
            </div>
        </Section>
    );
}

function FillCivilContent() {
    const searchParams = useSearchParams();
    const templateId = searchParams.get("id") || "";
    const docId = searchParams.get("docId") || "";

    const [schema, setSchema] = useState<TemplateSchema | null>(null);
    const [templateInfo, setTemplateInfo] = useState<SchemaTemplateResponse["template"] | null>(null);
    const [partyData, setPartyData] = useState<Record<string, PartyFormEntity[]>>({});
    const [agentData, setAgentData] = useState<Record<string, PrimitiveValue>>({});
    const [sectionData, setSectionData] = useState<Record<string, SectionValue>>({});
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pageError, setPageError] = useState("");
    const [schemaLoading, setSchemaLoading] = useState(false);

    const template = useMemo(() => templateInfo || CIVIL_TEMPLATES.find((item) => item.id === templateId) || null, [templateInfo, templateId]);
    const partiesSection = schema?.sections.find((section) => section.type === "builtin_parties");
    const otherTemplates = CIVIL_TEMPLATES.filter((item) => item.available && item.id !== templateId).map((item) => ({
        label: item.subtitle,
        href: `/fill-civil?id=${item.id}`,
    }));

    useBreadcrumb([
        { label: "智诉", siblings: [{ label: "智记", href: "/" }] },
        { label: "文书生成", siblings: [{ label: "案件分析", href: "/" }] },
        {
            label: template?.subtitle || "民事起诉状",
            siblings: [{ label: "刑事自诉状", href: "/fill" }, ...otherTemplates],
        },
    ]);

    useEffect(() => {
        if (!templateId) return;
        setSchemaLoading(true);
        setPageError("");

        (async () => {
            try {
                const response = await fetch(`/api/templates/${templateId}`);
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || "读取模板失败");
                }

                setSchema(result.schema);
                setTemplateInfo(result.template);
                setPartyData(buildInitialPartyState(result.schema));
                setSectionData(buildInitialSectionState(result.schema));
                setAgentData({});
            } catch (error) {
                setPageError(error instanceof Error ? error.message : "读取模板失败");
            } finally {
                setSchemaLoading(false);
            }
        })();
    }, [templateId]);

    useEffect(() => {
        if (!schema || !docId) return;
        setIsEditMode(true);

        (async () => {
            try {
                const response = await fetch(`/api/files/documents/${docId}`);
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || "读取文书失败");
                }

                const payload = result.document?.form_data ? JSON.parse(result.document.form_data) : {};
                const imported = importPartiesFromPayload(schema, payload);
                setPartyData(imported.parties);
                setAgentData(imported.agent);

                const nextSectionData = buildInitialSectionState(schema);
                for (const section of schema.sections) {
                    if (section.type === "builtin_parties" || section.type === "builtin_signature") continue;
                    const rawSection = payload[section.title];
                    if (!rawSection || typeof rawSection !== "object") continue;
                    nextSectionData[section.id] = importSectionData(section.fields, rawSection as Record<string, unknown>);
                    if (section.hasFreeText) {
                        const rawFreeText = (rawSection as Record<string, unknown>)._自由文本;
                        nextSectionData[section.id]._freeText = typeof rawFreeText === "string" ? rawFreeText : "";
                    }
                }
                setSectionData(nextSectionData);
                await generatePreview(payload);
            } catch (error) {
                setPageError(error instanceof Error ? error.message : "读取文书失败");
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schema, docId]);

    useEffect(() => {
        return () => {
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        };
    }, [pdfUrl]);

    const updateSectionData = (sectionId: string, path: string[], value: unknown) => {
        setSectionData((prev) => ({
            ...prev,
            [sectionId]: setNestedValue(prev[sectionId] || {}, path, value),
        }));
    };

    const getDisplayName = () => {
        const plaintiffField = partiesSection?.fields.find((field) => field.id === "plaintiff");
        const firstPlaintiff = plaintiffField ? partyData[plaintiffField.id]?.[0] : undefined;
        if (!firstPlaintiff) return "未命名";
        const variant = pickVariant(plaintiffField as SchemaField, firstPlaintiff.variantId);
        const primaryField = variant?.fields?.find((field) => field.label === "姓名" || field.label === "名称");
        if (!primaryField) return "未命名";
        return String(firstPlaintiff.values[primaryField.id] || "未命名");
    };

    const buildPayload = () => {
        const payload: Record<string, unknown> = {
            docId: docId || undefined,
            templateId,
            templateName: template ? `${template.subtitle} — ${getDisplayName()}` : "法律文书",
        };

        if (partiesSection) {
            const partyPayload: Record<string, unknown> = {};

            for (const field of partiesSection.fields) {
                if (field.id === "agent") {
                    const agentOutput: Record<string, unknown> = {};
                    for (const child of field.fields || []) {
                        if (!child.label) continue;
                        const value = agentData[child.id];
                        if (value === undefined || value === "") continue;
                        agentOutput[child.label] = value;
                    }
                    partyPayload["委托诉讼代理人"] = agentOutput;
                    continue;
                }

                if (field.type !== "group") continue;
                const roleLabel = cleanText(field.title || "");
                const roleEntities = (partyData[field.id] || []).map((entity) => {
                    const variant = pickVariant(field, entity.variantId);
                    const output: Record<string, unknown> = {
                        _类型: variant?.entityType === "organization" ? "组织" : "自然人",
                    };

                    for (const child of variant?.fields || []) {
                        if (!child.label) continue;
                        const value = entity.values[child.id];
                        if (value === undefined || value === "") continue;
                        output[child.label] = value;
                    }

                    return output;
                });
                partyPayload[roleLabel] = roleEntities;
            }

            payload["当事人信息"] = partyPayload;
        }

        for (const section of schema?.sections || []) {
            if (section.type === "builtin_parties" || section.type === "builtin_signature") continue;
            const rawSection = sectionData[section.id] || {};
            const exported = exportLabelMap(section.fields, rawSection);

            if (section.hasFreeText) {
                exported._自由文本 = typeof rawSection._freeText === "string" ? rawSection._freeText : "";
            }

            payload[section.title] = exported;
        }

        return payload;
    };

    async function generatePreview(payload?: Record<string, unknown>) {
        setPreviewLoading(true);
        setPageError("");
        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload || buildPayload()),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "生成预览失败");
            }

            const blob = await response.blob();
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
            setPdfUrl(URL.createObjectURL(blob));
        } catch (error) {
            setPageError(error instanceof Error ? error.message : "生成预览失败");
        } finally {
            setPreviewLoading(false);
        }
    }

    const handleSubmit = async () => {
        setLoading(true);
        setPageError("");

        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(buildPayload()),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "生成失败");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            if (isEditMode) {
                if (pdfUrl) URL.revokeObjectURL(pdfUrl);
                setPdfUrl(url);
            } else {
                const link = document.createElement("a");
                link.href = url;
                link.download = `${template?.subtitle || "法律文书"}_${getDisplayName()}.pdf`;
                link.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            setPageError(error instanceof Error ? error.message : "未知错误");
        } finally {
            setLoading(false);
        }
    };

    if (!templateId) {
        return (
            <div className="h-full flex items-center justify-center text-[var(--color-text-muted)]">
                <div className="text-center">
                    <p className="text-[16px] mb-2">缺少模板参数</p>
                    <Link href="/" className="text-[var(--color-accent)] text-[13px] hover:underline">← 返回首页</Link>
                </div>
            </div>
        );
    }

    if (schemaLoading) {
        return <div className="flex items-center justify-center h-full"><span className="spinner" style={{ width: 20, height: 20 }} /></div>;
    }

    if (!schema || !template) {
        return (
            <div className="h-full flex items-center justify-center text-[var(--color-text-muted)]">
                <div className="text-center">
                    <p className="text-[16px] mb-2">模板加载失败</p>
                    {pageError && <p className="text-[13px] mb-4">{pageError}</p>}
                    <Link href="/" className="text-[var(--color-accent)] text-[13px] hover:underline">← 返回首页</Link>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-full ${isEditMode ? "flex px-[10%] gap-6" : "overflow-auto"}`}>
            {isEditMode && (
                <div className="w-1/2 h-full border-r border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col shrink-0">
                    <div className="shrink-0 px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between">
                        <span className="text-[12px] text-[var(--color-text-muted)]">PDF 预览</span>
                        <div className="flex items-center gap-2">
                            {pdfUrl && (
                                <a href={pdfUrl} download={`${template.subtitle}.pdf`} className="text-[11px] text-[var(--color-accent)] hover:underline">
                                    下载
                                </a>
                            )}
                            <button
                                onClick={() => generatePreview()}
                                disabled={previewLoading}
                                className="text-[11px] px-2 py-1 border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)] transition-colors cursor-pointer disabled:opacity-40"
                            >
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

            <div className={`${isEditMode ? "flex-1 overflow-auto" : ""}`}>
                <div className="max-w-3xl mx-auto px-4 py-8">
                    <div className="text-center mb-8 fade-in">
                        <h1 className="text-2xl font-bold mb-1">民事起诉状</h1>
                        <p className="text-[13px] text-[var(--color-text-muted)]">（{template.subtitle}）</p>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{template.desc}</p>
                    </div>

                    {partiesSection && (
                        <>
                            {partiesSection.fields
                                .filter((field) => field.type === "group" && field.id !== "agent")
                                .map((field) => (
                                    <PartyRoleSection
                                        key={field.id}
                                        field={field}
                                        entities={partyData[field.id] || []}
                                        onChange={(entities) => setPartyData((prev) => ({ ...prev, [field.id]: entities }))}
                                    />
                                ))}

                            {partiesSection.fields.find((field) => field.id === "agent") && (
                                <Section title="委托诉讼代理人">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 gap-y-4">
                                        {(partiesSection.fields.find((field) => field.id === "agent")?.fields || []).map((field) => {
                                            const value = agentData[field.id];
                                            const label = cleanText(field.label || field.id);
                                            if (field.type === "radio") {
                                                return (
                                                    <Field key={field.id} label={label} span={2}>
                                                        <RadioGroup
                                                            options={field.options || []}
                                                            value={typeof value === "string" ? value : ""}
                                                            onChange={(next) => setAgentData((prev) => ({ ...prev, [field.id]: next }))}
                                                        />
                                                    </Field>
                                                );
                                            }
                                            return (
                                                <Field key={field.id} label={label}>
                                                    <Input
                                                        value={typeof value === "string" ? value : ""}
                                                        placeholder={`请输入${label}`}
                                                        onChange={(next) => setAgentData((prev) => ({ ...prev, [field.id]: next }))}
                                                    />
                                                </Field>
                                            );
                                        })}
                                    </div>
                                </Section>
                            )}
                        </>
                    )}

                    {schema.sections
                        .filter((section) => section.type !== "builtin_parties" && section.type !== "builtin_signature")
                        .map((section) => (
                            <Section key={section.id} title={section.title}>
                                {section.hasFreeText && (
                                    <div className="mb-4">
                                        <Field label={`${cleanText(section.title)}（自由书写）`} span={2}>
                                            <TextArea
                                                value={typeof sectionData[section.id]?._freeText === "string" ? String(sectionData[section.id]._freeText) : ""}
                                                placeholder={`请填写${cleanText(section.title)}...`}
                                                onChange={(next) => setSectionData((prev) => ({ ...prev, [section.id]: { ...(prev[section.id] || {}), _freeText: next } }))}
                                            />
                                        </Field>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 gap-y-4">
                                    {section.fields.map((field) => renderSchemaField(field, sectionData[section.id] || {}, (path, value) => updateSectionData(section.id, path, value)))}
                                </div>
                            </Section>
                        ))}

                    <div className="text-center mt-8 mb-20">
                        {pageError && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 text-sm">
                                ❌ {pageError}
                            </div>
                        )}
                        <button className="btn-primary text-[15px] px-10 py-3" onClick={handleSubmit} disabled={loading}>
                            {loading ? <><span className="spinner mr-2" /> 正在生成...</> : "生成起诉状 PDF"}
                        </button>
                        <p className="text-xs text-[var(--color-text-muted)] mt-4">结构化字段会随文书一并保存，并同步写入 PDF 模板对应区块。</p>
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
