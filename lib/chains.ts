import { defineChain } from "viem";

const STUB_CHAIN_ID = 0;

const rawChainId = Number(process.env.NEXT_PUBLIC_VALUECHAIN_TESTNET_CHAIN_ID ?? "0");
const rawRpcUrl = process.env.NEXT_PUBLIC_VALUECHAIN_TESTNET_RPC_URL ?? "";

export const VALUECHAIN_TESTNET_ID: number = Number.isFinite(rawChainId) && rawChainId > 0
  ? rawChainId
  : STUB_CHAIN_ID;

export const isValueChainConfigured = VALUECHAIN_TESTNET_ID !== STUB_CHAIN_ID && rawRpcUrl.length > 0;

if (typeof window !== "undefined" && !isValueChainConfigured) {
  console.warn(
    "[indexpilot] ValueChain testnet is not configured. Set NEXT_PUBLIC_VALUECHAIN_TESTNET_CHAIN_ID and NEXT_PUBLIC_VALUECHAIN_TESTNET_RPC_URL in .env.local.",
  );
}

export const valueChainTestnet = defineChain({
  id: isValueChainConfigured ? VALUECHAIN_TESTNET_ID : 1337,
  name: "ValueChain Testnet",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: rawRpcUrl ? [rawRpcUrl] : ["http://127.0.0.1:8545"],
    },
  },
  testnet: true,
});
