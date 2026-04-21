export default function DriftDetection() {
  return (
    <>
      <p>
        Drift is the distance between your intended allocation and your actual
        allocation. You set BTC to 50% of your index. A month passes, BTC
        rallies, and now BTC is 62% of your portfolio. That is a 12-point
        drift — your index is no longer the index you designed.
      </p>

      <h2>How IndexPilot measures drift</h2>

      <p>
        Every five minutes the dashboard pulls fresh prices from SoSoValue —
        or CoinGecko as a transparent fallback while an API key is pending.
        For each asset we compute:
      </p>

      <ul>
        <li>
          <strong>Current value</strong> — balance × live price, in USD.
        </li>
        <li>
          <strong>Current weight</strong> — current value ÷ total portfolio
          value.
        </li>
        <li>
          <strong>Drift</strong> — current weight minus target weight, in
          percentage points.
        </li>
      </ul>

      <p>
        Each row on the dashboard renders that drift as a notched horizontal
        bar — the notch is your target, the orange fill is how far you have
        strayed, left or right.
      </p>

      <h2>When a rebalance is recommended</h2>

      <p>
        In the setup screen you pick the trigger. Two modes are supported:
      </p>

      <ul>
        <li>
          <strong>Drift threshold.</strong> A rebalance is flagged the moment
          any single asset crosses the threshold you set. A 10-point band is
          the default — tight enough to catch meaningful drift, loose enough
          to avoid constant trading on daily volatility.
        </li>
        <li>
          <strong>Time-based.</strong> The rebalance banner appears on a fixed
          cadence — daily, weekly, or monthly — regardless of how far each
          asset has moved.
        </li>
      </ul>

      <h2>An example</h2>

      <p>
        A starting portfolio of $10,000 split 50 / 30 / 20 across BTC, ETH,
        and SOL. BTC rallies 40%, ETH and SOL are flat. Here is what the
        dashboard would show:
      </p>

      <table>
        <thead>
          <tr>
            <th>Token</th>
            <th>Target</th>
            <th>Current</th>
            <th>Drift</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>BTC</td>
            <td>50%</td>
            <td>58.3%</td>
            <td>+8.3 pts</td>
          </tr>
          <tr>
            <td>ETH</td>
            <td>30%</td>
            <td>25.0%</td>
            <td>−5.0 pts</td>
          </tr>
          <tr>
            <td>SOL</td>
            <td>20%</td>
            <td>16.7%</td>
            <td>−3.3 pts</td>
          </tr>
        </tbody>
      </table>

      <p>
        With a 10-point drift threshold, nothing flags yet. Cross 10 points on
        any single row and the dashboard surfaces a rebalance plan.
      </p>
    </>
  );
}
