import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function GettingStarted() {
  return (
    <>
      <p>
        IndexPilot is a one-person index fund manager. You define a basket of
        tokens with target weights, IndexPilot watches live prices, and when
        your portfolio drifts away from those weights it proposes the exact
        set of trades needed to restore your index — with a one-sentence
        explanation of why each trade is recommended.
      </p>

      <p>
        There is no custody, no pooled capital, and no proprietary smart
        contract standing between you and your funds. IndexPilot is a planner.
        You stay in control of execution.
      </p>

      <h2>Three steps to your first index</h2>

      <ol>
        <li>
          <strong>Connect your wallet.</strong> IndexPilot uses RainbowKit, so
          any supported wallet works. The connection is read-only until you
          execute a trade.
        </li>
        <li>
          <strong>Build your index.</strong> Pick two to six tokens, assign a
          target weight to each, and choose a rebalance trigger — either a
          fixed interval or a drift threshold.
        </li>
        <li>
          <strong>Monitor and rebalance.</strong> The dashboard shows live
          allocation versus target, highlights any asset outside its drift
          band, and generates a plain-English rebalance plan whenever action
          is needed.
        </li>
      </ol>

      <h2>Where to start</h2>

      <p>
        Head to the index builder to create your first basket. Most users
        begin with a three-asset split of BTC, ETH, and SOL — you can edit
        the weights at any time.
      </p>

      <div className="mt-8">
        <Link
          href="/setup"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-[6px] bg-[color:var(--color-accent)] text-[color:var(--color-bg)] text-sm font-medium no-underline hover:bg-[color:var(--color-accent-hover)] transition-colors"
        >
          Build your index
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </>
  );
}
