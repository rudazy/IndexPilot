// SoDEX spot trading client (server-only).
//
// Implements the Hyperliquid-style auth model: an API key (referenced by NAME in
// the X-API-Key header) whose private key signs each trading action via EIP-712.
// The private key NEVER leaves the server and NEVER appears in client code.
//
// Action signing pipeline (mirrors sodex-go-sdk-public):
//   ActionPayload{type, params} -> compact JSON -> keccak256 -> payloadHash
//   ExchangeAction{payloadHash, nonce} -> EIP-712 digest -> ECDSA sign
//   X-API-Sign = 0x01 (SignatureTypeEIP712) || r || s || v   (v normalised to 0/1)
//
// Two serialization details are load-bearing for signature acceptance and are
// flagged inline. They must be validated against a funded testnet account before
// mainnet fills are trusted, because a wrong byte silently yields a rejected sig:
//   (1) Decimal fields are serialized as trailing-zero-trimmed strings to match
//       the Go server's shopspring/decimal canonical form.
//   (2) viem returns v in {27,28}; go-ethereum's recover expects {0,1}.

import "server-only";
import { keccak256, toHex, type Hex } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import type { RebalanceOrder } from "./types";
import type {
  SodexAccountInfo,
  SodexNetwork,
  SodexOrderResult,
  SodexQuote,
  SodexUpstreamCall,
} from "./sodexTypes";

// --- Network config -------------------------------------------------------

const NETWORKS: Record<SodexNetwork, { baseUrl: string; chainId: number }> = {
  mainnet: { baseUrl: "https://mainnet-gw.sodex.dev/api/v1/spot", chainId: 286623 },
  testnet: { baseUrl: "https://testnet-gw.sodex.dev/api/v1/spot", chainId: 138565 },
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const QUOTE_ASSET = "USDC";
const ACTION_NEW_ORDER = "batchNewOrder";

// Enum values lifted verbatim from common/enums in the Go SDK.
const SIDE = { buy: 1, sell: 2 } as const;
const ORDER_TYPE_MARKET = 2;
const TIF_IOC = 3; // Immediate-or-cancel: the natural TIF for a market order.

export function getSodexNetwork(): SodexNetwork {
  return process.env.SODEX_NETWORK === "testnet" ? "testnet" : "mainnet";
}

/** Thrown when required env vars are missing; mapped to HTTP 503 by the route. */
export class SodexConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SodexConfigError";
  }
}

interface SodexSigner {
  account: PrivateKeyAccount;
  apiKeyName: string;
}

function getSigner(): SodexSigner {
  const rawKey = process.env.SODEX_SIGNER_PRIVATE_KEY;
  if (!rawKey) {
    throw new SodexConfigError("SODEX_SIGNER_PRIVATE_KEY is not configured.");
  }
  const apiKeyName = process.env.SODEX_API_KEY_NAME;
  if (!apiKeyName) {
    throw new SodexConfigError("SODEX_API_KEY_NAME is not configured.");
  }
  // The X-API-Key header carries the key NAME, not the address or private key.
  if (apiKeyName === "default" || !/^[0-9a-zA-Z_-]{1,36}$/.test(apiKeyName)) {
    throw new SodexConfigError(
      'SODEX_API_KEY_NAME must match ^[0-9a-zA-Z_-]{1,36}$ and not be "default".',
    );
  }
  const pk = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as Hex;
  if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) {
    throw new SodexConfigError(
      "SODEX_SIGNER_PRIVATE_KEY must be a 32-byte hex string.",
    );
  }
  return { account: privateKeyToAccount(pk), apiKeyName };
}

// --- Markets --------------------------------------------------------------

interface SodexMarket {
  symbolId: number;
  displayName: string; // e.g. "BTC/USDC"
  base: string; // e.g. "BTC"
  quote: string; // e.g. "USDC"
  quantityPrecision: number;
  quoteCoinPrecision: number;
  stepSize: string;
  marketMinQuantity: number;
  minNotional: number;
  takerFee: number;
  trading: boolean;
}

interface RawMarket {
  id: number;
  displayName: string;
  baseCoin: string;
  quoteCoin: string;
  quantityPrecision: number;
  quoteCoinPrecision: number;
  stepSize: string;
  marketMinQuantity: string;
  minNotional: string;
  takerFee: string;
  status: string;
}

function timed(): { mark: (call: Omit<SodexUpstreamCall, "latencyMs">) => SodexUpstreamCall } {
  const startedAt = Date.now();
  return {
    mark: (call) => ({ ...call, latencyMs: Date.now() - startedAt }),
  };
}

async function fetchMarkets(
  baseUrl: string,
  calls: SodexUpstreamCall[],
): Promise<Map<string, SodexMarket>> {
  const url = `${baseUrl}/markets/symbols`;
  const t = timed();
  try {
    const res = await fetch(url, { cache: "no-store" });
    const json = (await res.json()) as { code: number; data: RawMarket[] };
    calls.push(t.mark({ url, status: res.status, ok: res.ok && json.code === 0 }));
    const map = new Map<string, SodexMarket>();
    for (const m of json.data ?? []) {
      const [base, quote] = m.displayName.split("/");
      map.set(base.toUpperCase(), {
        symbolId: m.id,
        displayName: m.displayName,
        base: base.toUpperCase(),
        quote: (quote ?? "").toUpperCase(),
        quantityPrecision: m.quantityPrecision,
        quoteCoinPrecision: m.quoteCoinPrecision,
        stepSize: m.stepSize,
        marketMinQuantity: Number(m.marketMinQuantity),
        minNotional: Number(m.minNotional),
        takerFee: Number(m.takerFee),
        trading: m.status === "TRADING",
      });
    }
    return map;
  } catch (err) {
    calls.push(
      t.mark({ url, status: 0, ok: false, error: errMessage(err) }),
    );
    throw err;
  }
}

// --- Account --------------------------------------------------------------

async function fetchAccountId(
  baseUrl: string,
  address: string,
  calls: SodexUpstreamCall[],
): Promise<number> {
  const url = `${baseUrl}/accounts/${address}/state`;
  const t = timed();
  try {
    const res = await fetch(url, { cache: "no-store" });
    const json = (await res.json()) as { code: number; data?: { aid?: number } };
    calls.push(t.mark({ url, status: res.status, ok: res.ok && json.code === 0 }));
    return json.data?.aid ?? 0;
  } catch (err) {
    calls.push(t.mark({ url, status: 0, ok: false, error: errMessage(err) }));
    throw err;
  }
}

/**
 * Resolve the account id to trade on. Prefers SODEX_ACCOUNT_ID (deterministic);
 * otherwise looks up the state of SODEX_ACCOUNT_ADDRESS, falling back to the
 * signer's own address.
 */
async function resolveAccount(
  baseUrl: string,
  signerAddress: string,
  calls: SodexUpstreamCall[],
): Promise<SodexAccountInfo> {
  const override = process.env.SODEX_ACCOUNT_ID;
  const address = process.env.SODEX_ACCOUNT_ADDRESS ?? signerAddress;
  if (override && /^\d+$/.test(override)) {
    const accountId = Number(override);
    return { address, accountId, ready: accountId > 0 };
  }
  const accountId = await fetchAccountId(baseUrl, address, calls);
  return { address, accountId, ready: accountId > 0 };
}

// --- Decimal serialization (load-bearing for the signature) ---------------

/**
 * Floor `value` to `decimals` places, then trim trailing zeros so the string
 * matches the Go server's shopspring/decimal canonical form. We floor (never
 * round up) so an order can never exceed the intended size. Returns "0" for
 * non-positive / non-finite input. VERIFY against testnet before trusting fills.
 */
function decimalString(value: number, decimals: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  const factor = 10 ** decimals;
  const floored = Math.floor(value * factor) / factor;
  const fixed = floored.toFixed(decimals);
  if (!fixed.includes(".")) return fixed;
  const trimmed = fixed.replace(/0+$/, "").replace(/\.$/, "");
  return trimmed === "" ? "0" : trimmed;
}

// --- Quoting --------------------------------------------------------------

let clOrdCounter = 0;
function nextClOrdId(symbol: string, side: string): string {
  clOrdCounter += 1;
  return `ip-${side}-${symbol}-${Date.now().toString(36)}-${clOrdCounter}`;
}

function quoteForOrder(order: RebalanceOrder, market: SodexMarket | undefined): SodexQuote {
  const base: SodexQuote = {
    symbol: order.symbol,
    market: market?.displayName ?? null,
    symbolId: market?.symbolId ?? null,
    side: order.side,
    orderType: "market",
    quantity: null,
    funds: null,
    clOrdId: nextClOrdId(order.symbol, order.side),
    estPriceUsd: order.priceUsd,
    estNotionalUsd: order.amountUsd,
    estFeeUsd: market ? order.amountUsd * market.takerFee : 0,
    tradable: false,
  };

  // USDC is the quote asset (cash), never a tradable leg.
  if (order.symbol.toUpperCase() === QUOTE_ASSET) {
    return { ...base, skipReason: "USDC is the cash leg, not a tradable market." };
  }
  if (!market) {
    return { ...base, skipReason: `No ${order.symbol}/${QUOTE_ASSET} market on SoDEX.` };
  }
  if (!market.trading) {
    return { ...base, skipReason: `${market.displayName} is halted.` };
  }
  if (order.amountUsd < market.minNotional) {
    return {
      ...base,
      skipReason: `Below ${market.displayName} $${market.minNotional} minimum.`,
    };
  }

  if (order.side === "sell") {
    const qty = decimalString(order.amountToken, market.quantityPrecision);
    if (Number(qty) < market.marketMinQuantity || Number(qty) <= 0) {
      return { ...base, skipReason: "Sell quantity below market minimum after rounding." };
    }
    return { ...base, quantity: qty, tradable: true };
  }

  // Market BUY spends quote funds (USDC).
  const funds = decimalString(order.amountUsd, market.quoteCoinPrecision);
  if (Number(funds) < market.minNotional) {
    return { ...base, skipReason: "Buy funds below minimum after rounding." };
  }
  return { ...base, funds, tradable: true };
}

export interface QuotePlanResult {
  network: SodexNetwork;
  quotes: SodexQuote[];
  account: SodexAccountInfo | null;
  totalNotionalUsd: number;
  upstreamCalls: SodexUpstreamCall[];
}

/**
 * Map a rebalance plan onto SoDEX markets and validate each leg. Read-only:
 * fetches public markets and (best-effort) account state. Does NOT sign.
 * Account resolution is skipped silently if credentials are absent so the
 * preview still works without a configured signer.
 */
export async function quotePlan(orders: RebalanceOrder[]): Promise<QuotePlanResult> {
  const network = getSodexNetwork();
  const { baseUrl } = NETWORKS[network];
  const calls: SodexUpstreamCall[] = [];

  const markets = await fetchMarkets(baseUrl, calls);
  const quotes = orders.map((o) => quoteForOrder(o, markets.get(o.symbol.toUpperCase())));

  let account: SodexAccountInfo | null = null;
  try {
    const { account: signerAccount } = getSigner();
    account = await resolveAccount(baseUrl, signerAccount.address, calls);
  } catch (err) {
    if (!(err instanceof SodexConfigError)) throw err;
    // No signer configured yet: preview still returns, account stays null.
  }

  const totalNotionalUsd = quotes
    .filter((q) => q.tradable)
    .reduce((sum, q) => sum + q.estNotionalUsd, 0);

  return { network, quotes, account, totalNotionalUsd, upstreamCalls: calls };
}

// --- Signing --------------------------------------------------------------

// Strictly-monotonic millisecond nonce, unique per signing address. The engine
// keeps the highest 100 nonces per address and rejects anything outside
// (now - 2d, now + 1d). Process-local monotonicity guards rapid batches.
let lastNonce = 0;
function nextNonce(): number {
  const n = Math.max(Date.now(), lastNonce + 1);
  lastNonce = n;
  return n;
}

interface OrderItem {
  symbolID: number;
  clOrdID: string;
  side: number;
  type: number;
  timeInForce: number;
  // Optional decimal-string fields. Field ORDER below must match the Go struct
  // (SymbolID, ClOrdID, Side, Type, TimeInForce, Price, Quantity, Funds) because
  // the payload is hashed as compact JSON in declaration order.
  quantity?: string;
  funds?: string;
}

function buildOrderItem(quote: SodexQuote): OrderItem {
  const item: OrderItem = {
    symbolID: quote.symbolId as number,
    clOrdID: quote.clOrdId,
    side: SIDE[quote.side],
    type: ORDER_TYPE_MARKET,
    timeInForce: TIF_IOC,
  };
  // Insertion order matters: quantity precedes funds, matching the Go struct.
  if (quote.side === "sell") {
    item.quantity = quote.quantity as string;
  } else {
    item.funds = quote.funds as string;
  }
  return item;
}

/**
 * Compute payloadHash = keccak256(compact-JSON({type, params})). JSON.stringify
 * emits keys in insertion order with no whitespace, numbers unquoted, and the
 * decimal strings we already built quoted — matching the Go canonical form.
 */
function computePayloadHash(accountID: number, orders: OrderItem[]): Hex {
  const payload = { type: ACTION_NEW_ORDER, params: { accountID, orders } };
  return keccak256(toHex(JSON.stringify(payload)));
}

async function signExchangeAction(
  signer: SodexSigner,
  chainId: number,
  payloadHash: Hex,
  nonce: number,
): Promise<string> {
  const signature = await signer.account.signTypedData({
    domain: {
      name: "spot",
      version: "1",
      chainId,
      verifyingContract: ZERO_ADDRESS,
    },
    types: {
      ExchangeAction: [
        { name: "payloadHash", type: "bytes32" },
        { name: "nonce", type: "uint64" },
      ],
    },
    primaryType: "ExchangeAction",
    message: { payloadHash, nonce: BigInt(nonce) },
  });

  // viem returns 0x{r:32}{s:32}{v:1} with v in {27,28}. go-ethereum's recover
  // expects v in {0,1}; normalise and prefix with SignatureTypeEIP712 (0x01).
  const hex = signature.slice(2);
  const r = hex.slice(0, 64);
  const s = hex.slice(64, 128);
  let v = parseInt(hex.slice(128, 130), 16);
  if (v >= 27) v -= 27;
  const vHex = v.toString(16).padStart(2, "0");
  return `0x01${r}${s}${vHex}`;
}

// --- Execution ------------------------------------------------------------

export interface ExecutePlanResult {
  network: SodexNetwork;
  code: number;
  message: string;
  account: SodexAccountInfo;
  results: SodexOrderResult[];
  raw: unknown;
  upstreamCalls: SodexUpstreamCall[];
}

interface RawOrderResult {
  clOrdID?: string;
  orderID?: string | number;
  status?: string;
}

/**
 * Sign and submit the tradable legs of a plan as a single batchNewOrder.
 * Requires a configured signer (throws SodexConfigError otherwise) and a
 * resolved account id > 0.
 */
export async function executePlan(quotes: SodexQuote[]): Promise<ExecutePlanResult> {
  const network = getSodexNetwork();
  const { baseUrl, chainId } = NETWORKS[network];
  const calls: SodexUpstreamCall[] = [];

  const signer = getSigner();
  const account = await resolveAccount(baseUrl, signer.account.address, calls);
  if (!account.ready) {
    throw new SodexConfigError(
      `No SoDEX spot account (aid=0) for ${account.address}. Deposit/create the account before executing.`,
    );
  }

  const tradable = quotes.filter((q) => q.tradable && q.symbolId !== null);
  if (tradable.length === 0) {
    throw new SodexConfigError("No tradable legs to execute.");
  }

  const items = tradable.map(buildOrderItem);
  const payloadHash = computePayloadHash(account.accountId, items);
  const nonce = nextNonce();
  const signature = await signExchangeAction(signer, chainId, payloadHash, nonce);

  // HTTP body is the action params; the engine re-wraps with the action type
  // (implied by the endpoint) to recompute and verify the hash.
  const body = JSON.stringify({ accountID: account.accountId, orders: items });
  const url = `${baseUrl}/trade/orders/batch`;
  const t = timed();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": signer.apiKeyName,
      "X-API-Sign": signature,
      "X-API-Nonce": String(nonce),
    },
    body,
    cache: "no-store",
  });

  const rawText = await res.text();
  let json: {
    code?: number;
    msg?: string;
    message?: string;
    error?: string;
    errMsg?: string;
    data?: unknown;
  } = {};
  try {
    json = JSON.parse(rawText);
  } catch {
    // Non-JSON response; leave json empty and rely on status below.
  }
  const code = json.code ?? (res.ok ? 0 : res.status);
  const ok = res.ok && code === 0;
  const errText = json.msg ?? json.message ?? json.error ?? json.errMsg;
  calls.push(t.mark({ url, status: res.status, ok, error: ok ? undefined : errText }));

  const rawResults: RawOrderResult[] = Array.isArray(json.data)
    ? (json.data as RawOrderResult[])
    : [];
  const byClOrd = new Map(rawResults.map((r) => [r.clOrdID, r]));

  const results: SodexOrderResult[] = tradable.map((q) => {
    const r = byClOrd.get(q.clOrdId);
    return {
      clOrdId: q.clOrdId,
      symbol: q.symbol,
      side: q.side,
      orderId: r?.orderID != null ? String(r.orderID) : null,
      status: r?.status ?? (ok ? "ACCEPTED" : "REJECTED"),
      raw: r ?? null,
    };
  });

  return {
    network,
    code,
    message: errText ?? (ok ? "accepted" : `HTTP ${res.status}`),
    account,
    results,
    raw: json,
    upstreamCalls: calls,
  };
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
