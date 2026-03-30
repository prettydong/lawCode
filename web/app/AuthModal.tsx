"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";


interface AuthModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (user: { id: string; phone: string; name: string }) => void;
}

export default function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
    type TabType = "login" | "register";
    const [tab, setTab] = useState<TabType>("login");
    const [showForgot, setShowForgot] = useState(false);
    const [phone, setPhone] = useState("");
    const [smsCode, setSmsCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [codeCountdown, setCodeCountdown] = useState(0);

    // 读取cookie倒计时（原生实现）
    useEffect(() => {
        if (tab === "register") {
            const cookieKey = `sms_countdown_${phone}`;
            const match = document.cookie.match(new RegExp('(?:^|; )' + cookieKey.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
            const left = match ? parseInt(decodeURIComponent(match[1]), 10) : 0;
            if (left > 0) setCodeCountdown(left);
        }
    }, [tab, phone]);

    // 倒计时逻辑，写入cookie（原生实现）
    useEffect(() => {
        if (codeCountdown > 0) {
            const cookieKey = `sms_countdown_${phone}`;
            const expires = new Date(Date.now() + 60 * 1000).toUTCString();
            document.cookie = `${cookieKey}=${codeCountdown}; expires=${expires}; path=/`;
            const timer = setTimeout(() => setCodeCountdown(codeCountdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (phone) {
            const cookieKey = `sms_countdown_${phone}`;
            document.cookie = `${cookieKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        }
    }, [codeCountdown, phone]);

    const reset = () => {
        setPhone("");
        setSmsCode("");
        setPassword("");
        setConfirmPassword("");
        setName("");
        setError("");
        setLoading(false);
    };

    const switchTab = (t: TabType) => {
        setTab(t);
        setError("");
        setShowForgot(false);
        reset();
    };

    // 发送短信验证码
    const handleSendCode = async () => {
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            setError("请输入有效的手机号");
            return;
        }
        setSendingCode(true);
        setError("");
        try {
            const res = await fetch("/api/auth/send-sms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "发送失败，请重试");
                return;
            }
            setCodeCountdown(60);
        } catch {
            setError("网络错误，请检查连接");
        } finally {
            setSendingCode(false);
        }
    };

    // 提交表单
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            let url = "";
            let body: any = {};
            if (tab === "login") {
                if (!/^1[3-9]\d{9}$/.test(phone)) {
                    setError("请输入有效的手机号"); setLoading(false); return;
                }
                if (!password) { setError("请输入密码"); setLoading(false); return; }
                url = "/api/auth/login";
                body = { phone, password };
            } else if (tab === "register") {
                if (!name) { setError("请输入昵称"); setLoading(false); return; }
                if (!/^1[3-9]\d{9}$/.test(phone)) { setError("请输入有效的手机号"); setLoading(false); return; }
                if (!smsCode) { setError("请输入验证码"); setLoading(false); return; }
                if (!password || password.length < 6) { setError("密码至少6位"); setLoading(false); return; }
                if (password !== confirmPassword) { setError("两次密码不一致"); setLoading(false); return; }
                url = "/api/auth/register";
                body = { phone, smsCode, password, name };
            }
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

    // 忘记密码提交
    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            if (!/^1[3-9]\d{9}$/.test(phone)) { setError("请输入有效的手机号"); setLoading(false); return; }
            if (!smsCode) { setError("请输入验证码"); setLoading(false); return; }
            if (!password || password.length < 6) { setError("新密码至少6位"); setLoading(false); return; }
            if (password !== confirmPassword) { setError("两次密码不一致"); setLoading(false); return; }
            const url = "/api/auth/reset-password";
            const body = { phone, smsCode, password };
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
            setShowForgot(false);
            setTab("login");
            setError("密码重置成功，请登录");
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
                {!showForgot && (
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
                )}
                {/* 表单 */}
                {!showForgot && (
                    <form onSubmit={handleSubmit} className="px-7 pt-6 pb-7">
                        {/* 注册时显示昵称 */}
                        {tab === "register" && (
                            <div className="mb-4 fade-in">
                                <label className="block text-[12px] text-[var(--color-text-muted)] mb-1.5 tracking-wide">昵称</label>
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
                        {/* 手机号 */}
                        <div className="mb-4">
                            <label className="block text-[12px] text-[var(--color-text-muted)] mb-1.5 tracking-wide">手机号</label>
                            <input
                                id="auth-phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="请输入手机号"
                                required
                                autoFocus={tab !== "register"}
                                className="w-full px-3.5 py-2.5 bg-[var(--color-bg-warm)] border border-[var(--color-border)] text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(232,89,12,0.08)]"
                            />
                        </div>
                        {/* 短信验证码 */}
                        {tab === "register" && (
                            <div className="mb-4">
                                <label className="block text-[12px] text-[var(--color-text-muted)] mb-1.5 tracking-wide">短信验证码</label>
                                <div className="flex gap-2">
                                    <input
                                        id="auth-sms-code"
                                        type="text"
                                        value={smsCode}
                                        onChange={(e) => setSmsCode(e.target.value)}
                                        placeholder="请输入验证码"
                                        required
                                        className="flex-1 px-3.5 py-2.5 bg-[var(--color-bg-warm)] border border-[var(--color-border)] text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(232,89,12,0.08)]"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSendCode}
                                        disabled={sendingCode || codeCountdown > 0 || !/^1[3-9]\d{9}$/.test(phone)}
                                        className="px-4 py-2.5 bg-[#c23b22] text-white text-[12px] font-medium cursor-pointer hover:bg-[#a82b17] transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                    >
                                        {codeCountdown > 0 ? `${codeCountdown}s` : "获取验证码"}
                                    </button>
                                </div>
                            </div>
                        )}
                        {/* 密码 */}
                        <div className="mb-4">
                            <label className="block text-[12px] text-[var(--color-text-muted)] mb-1.5 tracking-wide">密码</label>
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
                        {/* 确认密码 */}
                        {tab === "register" && (
                            <div className="mb-4">
                                <label className="block text-[12px] text-[var(--color-text-muted)] mb-1.5 tracking-wide">确认密码</label>
                                <input
                                    id="auth-confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="请再次输入密码"
                                    required
                                    minLength={6}
                                    className="w-full px-3.5 py-2.5 bg-[var(--color-bg-warm)] border border-[var(--color-border)] text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(232,89,12,0.08)]"
                                />
                            </div>
                        )}
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
                                tab === "login"
                                    ? "登 录"
                                    : "注 册"
                            )}
                        </button>
                        {/* 底部提示 */}
                        <p className="mt-4 text-center text-[12px] text-[var(--color-text-muted)]">
                            {tab === "login" && (
                                <>
                                    还没有账号？
                                    <button
                                        type="button"
                                        onClick={() => switchTab("register")}
                                        className="text-[#c23b22] hover:underline cursor-pointer ml-0.5"
                                    >
                                        立即注册
                                    </button>
                                    <span className="mx-2">|</span>
                                    <button
                                        type="button"
                                        onClick={() => { reset(); setShowForgot(true); }}
                                        className="text-[#c23b22] hover:underline cursor-pointer ml-0.5"
                                    >
                                        忘记密码
                                    </button>
                                </>
                            )}
                            {tab === "register" && (
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
                )}
                {/* 忘记密码表单 */}
                {showForgot && (
                    <form onSubmit={handleForgotSubmit} className="px-7 pt-6 pb-7">
                        <div className="mb-4">
                            <label className="block text-[12px] text-[var(--color-text-muted)] mb-1.5 tracking-wide">手机号</label>
                            <input
                                id="forgot-phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="请输入手机号"
                                required
                                className="w-full px-3.5 py-2.5 bg-[var(--color-bg-warm)] border border-[var(--color-border)] text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(232,89,12,0.08)]"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-[12px] text-[var(--color-text-muted)] mb-1.5 tracking-wide">短信验证码</label>
                            <div className="flex gap-2">
                                <input
                                    id="forgot-sms-code"
                                    type="text"
                                    value={smsCode}
                                    onChange={(e) => setSmsCode(e.target.value)}
                                    placeholder="请输入验证码"
                                    required
                                    className="flex-1 px-3.5 py-2.5 bg-[var(--color-bg-warm)] border border-[var(--color-border)] text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(232,89,12,0.08)]"
                                />
                                <button
                                    type="button"
                                    onClick={handleSendCode}
                                    disabled={sendingCode || codeCountdown > 0 || !/^1[3-9]\d{9}$/.test(phone)}
                                    className="px-4 py-2.5 bg-[#c23b22] text-white text-[12px] font-medium cursor-pointer hover:bg-[#a82b17] transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    {codeCountdown > 0 ? `${codeCountdown}s` : "获取验证码"}
                                </button>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-[12px] text-[var(--color-text-muted)] mb-1.5 tracking-wide">新密码</label>
                            <input
                                id="forgot-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="新密码至少 6 位"
                                required
                                minLength={6}
                                className="w-full px-3.5 py-2.5 bg-[var(--color-bg-warm)] border border-[var(--color-border)] text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(232,89,12,0.08)]"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-[12px] text-[var(--color-text-muted)] mb-1.5 tracking-wide">确认密码</label>
                            <input
                                id="forgot-confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="请再次输入密码"
                                required
                                minLength={6}
                                className="w-full px-3.5 py-2.5 bg-[var(--color-bg-warm)] border border-[var(--color-border)] text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(232,89,12,0.08)]"
                            />
                        </div>
                        {error && (
                            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-[13px] text-[#c42b1c] fade-in">
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-[var(--color-text)] text-[var(--color-bg)] text-[14px] font-medium cursor-pointer hover:bg-[var(--color-primary-light)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
                            ) : (
                                "重置密码"
                            )}
                        </button>
                        <p className="mt-4 text-center text-[12px] text-[var(--color-text-muted)]">
                            <>
                                记起密码了？
                                <button
                                    type="button"
                                    onClick={() => { setShowForgot(false); setTab("login"); reset(); }}
                                    className="text-[#c23b22] hover:underline cursor-pointer ml-0.5"
                                >
                                    返回登录
                                </button>
                            </>
                        </p>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
}
