import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { userDb } from "@/lib/db";
import { signToken, setAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: "请输入邮箱和密码" },
                { status: 400 }
            );
        }

        // 查找用户
        const user = userDb.findByEmail(email);
        if (!user) {
            return NextResponse.json(
                { error: "邮箱或密码错误" },
                { status: 401 }
            );
        }

        // 验证密码
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return NextResponse.json(
                { error: "邮箱或密码错误" },
                { status: 401 }
            );
        }

        // 签发 token
        const token = await signToken({ userId: user.id, email: user.email, name: user.name });
        await setAuthCookie(token);

        return NextResponse.json({ user: userDb.toPublic(user) });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "登录失败，请稍后重试" },
            { status: 500 }
        );
    }
}
