import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { userDb } from "@/lib/db";
import { signToken, setAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const { email, password, name } = await req.json();

        // 基础校验
        if (!email || !password || !name) {
            return NextResponse.json(
                { error: "请填写所有必填字段" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "密码至少需要 6 位" },
                { status: 400 }
            );
        }

        // 检查邮箱是否已注册
        const existing = userDb.findByEmail(email);
        if (existing) {
            return NextResponse.json(
                { error: "该邮箱已被注册" },
                { status: 409 }
            );
        }

        // 创建用户
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = userDb.create({ email, password: hashedPassword, name });

        // 签发 token 并设置 cookie
        const token = await signToken({ userId: user.id, email: user.email, name: user.name });
        await setAuthCookie(token);

        return NextResponse.json({ user });
    } catch (error) {
        console.error("Register error:", error);
        return NextResponse.json(
            { error: "注册失败，请稍后重试" },
            { status: 500 }
        );
    }
}
