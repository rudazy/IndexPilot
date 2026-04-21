import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet } from "wagmi/chains";
import { valueChainTestnet, isValueChainConfigured } from "./chains";

const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

if (typeof window !== "undefined" && !WALLETCONNECT_PROJECT_ID) {
  console.warn(
    "[indexpilot] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. WalletConnect-based connectors will be unavailable.",
  );
}

const chains = isValueChainConfigured
  ? ([valueChainTestnet, mainnet] as const)
  : ([mainnet] as const);

export const wagmiConfig = getDefaultConfig({
  appName: "IndexPilot",
  projectId: WALLETCONNECT_PROJECT_ID || "indexpilot-dev",
  chains,
  ssr: true,
});
