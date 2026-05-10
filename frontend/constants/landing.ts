/**
 * Static content for the Landing Page.
 * Centralised here so copy changes don't require touching component code.
 */
export const LANDING_CONTENT = {
  /** Hero section — the first thing visitors see. */
  hero: {
    headline: "The $285M Drift hack took 12 minutes.",
    subheadline: "Killswitch would have stopped it in 30 seconds.",
    description:
      "Real-time exploit detection and auto-pause for Solana DeFi protocols. " +
      "Monitor on-chain activity, detect anomalous patterns, and auto-pause programs before damage occurs.",
  },

  /** Feature cards displayed below the hero. */
  features: [
    {
      title: "Real-time Monitoring",
      description:
        "Subscribe to every transaction hitting your program, evaluated against your security rules in real-time.",
      icon: "Eye" as const,
    },
    {
      title: "Anomaly Detection",
      description:
        "Detect unusual withdrawal rates, TVL drops, admin key changes, and multi-signal correlation.",
      icon: "AlertTriangle" as const,
    },
    {
      title: "Auto-Pause Circuit Breaker",
      description:
        "Automatically pause your program on-chain when thresholds are breached. No human intervention needed.",
      icon: "ShieldOff" as const,
    },
    {
      title: "Instant Telegram Alerts",
      description:
        "Get notified the moment something is wrong. Full incident details delivered to your Telegram.",
      icon: "Bell" as const,
    },
  ],

  /** Call-to-action buttons. */
  cta: {
    primary: "Connect Wallet",
    secondary: "Try Drift Replay →",
  },

  /** Key statistics shown on the landing page. */
  stats: {
    driftLoss: "$285M",
    timeToDetect: "30 seconds",
    protocolsSaved: "$279M",
  },
} as const;
