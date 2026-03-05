import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { caseDb } from "@/lib/db";

// GET /api/cases — 获取当前用户的案件列表
export async function GET() {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const cases = caseDb.listByUser(user.userId);
    return NextResponse.json({ cases });
}

// POST /api/cases — 新建案件
export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    try {
        const { title, description } = await req.json();
        if (!title?.trim()) {
            return NextResponse.json({ error: "请输入案件名称" }, { status: 400 });
        }

        const newCase = caseDb.create({
            userId: user.userId,
            title: title.trim(),
            description: description?.trim() || "",
        });

        return NextResponse.json({ case: newCase });
    } catch (error) {
        console.error("Create case error:", error);
        return NextResponse.json({ error: "创建失败" }, { status: 500 });
    }
}
