"use client";

import Link from "next/link";
import { Eye, AlertTriangle, ShieldOff, Bell } from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LANDING_CONTENT } from "@/constants/landing";

/** Icon lookup matching the LANDING_CONTENT feature icon strings. */
const ICON_MAP = {
  Eye,
  AlertTriangle,
  ShieldOff,
  Bell,
} as const;

/** Landing page — public route, no auth required. */
export default function Home() {
  const { hero, features, cta, stats } = LANDING_CONTENT;

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Hero Section ── */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-24 pb-16 md:pt-32 md:pb-24 text-center overflow-hidden">
        {/* Background glow effect */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[480px] w-[720px] rounded-full bg-status-green/5 blur-[120px]" />

        <p className="relative mb-4 inline-flex items-center gap-2 rounded-full border border-status-green/20 bg-status-green/5 px-4 py-1.5 text-sm font-medium text-status-green">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-green opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-status-green" />
          </span>
          Real-time DeFi Protection for Solana
        </p>

        <h1 className="relative mt-4 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl lg:text-7xl">
          <span className="text-foreground">The </span>
          <span className="text-status-green">$285M</span>
          <span className="text-foreground"> Drift hack took </span>
          <span className="text-status-green">12 minutes</span>
          <span className="text-foreground">.</span>
        </h1>

        <p className="relative mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
          {hero.subheadline}
        </p>

        <p className="relative mt-4 max-w-2xl text-base text-muted-foreground/80">
          {hero.description}
        </p>

        {/* CTA Buttons */}
        <div className="relative mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <WalletMultiButton className="!bg-status-green !text-black !font-semibold !rounded-lg !h-12 !px-8 !text-base hover:!bg-status-green/90 !transition-all !shadow-lg !shadow-status-green/20" />
          <Link
            href="/simulate"
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-1 px-8 py-3 text-base font-medium text-foreground transition-colors hover:bg-surface-2"
          >
            {cta.secondary}
          </Link>
        </div>
      </section>

      {/* ── Stats Section ── */}
      <section className="relative border-y border-border bg-surface-1/50 py-12 md:py-16">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-6 sm:grid-cols-3">
          <StatCard value={stats.driftLoss} label="Lost in Drift Hack" accent="red" />
          <StatCard value={stats.timeToDetect} label="Detection Time" accent="green" />
          <StatCard value={stats.protocolsSaved} label="Could Have Been Saved" accent="green" />
        </div>
      </section>

      {/* ── Features Section ── */}
      <section className="py-16 md:py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              How Killswitch Protects Your Protocol
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              Four layers of defense that work together to detect exploits and auto-pause your program before damage occurs.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {features.map((feature) => {
              const Icon = ICON_MAP[feature.icon];
              return (
                <FeatureCard
                  key={feature.title}
                  icon={<Icon className="h-6 w-6 text-status-green" />}
                  title={feature.title}
                  description={feature.description}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA Section ── */}
      <section className="relative border-t border-border bg-surface-1/30 py-16 md:py-24 px-6">
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-[320px] w-[560px] rounded-full bg-status-green/5 blur-[100px]" />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            Don&apos;t wait for the next exploit.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Connect your wallet and start protecting your protocol in minutes.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <WalletMultiButton className="!bg-status-green !text-black !font-semibold !rounded-lg !h-12 !px-8 !text-base hover:!bg-status-green/90 !transition-all !shadow-lg !shadow-status-green/20" />
            <Link
              href="/simulate"
              className="inline-flex items-center gap-1 text-status-green font-medium hover:underline underline-offset-4 transition-colors"
            >
              {cta.secondary}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Sub-components ── */

function StatCard({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent: "green" | "red";
}) {
  const colorClass = accent === "green" ? "text-status-green" : "text-status-red";
  return (
    <div className="flex flex-col items-center text-center">
      <span className={`text-4xl font-extrabold tracking-tight md:text-5xl ${colorClass}`}>
        {value}
      </span>
      <span className="mt-2 text-sm text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border border-border bg-surface-1 p-6 transition-colors hover:border-status-green/30 hover:bg-surface-2/50">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-status-green/10">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
