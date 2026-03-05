"use client";

import { useState, useEffect, useRef } from "react";
import AuthModal from "./AuthModal";

interface User {
    id?: string;
    userId?: string;
    email: string;
    name: string;
}

interface UsageData {
    level: string;
    quota: number;
    used: number;
    breakdown: { cases: number; documents: number; analyses: number };
}

export default function UserButton() {
    const [user, setUser] = useState<User | null>(null);
    const [showAuth, setShowAuth] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [checked, setChecked] = useState(false);
    const [usage, setUsage] = useState<UsageData | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // 页面加载时检查登录状态
    useEffect(() => {
        fetch("/api/auth/me")
            .then((r) => r.json())
            .then((data) => {
                if (data.user) setUser(data.user);
            })
            .catch(() => { })
            .finally(() => setChecked(true));
    }, []);

    // 打开菜单时加载使用量
    useEffect(() => {
        if (!showMenu || !user) return;
        fetch("/api/auth/usage")
            .then((r) => r.json())
            .then((data) => { if (data.quota) setUsage(data); })
            .catch(() => { });
    }, [showMenu, user]);

    // 点击外部关闭菜单
    useEffect(() => {
        if (!showMenu) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showMenu]);

    const handleLogout = async () => {
        setShowMenu(false);
        await fetch("/api/auth/logout", { method: "POST" });
        setUser(null);
        window.location.href = "/";
    };

    // 还在检查登录状态时不显示
    if (!checked) return null;

    // 未登录：显示登录按钮
    if (!user) {
        return (
            <>
                <button
                    id="login-button"
                    onClick={() => setShowAuth(true)}
                    className="hover:text-[var(--color-text)] transition-colors cursor-pointer"
                >
                    登录
                </button>
                <AuthModal
                    open={showAuth}
                    onClose={() => setShowAuth(false)}
                    onSuccess={(u) => setUser(u)}
                />
            </>
        );
    }

    // 已登录：显示头像 + 下拉菜单
    const initial = user.name.charAt(0).toUpperCase();
    const pct = usage ? Math.min((usage.used / usage.quota) * 100, 100) : 0;

    return (
        <div className="relative" ref={menuRef}>
            <button
                id="user-menu-button"
                onClick={() => setShowMenu(!showMenu)}
                className="w-8 h-8 bg-[#c23b22] text-white text-[13px] font-semibold flex items-center justify-center cursor-pointer hover:bg-[#a83220] transition-colors"
                title={user.name}
            >
                {initial}
            </button>

            {/* 下拉菜单 */}
            {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg fade-in z-50">
                    {/* 用户信息 + 等级 */}
                    <div className="px-4 py-3 border-b border-[var(--color-border)]">
                        <div className="flex items-center justify-between">
                            <p className="text-[13px] font-medium text-[var(--color-text)] truncate">
                                {user.name}
                            </p>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gradient-to-r from-[#c23b22] to-[#e8590c] text-white tracking-wider" style={{ fontFamily: "var(--font-kaiti), KaiTi, 楷体, serif" }}>
                                大理寺卿
                            </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5">
                            {user.email}
                        </p>
                    </div>

                    {/* 工作区用量 */}
                    <div className="px-4 py-3 border-b border-[var(--color-border)]">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] text-[var(--color-text-muted)]">工作区</span>
                            <span className="text-[11px] text-[var(--color-text-muted)]">
                                {usage ? `${usage.used} / ${usage.quota.toLocaleString()}` : "加载中..."}
                            </span>
                        </div>
                        {/* 进度条 */}
                        <div className="w-full h-1.5 bg-[var(--color-border)]">
                            <div
                                className="h-full bg-gradient-to-r from-[#c23b22] to-[#e8590c] transition-all duration-500"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        {/* 明细 */}
                        {usage && (
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--color-text-muted)]">
                                <span>案件 {usage.breakdown.cases}</span>
                                <span>诉状 {usage.breakdown.documents}</span>
                                <span>分析 {usage.breakdown.analyses}</span>
                            </div>
                        )}
                    </div>

                    {/* 菜单项 */}
                    <div className="py-1">
                        <button
                            id="logout-button"
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-[13px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
                        >
                            退出登录
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
