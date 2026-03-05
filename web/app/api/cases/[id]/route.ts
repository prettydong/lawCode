import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { caseDb } from "@/lib/db";

// DELETE /api/cases/[id] — 删除案件
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;
    const existing = caseDb.findById(id);
    if (!existing || existing.user_id !== user.userId) {
        return NextResponse.json({ error: "案件不存在" }, { status: 404 });
    }

    caseDb.delete(id);
    return NextResponse.json({ success: true });
}

// PATCH /api/cases/[id] — 更新案件
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;
    const existing = caseDb.findById(id);
    if (!existing || existing.user_id !== user.userId) {
        return NextResponse.json({ error: "案件不存在" }, { status: 404 });
    }

    try {
        const body = await req.json();
        caseDb.update(id, body);
        const updated = caseDb.findById(id);
        return NextResponse.json({ case: updated });
    } catch (error) {
        console.error("Update case error:", error);
        return NextResponse.json({ error: "更新失败" }, { status: 500 });
    }
}
