import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { CIVIL_TEMPLATES } from "@/lib/templates";

const REFACTORED_TEMPLATES_BASE = path.resolve(process.cwd(), "..", "template_refactor");

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const template = CIVIL_TEMPLATES.find((item) => item.id === id);

        if (!template) {
            return NextResponse.json({ error: `未知模板: ${id}` }, { status: 404 });
        }

        const schemaPath = path.join(REFACTORED_TEMPLATES_BASE, template.dirName, "schema.json");
        if (!existsSync(schemaPath)) {
            return NextResponse.json({ error: `模板 schema 不存在: ${template.dirName}` }, { status: 404 });
        }

        const raw = await readFile(schemaPath, "utf-8");
        const schema = JSON.parse(raw);

        return NextResponse.json({
            template: {
                id: template.id,
                dirName: template.dirName,
                name: template.name,
                subtitle: template.subtitle,
                desc: template.desc,
                category: template.category,
                tags: template.tags,
                pages: template.pages,
                available: template.available,
            },
            schema,
        });
    } catch (error) {
        console.error("Template schema error:", error);
        return NextResponse.json({ error: "读取模板 schema 失败" }, { status: 500 });
    }
}
