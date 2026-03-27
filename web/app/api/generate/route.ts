import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { writeFile, readFile, mkdir, readdir, rm } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { documentDb } from "@/lib/db";
import { CIVIL_TEMPLATES } from "@/lib/templates";

// 旧模板（侮辱案）的路径
const OLD_TEMPLATE_DIR = path.resolve(process.cwd(), "..", "templates", "刑事附带民事自诉状_侮辱案");
const OLD_GENERATE_SCRIPT = path.join(OLD_TEMPLATE_DIR, "generate.py");

// 新通用生成脚本
const CIVIL_GENERATE_SCRIPT = path.resolve(process.cwd(), "..", "templates", "generate_civil.py");
const REFACTORED_TEMPLATES_BASE = path.resolve(process.cwd(), "..", "template_refactor");
const LEGACY_TEMPLATES_BASE = path.resolve(process.cwd(), "..", "templates");

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();

        // 创建临时目录
        const tmpId = randomUUID();
        const tmpDir = path.join("/tmp", `lawdoc_${tmpId}`);
        await mkdir(tmpDir, { recursive: true });

        const dataPath = path.join(tmpDir, "data.json");
        await writeFile(dataPath, JSON.stringify(data, null, 2), "utf-8");
        const outputPath = path.join(tmpDir, "output.pdf");

        // 判断使用哪个生成脚本
        const templateId = data.templateId || "";
        const civilTemplate = CIVIL_TEMPLATES.find(t => t.id === templateId);

        let cmd: string;

        if (civilTemplate) {
            // 民事起诉状模板优先走重构版，未迁移时再回退到原目录。
            const refactoredTemplateDir = path.join(REFACTORED_TEMPLATES_BASE, civilTemplate.dirName);
            const legacyTemplateDir = path.join(LEGACY_TEMPLATES_BASE, civilTemplate.dirName);
            const templateDir = existsSync(refactoredTemplateDir) ? refactoredTemplateDir : legacyTemplateDir;

            if (!civilTemplate.available) {
                return NextResponse.json({ error: `模板暂未上线: ${civilTemplate.subtitle}` }, { status: 400 });
            }

            if (!existsSync(templateDir)) {
                return NextResponse.json({ error: `模板目录不存在: ${civilTemplate.dirName}` }, { status: 500 });
            }

            const texFiles = (await readdir(templateDir)).filter(name => name.endsWith(".tex"));
            if (texFiles.length === 0) {
                return NextResponse.json(
                    { error: `模板目录缺少 .tex 文件，当前模板暂不可生成: ${civilTemplate.subtitle}` },
                    { status: 500 }
                );
            }

            cmd = `python3 "${CIVIL_GENERATE_SCRIPT}" --template "${templateDir}" --data "${dataPath}" --output "${outputPath}"`;
        } else if (templateId === "xingshi-wuru") {
            // 旧侮辱案模板 → 使用专用生成器
            cmd = `python3 "${OLD_GENERATE_SCRIPT}" --data "${dataPath}" --output "${outputPath}"`;
        } else {
            // 未知模板
            return NextResponse.json({ error: `未知模板: ${templateId}` }, { status: 400 });
        }

        const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            exec(cmd, { timeout: 120000, env: { ...process.env, HOME: process.env.HOME || "/root" } }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`生成失败: ${stderr || error.message}`));
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });

        if (!existsSync(outputPath)) {
            throw new Error(`PDF 文件未生成。日志: ${result.stderr}`);
        }

        const pdfBuffer = await readFile(outputPath);

        // 保存文档记录
        try {
            const user = await getCurrentUser();
            if (user) {
                if (data.docId) {
                    const existingDoc = documentDb.findById(data.docId);
                    if (existingDoc && existingDoc.user_id === user.userId) {
                        documentDb.update(data.docId, {
                            title: data.templateName || "法律文书",
                            templateId: data.templateId || "",
                            formData: JSON.stringify(data),
                        });
                    } else {
                        documentDb.create({
                            userId: user.userId,
                            title: data.templateName || "法律文书",
                            templateId: data.templateId || "",
                            formData: JSON.stringify(data),
                        });
                    }
                } else {
                    documentDb.create({
                        userId: user.userId,
                        title: data.templateName || "法律文书",
                        templateId: data.templateId || "",
                        formData: JSON.stringify(data),
                    });
                }
            }
        } catch {
            // 不影响主流程
        }

        // 清理
        try {
            await rm(tmpDir, { recursive: true, force: true });
        } catch { }

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
