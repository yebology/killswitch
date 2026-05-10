# Killswitch — Pitch Deck

---

## Slide 1: Title

**Killswitch**
Real-time exploit detection and auto-pause for Solana DeFi protocols.

The emergency stop button that DeFi is missing.

---

## Slide 2: The Problem

**$285 Million. 12 Minutes. Zero Runtime Defense.**

April 1, 2026 — Drift Protocol drained of $285M in 12 minutes. The code was audited. The oracles worked. But nothing was watching at runtime.

- Attacker compromised 2/5 multisig signers via social engineering
- Changed admin key → removed safety parameters → drained 3 vaults
- Result: $3B drop in Solana TVL, SOL crashed below $80

**The gap:** Guardrail.ai and STRIDE monitor and alert — but **none of them auto-pause your program on-chain.** By the time a human responds, the funds are gone.

**What's missing: an automated on-chain circuit breaker that pauses at the blockchain level — without human intervention.**

Sources: [Forbes](https://www.forbes.com/sites/jemmagreen/2026/04/11/285m-hack-proved-defis-decentralisation-promise-is-still-a-fiction/), [Crypto News](https://crypto.news/drift-protocols-285m-hack-exposes-social-engineering-threat-to-solana-defi/), [QuillAudits](https://www.quillaudits.com/blog/hack-analysis/drift-protocol-multisig-exploit), [Yahoo Finance](https://finance.yahoo.com/markets/crypto/articles/drift-protocol-hit-285m-exploit-074032288.html)

---

## Slide 3: The Solution

**Killswitch = Runtime security for Solana**

1. **Monitor** — Subscribe to every transaction hitting your program in real-time
2. **Evaluate** — Check against configurable security rules (invariants)
3. **Detect** — Multi-signal correlation catches sophisticated attacks
4. **Pause** — Auto-pause your program on-chain via CPI — before funds are drained
5. **Alert** — Instant Telegram notification with full incident details

**From detection to on-chain pause: < 5 seconds.**

---

## Slide 4: How It Works — CPI + Architecture

**Cross-Program Invocation makes Killswitch an on-chain kill switch, not just a dashboard.**

```
┌─────────────────────────────────────────┐
│        Dashboard (Next.js 16)           │
└──────────────────┬──────────────────────┘
                   │ REST + WebSocket
┌──────────────────▼──────────────────────┐
│      Sentinel Service (FastAPI)         │
│  Geyser → Evaluator → Circuit Breaker  │
│                          → Telegram     │
└──────────────────┬──────────────────────┘
                   │ trigger_pause
┌──────────────────▼──────────────────────┐
│    Guardian Program (Anchor/Rust)       │
│         CPI → Protected Protocol        │
│    All transactions REJECTED by Solana  │
└─────────────────────────────────────────┘
```

- Pause happens inside Solana's runtime — not in an off-chain database
- No one can bypass it — the blockchain enforces the pause
- Resume requires the protocol team's guardian wallet signature

---

## Slide 5: Invariant Rules + Drift Proof

Three configurable rules — protocol teams set their own thresholds:

- **Withdrawal Rate** — max amount per time window (e.g., $5M / 60s)
- **TVL Drop** — max % of TVL leaving (e.g., 10% / 5 min)
- **Admin Action** — any admin activity = immediate breach (key change, config update)

**Multi-Signal Correlation:** 2+ warnings or admin action + any warning → auto-escalate to CRITICAL → pause

**Applied to the Drift hack:**

| Time | Event | Killswitch |
|------|-------|------------|
| T+0:00 | Admin key changed | 🔴 BREACH |
| T+0:15 | Safety params removed | 🔴 ESCALATION |
| T+0:45 | $6.2M withdrawn | 🟡 WARNING |
| T+1:30 | $18.5M withdrawn | 🛑 **AUTO-PAUSE** |

**Without Killswitch:** $285M lost. **With Killswitch:** $6M lost, **$279M saved.**

---

## Slide 6: Closing

**The $285M Drift hack took 12 minutes.**
**Killswitch would have stopped it in 30 seconds.**

- Guardrail.ai monitors and alerts — doesn't auto-pause on-chain
- STRIDE evaluates security posture — doesn't stop attacks in real-time
- Forta works on EVM — not Solana
- **Killswitch is the only solution that auto-pauses your Solana program on-chain via CPI**

🛡️ **Killswitch** — Because every protocol deserves a kill switch.

*Built by Yobel Nathaniel Filipus — [@yebology](https://github.com/yebology)*

---

## Slide 7: Live Demo

**See Killswitch in action — watch the full demo video below.**

**Guardian Program deployed on Solana devnet:** `8uSSf1TnE6Bqz1qGt3uZVAwU5Za9f1Sgp7sxtBQJ5HyJ`
