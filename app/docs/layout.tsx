import type { ReactNode } from "react";
import { DocsSidebar } from "./_components/DocsSidebar";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[color:var(--color-bg)]">
      <DocsSidebar />
      <main className="md:pl-[240px]">
        <div className="mx-auto w-full max-w-[780px] px-6 py-16 md:py-20">
          {children}
        </div>
      </main>
    </div>
  );
}
