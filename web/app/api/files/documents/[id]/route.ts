import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { documentDb } from "@/lib/db";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const { id } = await params;
    const doc = documentDb.findById(id);
    if (!doc || doc.user_id !== user.userId) {
        return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    return NextResponse.json({ document: doc });
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const { id } = await params;
    const doc = documentDb.findById(id);
    if (!doc || doc.user_id !== user.userId) {
        return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    documentDb.delete(id);
    return NextResponse.json({ success: true });
}
