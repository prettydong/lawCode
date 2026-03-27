"use client";

import { ConfirmProvider } from "./ConfirmDialog";
import { BreadcrumbProvider } from "./Breadcrumb";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <ConfirmProvider>
            <BreadcrumbProvider>
                {children}
            </BreadcrumbProvider>
        </ConfirmProvider>
    );
}
