"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

interface AuthModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (user: { id: string; email: string; name: string }) => void;
}

export default function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
    const [tab, setTab] = useState<"login" | "register">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const reset = () => {
        setEmail("");
        setPassword("");
        setName("");
        setError("");
        setLoading(false);
    };

    const switchTab = (t: "login" | "register") => {
        setTab(t);
        setError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const isLogin = tab === "login";
            const url = isLogin ? "/api/auth/login" : "/api/auth/register";
            const body = isLogin
                ? { email, password }
                : { email, password, name };

            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "操作失败，请重试");
                return;
            }

            reset();
            onSuccess(data.user);
            onClose();
        } catch {
            setError("网络错误，请检查连接");
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            onClick={onClose}
        >
            {/* 遮罩 */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm fade-in" />

            {/* 弹窗 */}
            <div
                className="relative bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl w-full max-w-[380px] mx-4 fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 顶部 Tab 切换 */}
                <div className="flex border-b border-[var(--color-border)]">
                    {(["login", "register"] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => switchTab(t)}
                            className={`flex-1 py-3.5 text-[14px] font-medium transition-colors cursor-pointer relative ${tab === t
                                    ? "text-[var(--color-text)]"
                                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                                }`}
                        >
                            {t === "login" ? "登录" : "注册"}
                            {tab === t && (
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#c23b22]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* 表单 */}
                <form onSubmit={handleSubmit} className="px-7 pt-6 pb-7">
                    {/* 注册时显示昵称 */}
                    {tab === "register" && (
                        <div className="mb-4 fade-in">
                            <label className="block text-[12px] text-[var(--color-text-muted)] mb-1.5 tracking-wide">
                                昵称
                            </label>
                            <input
                                id="auth-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="请输入昵称"
                                required
                                className="w-full px-3.5 py-2.5 bg-[var(--color-bg-warm)] border border-[var(--color-border)] text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(232,89,12,0.08)]"
                            />
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-[12px] text-[var(--color-text-muted)] mb-1.5 tracking-wide">
                            邮箱
                        </label>
                        <input
                            id="auth-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="请输入邮箱"
                            required
                            autoFocus
                            className="w-full px-3.5 py-2.5 bg-[var(--color-bg-warm)] border border-[var(--color-border)] text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(232,89,12,0.08)]"
                        />
                    </div>

                    <div className="mb-5">
                        <label className="block text-[12px] text-[var(--color-text-muted)] mb-1.5 tracking-wide">
                            密码
                        </label>
                        <input
                            id="auth-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={tab === "register" ? "至少 6 位" : "请输入密码"}
                            required
                            minLength={tab === "register" ? 6 : undefined}
                            className="w-full px-3.5 py-2.5 bg-[var(--color-bg-warm)] border border-[var(--color-border)] text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(232,89,12,0.08)]"
                        />
                    </div>

                    {/* 错误提示 */}
                    {error && (
                        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-[13px] text-[#c42b1c] fade-in">
                            {error}
                        </div>
                    )}

                    {/* 提交按钮 */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-[var(--color-text)] text-[var(--color-bg)] text-[14px] font-medium cursor-pointer hover:bg-[var(--color-primary-light)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
                        ) : (
                            tab === "login" ? "登 录" : "注 册"
                        )}
                    </button>

                    {/* 底部提示 */}
                    <p className="mt-4 text-center text-[12px] text-[var(--color-text-muted)]">
                        {tab === "login" ? (
                            <>
                                还没有账号？
                                <button
                                    type="button"
                                    onClick={() => switchTab("register")}
                                    className="text-[#c23b22] hover:underline cursor-pointer ml-0.5"
                                >
                                    立即注册
                                </button>
                            </>
                        ) : (
                            <>
                                已有账号？
                                <button
                                    type="button"
                                    onClick={() => switchTab("login")}
                                    className="text-[#c23b22] hover:underline cursor-pointer ml-0.5"
                                >
                                    返回登录
                                </button>
                            </>
                        )}
                    </p>
                </form>
            </div>
        </div>,
        document.body
    );
}
