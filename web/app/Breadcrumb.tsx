"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// ── 面包屑项定义 ──
export interface BreadcrumbLink {
    label: string;
    href?: string;
    onClick?: () => void;
}

export interface BreadcrumbItem {
    label: string;                // 当前层显示名
    siblings?: BreadcrumbLink[];  // 同级的下拉选项（不含自身）
}

interface BreadcrumbContextType {
    path: BreadcrumbItem[];
    setPath: (path: BreadcrumbItem[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType>({
    path: [],
    setPath: () => { },
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
    const [path, setPath] = useState<BreadcrumbItem[]>([]);
    return (
        <BreadcrumbContext.Provider value={{ path, setPath }}>
            {children}
        </BreadcrumbContext.Provider>
    );
}

// ── Hook：供子页面设置面包屑路径 ──
export function useBreadcrumb(items: BreadcrumbItem[]) {
    const { setPath } = useContext(BreadcrumbContext);
    const itemsRef = useRef(items);
    itemsRef.current = items;

    useEffect(() => {
        setPath(itemsRef.current);
        return () => setPath([]);
    }, [items.map(i => i.label).join("/"), setPath]);
}

// ── 田字格文字组件（与 logo 完全一致，28px） ──
function GridChar({ char, color }: { char: string; color: string }) {
    return (
        <div
            className="relative flex items-center justify-center shrink-0"
            style={{
                width: "28px",
                height: "28px",
                border: "1.5px solid #ccc",
                marginLeft: "-0.75px",
            }}
        >
            <div className="absolute left-0 right-0 top-1/2" style={{ borderTop: "0.5px dashed #ccc" }} />
            <div className="absolute top-0 bottom-0 left-1/2" style={{ borderLeft: "0.5px dashed #ccc" }} />
            <span
                className="relative z-10 leading-none"
                style={{
                    fontFamily: "var(--font-kaiti), serif",
                    fontSize: "18px",
                    color,
                    WebkitTextStroke: `0.5px ${color}`,
                }}
            >
                {char}
            </span>
        </div>
    );
}

// ── 小田字格（用于下拉菜单内，20px） ──
function GridCharSmall({ char, color }: { char: string; color: string }) {
    return (
        <div
            className="relative flex items-center justify-center shrink-0"
            style={{
                width: "20px",
                height: "20px",
                border: "1px solid #ccc",
                marginLeft: "-0.5px",
            }}
        >
            <div className="absolute left-0 right-0 top-1/2" style={{ borderTop: "0.5px dashed #ccc" }} />
            <div className="absolute top-0 bottom-0 left-1/2" style={{ borderLeft: "0.5px dashed #ccc" }} />
            <span
                className="relative z-10 leading-none"
                style={{
                    fontFamily: "var(--font-kaiti), serif",
                    fontSize: "12px",
                    color,
                    WebkitTextStroke: `0.3px ${color}`,
                }}
            >
                {char}
            </span>
        </div>
    );
}

// ── 节点内容：短名用田字格，长名用楷体文字 ──
function NodeLabel({ label }: { label: string }) {
    const isShort = Array.from(label).length <= 2;
    if (isShort) {
        const chars = Array.from(label);
        return (
            <span className="flex" style={{ marginLeft: "0.75px" }}>
                {chars.map((c, i) => (
                    <GridChar key={i} char={c} color={i === 0 ? "#000" : "#c23b22"} />
                ))}
            </span>
        );
    }
    return (
        <span className="breadcrumb-text">{label}</span>
    );
}

// ── 下拉菜单项内容 ──
function DropdownLabel({ label }: { label: string }) {
    const isShort = Array.from(label).length <= 2;
    if (isShort) {
        const chars = Array.from(label);
        return (
            <>
                <span className="flex shrink-0" style={{ marginLeft: "0.5px" }}>
                    {chars.map((c, i) => (
                        <GridCharSmall key={i} char={c} color={i === 0 ? "#000" : "#c23b22"} />
                    ))}
                </span>
                <span className="breadcrumb-dropdown-label">{label}</span>
            </>
        );
    }
    return (
        <span className="breadcrumb-dropdown-label">{label}</span>
    );
}

// ── 单个面包屑节点（带可选下拉） ──
function BreadcrumbNode({ item }: { item: BreadcrumbItem }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    useEffect(() => { setOpen(false); }, [pathname]);

    const hasSiblings = item.siblings && item.siblings.length > 0;

    return (
        <div className="breadcrumb-node" ref={ref}>
            {/* 箭头分隔符 */}
            <span className="breadcrumb-arrow">›</span>

            {/* 节点内容 + 可选下拉 */}
            {hasSiblings ? (
                <button
                    className="breadcrumb-current"
                    onClick={() => setOpen(!open)}
                >
                    <NodeLabel label={item.label} />
                </button>
            ) : (
                <NodeLabel label={item.label} />
            )}

            {/* 下拉菜单 */}
            {open && hasSiblings && (
                <div className="breadcrumb-dropdown">
                    {item.siblings!.map((link) => {
                        const inner = <DropdownLabel label={link.label} />;

                        if (link.href) {
                            return (
                                <a key={link.label} href={link.href}
                                    className="breadcrumb-dropdown-item"
                                    onClick={() => setOpen(false)}>
                                    {inner}
                                </a>
                            );
                        }
                        return (
                            <button key={link.label}
                                className="breadcrumb-dropdown-item"
                                onClick={() => { link.onClick?.(); setOpen(false); }}>
                                {inner}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── 面包屑主组件 ──
export function Breadcrumb() {
    const { path } = useContext(BreadcrumbContext);

    if (path.length === 0) return null;

    return (
        <div className="breadcrumb-container">
            {path.map((item, i) => (
                <BreadcrumbNode key={`${item.label}-${i}`} item={item} />
            ))}
        </div>
    );
}
