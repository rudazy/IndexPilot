import Link from "next/link";
import { ArrowRight, Activity, Compass, Scale } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header variant="transparent" />
      <main className="flex-1">
        <Hero />
        <FeatureRow />
        <SubHero />
        <Footer />
      </main>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto w-full max-w-[1400px] px-6 pt-20 pb-32 sm:pt-32 sm:pb-40">
      <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] items-start">
        <div className="space-y-10">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
            One-person index fund
          </p>

          <h1
            className="text-[44px] sm:text-[64px] lg:text-[88px] leading-[0.95] tracking-tight text-[color:var(--color-fg)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your personal<br />
            on-chain{" "}
            <span className="italic text-[color:var(--color-accent)]">index fund.</span>
          </h1>

          <p className="text-lg sm:text-xl text-[color:var(--color-fg-muted)] max-w-[54ch] leading-relaxed">
            Set your weights. Watch for drift. Rebalance with precision — and have
            every decision explained in plain English.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="/setup">
              <Button size="lg" variant="primary">
                Build your index
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="ghost">
                Open dashboard
              </Button>
            </Link>
          </div>
        </div>

        <HeroPanel />
      </div>
    </section>
  );
}

function HeroPanel() {
  return (
    <div className="relative mt-6 lg:mt-4">
      <div className="absolute -inset-px rounded-[18px] bg-gradient-to-br from-[color:var(--color-accent)]/40 via-transparent to-[color:var(--color-border)] opacity-60 blur-xl" />
      <div className="relative rounded-[16px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-elev-2)]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-fg-subtle)]">
              Live preview
            </p>
            <p className="text-sm mt-1">My index</p>
          </div>
          <span className="text-[10px] uppercase tracking-wide text-[color:var(--color-success)] bg-[color:var(--color-success-dim)] px-2 py-1 rounded">
            Rebalanced
          </span>
        </div>

        <div className="text-5xl font-normal text-numeric mb-1">$12,480.55</div>
        <div className="text-xs text-[color:var(--color-success)] text-numeric mb-6">
          +3.21% · 24h
        </div>

        <div className="space-y-3">
          <PreviewRow symbol="BTC" current={49.6} target={50} />
          <PreviewRow symbol="ETH" current={32.4} target={30} />
          <PreviewRow symbol="SOL" current={18.0} target={20} />
        </div>
      </div>
    </div>
  );
}

function PreviewRow({
  symbol,
  current,
  target,
}: {
  symbol: string;
  current: number;
  target: number;
}) {
  const drift = current - target;
  const absDrift = Math.abs(drift);
  const fill = Math.min(absDrift / 5, 1) * 50;
  const overTarget = drift >= 0;

  return (
    <div className="grid grid-cols-[40px_1fr_70px] items-center gap-3">
      <span className="h-7 w-7 rounded-full bg-[color:var(--color-surface-2)] border border-[color:var(--color-border-strong)] flex items-center justify-center text-[9px] font-semibold">
        {symbol}
      </span>
      <div className="relative h-1.5 rounded-full bg-[color:var(--color-surface-3)]">
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-px bg-[color:var(--color-fg-muted)] opacity-40" />
        <span
          className="absolute top-0 h-full rounded-full"
          style={{
            width: `${fill}%`,
            backgroundColor: "var(--color-accent)",
            ...(overTarget ? { left: "50%" } : { right: "50%" }),
          }}
        />
      </div>
      <span className="text-[11px] text-numeric text-right text-[color:var(--color-fg-muted)]">
        {current.toFixed(1)}%
      </span>
    </div>
  );
}

function FeatureRow() {
  const features = [
    {
      icon: <Compass className="h-5 w-5" />,
      title: "Monitor",
      body: "Live prices flow from SoSoValue. Your portfolio is priced every five minutes, no spreadsheets required.",
    },
    {
      icon: <Activity className="h-5 w-5" />,
      title: "Detect",
      body: "Weights drift. The agent watches for the moment your allocation steps outside your threshold.",
    },
    {
      icon: <Scale className="h-5 w-5" />,
      title: "Rebalance",
      body: "A precise list of buys and sells — and a single sentence explaining why each trade restores your index.",
    },
  ];

  return (
    <section className="border-y border-[color:var(--color-border)]">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-20 grid gap-12 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="space-y-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-[color:var(--color-surface-2)] border border-[color:var(--color-border)] text-[color:var(--color-accent)]">
              {f.icon}
            </div>
            <h2
              className="text-2xl text-[color:var(--color-fg)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {f.title}
            </h2>
            <p className="text-sm text-[color:var(--color-fg-muted)] leading-relaxed max-w-[38ch]">
              {f.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SubHero() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-6 py-24 sm:py-32 grid gap-10 lg:grid-cols-[1fr_1.4fr] items-center">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
        Built for clarity
      </p>
      <div className="space-y-6">
        <h2
          className="text-3xl sm:text-4xl lg:text-5xl leading-tight text-[color:var(--color-fg)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          An index manager that reads like a
          <span className="italic text-[color:var(--color-accent)]"> trading desk memo</span>,
          not a crypto dashboard.
        </h2>
        <p className="text-[color:var(--color-fg-muted)] leading-relaxed max-w-[56ch]">
          No promises of yield. No cartoons. Just a clean view of your allocation,
          the drift you care about, and the trades you need — written plainly.
        </p>
        <Link href="/setup">
          <Button size="lg" variant="primary">
            Design an index
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[color:var(--color-border)]">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-10 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <span className="text-xs text-[color:var(--color-fg-subtle)]">
          IndexPilot · {new Date().getFullYear()}
        </span>
        <div className="flex items-center gap-5 text-xs text-[color:var(--color-fg-subtle)]">
          <Link href="/setup" className="hover:text-[color:var(--color-fg)] transition-colors">
            Setup
          </Link>
          <Link href="/dashboard" className="hover:text-[color:var(--color-fg)] transition-colors">
            Dashboard
          </Link>
        </div>
      </div>
    </footer>
  );
}
