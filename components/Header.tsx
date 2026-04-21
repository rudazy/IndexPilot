import Link from "next/link";
import { TestnetBadge } from "./TestnetBadge";
import { WalletButton } from "./WalletButton";
import { cn } from "@/lib/utils";

interface HeaderProps {
  variant?: "default" | "transparent";
  className?: string;
}

export function Header({ variant = "default", className }: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-16 w-full backdrop-blur-lg",
        variant === "default"
          ? "bg-[color:var(--color-bg)]/75 border-b border-[color:var(--color-border)]"
          : "bg-transparent",
        className,
      )}
    >
      <div className="h-full mx-auto max-w-[1400px] px-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-medium text-[color:var(--color-fg)] hover:opacity-80 transition-opacity"
          >
            <Logomark />
            <span className="text-sm tracking-tight">IndexPilot</span>
          </Link>
          <span className="hidden sm:inline-block h-4 w-px bg-[color:var(--color-border-strong)]" />
          <TestnetBadge className="hidden sm:inline-flex" />
        </div>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink href="/setup">Index</NavLink>
          <NavLink href="/docs">Docs</NavLink>
          <NavLink href="/dashboard">Dashboard</NavLink>
        </nav>

        <WalletButton />
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "px-3 h-8 inline-flex items-center rounded-[6px] text-sm",
        "text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]",
        "hover:bg-[color:var(--color-surface-2)] transition-colors",
      )}
    >
      {children}
    </Link>
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
