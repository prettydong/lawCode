"use client";

import { useState, useEffect, useRef } from "react";
import AuthModal from "./AuthModal";

interface User {
    id?: string;
    userId?: string;
    email: string;
    name: string;
}

export default function UserButton() {
    const [user, setUser] = useState<User | null>(null);
    const [showAuth, setShowAuth] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [checked, setChecked] = useState(false);
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
                <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg fade-in z-50">
                    {/* 用户信息 */}
                    <div className="px-4 py-3 border-b border-[var(--color-border)]">
                        <p className="text-[13px] font-medium text-[var(--color-text)] truncate">
                            {user.name}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5">
                            {user.email}
                        </p>
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
