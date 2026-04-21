import Link from "next/link";

export default function SetupGuide() {
  return (
    <>
      <p>
        The setup screen is where you define your index. It has three panels —
        index composition, token picker, and rebalance trigger — and a single
        launch button at the bottom. Everything else is live validation.
      </p>

      <h2>1. Pick your tokens</h2>

      <p>
        The token picker lists every asset IndexPilot currently supports. Tap
        a token to add it to your index; it will appear in the composition
        panel on the left. Supported assets at the moment: BTC, ETH, SOL, BNB,
        AVAX, and USDC. More will arrive as ValueChain onboards them.
      </p>

      <p>
        An index of one asset works but defeats the point. Two to six assets
        is the sweet spot — enough spread to matter, few enough to understand
        at a glance.
      </p>

      <h2>2. Set the weights</h2>

      <p>
        Each allocation row shows the token, a weight slider or input, and a
        remove button. Edit the weight directly with the number field, or
        drag the slider. Rules:
      </p>

      <ul>
        <li>
          <strong>Weights must sum to 100%.</strong> The total counter at the
          top of the composition panel turns amber until the sum is exactly
          one hundred.
        </li>
        <li>
          <strong>No zero weights.</strong> If you want a token out, remove
          it — don&apos;t leave it at 0.
        </li>
        <li>
          <strong>Even split</strong> is a one-click helper that distributes
          weights evenly across every token in the index. Useful as a
          starting point.
        </li>
      </ul>

      <h2>3. Choose a rebalance trigger</h2>

      <p>
        The trigger decides when the dashboard will tell you action is
        needed.
      </p>

      <ul>
        <li>
          <strong>Drift threshold</strong> — rebalance the moment any asset
          drifts more than X percentage points from its target. 10 points is
          a reasonable default for a volatile basket.
        </li>
        <li>
          <strong>Time-based</strong> — rebalance on a fixed cadence
          regardless of drift. Good for disciplined, strategy-driven indices
          where you want regular touches rather than reactive ones.
        </li>
      </ul>

      <h2>4. Launch the dashboard</h2>

      <p>
        When the composition is valid and a trigger is selected,{" "}
        <strong>Launch dashboard</strong> becomes active. Pressing it saves
        your index configuration to local storage, seeds a simulated set of
        holdings at the target weights using a $10,000 notional value, and
        routes you to the live dashboard.
      </p>

      <p>
        You can edit the index at any time — the <strong>Edit index</strong>{" "}
        link in the dashboard activity panel drops you back into setup with
        your existing configuration prefilled.
      </p>

      <p>
        Ready to build? <Link href="/setup">Open the setup screen.</Link>
      </p>
    </>
  );
}
