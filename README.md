# 🛡️ Killswitch

> **Real-time exploit detection and auto-pause for Solana DeFi protocols.**

## 🎬 Demo Video

[![Killswitch Demo](https://img.shields.io/badge/Watch%20Demo-YouTube-red?style=for-the-badge&logo=youtube)](https://youtu.be/pn-9KJJ_ReU)

## 🎤 Pitch Deck

[![Killswitch Pitch](https://img.shields.io/badge/Watch%20Pitch-YouTube-red?style=for-the-badge&logo=youtube)](https://youtu.be/HUUrHkWcAfQ) [![Slides](https://img.shields.io/badge/Slides-Google%20Slides-yellow?style=for-the-badge&logo=googleslides)](https://docs.google.com/presentation/d/1VQ_-CtcHYrVeAD0pahW_Y4I4V_qcCQwZEyB9jhu_r98/edit?usp=sharing)

---

**Killswitch** is a runtime security system for Solana that monitors on-chain activity, detects anomalous transaction patterns, and auto-pauses programs before exploits drain funds — the emergency stop button that DeFi protocols are missing.

On April 1, 2026, Drift Protocol lost $285M in 12 minutes. The code was audited. The oracles worked. But nothing was watching at runtime. Killswitch would have stopped it in 30 seconds.

---

## ✨ Overview

Audits catch bugs before deployment. Killswitch catches exploits during execution.

Every DeFi protocol on Solana — Jupiter, Raydium, Marinade, Kamino — is vulnerable to the same class of attack that hit Drift: valid transactions that are malicious in aggregate. Killswitch provides the missing runtime defense layer:

- 🔍 **Real-time Monitoring** — Subscribe to every transaction hitting your program, evaluated against your security rules
- 🚨 **Anomaly Detection** — Detect unusual withdrawal rates, TVL drops, and admin actions
- 🛑 **Auto-Pause (Circuit Breaker)** — Automatically pause your program on-chain when thresholds are breached
- 📢 **Instant Alerts** — Telegram notifications the moment something is wrong
- 📊 **Incident Timeline** — Full chronological replay of what happened, which rule triggered, and what was saved

---

## 🎯 Key Features

### 🔍 Sentinel Monitoring
- Real-time transaction stream via Solana Geyser / WebSocket
- Every transaction to your program is parsed and evaluated
- Sub-second detection latency — leverages Solana's 400ms blocks
- Live transaction feed on dashboard

### 🛑 On-chain Circuit Breaker
- Guardian Program (Anchor) stores invariant rules and circuit breaker state on-chain
- When a rule is breached, Sentinel triggers on-chain pause via CPI
- Program is paused at the blockchain level — all subsequent transactions rejected
- Resume requires guardian wallet signature (on-chain action)

### 📏 Invariant Rules
Configurable security rules that should never be violated:

| Rule Type | Example | Action |
|---|---|---|
| **Withdrawal Rate** | Max $5M per minute | Auto-pause |
| **TVL Drop** | Max 10% drop in 5 minutes | Auto-pause |
| **Admin Action** | Any admin activity (key change, parameter modification) | Auto-pause |

**Severity Escalation:** Killswitch automatically correlates multiple signals. If 2+ rules are in warning state simultaneously (>50% of threshold), or an admin action occurs alongside any other warning, the system auto-escalates to CRITICAL and triggers pause — even if no single rule has been breached.

### 📢 Telegram Alerts
- Comprehensive Telegram bot notifications for all incidents
- Shows all breached indicators, damage estimate, and action taken
- Dashboard real-time push via WebSocket

### 🔄 Drift Hack Replay
- Replay actual Drift Protocol hack transactions through Killswitch
- Visual timeline showing detection → warning → breach → auto-pause
- Adjustable rules to see different outcomes
- "Killswitch would have saved $279M" — the demo that sells itself

### 🔐 Wallet-based Auth
- Connect wallet (Phantom/Solflare) = login
- Guardian wallet address = identity
- No Firebase, no API keys, no passwords
- Crypto-native authentication

### 🚨 Attack Test (Fire Drill)
- One-click attack simulation on your registered protocol
- Injects Drift-like exploit pattern (admin takeover + parameter change + rapid drain)
- Attack amounts dynamically scaled to your configured thresholds
- Comprehensive Telegram alert showing all breached indicators
- Protocol auto-pauses — verify your security setup works end-to-end

---

## 📋 How It Works

1. 🔗 **Connect** — Protocol team connects guardian wallet to Killswitch dashboard
2. 📝 **Register** — Register program address and configure alert channels
3. 📏 **Set Rules** — Define invariant rules: withdrawal limits, TVL thresholds, admin action alerts
4. 👁️ **Monitor** — Sentinel watches every transaction in real-time, evaluates against rules
5. 🛑 **Protect** — When a rule is breached, circuit breaker auto-pauses the program on-chain
6. 📢 **Alert** — Team gets instant Telegram notification with full incident details
7. 🔍 **Review** — Full incident timeline on dashboard for investigation
8. ▶️ **Resume** — Team signs with guardian wallet to resume after review

---

## 🧩 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Dashboard (Next.js 16)                   │
│  Monitor → Configure Rules → Incidents → Replay          │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API + WebSocket
                       ▼
┌─────────────────────────────────────────────────────────┐
│            Sentinel Service (Python + FastAPI)            │
│                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Geyser   │  │ Invariant    │  │ Alert             │  │
│  │ Listener │→ │ Evaluator    │→ │ Dispatcher        │  │
│  │          │  │              │  │ (Telegram)        │  │
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

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy (async), Pydantic |
| Database | PostgreSQL |
| TX Streaming | Solana Geyser / WebSocket (mock mode for demo) |
| Solana RPC | solders / solana-py |
| Smart Contract | Anchor (Rust) |
| Frontend | Next.js 16, Tailwind CSS v4, shadcn/ui, TypeScript |
| Wallet Auth | @solana/wallet-adapter (Phantom, Solflare) |
| Alerts | Telegram Bot API (httpx) |
| Infra | Docker, Docker Compose |

---

## 🧩 Project Structure

```
killswitch/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py            # FastAPI dependencies (DI)
│   │   │   ├── middleware.py      # CORS + exception handlers
│   │   │   ├── response.py       # Standardized API response envelope
│   │   │   └── routes/
│   │   │       ├── auth.py        # Wallet verification
│   │   │       ├── health.py      # Health check
│   │   │       ├── internal.py    # Attack test + TX injection (demo)
│   │   │       ├── invariant.py   # Invariant CRUD
│   │   │       ├── protocol.py    # Protocol CRUD + resume
│   │   │       └── simulate.py    # Drift hack replay
│   │   ├── clients/
│   │   │   ├── geyser.py         # Solana TX stream (mock + real mode)
│   │   │   ├── solana.py         # Solana RPC client (trigger_pause, resume)
│   │   │   └── telegram.py       # Telegram Bot API client
│   │   ├── core/
│   │   │   ├── config.py         # Pydantic Settings (env loader)
│   │   │   ├── database.py       # SQLAlchemy async engine + session
│   │   │   ├── exceptions.py     # AppError
│   │   │   └── security.py       # Wallet signature verification
│   │   ├── models/               # SQLAlchemy ORM models
│   │   │   ├── protocol.py       # Protocol (program_address, status, guardian_wallet)
│   │   │   ├── invariant.py      # Invariant (type, threshold, time_window, action)
│   │   │   └── incident.py       # Incident (trigger_time, tx_hashes, damage_estimate)
│   │   ├── repositories/         # Database access layer
│   │   │   ├── protocol.py
│   │   │   ├── invariant.py
│   │   │   └── incident.py
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   │   ├── requests.py
│   │   │   └── responses.py
│   │   ├── services/             # Business logic
│   │   │   ├── sentinel.py       # Core: TX stream → evaluate → trigger actions
│   │   │   ├── evaluator.py      # Invariant evaluation + severity escalation
│   │   │   ├── circuit_breaker.py # On-chain pause/resume + incident recording
│   │   │   ├── telegram.py       # Alert message formatting + dispatch
│   │   │   ├── protocol.py       # Protocol registration + management
│   │   │   ├── invariant.py      # Invariant CRUD
│   │   │   ├── incident.py       # Incident queries
│   │   │   └── simulator.py      # Drift hack replay engine
│   │   ├── ws/                   # WebSocket real-time updates
│   │   │   ├── manager.py        # Connection manager
│   │   │   └── routes.py         # WebSocket endpoint
│   │   └── constants.py          # Invariant types, status values, messages
│   ├── seeds/                    # Database seeding
│   ├── scripts/                  # Attack simulator script
│   ├── main.py                   # FastAPI app entry point + lifespan
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
├── frontend/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # Landing page
│   │   ├── dashboard/page.tsx    # Main monitoring dashboard
│   │   ├── protocols/page.tsx    # Protocol list
│   │   ├── protocols/[id]/page.tsx # Protocol detail + attack test
│   │   └── simulate/page.tsx     # Drift hack replay
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── layout/               # Navbar
│   │   ├── dashboard/            # Threat level, invariant status
│   │   ├── protocol/             # Register form, invariant editor
│   │   ├── simulate/             # Drift replay visualizer
│   │   └── providers/            # Wallet provider, auth provider
│   ├── hooks/                    # useWebSocket
│   ├── types/                    # TypeScript types
│   ├── constants/                # Invariant types, nav items
│   └── lib/                      # API client, utilities
├── contracts/
│   └── guardian/                 # Anchor program (Solana smart contract)
│       ├── programs/guardian/src/
│       │   ├── lib.rs
│       │   ├── instructions/     # register, add_invariant, trigger_pause, resume
│       │   ├── state/            # protocol_config, invariant_rule (PDAs)
│       │   ├── error.rs
│       │   └── constants.rs
│       ├── tests/guardian.ts
│       └── Anchor.toml
├── docker-compose.yml            # PostgreSQL + Backend + Frontend
├── Makefile
└── README.md
```

---

## 🧭 How to Run

### 📦 Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for frontend dev)
- Rust + Anchor CLI (for smart contract)
- Solana CLI (for devnet deployment)

### 🔨 1. Clone Repository

```bash
git clone https://github.com/yebology/killswitch.git
cd killswitch
```

### 🔐 2. Configure Environment

```bash
cp backend/.env.example backend/.env
# Fill in: Solana RPC URL, Guardian Program ID, Sentinel keypair, Telegram bot token + chat ID
```

### 🚀 3. Start Everything (Docker)

```bash
make docker-up
```

This starts PostgreSQL, Backend (port 8002), and Frontend (port 3003).

### ⚓ 4. Deploy Guardian Program (Devnet)

```bash
cd contracts/guardian
anchor build
anchor deploy --provider.cluster devnet
# Program ID: 8uSSf1TnE6Bqz1qGt3uZVAwU5Za9f1Sgp7sxtBQJ5HyJ
```

### 🌐 5. Access Dashboard

Open http://localhost:3003 and connect your wallet.

---

## 🔑 Environment Variables

| Variable | Description |
|----------|------------|
| `APP_PORT` | Backend server port (default: 8000) |
| `POSTGRES_USER` | PostgreSQL username |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `POSTGRES_DB` | PostgreSQL database name |
| `DB_HOST` | Database host (`postgres` in Docker) |
| `DB_PORT` | Database port (default: 5432) |
| `SOLANA_RPC_URL` | Solana RPC endpoint (devnet) |
| `SOLANA_WS_URL` | Solana WebSocket endpoint |
| `GUARDIAN_PROGRAM_ID` | Deployed Guardian Program address |
| `SENTINEL_KEYPAIR` | Sentinel's keypair JSON (authorized to trigger pause) |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token for alerts |
| `TELEGRAM_CHAT_ID` | Default Telegram chat ID for alerts |
| `ALLOWED_ORIGINS` | CORS allowed origins |

---

## 📡 API Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|------------|
| GET | `/api/health` | Health check |
| GET | `/api/simulate/drift` | Run Drift hack replay |

### Protected (Wallet Auth via X-Wallet-Address header)
| Method | Endpoint | Description |
|--------|----------|------------|
| POST | `/api/protocols` | Register a new protocol |
| GET | `/api/protocols` | List user's registered protocols |
| GET | `/api/protocols/:id` | Get protocol detail + invariants |
| POST | `/api/protocols/:id/invariants` | Add invariant rule |
| POST | `/api/protocols/:id/resume` | Resume paused protocol |

### Internal (Demo/Testing)
| Method | Endpoint | Description |
|--------|----------|------------|
| POST | `/api/_internal/attack_test` | Run attack simulation on a protocol |
| POST | `/api/_internal/inject_tx` | Inject a single transaction |

### WebSocket
| Endpoint | Description |
|----------|------------|
| `ws://host/ws?protocol_id=ID` | Real-time TX feed + threat level + alerts |

---

## 🔥 The Drift Hack Replay

The killer demo:

| Time | Event | Killswitch Response |
|---|---|---|
| T+0:00 | Admin key changed | 🔴 BREACH: Admin action detected |
| T+0:15 | Safety parameters removed | 🔴 BREACH: Parameter change detected |
| T+0:45 | $6.2M withdrawn | 🟡 WARNING: 40% of threshold |
| T+1:30 | $18.5M withdrawn | 🛑 **CIRCUIT BREAKER** — program paused |
| T+1:31 | Telegram alert sent | Full incident details to team |
| T+12:00 | Reality: $285M gone | **With Killswitch: $6M lost, $279M saved** |

---

## 🔥 Why Killswitch?

| Without Killswitch | With Killswitch |
|------|--------|
| No runtime monitoring | Every transaction checked in real-time |
| Attack detected after funds gone | Attack detected in seconds |
| No way to auto-stop exploits | On-chain circuit breaker auto-pauses |
| Team must manually monitor 24/7 | Sentinel monitors + alerts automatically |
| $285M lost in 12 minutes (Drift) | $6M lost, $279M saved |

---

## 🤝 Contributors

🧑 **Yobel Nathaniel Filipus**
- 🐙 Github: [@yebology](https://github.com/yebology)
- 💼 LinkedIn: [View Profile](https://linkedin.com/in/yobelnathanielfilipus)

---

## ⚠️ Disclaimer

Killswitch is a security monitoring tool that reduces exploit risk but cannot guarantee complete protection. Protocol teams are responsible for their own security configurations and response procedures. False positives may occur — always review incidents before resuming.

---

## 📄 License

MIT License
