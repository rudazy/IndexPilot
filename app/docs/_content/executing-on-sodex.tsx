export default function ExecutingOnSoDEX() {
  return (
    <>
      <p>
        SoDEX is the native decentralized exchange for the ValueChain
        ecosystem. It is where IndexPilot rebalance trades are routed —
        today via a manual hand-off, soon via a direct API integration.
      </p>

      <h2>The current flow</h2>

      <p>
        IndexPilot generates the rebalance plan. You copy the orders and
        execute them on SoDEX yourself. The dashboard provides the numbers,
        the order, and a deep link — you provide the signature.
      </p>

      <ol>
        <li>
          On the dashboard, review the orders in the <strong>Rebalance
          plan</strong> panel. Each row shows side (buy or sell), token,
          amount in token units, and USD equivalent.
        </li>
        <li>
          Press <strong>Execute on SoDEX</strong>. A new tab opens to the
          SoDEX app.
        </li>
        <li>
          In SoDEX, select the first order&apos;s trading pair, enter the
          amount, and place the trade.
        </li>
        <li>
          Repeat for each order in the plan. The plan is already sorted —
          sells first, then buys — so proceeds fund subsequent purchases.
        </li>
        <li>
          Back in IndexPilot, the activity log records the plan you acted on.
          Once your wallet balances reflect the trades, the dashboard will
          settle to the new allocation on its next price tick.
        </li>
      </ol>

      <h2>Why it is manual right now</h2>

      <p>
        Direct execution requires a SoDEX API key and a signed approval for
        IndexPilot to submit orders on your behalf. That approval flow is
        live in Wave 2 of the roadmap — the client-side typings in{" "}
        <code>lib/sodex.ts</code> are already in place, waiting for the API
        handshake to land.
      </p>

      <h2>Coming in Wave 2</h2>

      <ul>
        <li>
          <strong>One-click execution.</strong> Press a single button and
          IndexPilot submits every order in the plan to SoDEX in sequence,
          surfacing transaction hashes and fills as they return.
        </li>
        <li>
          <strong>Slippage controls.</strong> Set a maximum slippage per
          order, and abort the remainder of the plan if any single leg
          breaches it.
        </li>
        <li>
          <strong>Partial fills and retries.</strong> If a leg fills
          partially, the planner adjusts downstream orders so the final
          portfolio still lands on target.
        </li>
      </ul>

      <p>
        Until Wave 2 ships, the manual hand-off is the full flow — and
        because every number on the rebalance panel is deterministic, the
        manual path produces exactly the same end state as the automated
        one will.
      </p>
    </>
  );
}
