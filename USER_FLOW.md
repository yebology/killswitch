# Killswitch — User Flows (End-to-End)

This document describes all user flows in detail, including interactions between components (Frontend, Backend, Smart Contract, Solana, Telegram).

---

## Flow 1: Visitor Views Landing Page

**Actor:** Visitor (no wallet)
**Route:** `/`

```
1. Visitor opens the Killswitch app
2. Browser loads Landing Page
3. Displays:
   - Hero: "The $285M Drift hack took 12 minutes. Killswitch would have stopped it in 30 seconds."
   - Features: Real-time Monitoring, Anomaly Detection, Auto-Pause, Instant Alerts
   - CTA: "Connect Wallet" button
   - Secondary CTA: "Try Drift Replay →" link to /simulate
4. Visitor can:
   a. Click "Connect Wallet" → Flow 2
   b. Click "Try Drift Replay" → Flow 8
   c. Close browser → done
```

**Components involved:**
- Frontend: `app/page.tsx`, `components/layout/navbar.tsx`

---

## Flow 2: Connect Wallet & Login

**Actor:** Protocol owner
**Route:** `/` → `/dashboard`

```
1. User clicks "Connect Wallet" in Navbar
2. Frontend triggers @solana/wallet-adapter dialog
3. Popup appears: choose Phantom or Solflare
4. User selects wallet → wallet extension popup appears
5. User approves connection → wallet connected
6. Frontend stores wallet address as identity (no sign message required)
7. Navbar changes: "Connect Wallet" → "AbCd...WxYz" (truncated address) + Disconnect
8. User can now access protected routes (Dashboard, Protocols)
```

**Components involved:**
- Frontend: `components/providers/wallet-provider.tsx`, `components/providers/auth-provider.tsx`, `components/layout/navbar.tsx`

---

## Flow 3: Register New Protocol

**Actor:** Protocol owner (wallet connected)
**Route:** `/protocols`

```
1. User navigates to /protocols → no protocols registered yet
2. Empty state displayed + "Register Protocol" button
3. User clicks "Register Protocol"
4. Form appears:
   - Program Address: [text input] (Solana public key)
   - Protocol Name: [text input]
   - Telegram Chat ID: [text input] (optional)
5. User fills form and clicks "Submit"
6. Frontend sends to backend:
   POST /api/protocols
   Headers: { X-Wallet-Address: "user_wallet_address" }
   Body: { program_address, name, telegram_chat_id }
7. Backend processes:
   a. Verify wallet from header
   b. Check program_address not already registered
   c. Create Protocol record in database (status: "active")
   d. Return 201 + protocol data
8. Frontend redirects to /protocols/[id]
9. Backend Sentinel: subscribes to new program address on Geyser stream
```

**Components involved:**
- Frontend: `components/protocol/register-form.tsx`, `lib/api.ts`
- Backend: `app/api/routes/protocol.py`, `app/services/protocol.py`, `app/repositories/protocol.py`

---

## Flow 4: Add Invariant Rule

**Actor:** Protocol owner (wallet connected, protocol registered)
**Route:** `/protocols/[id]`

```
1. User is on Protocol Detail Page
2. Clicks "+ Add Rule"
3. Form appears:
   - Type: [dropdown]
     - Withdrawal Rate
     - TVL Drop
     - Admin Action
   - Threshold: [numeric input]
   - Time Window (seconds): [numeric input]
   - Action: [radio] Pause / Alert
4. User fills and clicks "Submit"
5. Frontend sends to backend:
   POST /api/protocols/:id/invariants
   Body: { type: "WITHDRAWAL_RATE", threshold: 5000000, time_window: 60, action: "pause" }
6. Backend creates Invariant record → returns 201
7. Frontend updates list: new rule appears
8. Evaluator will now check transactions against this rule
```

**Components involved:**
- Frontend: `components/protocol/invariant-editor.tsx`
- Backend: `app/api/routes/invariant.py`, `app/services/invariant.py`

---

## Flow 5: Normal Monitoring (No Attack)

**Actor:** System (background)
**Route:** `/dashboard`

```
1. User opens /dashboard
2. Frontend establishes WebSocket: ws://host/ws?protocol_id=UUID
3. Dashboard displays:
   - Combined Threat Level: 🟢 LOW
   - Protocol Status: 🟢 Active
   - Invariant Rules: progress bars (all green)
   - Live TX Feed: normal transactions

4. Behind the scenes (every 5 seconds in mock mode):
   a. Geyser mock loop generates fake transfer ($1K-$500K)
   b. Sentinel matches to registered protocol
   c. Evaluator checks all rules:
      - WITHDRAWAL_RATE: $50K (1% of $5M) → PASS
      - TVL_DROP: 0.1% → PASS
      - ADMIN_ACTION: not admin TX → PASS
   d. Combined threat level: 0 warnings → LOW
   e. Broadcasts via WebSocket
   f. Dashboard updates: TX appears in feed

5. Continues as long as no anomaly is detected
```

**Components involved:**
- Frontend: `app/dashboard/page.tsx`, `hooks/use-websocket.ts`
- Backend: `app/services/sentinel.py`, `app/services/evaluator.py`, `app/clients/geyser.py`, `app/ws/manager.py`

---

## Flow 6: Attack Test (Fire Drill)

**Actor:** Protocol owner (wallet connected)
**Route:** `/protocols/[id]`

```
1. User is on Protocol Detail Page, protocol status "active"
2. Clicks "🚨 Run Attack Test — Simulate Drift-like exploit"
3. Button changes to loading state: "Running Attack Test..."
4. Frontend sends:
   POST /api/_internal/attack_test
   Body: { program_address: "..." }
5. Backend processes:
   a. Finds protocol by program_address
   b. Reads user-configured thresholds from invariant rules
   c. Generates attack steps scaled to thresholds:
      - admin_change (amount: $0)
      - parameter_change (amount: $0)
      - transfer (40% of withdrawal threshold — warning zone)
      - transfer (70% of withdrawal threshold — warning zone)
      - transfer (120% of withdrawal threshold — guaranteed breach)
   d. Evaluates each step through Evaluator (collects all evidence)
   e. Updates protocol status → "paused"
   f. Creates incident record
   g. Triggers on-chain pause (stub)
   h. Sends comprehensive Telegram alert with ALL indicators
   i. Broadcasts via WebSocket
   j. Returns success
6. Frontend updates:
   - Protocol status → "Paused" (red badge)
   - Red banner: "🛑 Attack Detected — Protocol Paused!"
   - "Resume Protocol" button appears
7. User receives Telegram notification with full details:
   - All breached indicators listed
   - Damage estimate
   - TX hashes
   - Action taken: AUTO-PAUSE ✅
```

**Components involved:**
- Frontend: `app/protocols/[id]/page.tsx`
- Backend: `app/api/routes/internal.py`, `app/services/evaluator.py`, `app/services/telegram.py`
- Telegram: Bot API send message

---

## Flow 7: Resume Protocol

**Actor:** Protocol owner (wallet connected)
**Route:** `/protocols/[id]`

```
1. Protocol status: 🔴 PAUSED
2. User clicks "Resume Protocol" button
3. Frontend sends:
   POST /api/protocols/:id/resume
   Headers: { X-Wallet-Address: "guardian_wallet" }
4. Backend processes:
   a. Verifies wallet = guardian_wallet ✅
   b. Calls Solana client resume (stub)
   c. Updates DB status → "active"
   d. Sets 30-second cooldown on Sentinel (prevents immediate re-pause from mock TXs)
   e. Returns updated protocol
5. Frontend updates: status → "Active" (green badge)
6. Sentinel resumes monitoring after cooldown expires
```

**Components involved:**
- Frontend: `app/protocols/[id]/page.tsx`
- Backend: `app/api/routes/protocol.py`, `app/services/protocol.py`, `app/clients/solana.py`

---

## Flow 8: Drift Hack Replay (Public Demo)

**Actor:** Visitor (no wallet, no auth required)
**Route:** `/simulate`

```
1. Visitor opens /simulate
2. Page displays:
   - Adjustable parameters: Withdrawal Rate threshold, TVL Drop threshold
   - "Run Replay" button
3. User clicks "Run Replay"
4. Frontend sends:
   GET /api/simulate/drift?withdrawal_rate_threshold=5000000&tvl_drop_threshold=10
5. Backend Simulator:
   a. Creates temporary rules from parameters
   b. Replays hardcoded Drift hack timeline (10 events over 12 minutes)
   c. Evaluates each event through Evaluator logic
   d. Calculates: damage with vs without Killswitch
   e. Returns timeline + summary
6. Frontend playback:
   - Timeline events appear one by one (animated)
   - Threat level escalates: LOW → ELEVATED → HIGH → CRITICAL
   - Circuit breaker triggers at breach point
   - Summary: "$279M saved"
7. User can adjust parameters and re-run
```

**Components involved:**
- Frontend: `app/simulate/page.tsx`, `components/simulate/drift-replay.tsx`
- Backend: `app/api/routes/simulate.py`, `app/services/simulator.py`

---

## Flow 9: Disconnect Wallet

**Actor:** Protocol owner (wallet connected)

```
1. User clicks "Disconnect" in Navbar
2. Frontend: clears wallet state, disconnects via wallet-adapter
3. Navbar returns to "Connect Wallet" button
4. Protected routes show "Connect wallet to access"
```

---

## Flow 10: Real-time Breach Detection (Production Flow)

**Actor:** System (automatic)

```
1. Attacker sends TX: admin key change
2. Geyser stream → Sentinel receives TX
3. Sentinel creates fresh DB session
4. Finds protocol by program_address
5. Evaluator evaluates against all enabled rules:
   - ADMIN_ACTION: admin_change detected → BREACH
   - WITHDRAWAL_RATE: $0 → PASS
   - TVL_DROP: 0% → PASS
6. Result: status=breach, threat_level=CRITICAL, action=pause
7. Circuit Breaker:
   a. Sends trigger_pause TX to Guardian Program on-chain
   b. Updates protocol status → "paused" in DB
   c. Creates incident record
8. Telegram Dispatcher: sends alert to protocol's chat_id
9. WebSocket: broadcasts incident to connected dashboard clients
10. All subsequent TXs to this protocol → skipped (status=paused)
```

---

## Flow 11: Severity Escalation (Multi-Signal Correlation)

**Actor:** System (automatic)

```
Scenario: No single rule breaches, but multiple warnings correlate

1. TX arrives: large transfer ($3M, 60% of $5M threshold)
2. Evaluator checks:
   - WITHDRAWAL_RATE: 60% → WARNING (>50% of threshold)
   - TVL_DROP: 6% → WARNING (>50% of 10%)
   - ADMIN_ACTION: not admin → PASS
3. Combined threat level calculation:
   - 2 warnings detected simultaneously
   - ESCALATION RULE: 2+ warnings → auto-escalate to CRITICAL
   - Action: PAUSE
4. Circuit breaker triggers even though no single rule was individually breached
5. Telegram alert includes escalation reason:
   "ESCALATION: 2 simultaneous warnings detected"
```

---

## Component Interaction Summary

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER FLOWS                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Landing ──→ Connect Wallet ──→ Register Protocol ──→ Add Rules  │
│     │              │                    │                  │      │
│     │              ▼                    ▼                  ▼      │
│     │         Dashboard ◄──── Sentinel Monitoring ────► Evaluator │
│     │              │                    │                  │      │
│     │              │              ┌─────┴─────┐           │      │
│     │              │              ▼           ▼           │      │
│     │              │        Circuit      Telegram         │      │
│     │              │        Breaker       Alert           │      │
│     │              │           │                          │      │
│     │              │           ▼                          │      │
│     │              │      Guardian Program                │      │
│     │              │      (On-chain Pause)                │      │
│     │              │           │                          │      │
│     │              ◄── WebSocket Push ◄──────────────────┘      │
│     │              │                                             │
│     │              ▼                                             │
│     │         Resume Protocol (+ 30s cooldown)                   │
│     │                                                            │
│     ▼                                                            │
│  Drift Replay (Public Demo — no auth required)                   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow per Component

| Step | Frontend | Backend | Smart Contract | Solana | Telegram |
|------|----------|---------|----------------|--------|----------|
| Connect Wallet | wallet-adapter | — | — | — | — |
| Register Protocol | POST /api/protocols | create DB record | — | — | — |
| Add Rule | POST /api/.../invariants | create DB record | — | — | — |
| Normal TX | WebSocket receive | Geyser → Evaluate → WS | — | TX stream | — |
| Breach Detected | WebSocket receive | Evaluate → Circuit Breaker | trigger_pause | TX confirmed | Send alert |
| Auto-Pause | Dashboard update (🔴) | Update DB status | Set status=Paused | State change | Alert sent |
| Attack Test | POST /api/_internal/attack_test | Evaluate all → Pause → Alert | trigger_pause | — | Comprehensive alert |
| Resume | POST /api/.../resume | Update DB + cooldown | resume | TX confirmed | — |
| Drift Replay | GET /api/simulate/drift | Replay through Evaluator | — | — | — |
