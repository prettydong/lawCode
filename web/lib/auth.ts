import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "fallback-secret-change-me"
);

const TOKEN_NAME = "auth-token";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function parseSecureCookieOverride(): boolean | null {
    const override = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
    if (override === "true") {
        return true;
    }
    if (override === "false") {
        return false;
    }
    return null;
}

function parseProtocol(protocol: string | null | undefined): boolean | null {
    if (!protocol) {
        return null;
    }

    const normalized = protocol.trim().toLowerCase().replace(/:$/, "");
    if (normalized === "https" || normalized === "wss") {
        return true;
    }
    if (normalized === "http" || normalized === "ws") {
        return false;
    }

    return null;
}

function parseUrlProtocol(value: string | null | undefined): boolean | null {
    if (!value) {
        return null;
    }

    try {
        return parseProtocol(new URL(value).protocol);
    } catch {
        return null;
    }
}

function firstHeaderValue(value: string | null): string | null {
    if (!value) {
        return null;
    }

    const first = value.split(",")[0]?.trim();
    return first || null;
}

// 非 https 站点不能写入 Secure Cookie，因此这里优先根据当前请求协议动态决定。
async function shouldUseSecureCookie(): Promise<boolean> {
    const override = parseSecureCookieOverride();
    if (override !== null) {
        return override;
    }

    const headerStore = await headers();

    const forwardedProto = parseProtocol(
        firstHeaderValue(headerStore.get("x-forwarded-proto"))
    );
    if (forwardedProto !== null) {
        return forwardedProto;
    }

    const originProto = parseUrlProtocol(headerStore.get("origin"));
    if (originProto !== null) {
        return originProto;
    }

    const refererProto = parseUrlProtocol(headerStore.get("referer"));
    if (refererProto !== null) {
        return refererProto;
    }

    return process.env.NODE_ENV === "production";
}

export interface JWTPayload {
    userId: string;
    email: string;
    name: string;
}

/** 签发 JWT */
export async function signToken(payload: JWTPayload): Promise<string> {
    return new SignJWT(payload as unknown as Record<string, unknown>)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${TOKEN_MAX_AGE}s`)
        .sign(JWT_SECRET);
}

/** 验证 JWT */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as unknown as JWTPayload;
    } catch {
        return null;
    }
}

/** 设置 cookie */
export async function setAuthCookie(token: string) {
    const cookieStore = await cookies();
    const secure = await shouldUseSecureCookie();
    cookieStore.set(TOKEN_NAME, token, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        maxAge: TOKEN_MAX_AGE,
        path: "/",
    });
}

/** 清除 cookie */
export async function clearAuthCookie() {
    const cookieStore = await cookies();
    const secure = await shouldUseSecureCookie();
    cookieStore.set(TOKEN_NAME, "", {
        httpOnly: true,
        secure,
        sameSite: "lax",
        maxAge: 0,
        path: "/",
    });
}

/** 从 cookie 获取当前用户 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
}
