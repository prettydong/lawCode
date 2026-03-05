"use client";

import { ConfirmProvider } from "./ConfirmDialog";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
    return <ConfirmProvider>{children}</ConfirmProvider>;
}
