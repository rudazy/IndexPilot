"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { Holding } from "@/lib/types";
import { formatPct, formatUsd } from "@/lib/utils";

const SLICE_PALETTE = [
  "#ff6a00",
  "#f5f5f5",
  "#8a8a8a",
  "#3fb96a",
  "#d4a24a",
  "#4d8ee8",
];

interface PortfolioChartProps {
  holdings: Holding[];
  mode: "current" | "target";
  totalUsd: number;
}

export function PortfolioChart({ holdings, mode, totalUsd }: PortfolioChartProps) {
  const data = useMemo(() => {
    return holdings.map((h, i) => ({
      name: h.symbol,
      value:
        mode === "current"
          ? Math.max(h.currentWeight, 0.0001)
          : Math.max(h.targetWeight, 0.0001),
      color: SLICE_PALETTE[i % SLICE_PALETTE.length],
    }));
  }, [holdings, mode]);

  return (
    <div className="relative h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            stroke="#0a0a0a"
            strokeWidth={2}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            cursor={false}
            contentStyle={{
              background: "#111111",
              border: "1px solid #1f1f1f",
              borderRadius: 8,
              fontSize: 12,
              color: "#f5f5f5",
            }}
            formatter={(value, name) => [
              `${typeof value === "number" ? value.toFixed(1) : value}%`,
              String(name),
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-fg-subtle)]">
          {mode === "current" ? "Current" : "Target"}
        </div>
        <div className="text-lg font-medium mt-1 text-numeric">
          {mode === "current" ? formatUsd(totalUsd, 0) : "100%"}
        </div>
        {mode === "current" && (
          <div className="text-[11px] text-[color:var(--color-fg-subtle)] mt-0.5">
            {holdings.length} assets
          </div>
        )}
      </div>
    </div>
  );
}

export function ChartLegend({ holdings }: { holdings: Holding[] }) {
  return (
    <div className="flex flex-wrap gap-3 justify-center mt-2">
      {holdings.map((h, i) => (
        <div key={h.symbol} className="flex items-center gap-1.5 text-[11px]">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: SLICE_PALETTE[i % SLICE_PALETTE.length] }}
          />
          <span className="text-[color:var(--color-fg-muted)]">{h.symbol}</span>
          <span className="text-[color:var(--color-fg-subtle)] text-numeric">
            {formatPct(h.currentWeight - h.targetWeight, 1)}
          </span>
        </div>
      ))}
    </div>
  );
}
