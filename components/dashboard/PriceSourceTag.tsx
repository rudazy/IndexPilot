import { formatRelativeTime } from "@/lib/utils";

interface PriceSourceTagProps {
  source: "sosovalue" | "coingecko" | null;
  fetchedAt: number | null;
}

const LABEL: Record<"sosovalue" | "coingecko", string> = {
  sosovalue: "SoSoValue",
  coingecko: "CoinGecko",
};

export function PriceSourceTag({ source, fetchedAt }: PriceSourceTagProps) {
  if (!source || !fetchedAt) {
    return (
      <span className="text-[11px] text-[color:var(--color-fg-subtle)]">Loading prices…</span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[color:var(--color-fg-subtle)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-success)]" />
      Prices · {LABEL[source]} · updated {formatRelativeTime(fetchedAt)}
    </span>
  );
}
