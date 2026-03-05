import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { writeFile, readFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { documentDb } from "@/lib/db";

// 模板目录（相对于项目根目录）
const TEMPLATE_DIR = path.resolve(process.cwd(), "..", "templates", "刑事附带民事自诉状_侮辱案");
const GENERATE_SCRIPT = path.join(TEMPLATE_DIR, "generate.py");

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();

        // 创建临时目录存放数据和输出
        const tmpId = randomUUID();
        const tmpDir = path.join("/tmp", `lawdoc_${tmpId}`);
        await mkdir(tmpDir, { recursive: true });

        // 写入数据 JSON
        const dataPath = path.join(tmpDir, "data.json");
        await writeFile(dataPath, JSON.stringify(data, null, 2), "utf-8");

        // 输出路径
        const outputPath = path.join(tmpDir, "output.pdf");

        // 调用 Python 生成脚本
        const cmd = `python3 "${GENERATE_SCRIPT}" --data "${dataPath}" --output "${outputPath}"`;

        const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            exec(cmd, { timeout: 60000, env: { ...process.env, HOME: process.env.HOME || "/root" } }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`生成失败: ${stderr || error.message}`));
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });

        // 检查 PDF 是否生成
        if (!existsSync(outputPath)) {
            throw new Error(`PDF 文件未生成。日志: ${result.stderr}`);
        }

        // 读取 PDF 并返回
        const pdfBuffer = await readFile(outputPath);

        // 如果用户已登录，保存诉状记录到工作区
        try {
            const user = await getCurrentUser();
            if (user) {
                documentDb.create({
                    userId: user.userId,
                    title: data.templateName || "法律文书",
                    templateId: data.templateId || "",
                    formData: JSON.stringify(data),
                });
            }
        } catch {
            // 不影响主流程
        }

        // 清理临时文件
        try {
            await unlink(dataPath);
            await unlink(outputPath);
            await unlink(tmpDir).catch(() => { });
        } catch {
            // ignore cleanup errors
        }

        return new NextResponse(pdfBuffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="complaint.pdf"`,
            },
        });
    } catch (error: unknown) {
        console.error("PDF generation error:", error);
        const message = error instanceof Error ? error.message : "未知错误";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
