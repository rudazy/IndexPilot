"use client";

import { useSyncExternalStore } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import {
  dismissToast,
  getEmptyToasts,
  getToasts,
  subscribeToasts,
  type Toast,
  type ToastTone,
} from "@/lib/toast";
import { cn } from "@/lib/utils";

const TONE_STYLES: Record<ToastTone, { border: string; icon: React.ReactNode }> = {
  success: {
    border: "border-[color:var(--color-success)]/40",
    icon: <CheckCircle2 className="h-4 w-4 text-[color:var(--color-success)]" />,
  },
  danger: {
    border: "border-[color:var(--color-danger)]/40",
    icon: <AlertTriangle className="h-4 w-4 text-[color:var(--color-danger)]" />,
  },
  info: {
    border: "border-[color:var(--color-border-strong)]",
    icon: <Info className="h-4 w-4 text-[color:var(--color-fg-muted)]" />,
  },
};

export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getEmptyToasts);
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-[min(360px,calc(100vw-40px))]"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastCard({ toast }: { toast: Toast }) {
  const tone = TONE_STYLES[toast.tone];
  return (
    <div
      role="status"
      className={cn(
        "card-glass flex items-start gap-3 rounded-[10px] border p-3.5 shadow-[var(--shadow-elev-2)] fade-in-up",
        tone.border,
      )}
    >
      <span className="mt-0.5 shrink-0">{tone.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[color:var(--color-fg)]">{toast.title}</p>
        {toast.message && (
          <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--color-fg-muted)]">
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 text-[color:var(--color-fg-subtle)] hover:text-[color:var(--color-fg)] transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
