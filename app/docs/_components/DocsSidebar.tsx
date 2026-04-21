"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu, X } from "lucide-react";
import { DOC_SECTIONS } from "../_lib/nav";
import { cn } from "@/lib/utils";

export function DocsSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 h-9 w-9 inline-flex items-center justify-center rounded-[6px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/90 backdrop-blur-sm text-[color:var(--color-fg)]"
        aria-label="Open docs menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-40 bg-[color:var(--color-bg)]/70 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-label="Close docs menu"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-screen w-[240px] z-40 flex flex-col",
          "bg-[color:var(--color-bg)] border-r border-[color:var(--color-border)]",
          "transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
        )}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-[color:var(--color-border)]">
          <Link
            href="/"
            className="flex items-center gap-2 font-medium text-[color:var(--color-fg)] hover:opacity-80 transition-opacity"
          >
            <Logomark />
            <span className="text-sm tracking-tight">IndexPilot</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden h-8 w-8 inline-flex items-center justify-center rounded-[6px] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
            aria-label="Close docs menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="px-5 pt-6 pb-2 text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
          Documentation
        </p>

        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {DOC_SECTIONS.map((section) => {
            const href = `/docs/${section.slug}`;
            const active = pathname === href;
            return (
              <Link
                key={section.slug}
                href={href}
                onClick={close}
                className={cn(
                  "block px-3 py-2 my-0.5 rounded-[6px] text-[13.5px] leading-snug transition-colors",
                  active
                    ? "bg-[color:var(--color-accent-dim)] text-[color:var(--color-accent)] font-medium"
                    : "text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] hover:bg-[color:var(--color-surface-2)]",
                )}
              >
                {section.title}
              </Link>
            );
          })}
        </nav>

        <div className="p-5 border-t border-[color:var(--color-border)]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to app
          </Link>
        </div>
      </aside>
    </>
  );
}

function Logomark() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      aria-hidden
      className="text-[color:var(--color-accent)]"
    >
      <circle cx="11" cy="11" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="11" cy="11" r="4" fill="currentColor" />
      <line
        x1="11"
        y1="1"
        x2="11"
        y2="21"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.3"
      />
    </svg>
  );
}
