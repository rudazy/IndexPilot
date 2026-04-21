export default function FAQ() {
  return (
    <>
      <p>
        Short answers to the questions new users ask most often. For anything
        not covered here, reach out on the ValueChain developer channel or
        check the rest of these docs.
      </p>

      <h3>Is IndexPilot non-custodial?</h3>
      <p>
        Yes. IndexPilot never takes custody of your funds. Your wallet stays
        connected in read mode — the dashboard prices your balances and
        proposes trades, but every transaction is signed and broadcast by
        you. There is no pooled vault, no deposit step, and no shared
        smart-contract address.
      </p>

      <h3>Which chains are supported?</h3>
      <p>
        ValueChain testnet is the target for Wave 1. Because IndexPilot is a
        planner rather than an executor, price data already covers the major
        assets you would want in an index — BTC, ETH, SOL, BNB, AVAX, USDC —
        regardless of which chain they live on. Execution lands on
        ValueChain through SoDEX; additional execution venues are on the
        roadmap.
      </p>

      <h3>How often does IndexPilot check prices?</h3>
      <p>
        Every five minutes while the dashboard is open. Prices are pulled
        from SoSoValue (or CoinGecko as a transparent fallback) through a
        server-side proxy, cached for five minutes in React Query, and
        revalidated on demand when you press <strong>Refresh</strong>.
      </p>

      <h3>Is an API key required?</h3>
      <p>
        Not for monitoring. IndexPilot ships with a CoinGecko fallback that
        covers every supported asset, so you can build an index and watch
        drift without registering anywhere. A SoSoValue API key is
        recommended for production use — it ships richer, higher-frequency
        data — and will be required once direct execution via SoDEX goes
        live.
      </p>

      <h3>What is SoSoValue?</h3>
      <p>
        SoSoValue is an on-chain market-data and analytics platform for
        digital assets — think Bloomberg for crypto, with a public API for
        prices, market caps, volumes, and ETF flows. IndexPilot uses it as
        its primary price source because the data is purpose-built for index
        construction rather than scraped from spot exchanges. Learn more at{" "}
        <a
          href="https://sosovalue.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          sosovalue.com
        </a>
        .
      </p>

      <h3>Where is my index configuration stored?</h3>
      <p>
        In your browser&apos;s local storage, under a versioned schema. No
        index definition, wallet address, or balance ever leaves your
        machine. Server-side persistence is on the roadmap for cross-device
        history but is opt-in by design.
      </p>

      <h3>What happens if a token I hold is not in the catalog?</h3>
      <p>
        Today it cannot be added to your index. The catalog is intentionally
        conservative in Wave 1 — each listing includes a verified price
        source and a token metadata mapping. New listings land as
        ValueChain and SoSoValue expand coverage.
      </p>
    </>
  );
}
