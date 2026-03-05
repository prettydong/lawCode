import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { analysisDb } from "@/lib/db";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    return NextResponse.json({ analyses: analysisDb.listByUser(user.userId) });
}
