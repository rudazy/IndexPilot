import { NextResponse } from "next/server";
import { z } from "zod";
import {
  SodexConfigError,
  executePlan,
  fetchAccountBalances,
  fetchOrderStatuses,
  getSodexNetwork,
  quotePlan,
} from "@/lib/sodex";
import type { SodexNetwork, SodexQuote } from "@/lib/sodexTypes";
import type { RebalanceOrder } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OrderSchema = z.object({
  side: z.enum(["buy", "sell"]),
  symbol: z.string().min(1).max(16),
  amountToken: z.number().nonnegative(),
  amountUsd: z.number().nonnegative(),
  priceUsd: z.number().nonnegative(),
});

const NetworkSchema = z.enum(["testnet", "mainnet"]).optional();

const QuoteRequest = z.object({
  action: z.literal("quote"),
  orders: z.array(OrderSchema).max(50),
  network: NetworkSchema,
});

const QuoteSchema = z.object({
  symbol: z.string(),
  market: z.string().nullable(),
  symbolId: z.number().nullable(),
  side: z.enum(["buy", "sell"]),
  orderType: z.literal("market"),
  quantity: z.string().nullable(),
  funds: z.string().nullable(),
  clOrdId: z.string(),
  estPriceUsd: z.number(),
  estNotionalUsd: z.number(),
  estFeeUsd: z.number(),
  tradable: z.boolean(),
  skipReason: z.string().optional(),
});

const ExecuteRequest = z.object({
  action: z.literal("execute"),
  quotes: z.array(QuoteSchema).max(50),
  network: NetworkSchema,
});

const BalancesRequest = z.object({
  action: z.literal("balances"),
  network: NetworkSchema,
});

const OrderStatusRequest = z.object({
  action: z.literal("orderStatus"),
  clOrdIds: z.array(z.string().min(1).max(64)).min(1).max(50),
  network: NetworkSchema,
});

const RequestSchema = z.discriminatedUnion("action", [
  QuoteRequest,
  ExecuteRequest,
  BalancesRequest,
  OrderStatusRequest,
]);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Request body failed schema validation.", details: parsed.error.issues },
      { status: 400 },
    );
  }

  if (parsed.data.action === "quote") {
    return handleQuote(parsed.data.orders as RebalanceOrder[], parsed.data.network);
  }
  if (parsed.data.action === "balances") {
    return handleBalances(parsed.data.network);
  }
  if (parsed.data.action === "orderStatus") {
    return handleOrderStatus(parsed.data.clOrdIds, parsed.data.network);
  }
  return handleExecute(parsed.data.quotes as SodexQuote[], parsed.data.network);
}

async function handleOrderStatus(clOrdIds: string[], network?: SodexNetwork) {
  const startedAt = Date.now();
  try {
    const result = await fetchOrderStatuses(clOrdIds, network);
    const totalLatencyMs = Date.now() - startedAt;
    logCall("orderStatus", {
      network: result.network,
      requested: clOrdIds.length,
      found: result.statuses.filter((s) => s.found).length,
      filled: result.statuses.filter((s) => s.filled).length,
      latencyMs: totalLatencyMs,
    });
    return NextResponse.json({
      network: result.network,
      account: result.account,
      statuses: result.statuses,
      meta: { upstreamCalls: result.upstreamCalls, totalLatencyMs },
    });
  } catch (err) {
    return errorResponse(err, "orderStatus");
  }
}

async function handleBalances(network?: SodexNetwork) {
  const startedAt = Date.now();
  try {
    const result = await fetchAccountBalances(network);
    const totalLatencyMs = Date.now() - startedAt;
    logCall("balances", {
      network: result.network,
      account: result.account.accountId,
      assets: result.balances.length,
      latencyMs: totalLatencyMs,
    });
    return NextResponse.json({
      network: result.network,
      account: result.account,
      balances: result.balances,
      meta: { upstreamCalls: result.upstreamCalls, totalLatencyMs },
    });
  } catch (err) {
    return errorResponse(err, "balances");
  }
}

async function handleQuote(orders: RebalanceOrder[], network?: SodexNetwork) {
  const startedAt = Date.now();
  try {
    const result = await quotePlan(orders, network);
    const totalLatencyMs = Date.now() - startedAt;
    logCall("quote", {
      network: result.network,
      legs: result.quotes.length,
      tradable: result.quotes.filter((q) => q.tradable).length,
      account: result.account?.accountId ?? null,
      latencyMs: totalLatencyMs,
    });
    return NextResponse.json({
      network: result.network,
      quotes: result.quotes,
      account: result.account,
      totalNotionalUsd: result.totalNotionalUsd,
      meta: { upstreamCalls: result.upstreamCalls, totalLatencyMs },
    });
  } catch (err) {
    return errorResponse(err, "quote");
  }
}

async function handleExecute(quotes: SodexQuote[], network?: SodexNetwork) {
  const startedAt = Date.now();
  try {
    const result = await executePlan(quotes, network);
    const totalLatencyMs = Date.now() - startedAt;
    logCall("execute", {
      network: result.network,
      code: result.code,
      orders: result.results.length,
      account: result.account.accountId,
      latencyMs: totalLatencyMs,
    });
    return NextResponse.json({
      network: result.network,
      code: result.code,
      message: result.message,
      account: result.account,
      results: result.results,
      raw: result.raw,
      meta: { upstreamCalls: result.upstreamCalls, totalLatencyMs },
    });
  } catch (err) {
    return errorResponse(err, "execute");
  }
}

function errorResponse(err: unknown, action: string) {
  if (err instanceof SodexConfigError) {
    // Configuration / readiness problems: not the server's fault, surface as 503.
    return NextResponse.json({ error: err.message, network: getSodexNetwork() }, { status: 503 });
  }
  const message = err instanceof Error ? err.message : "Unknown error";
  console.error(`[sodex] ${action} failed: ${message}`);
  return NextResponse.json(
    { error: `SoDEX ${action} failed: ${message}`, network: getSodexNetwork() },
    { status: 502 },
  );
}

function logCall(action: string, fields: Record<string, unknown>) {
  const parts = Object.entries(fields).map(([k, v]) => `${k}=${v}`);
  console.log(`[sodex] action=${action} ${parts.join(" ")}`);
}
