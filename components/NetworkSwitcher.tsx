"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { useSodexNetwork } from "@/contexts/SodexNetworkContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface NetworkSwitcherProps {
  className?: string;
}

export function NetworkSwitcher({ className }: NetworkSwitcherProps) {
  const { network, setNetwork } = useSodexNetwork();
  const isMainnet = network === "mainnet";
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pillTone = isMainnet
    ? "bg-[color:var(--color-success-dim)] text-[color:var(--color-success)]"
    : "bg-[color:var(--color-warn-dim)] text-[color:var(--color-warn)]";
  const dotTone = isMainnet
    ? "bg-[color:var(--color-success)]"
    : "bg-[color:var(--color-warn)]";
  const label = isMainnet ? "Mainnet" : "Testnet";

  const pillBase =
    "inline-flex items-center gap-1.5 h-6 px-2 rounded-[4px] text-xs font-medium tracking-[0.08em] uppercase";

  // Switching to Mainnet is gated by a confirm modal; switching back to the
  // safer Testnet is immediate.
  const handleClick = useCallback(() => {
    if (isMainnet) {
      setNetwork("testnet");
    } else {
      setConfirmOpen(true);
    }
  }, [isMainnet, setNetwork]);

  const confirmMainnet = useCallback(() => {
    setNetwork("mainnet");
    setConfirmOpen(false);
  }, [setNetwork]);

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={handleClick}
        title={`Switch to ${isMainnet ? "Testnet" : "Mainnet"}`}
        aria-label={`Network: ${label}. Switch to ${isMainnet ? "Testnet" : "Mainnet"}.`}
        className={cn(
          pillBase,
          pillTone,
          "cursor-pointer hover:opacity-80 transition-opacity",
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", dotTone)} />
        {label}
      </button>

      {isMainnet && (
        <span className="relative group inline-flex items-center">
          <AlertTriangle className="h-3.5 w-3.5 text-[color:var(--color-warn)]" />
          <span
            role="tooltip"
            className={cn(
              "pointer-events-none absolute left-1/2 top-full z-40 mt-1.5 -translate-x-1/2 whitespace-nowrap",
              "rounded-[6px] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-3)]",
              "px-2.5 py-1.5 text-xs text-[color:var(--color-fg)] shadow-[var(--shadow-elev-2)]",
              "opacity-0 group-hover:opacity-100 transition-opacity",
            )}
          >
            Real orders will be placed
          </span>
        </span>
      )}

      {confirmOpen && (
        <ConfirmMainnetDialog
          onConfirm={confirmMainnet}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}

function ConfirmMainnetDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onCancel]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mainnet-confirm-title"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full max-w-[420px] rounded-[10px] border border-[color:var(--color-border-strong)]",
          "bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-elev-2)] fade-in-up",
        )}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-warn-dim)]">
            <AlertTriangle className="h-4 w-4 text-[color:var(--color-warn)]" />
          </span>
          <div className="min-w-0">
            <h2
              id="mainnet-confirm-title"
              className="text-base font-medium text-[color:var(--color-fg)]"
            >
              Switch to Mainnet?
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
              Orders placed while on Mainnet are{" "}
              <span className="text-[color:var(--color-fg)]">real</span> and execute
              against your live SoDEX account and funds. There is no undo.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} autoFocus>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm}>
            Switch to Mainnet
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
