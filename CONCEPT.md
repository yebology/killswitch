# Killswitch — Real-time Exploit Detection & Auto-Pause for Solana DeFi

> **One-liner:** Real-time exploit detection and auto-pause for Solana DeFi protocols.

> "The $285M Drift hack took 12 minutes. Killswitch would have stopped it in 30 seconds."

---

## The Problem

On April 1, 2026, Drift Protocol — Solana's largest perpetual futures exchange — lost $285 million in 12 minutes. The attacker social-engineered two multisig signers, pre-signed malicious transactions, hijacked admin control, and drained three vaults before anyone could react.

The smart contracts passed two independent audits. The oracles worked correctly. The code was fine.

**The problem was that nothing was watching at runtime.**

No system detected that $285M was leaving in 12 minutes. No system said "this is abnormal, pause everything." No circuit breaker existed. By the time humans noticed, it was over.

This is not a Drift-specific problem. Every protocol on Solana — Jupiter, Raydium, Marinade, Kamino — is vulnerable to the same class of attack: **valid transactions that are malicious in aggregate.**

Audits catch code bugs before deployment. Killswitch catches exploits during execution.

---

## The Solution

Killswitch is a real-time protocol guardian for Solana. It monitors on-chain activity, detects anomalous patterns, and auto-pauses programs before damage occurs.

Three components:

### 1. Guardian Program (On-chain — Anchor)
A Solana program that protocols integrate. It stores:
- **Invariants**: rules that should never be violated ("TVL should not drop >X% in Y minutes")
- **Guardian key**: authorized to trigger emergency pause
- **Circuit breaker state**: active/paused/cooldown

When an invariant is violated, the Guardian Program can pause the protected protocol via CPI (Cross-Program Invocation).

### 2. Sentinel Service (Off-chain — Rust)
A monitoring daemon that:
- Subscribes to Solana transactions in real-time (geyser plugin / WebSocket)
- Evaluates transactions against registered invariants
- Detects anomaly patterns: rapid withdrawals, oracle manipulation, unusual admin actions
- Triggers the on-chain circuit breaker when thresholds are breached
- Dispatches alerts (Telegram, Discord, webhook, email)

### 3. Dashboard (Frontend — Next.js)
Protocol teams get:
- Real-time monitoring view of their program's health
- Invariant configuration UI (set rules without code)
- Alert history and incident timeline
- Manual pause/resume controls
- Simulation mode: "what would Killswitch have detected in the Drift hack?"

---

## How It Works

### Auth: Wallet-Based (No Firebase, No API Keys)

Connect wallet = login. Wallet address = identity.

```
1. User buka dashboard Killswitch
2. Klik "Connect Wallet" → Phantom/Solflare popup → sign message
3. Backend verify signature → check: "apakah wallet ini guardian key dari protocol manapun?"
4. Ya → tampilkan dashboard protocol itu (monitoring, rules, incidents)
5. Tidak → tampilkan halaman "Register Protocol"
```

Guardian wallet yang sudah di-register on-chain = natural auth mechanism. Tidak perlu manage accounts, passwords, atau API keys.

### Setup (Protocol Integration)
```
1. Protocol deploys Killswitch Guardian as a co-signer/authority
2. Protocol defines invariants:
   - "Max withdrawal per minute: $5M"
   - "TVL drop threshold: 10% in 5 minutes"
   - "Admin action requires 30-minute timelock"
3. Killswitch Sentinel starts monitoring
```

### Runtime (Normal Operation)
```
User swaps on Jupiter → Killswitch sees transaction → checks invariants → all pass → no action
User swaps on Jupiter → Killswitch sees transaction → checks invariants → all pass → no action
... (thousands of normal transactions)
```

### Runtime (Attack Detected)
```
Attacker drains $10M from vault → Killswitch detects: "withdrawal rate 500% above normal"
Attacker drains another $15M → Killswitch detects: "TVL dropped 8% in 2 minutes"
→ THRESHOLD BREACHED
→ Killswitch triggers on-chain circuit breaker
→ Protocol paused
→ Alert sent to team: "Emergency pause triggered. $25M withdrawn in 2 minutes. Review required."
→ Team investigates, confirms attack, keeps paused
→ $260M saved (vs $285M lost in Drift)
```

---

## The Drift Hack — Killswitch Simulation

Here's exactly how Killswitch would have handled the Drift exploit:

| Time | What Happened | Killswitch Response |
|---|---|---|
| T+0:00 | Attacker gains admin control via compromised multisig | ⚠️ Alert: "Admin key change detected" |
| T+0:30 | Attacker creates fake token (CVT), seeds liquidity pool | ⚠️ Alert: "New spot market created by admin" |
| T+1:00 | Attacker disables withdrawal safeguards | 🔴 Alert: "Safety parameter modified — withdrawal limits removed" |
| T+2:00 | First vault drain begins — $10M withdrawn | 🔴 Invariant check: withdrawal rate 10x normal |
| T+3:00 | $50M withdrawn across 8 transactions | 🛑 **CIRCUIT BREAKER TRIGGERED** — program paused |
| T+3:01 | Alert dispatched to Drift team | Team notified via Telegram + Discord |
| T+12:00 | In reality: $285M gone. With Killswitch: **$50M lost, $235M saved** |

**This simulation is the demo.** Replay actual Drift hack transactions through Killswitch and show it catching the attack at T+3:00.

---

## Invariant Types

### Volume-based
- Max withdrawal per minute/hour
- Max TVL change percentage in time window
- Max single transaction size

### Admin-based
- Admin key change requires timelock
- Parameter changes require timelock
- New market/vault creation alert

### Oracle-based
- Price deviation beyond threshold
- Oracle staleness detection
- Cross-oracle disagreement

### Pattern-based
- Rapid sequential withdrawals from same source
- Wash trading detection (same tokens cycling)
- Flash loan pattern detection

### Custom
- Protocol-specific invariants defined via SDK
- Composable rules: "IF withdrawal > $1M AND time < 6am UTC THEN pause"
- **MVP includes severity escalation**: auto-correlate multiple signals (2+ warnings = auto-pause, admin change + any warning = auto-pause)

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Dashboard (Next.js)                    │
│  Monitor → Configure Rules → Alert History → Simulate    │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Sentinel Service (Rust)                      │
│                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Geyser   │  │ Invariant    │  │ Alert             │  │
│  │ Listener │→ │ Evaluator    │→ │ Dispatcher        │  │
│  │          │  │              │  │ (TG/Discord/Hook) │  │
│  └──────────┘  └──────┬───────┘  └───────────────────┘  │
│                       │ trigger                          │
└───────────────────────┼─────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│           Guardian Program (Anchor - On-chain)           │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Protocol     │  │ Invariant    │  │ Circuit       │  │
│  │ Registry     │  │ Store (PDA)  │  │ Breaker       │  │
│  └──────────────┘  └──────────────┘  └───────┬───────┘  │
│                                              │ CPI      │
│                                              ▼          │
│                                    ┌──────────────────┐ │
│                                    │ Protected        │ │
│                                    │ Protocol's       │ │
│                                    │ Pause Instruction│ │
│                                    └──────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| On-chain program | Anchor (Rust) | Standard Solana program framework |
| Sentinel service | Rust | Performance-critical — must process thousands of TXs/second |
| TX streaming | Geyser plugin / Yellowstone gRPC | Real-time transaction feed, sub-second latency |
| Dashboard | Next.js + TypeScript | Fast to build, good DX |
| Alerts | Telegram Bot API + Discord Webhooks | Where protocol teams already are |
| Database | PostgreSQL | Store invariant configs, alert history, incident logs |
| Deployment | Docker | Easy setup for protocol teams |

---

## Why This Wins

### 1. Timing
Drift hack was April 1, 2026. Frontier submissions due May 11. Every judge will have Drift on their mind. Killswitch is the direct answer.

### 2. Judge Alignment
- **w.sol (Drift DevRel)** — His team lost $285M. Killswitch is literally built for Drift.
- **Anatoly Yakovenko (Solana Cofounder)** — Solana's reputation took a hit. Security tooling strengthens the ecosystem.
- **Jed (Anza CSO)** — Anza builds validator clients. Runtime security is core infrastructure.
- **Arihant Bansal + milian (Arcium)** — Security/privacy infrastructure builders.
- **Infra (Raydium)** — Major DEX that needs this protection.

### 3. Zero Winners in Security
Across 4 Colosseum hackathons (Renaissance, Radar, Breakout, Cypherpunk), 5,400+ submissions, 6+ security projects — **zero won any prize**. This is the biggest untapped category. Not because judges don't care, but because no one executed well enough.

### 4. a16z Research Validation
Copilot archives surfaced a16z's "Runtime enforcement: A new line of defense against subtle numerical exploits" paper — academic validation that this approach works.

### 5. Every Protocol is a Customer
Jupiter ($8B+ volume), Raydium, Marinade, Kamino, Orca — every DeFi protocol on Solana needs runtime protection post-Drift. TAM is the entire Solana DeFi ecosystem.

### 6. Solana-Native Advantage
Solana's 400ms blocks enable real-time detection and response that's impossible on Ethereum (12s blocks). Killswitch leverages Solana's speed as a security feature.

---

## Competitive Moat

| Existing Solution | What They Do | Killswitch Difference |
|---|---|---|
| Audits (OtterSec, Neodyme) | Pre-deployment code review | Killswitch = runtime, not pre-deployment |
| Forta Network (EVM) | Real-time monitoring on Ethereum | Not on Solana. Killswitch is Solana-native |
| OpenZeppelin Defender (EVM) | Admin automation + monitoring | Not on Solana |
| Tossbounty (hackathon) | "Pause button" concept | Concept from 2024, not production. Killswitch = full system |
| Bulwark (hackathon) | Audit scoping tool | Pre-deployment, not runtime |

**Killswitch is the first production-grade runtime security system for Solana.** There is no direct competitor.

---

## MVP Scope (5 Weeks)

### Week 1-2: Guardian Program (On-chain)
- [ ] Anchor program: protocol registration, invariant storage (PDAs), circuit breaker state
- [ ] Pause/resume instructions with guardian key authorization
- [ ] Basic invariants: max withdrawal rate, TVL change threshold
- [ ] Deploy on devnet

### Week 2-3: Sentinel Service (Off-chain)
- [ ] WebSocket transaction listener for monitored programs
- [ ] Invariant evaluator: check each TX against registered rules
- [ ] Circuit breaker trigger: call on-chain pause when threshold breached
- [ ] Telegram alert bot

### Week 3-4: Dashboard
- [ ] Protocol registration UI
- [ ] Invariant configuration (add/edit/remove rules)
- [ ] Real-time monitoring view (live TX feed + invariant status)
- [ ] Alert history

### Week 4-5: Demo & Polish
- [ ] **Drift Hack Replay**: replay actual Drift transactions, show Killswitch catching it
- [ ] Record pitch video (< 3 min)
- [ ] Record technical demo video (2-3 min)
- [ ] Polish UI, fix bugs, write docs

### What's NOT in MVP
- ML-based anomaly detection (rule-based is enough for hackathon)
- Multi-protocol monitoring (focus on one protocol demo)
- Decentralized sentinel network (centralized is fine for MVP)
- Production mainnet deployment (devnet demo is sufficient)

---

## Demo Script (The Money Shot)

The demo that wins:

1. **Show the problem** (30 sec): "On April 1, Drift lost $285M in 12 minutes. No system detected it. No system stopped it."

2. **Show Killswitch setup** (30 sec): Register a mock protocol, set invariants: "max $5M withdrawal per minute, max 10% TVL drop in 5 minutes."

3. **Show normal operation** (30 sec): Simulate normal swaps and withdrawals. Killswitch monitors, all green.

4. **Simulate the Drift attack** (60 sec): Replay Drift-like transactions — rapid withdrawals, admin key change, safety parameter removal. Show Killswitch's dashboard turning yellow → orange → RED. Circuit breaker triggers. Program paused. Alert sent.

5. **Show the result** (30 sec): "Killswitch detected the attack at $50M. In reality, $285M was lost. Killswitch would have saved $235M."

6. **Business case** (30 sec): "Every DeFi protocol on Solana needs this. $500/month per protocol. 100 protocols = $600K ARR."

---

## Revenue Model

| Tier | Price | Features |
|---|---|---|
| **Open Source** | Free | Guardian program + basic invariants + manual pause |
| **Pro** | $500/month | Sentinel monitoring + auto-pause + alerts + dashboard |
| **Enterprise** | Custom | Custom invariants + SLA + dedicated support + incident response |

Target: 100 protocols × $500/month = **$600K ARR** within 12 months.

Long-term: become the "Cloudflare of Solana" — every protocol routes through Killswitch for protection.

---

## Business Flow (Step-by-Step)

### Flow 1: Protocol Onboarding

```
1. Tim protocol buka killswitch.xyz
2. Connect wallet (Phantom) → sign message → wallet verified
3. Wallet belum terdaftar → tampil halaman "Register Protocol"
4. Isi form:
   - Program address (smart contract mereka di Solana)
   - Protocol name
   - Alert channel (Telegram group ID / Discord webhook)
5. Submit → Killswitch:
   a. Simpan di database (protocol record)
   b. Call Guardian Program on-chain → buat PDA config (program address, guardian key = wallet, status = active)
6. Redirect ke dashboard protocol → siap configure rules
```

### Flow 2: Configure Invariant Rules

```
1. Tim protocol di dashboard → klik "Add Rule"
2. Pilih template:
   - Withdrawal Rate: "Max $X dalam Y menit"
   - TVL Drop: "Max X% drop dalam Y menit"
   - Admin Change: "Alert kalau admin key berubah"
   - Custom: define sendiri
3. Set threshold dan time window
4. Set action: PAUSE (auto-pause) atau ALERT (notify saja)
5. Submit → rule disimpan di database + publish on-chain sebagai PDA
6. Rule langsung aktif → Sentinel mulai evaluate
```

### Flow 3: Normal Monitoring

```
1. Sentinel service subscribe ke Solana TX stream (Geyser/WebSocket)
2. Setiap transaksi ke program yang terdaftar:
   a. Parse: instruction type, amount, accounts involved
   b. Evaluate terhadap semua active rules
   c. Semua pass → log transaksi, update dashboard via WebSocket
3. Dashboard real-time:
   - 🟢 Status: Active
   - Live TX feed
   - Invariant status: all passing
   - Stats: "45,000 TXs monitored today, 0 alerts"
```

### Flow 4: Attack Detection & Auto-Pause

```
1. Anomalous TX detected → rule evaluation:
   - Withdrawal rate 120% of limit → BREACH
2. Sentinel trigger circuit breaker:
   a. Call Guardian Program on-chain → trigger_pause instruction
   b. Guardian Program verify: caller = authorized sentinel key
   c. Guardian Program CPI ke protected protocol → set status = PAUSED
   d. Semua TX ke protocol sekarang di-REJECT oleh blockchain
3. Alert dispatched:
   - Telegram: "🛑 EMERGENCY PAUSE. $6M withdrawn in 1 min. Circuit breaker triggered."
   - Discord webhook
   - Dashboard WebSocket push
4. Dashboard update:
   - 🔴 Status: PAUSED
   - Incident timeline populated
   - "Estimated damage prevented: $XXM"
```

### Flow 5: Incident Review & Resume

```
1. Tim protocol lihat alert → buka dashboard
2. Review incident timeline:
   - Chronological list of events leading to pause
   - Which rule was breached
   - Which transactions triggered it
   - Wallet addresses involved
3. Tim investigate:
   - Confirm attack → keep paused, contact security, trace funds
   - False alarm → proceed to resume
4. Resume:
   - Klik "Resume Protocol" di dashboard
   - Sign transaction dengan guardian wallet (on-chain action)
   - Guardian Program set status = ACTIVE
   - Protocol kembali beroperasi
5. Post-incident:
   - Incident saved permanently di database
   - Accessible di "Incidents" page
   - Stats updated: "1 incident, $XXM saved"
```

### Flow 6: Drift Hack Replay (Demo)

```
1. User buka /simulate page (no auth required — public demo)
2. Klik "Run Drift Replay"
3. System replay actual Drift hack transactions:
   - T+0:00: Admin key change → 🟡 ALERT
   - T+0:30: $2M withdrawal → 🟡 WARNING (40% of limit)
   - T+1:00: $6M total → 🔴 BREACH → AUTO PAUSE
4. Visual timeline shows:
   - Green → Yellow → Red progression
   - Exact moment circuit breaker triggers
   - "Damage: $6M. Without Killswitch: $285M. Saved: $279M."
5. User can adjust rules and re-run simulation to see different outcomes
```

---

## Pitch (30 seconds)

> "Two weeks ago, Drift Protocol lost $285 million in 12 minutes. The code was audited. The oracles worked. But nothing was watching at runtime.
>
> Killswitch is a real-time protocol guardian for Solana. We monitor on-chain activity, detect anomalous patterns, and auto-pause programs before damage occurs.
>
> In our simulation, Killswitch detects the Drift attack at $50M and triggers an emergency pause — saving $235M.
>
> Every DeFi protocol on Solana needs runtime protection. We're building it."

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| False positive pauses | High | Conservative default thresholds + protocol sets own rules + cooldown period |
| Sentinel single point of failure | Medium | Open-source sentinel, anyone can run. Decentralize post-hackathon |
| Protocol integration friction | Medium | Minimal integration: add guardian key + implement pause instruction |
| 5-week timeline is tight | Medium | Focus on rule-based detection (no ML). Drift simulation is the demo, not production deployment |
| Judges might think "too hard to build" | Low | Working demo on devnet proves feasibility |

---

## Why Me

[FILL — Personal background, why you're the right person to build this]

Suggested angles:
- "I've been building on Solana for X months"
- "I watched the Drift hack unfold in real-time and thought: this should never happen again"
- "My background in [X] gives me unique insight into runtime monitoring"
- "I built Miora AI's scoring engine which analyzes on-chain transaction patterns — Killswitch applies the same pattern recognition to security"

---

## Post-Hackathon Roadmap

### Phase 1: Hackathon MVP (Now → May 11)
Rule-based invariants, devnet demo, Drift simulation

### Phase 2: Beta (May → July)
Partner with 3-5 protocols on devnet. Add more invariant types. Improve dashboard.

### Phase 3: Mainnet (July → September)
Production deployment. First paying customers. SOC2 compliance.

### Phase 4: Scale (September → December)
ML-based anomaly detection. Decentralized sentinel network. Cross-program correlation. Insurance integration.

---

## References

- [Drift Protocol Post-Mortem](https://discover.credshields.com/drift-protocol-incident-post-mortem/)
- [a16z: Runtime enforcement — A new line of defense](https://a16zcrypto.com/posts/article/runtime-enforcement/) (from Copilot archives)
- [Solana Program Security Guide (Helius)](https://www.helius.dev/blog/a-hitchhikers-guide-to-solana-program-security)
- [Solana Upgrade Patterns Security Guide 2026 (Cantina)](https://cantina.xyz/blog/solana-upgrade-patterns-security-guide-for-2026)
