import { formatRelativeTime } from "@/lib/utils";

interface PriceSourceTagProps {
  source: "sosovalue" | null;
  fetchedAt: number | null;
}

export function PriceSourceTag({ source, fetchedAt }: PriceSourceTagProps) {
  if (!source || !fetchedAt) {
    return (
      <span className="text-xs text-[color:var(--color-fg-subtle)]">Loading prices…</span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[color:var(--color-fg-subtle)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-success)]" />
      Prices · SoSoValue · updated {formatRelativeTime(fetchedAt)}
    </span>
  );
}
