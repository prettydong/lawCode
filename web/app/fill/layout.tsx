import { Suspense } from "react";

export default function FillLayout({ children }: { children: React.ReactNode }) {
    return <Suspense>{children}</Suspense>;
}
