import { NextRequest, NextResponse } from "next/server";

const KIMI_API_KEY = "sk-kimi-Tlzxkdt8nbEM6wryMjUlsjuBD95CO7y5GN505sM8IKwLdSIhUbvmqGbo9dwecXKH";
const KIMI_API_URL = "https://api.kimi.com/coding/v1/chat/completions";

const SYSTEM_PROMPT = `你是一位资深的中国法律分析助手，具备丰富的法律知识和案件分析经验。用户将向你描述案件情况，你需要：

1. **案情梳理**：提取关键事实要素（时间、地点、当事人、事件经过）
2. **法律关系分析**：分析涉及的法律关系和可能适用的法律条文
3. **风险评估**：评估案件的法律风险和胜诉可能性
4. **策略建议**：给出具体的诉讼策略或解决建议

请用结构化的方式输出分析结果，用清晰的标题分隔各部分。语言要专业但易懂。`;

export async function POST(req: NextRequest) {
    try {
        const { message, mode } = await req.json();

        if (!message && !mode) {
            return NextResponse.json({ error: "请输入案件描述" }, { status: 400 });
        }

        // 根据选中的模式调整 prompt
        let userMessage = message || "";
        if (mode) {
            const modePrompts: Record<string, string> = {
                "案情梳理": "请重点梳理以下案件的关键事实要素：\n\n",
                "法律检索": "请重点检索以下案件涉及的相关法律条文和司法解释：\n\n",
                "风险评估": "请重点评估以下案件的法律风险和胜诉可能性：\n\n",
                "策略建议": "请重点给出以下案件的诉讼策略建议：\n\n",
            };
            userMessage = (modePrompts[mode] || "") + userMessage;
        }

        const response = await fetch(KIMI_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${KIMI_API_KEY}`,
                "User-Agent": "KimiCLI/1.6",
            },
            body: JSON.stringify({
                model: "kimi-k2-0905",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
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
        const content = data.choices?.[0]?.message?.content || "未获取到分析结果";

        return NextResponse.json({ result: content });
    } catch (error) {
        console.error("Analysis API error:", error);
        return NextResponse.json(
            { error: "服务器内部错误，请稍后重试" },
            { status: 500 }
        );
    }
}
