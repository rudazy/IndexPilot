"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Zap } from "lucide-react";
import {
  AUTO_INTERVAL_OPTIONS_MS,
  getAutoRebalanceSettings,
  getDefaultAutoRebalanceSettings,
  hydrateAutoRebalanceSettings,
  saveAutoRebalanceSettings,
  subscribeAutoRebalanceSettings,
} from "@/lib/autoRebalance";
import { useSodexNetwork } from "@/contexts/SodexNetworkContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { RebalanceTrigger } from "@/lib/types";

interface AutoRebalanceToggleProps {
  trigger: RebalanceTrigger;
}

function intervalLabel(ms: number): string {
  const minutes = Math.round(ms / 60000);
  return minutes >= 60 ? `${Math.round(minutes / 60)}h` : `${minutes} min`;
}

/**
 * Setup-page control for auto-execution. Enabling on mainnet demands an
 * explicit confirmation modal; the confirmation is stored so the execution
 * loop can distinguish "enabled on testnet" from "cleared for mainnet".
 */
export function AutoRebalanceToggle({ trigger }: AutoRebalanceToggleProps) {
  const settings = useSyncExternalStore(
    subscribeAutoRebalanceSettings,
    getAutoRebalanceSettings,
    getDefaultAutoRebalanceSettings,
  );
  const { network } = useSodexNetwork();
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    hydrateAutoRebalanceSettings();
  }, []);

  const isDriftTrigger = trigger.kind === "drift";

  const handleToggle = () => {
    if (settings.enabled) {
      // Disabling always resets the mainnet clearance; re-enabling re-confirms.
      saveAutoRebalanceSettings({ ...settings, enabled: false, mainnetConfirmed: false });
      return;
    }
    if (network === "mainnet") {
      setConfirmOpen(true);
      return;
    }
    saveAutoRebalanceSettings({ ...settings, enabled: true, mainnetConfirmed: false });
  };

  const confirmMainnet = () => {
    saveAutoRebalanceSettings({ ...settings, enabled: true, mainnetConfirmed: true });
    setConfirmOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              settings.enabled
                ? "bg-[color:var(--color-signal-low-dim)]"
                : "bg-[color:var(--color-surface-2)]",
            )}
          >
            <Zap
              className={cn(
                "h-4 w-4",
                settings.enabled
                  ? "text-[color:var(--color-signal-low)]"
                  : "text-[color:var(--color-fg-subtle)]",
              )}
            />
          </span>
          <div>
            <p className="text-sm font-medium text-[color:var(--color-fg)]">
              Auto-rebalance when drift exceeds threshold
            </p>
            <p className="text-xs text-[color:var(--color-fg-muted)] mt-1 max-w-[46ch] leading-relaxed">
              While the dashboard is open, drift is checked on the cadence below.
              When drift breaches your threshold and the market signal is medium
              or above, the plan executes on SoDEX without a click.
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          aria-label="Auto-rebalance"
          onClick={handleToggle}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
            settings.enabled
              ? "bg-[color:var(--color-signal-low-dim)] border-[color:var(--color-signal-low)]"
              : "bg-[color:var(--color-surface-2)] border-[color:var(--color-border-strong)]",
          )}
        >
          <span
            className={cn(
              "absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full transition-all",
              settings.enabled
                ? "left-[24px] bg-[color:var(--color-signal-low)]"
                : "left-[3px] bg-[color:var(--color-fg-subtle)]",
            )}
          />
        </button>
      </div>

      {settings.enabled && (
        <div className="flex items-center gap-2 pl-11">
          <span className="text-xs text-[color:var(--color-fg-subtle)] mr-1">
            Check every
          </span>
          {AUTO_INTERVAL_OPTIONS_MS.map((ms) => (
            <button
              key={ms}
              type="button"
              onClick={() => saveAutoRebalanceSettings({ ...settings, intervalMs: ms })}
              className={cn(
                "h-7 px-3 rounded-[6px] text-xs font-medium border transition-all duration-150",
                settings.intervalMs === ms
                  ? "bg-[color:var(--color-fg)] text-[color:var(--color-bg)] border-[color:var(--color-fg)]"
                  : "bg-transparent border-[color:var(--color-border-strong)] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]",
              )}
            >
              {intervalLabel(ms)}
            </button>
          ))}
        </div>
      )}

      {settings.enabled && !isDriftTrigger && (
        <p className="flex items-start gap-2 pl-11 text-xs text-[color:var(--color-warn)]">
          <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
          Auto-execution needs a drift-based trigger. Switch the rebalance
          trigger above to drift, or auto mode stays armed but idle.
        </p>
      )}

      {settings.enabled && network === "mainnet" && settings.mainnetConfirmed && (
        <p className="flex items-start gap-2 pl-11 text-xs text-[color:var(--color-warn)]">
          <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
          Mainnet auto-execution confirmed. Real orders will be placed without
          further prompts.
        </p>
      )}

      {confirmOpen && (
        <ConfirmAutoMainnetDialog
          onConfirm={confirmMainnet}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}

function ConfirmAutoMainnetDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
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
        aria-labelledby="auto-mainnet-confirm-title"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full max-w-[440px] rounded-[10px] border border-[color:var(--color-border-strong)]",
          "card-glass p-5 shadow-[var(--shadow-elev-2)] fade-in-up",
        )}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-warn-dim)]">
            <AlertTriangle className="h-4 w-4 text-[color:var(--color-warn)]" />
          </span>
          <div className="min-w-0">
            <h2
              id="auto-mainnet-confirm-title"
              className="text-base font-medium text-[color:var(--color-fg)]"
            >
              Enable auto-execution on Mainnet?
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
              While auto mode is on, IndexPilot will place{" "}
              <span className="text-[color:var(--color-fg)]">real orders</span>{" "}
              against your live SoDEX account whenever drift breaches your
              threshold and the market signal is medium or above. No further
              confirmation is asked per trade.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} autoFocus>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm}>
            Enable on Mainnet
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
