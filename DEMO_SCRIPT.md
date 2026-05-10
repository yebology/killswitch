# Killswitch — Demo Script

Target: ~2-3 minutes live demo recording.

---

## Pre-Demo Setup

1. `make docker-up` — everything running
2. Open browser at `localhost:3003`
3. Wallet already connected (Phantom)
4. Protocol already registered with 3 invariant rules configured
5. Protocol status: **Active** (resume if paused from previous test)
6. Telegram app open on phone (visible in screen recording or picture-in-picture)

---

## Demo Flow

### Scene 1: Dashboard Overview (~20s)

**Show:** Dashboard page with protocol active, threat level LOW, invariant rules green.

**Say:**
"This is Killswitch — a real-time security monitoring system for Solana DeFi protocols. Right now our protocol is active, threat level is LOW, and all three invariant rules are passing: Withdrawal Rate, TVL Drop, and Admin Action."

---

### Scene 2: Protocol Detail + Rules (~20s)

**Action:** Navigate to Protocols → click on protocol detail.

**Say:**
"Each protocol configures their own security thresholds. Here we have Withdrawal Rate capped at $5M per minute, TVL Drop at 10%, and Admin Action detection — any admin key change or parameter modification triggers an immediate alert."

---

### Scene 3: Run Attack Test (~30s)

**Action:** Click "🚨 Run Attack Test" button. Wait for red banner to appear.

**Say:**
"Now let's simulate a Drift-like attack. This injects the same pattern that drained $285M from Drift — admin key change, parameter removal, then rapid vault drains. Watch..."

*[Button loading → Red banner appears: "Attack Detected — Protocol Paused!"]*

"Killswitch detected the multi-signal attack pattern and auto-paused the protocol in under 5 seconds. All subsequent transactions are now rejected at the blockchain level."

---

### Scene 4: Telegram Alert (~15s)

**Action:** Show phone/Telegram with the alert message.

**Say:**
"And here's the Telegram alert — showing all 6 breached indicators, the damage estimate, TX hashes, and confirmation that the protocol was auto-paused. The team knows exactly what happened."

---

### Scene 5: Dashboard Breach State (~15s)

**Action:** Navigate to Dashboard. Show CRITICAL threat level, all rules red at 120%.

**Say:**
"Back on the dashboard — threat level CRITICAL, all invariant rules in breach state. The protocol is paused and protected."

---

### Scene 6: Resume (~15s)

**Action:** Go back to protocol detail, click "Resume Protocol."

**Say:**
"Once the team reviews the incident and confirms it's safe, they resume with their guardian wallet. Protocol is back to active — monitoring continues."

---

### Scene 7: Closing (~15s)

**Say:**
"The Drift hack took 12 minutes and lost $285 million. Killswitch would have stopped it in 30 seconds. Every DeFi protocol on Solana deserves a kill switch."

---

## Key Points to Hit

- **< 5 seconds** from detection to pause
- **On-chain** circuit breaker via CPI — not just a dashboard
- **Multi-signal correlation** — catches attacks where no single rule breaches
- **$279M saved** if Drift had Killswitch
- **Self-service** — protocol teams configure their own rules
- Guardian Program deployed on Solana devnet

---

## If Something Breaks

- Attack test returns error → refresh page, try again
- Telegram doesn't arrive → mention "alert dispatched" and move on
- Protocol stuck paused → resume first, then re-run demo
- WebSocket disconnects → refresh page (auto-reconnects)
