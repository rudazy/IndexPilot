"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ValueHistoryPoint } from "@/lib/valueHistory";
import { formatUsd } from "@/lib/utils";

const ACTUAL_COLOR = "#ff6a00";
const TARGET_COLOR = "#8a8a8a";

interface PerformanceChartProps {
  points: ValueHistoryPoint[];
}

/**
 * Index value over time: the actual portfolio against the hypothetical
 * perfectly-balanced portfolio (target weights held from the baseline).
 * Series identity is carried by color plus dash pattern and the legend, so it
 * survives colorblind viewing; the target line is a recessive dashed benchmark.
 */
export function PerformanceChart({ points }: PerformanceChartProps) {
  const data = useMemo(
    () =>
      points.map((p) => ({
        t: p.t,
        actual: p.actualUsd,
        target: p.targetUsd,
      })),
    [points],
  );

  const spanMs = data.length >= 2 ? data[data.length - 1].t - data[0].t : 0;

  if (data.length < 2) {
    return (
      <div className="h-[220px] flex flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm text-[color:var(--color-fg-muted)]">
          Collecting value snapshots.
        </p>
        <p className="text-xs text-[color:var(--color-fg-subtle)]">
          A point is recorded on each price refresh, at most every 5 minutes.
          The chart appears once there are two or more points.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t: number) => formatTick(t, spanMs)}
              tick={{ fontSize: 11, fill: "#5a5a5a", fontFamily: "var(--font-mono)" }}
              axisLine={{ stroke: "#1f1f1f" }}
              tickLine={false}
              minTickGap={48}
            />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              cursor={{ stroke: "#2a2a2a", strokeWidth: 1 }}
              contentStyle={{
                background: "#111111",
                border: "1px solid #1f1f1f",
                borderRadius: 8,
                fontSize: 12,
                color: "#f5f5f5",
                fontFamily: "var(--font-mono)",
              }}
              labelFormatter={(t) => formatTooltipTime(Number(t))}
              formatter={(value, name) => [
                typeof value === "number" ? formatUsd(value) : "n/a",
                name === "actual" ? "Your index" : "Target allocation",
              ]}
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke={TARGET_COLOR}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4, fill: TARGET_COLOR, stroke: "#0a0a0a", strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke={ACTUAL_COLOR}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: ACTUAL_COLOR, stroke: "#0a0a0a", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-5 mt-3 px-1">
        <LegendItem color={ACTUAL_COLOR} dashed={false} label="Your index" />
        <LegendItem color={TARGET_COLOR} dashed label="Target allocation (rebalanced at baseline, held)" />
      </div>
    </div>
  );
}

function LegendItem({
  color,
  dashed,
  label,
}: {
  color: string;
  dashed: boolean;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-[color:var(--color-fg-muted)]">
      <svg width="20" height="6" aria-hidden>
        <line
          x1="0"
          y1="3"
          x2="20"
          y2="3"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? "5 4" : undefined}
        />
      </svg>
      {label}
    </span>
  );
}

function formatTick(t: number, spanMs: number): string {
  const d = new Date(t);
  // Under a day of data, show clock time; beyond that, show the date.
  if (spanMs <= 24 * 60 * 60 * 1000) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTooltipTime(t: number): string {
  const d = new Date(t);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
