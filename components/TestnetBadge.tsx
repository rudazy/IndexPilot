import { cn } from "@/lib/utils";

export function TestnetBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-6 px-2 rounded-[4px]",
        "text-[10px] font-medium tracking-[0.08em] uppercase",
        "bg-[color:var(--color-warn-dim)] text-[color:var(--color-warn)]",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-warn)]" />
      Testnet mode
    </span>
  );
}
