"use client";

import { useState, useCallback, createContext, useContext } from "react";

// ── Context ──
interface ConfirmState {
    message: string;
    resolve: (v: boolean) => void;
}

const ConfirmContext = createContext<(msg: string) => Promise<boolean>>(
    () => Promise.resolve(false)
);

export function useConfirm() {
    return useContext(ConfirmContext);
}

// ── Provider + Dialog ──
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<ConfirmState | null>(null);

    const confirm = useCallback((message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setState({ message, resolve });
        });
    }, []);

    const handleClose = (result: boolean) => {
        state?.resolve(result);
        setState(null);
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}

            {/* Overlay */}
            {state && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
                    onClick={() => handleClose(false)}
                >
                    <div
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[0_8px_40px_rgba(0,0,0,0.12)] w-[340px] px-7 py-6 fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 请三思 */}
                        <div className="flex justify-center mb-4">
                            <span className="text-[22px] font-semibold" style={{ color: "#c23b22", fontFamily: "var(--font-kaiti), KaiTi, 楷体, serif" }}>请三思</span>
                        </div>

                        {/* Message */}
                        <p className="text-center text-[14px] text-[var(--color-text)] mb-6 leading-relaxed">
                            {state.message}
                        </p>

                        {/* Buttons */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleClose(false)}
                                className="flex-1 py-2.5 text-[13px] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:border-[var(--color-text)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
                            >
                                否
                            </button>
                            <button
                                onClick={() => handleClose(true)}
                                className="flex-1 py-2.5 text-[13px] text-white bg-[#c23b22] hover:bg-[#a83220] transition-colors cursor-pointer"
                            >
                                是
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}
