"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { SodexNetwork } from "@/lib/sodexTypes";

const STORAGE_KEY = "indexpilot.network";
const DEFAULT_NETWORK: SodexNetwork = "testnet";

interface SodexNetworkContextValue {
  network: SodexNetwork;
  setNetwork: (network: SodexNetwork) => void;
  toggle: () => void;
}

const SodexNetworkContext = createContext<SodexNetworkContextValue | null>(null);

function isNetwork(value: unknown): value is SodexNetwork {
  return value === "testnet" || value === "mainnet";
}

function persist(network: SodexNetwork): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, network);
  } catch {
    /* localStorage unavailable (private mode / SSR) — choice just won't persist */
  }
}

export function SodexNetworkProvider({ children }: { children: ReactNode }) {
  // Initialise to the default so server and first client render match; the
  // stored choice is applied after mount to avoid a hydration mismatch.
  const [network, setNetworkState] = useState<SodexNetwork>(DEFAULT_NETWORK);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate persisted choice post-mount
      if (isNetwork(stored)) setNetworkState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const setNetwork = useCallback((next: SodexNetwork) => {
    setNetworkState(next);
    persist(next);
  }, []);

  const toggle = useCallback(() => {
    setNetworkState((prev) => {
      const next: SodexNetwork = prev === "testnet" ? "mainnet" : "testnet";
      persist(next);
      return next;
    });
  }, []);

  return (
    <SodexNetworkContext.Provider value={{ network, setNetwork, toggle }}>
      {children}
    </SodexNetworkContext.Provider>
  );
}

export function useSodexNetwork(): SodexNetworkContextValue {
  const ctx = useContext(SodexNetworkContext);
  if (!ctx) {
    throw new Error("useSodexNetwork must be used within a SodexNetworkProvider");
  }
  return ctx;
}
