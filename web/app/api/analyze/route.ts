import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { analysisDb } from "@/lib/db";

const KIMI_API_KEY =
    process.env.KIMI_API_KEY ||
    "sk-kimi-Tlzxkdt8nbEM6wryMjUlsjuBD95CO7y5GN505sM8IKwLdSIhUbvmqGbo9dwecXKH";
const KIMI_CHAT_URL =
    process.env.KIMI_CHAT_URL || "https://api.kimi.com/coding/v1/chat/completions";
const KIMI_FILE_API_BASE =
    process.env.KIMI_FILE_API_BASE || "https://api.moonshot.cn/v1";
const KIMI_MODEL = process.env.KIMI_MODEL || "kimi-k2-0905";
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB

const SYSTEM_PROMPT = `你是一位资深的中国法律分析助手，具备丰富的法律知识和案件分析经验。用户将向你描述案件情况，你需要：

1. **案情梳理**：提取关键事实要素（时间、地点、当事人、事件经过）
2. **法律关系分析**：分析涉及的法律关系和可能适用的法律条文
3. **风险评估**：评估案件的法律风险和胜诉可能性
4. **策略建议**：给出具体的诉讼策略或解决建议

请用结构化的方式输出分析结果，用清晰的标题分隔各部分。语言要专业但易懂。

【Markdown 格式要求——严格遵守】
允许使用：
- 标题：# ## ### ####
- 加粗：**文字**（星号必须紧贴文字，中间不能有空格）
- 无序列表：- 项目
- 有序列表：1. 项目
- 引用：> 文字

严格禁止：
- 星号和文字之间加空格（错误：** 文字 **，正确：**文字**）
- 斜体标记 *文字* 或 _文字_（全部禁止）
- 表格、HTML标签、LaTeX公式、脚注、图片链接、代码块`;

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function toOptionalString(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed || null;
}

async function parseRequest(req: NextRequest): Promise<{
    message: string;
    mode: string | null;
    file: File | null;
}> {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        const candidate = formData.get("file");
        return {
            message: toOptionalString(formData.get("message")) || "",
            mode: toOptionalString(formData.get("mode")),
            file:
                candidate instanceof File && candidate.size > 0 ? candidate : null,
        };
    }

    const body = await req.json();
    return {
        message: toOptionalString(body.message) || "",
        mode: toOptionalString(body.mode),
        file: null,
    };
}

function buildUserMessage(
    message: string,
    mode: string | null,
    hasFile: boolean
): string {
    const modePrompts: Record<string, string> = {
        "案情梳理": "请重点梳理以下案件的关键事实要素：\n\n",
        "法律检索": "请重点检索以下案件涉及的相关法律条文和司法解释：\n\n",
        "风险评估": "请重点评估以下案件的法律风险和胜诉可能性：\n\n",
        "策略建议": "请重点给出以下案件的诉讼策略建议：\n\n",
    };

    const fallbackMessage = hasFile ? "请基于我上传的材料进行综合法律分析。" : "";
    return (modePrompts[mode || ""] || "") + (message || fallbackMessage);
}

function buildStoredInputSummary(message: string, fileName: string | null): string {
    if (fileName && message) {
        return `附件：${fileName}\n问题：${message}`;
    }
    if (fileName) {
        return `附件：${fileName}`;
    }
    return message;
}

async function kimiFetch(
    url: string,
    init: RequestInit,
    expectJson = true
): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${KIMI_API_KEY}`);
    headers.set("User-Agent", "KimiCLI/1.6");
    if (expectJson && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    return fetch(url, {
        ...init,
        headers,
    });
}

async function deleteKimiFile(fileId: string) {
    try {
        await kimiFetch(
            `${KIMI_FILE_API_BASE}/files/${fileId}`,
            { method: "DELETE" },
            false
        );
    } catch {
        // 不影响主流程
    }
}

async function uploadFileToKimi(file: File): Promise<{ content: string; fileName: string }> {
    if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error("上传文件不能超过 20MB");
    }

    let fileId = "";

    try {
        const uploadFormData = new FormData();
        uploadFormData.append("file", file, file.name);
        uploadFormData.append("purpose", "file-extract");

        const uploadResponse = await kimiFetch(
            `${KIMI_FILE_API_BASE}/files`,
            {
                method: "POST",
                body: uploadFormData,
            },
            false
        );

        if (!uploadResponse.ok) {
            const uploadError = await uploadResponse.text();
            console.error("Kimi file upload error:", uploadResponse.status, uploadError);
            throw new Error(`文件上传失败 (${uploadResponse.status})`);
        }

        const uploadData = await uploadResponse.json();
        fileId = uploadData.id;
        if (!fileId) {
            throw new Error("文件上传成功，但未返回 file_id");
        }

        for (let attempt = 0; attempt < 20; attempt += 1) {
            const fileInfoResponse = await kimiFetch(
                `${KIMI_FILE_API_BASE}/files/${fileId}`,
                { method: "GET" }
            );

            if (!fileInfoResponse.ok) {
                const infoError = await fileInfoResponse.text();
                console.error("Kimi file info error:", fileInfoResponse.status, infoError);
                throw new Error(`文件处理失败 (${fileInfoResponse.status})`);
            }

            const fileInfo = await fileInfoResponse.json();
            if (fileInfo.status === "ok") {
                break;
            }
            if (fileInfo.status === "error") {
                throw new Error(fileInfo.status_details || "文件抽取失败");
            }
            if (attempt === 19) {
                throw new Error("文件解析超时，请稍后重试");
            }

            await sleep(1000);
        }

        const contentResponse = await kimiFetch(
            `${KIMI_FILE_API_BASE}/files/${fileId}/content`,
            { method: "GET" },
            false
        );

        if (!contentResponse.ok) {
            const contentError = await contentResponse.text();
            console.error("Kimi file content error:", contentResponse.status, contentError);
            throw new Error(`文件内容抽取失败 (${contentResponse.status})`);
        }

        const content = await contentResponse.text();
        if (!content.trim()) {
            throw new Error("文件内容为空，无法分析");
        }

        return { content, fileName: file.name };
    } finally {
        if (fileId) {
            await deleteKimiFile(fileId);
        }
    }
}

// ── 后处理：剥掉所有 ** 标记和内部空格 ──
function fixMarkdownBold(raw: string): string {
    return raw.split('\n').map(line => {
        const positions: number[] = [];
        let i = 0;
        while (i < line.length) {
            if (line[i] === '*' && i + 1 < line.length && line[i + 1] === '*') {
                if ((i + 2 >= line.length || line[i + 2] !== '*') &&
                    (i === 0 || line[i - 1] !== '*'))
                    positions.push(i);
                i += 2;
            } else i++;
        }
        if (positions.length < 2) return line;
        let result = line;
        for (let p = positions.length - 2; p >= 0; p -= 2) {
            const o = positions[p], c = positions[p + 1];
            const content = result.slice(o + 2, c).trim();
            result = result.slice(0, o) + content + result.slice(c + 2);
        }
        return result;
    }).join('\n');
}

export async function POST(req: NextRequest) {
    try {
        const { message, mode, file } = await parseRequest(req);

        if (!message && !mode && !file) {
            return NextResponse.json({ error: "请输入案件描述或上传材料" }, { status: 400 });
        }

        let uploadedFileName: string | null = null;
        const extraMessages: Array<{ role: "system"; content: string }> = [];

        if (file) {
            const extracted = await uploadFileToKimi(file);
            uploadedFileName = extracted.fileName;
            extraMessages.push({
                role: "system",
                content: `以下内容来自用户上传文件《${extracted.fileName}》的官方抽取结果，请将其作为案件材料的一部分进行分析。`,
            });
            extraMessages.push({
                role: "system",
                content: extracted.content,
            });
        }

        const userMessage = buildUserMessage(message, mode, Boolean(file));

        const response = await kimiFetch(KIMI_CHAT_URL, {
            method: "POST",
            body: JSON.stringify({
                model: KIMI_MODEL,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    ...extraMessages,
                    { role: "user", content: userMessage },
                ],
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Kimi API error:", response.status, errorData);
            return NextResponse.json(
                { error: `AI 服务异常 (${response.status})，请稍后重试` },
                { status: response.status }
            );
        }

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content || "未获取到分析结果";
        const content = fixMarkdownBold(rawContent);

        // 如果用户已登录，自动保存分析记录到工作区
        try {
            const user = await getCurrentUser();
            if (user) {
                analysisDb.create({
                    userId: user.userId,
                    input: buildStoredInputSummary(message, uploadedFileName),
                    mode: mode || "",
                    result: content,
                });
            }
        } catch {
            // 不影响主流程
        }

        return NextResponse.json({ result: content });
    } catch (error) {
        console.error("Analysis API error:", error);
        return NextResponse.json(
            { error: "服务器内部错误，请稍后重试" },
            { status: 500 }
        );
    }
}
