import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { caseDb, documentDb, analysisDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const cases = caseDb.listByUser(user.userId).length;
    const documents = documentDb.listByUser(user.userId).length;
    const analyses = analysisDb.listByUser(user.userId).length;
    const total = cases + documents + analyses;

    return NextResponse.json({
        level: "大理寺卿",
        quota: 10000,
        used: total,
        breakdown: { cases, documents, analyses },
    });
}
