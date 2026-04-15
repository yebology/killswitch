# 🛡️ Killswitch

> **Real-time exploit detection and auto-pause for Solana DeFi protocols.**

**Killswitch** is a runtime security system for Solana that monitors on-chain activity, detects anomalous transaction patterns, and auto-pauses programs before exploits drain funds — the emergency stop button that DeFi protocols are missing.

On April 1, 2026, Drift Protocol lost $285M in 12 minutes. The code was audited. The oracles worked. But nothing was watching at runtime. Killswitch would have stopped it in 30 seconds.

---

## ✨ Overview

Audits catch bugs before deployment. Killswitch catches exploits during execution.

Every DeFi protocol on Solana — Jupiter, Raydium, Marinade, Kamino — is vulnerable to the same class of attack that hit Drift: valid transactions that are malicious in aggregate. Killswitch provides the missing runtime defense layer:

- 🔍 **Real-time Monitoring** — Subscribe to every transaction hitting your program, evaluated against your security rules
- 🚨 **Anomaly Detection** — Detect unusual withdrawal rates, TVL drops, admin key changes, oracle manipulation
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
| **Admin Key Change** | Any authority change | Alert |
| **Parameter Change** | Safety limits modified | Alert |
| **Single TX Size** | Max $1M per transaction | Auto-pause |
| **Custom** | User-defined conditions | Configurable |

**Severity Escalation:** Killswitch automatically correlates multiple signals. If 2+ rules are in warning state simultaneously (>50% of threshold), or an admin/parameter change occurs alongside any other warning, the system auto-escalates to CRITICAL and triggers pause — even if no single rule has been breached.

### 📢 Telegram Alerts
- Telegram bot notifications for all incidents and breaches
- Dashboard real-time push via WebSocket

### 🔄 Drift Hack Simulation
- Replay actual Drift Protocol hack transactions through Killswitch
- Visual timeline showing detection → warning → breach → auto-pause
- Adjustable rules to see different outcomes
- "Killswitch would have saved $279M" — the demo that sells itself

### 🔐 Wallet-based Auth
- Connect wallet (Phantom/Solflare) = login
- Guardian wallet address = identity
- No Firebase, no API keys, no passwords
- Crypto-native authentication

---

## 📋 How It Works

1. 🔗 **Connect** — Protocol team connects guardian wallet to Killswitch dashboard
2. 📝 **Register** — Register program address and configure alert channels
3. 📏 **Set Rules** — Define invariant rules: withdrawal limits, TVL thresholds, admin change alerts
4. 👁️ **Monitor** — Sentinel watches every transaction in real-time, evaluates against rules
5. 🛑 **Protect** — When a rule is breached, circuit breaker auto-pauses the program on-chain
6. 📢 **Alert** — Team gets instant notification with incident details
7. 🔍 **Review** — Full incident timeline on dashboard for investigation
8. ▶️ **Resume** — Team signs with guardian wallet to resume after review

---

## 🧩 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Dashboard (Next.js)                     │
│  Monitor → Configure Rules → Incidents → Simulate        │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API + WebSocket
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Sentinel Service (Go + Fiber)                │
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
| Backend | Go, Fiber, GORM, WebSocket |
| Database | PostgreSQL |
| TX Streaming | Solana Geyser / Yellowstone gRPC |
| Solana RPC | solana-go |
| Smart Contract | Anchor (Rust) |
| Frontend | Next.js 16, Tailwind CSS v4, shadcn/ui, TypeScript |
| Wallet Auth | @solana/wallet-adapter (Phantom, Solflare) |
| Alerts | Telegram Bot API |
| Infra | Docker, Docker Compose |

---

## 🧩 Project Structure

```
killswitch/
├── backend/
│   ├── app/
│   │   ├── clients/        # Geyser listener, Solana RPC, Telegram bot
│   │   ├── dto/            # Request/response objects
│   │   ├── entities/       # Database models (Protocol, Invariant, Incident)
│   │   ├── handlers/       # HTTP handlers (protocol, invariant, simulate, auth)
│   │   ├── http/           # Route registration per domain
│   │   ├── interfaces/     # Service & repository contracts
│   │   ├── middleware/      # Wallet signature verification
│   │   ├── output/         # Standardized API response envelope
│   │   ├── repositories/   # Database access layer
│   │   ├── services/       # Business logic (sentinel, evaluator, circuit_breaker, telegram, simulator)
│   │   └── ws/             # WebSocket hub for real-time dashboard
│   ├── cmd/                # CLI commands (seed, simulate)
│   ├── config/             # Environment config loader
│   ├── constants/          # Invariant types, errors, success messages
│   ├── migrations/         # Database migrations
│   ├── router/             # DI container + route setup
│   ├── utils/              # Shared utilities
│   ├── pkg/                # Shared packages (AppError)
│   └── main.go             # Entry point
├── frontend/
│   ├── app/                # Next.js App Router
│   │   ├── page.tsx        # Landing page
│   │   ├── dashboard/      # Main monitoring dashboard
│   │   ├── protocols/      # Protocol list + detail + invariant config
│   │   ├── incidents/      # Incident history + timeline
│   │   └── simulate/       # Drift hack simulation
│   ├── components/
│   │   ├── ui/             # shadcn/ui components
│   │   ├── layout/         # Navbar, Sidebar, Footer
│   │   ├── dashboard/      # Status indicator, TX feed, invariant status, alert timeline
│   │   ├── protocol/       # Register form, protocol card, invariant editor
│   │   ├── incident/       # Incident card, incident timeline
│   │   ├── simulate/       # Drift replay visualizer, simulation controls
│   │   └── providers/      # Theme provider, Wallet provider
│   ├── constants/          # Invariant types, nav, landing
│   ├── hooks/              # useWebSocket, useSimulation
│   ├── types/              # TypeScript types
│   └── lib/                # Utilities, API client
├── contracts/
│   └── guardian/            # Anchor program (Solana smart contract)
│       ├── programs/
│       │   └── guardian/
│       │       └── src/
│       │           ├── lib.rs
│       │           ├── instructions/   # register, add_invariant, trigger_pause, resume
│       │           ├── state/          # protocol_config, invariant_rule (PDAs)
│       │           ├── error.rs
│       │           └── constants.rs
│       ├── tests/
│       └── Anchor.toml
├── Makefile
└── README.md
```

---

## 🧭 How to Run

### 📦 Prerequisites
- Go 1.25+
- Docker & Docker Compose
- Node.js 18+
- Rust + Anchor CLI (for smart contract)
- Solana CLI (for devnet deployment)

### 🔨 1. Clone Repository

```bash
git clone https://github.com/[username]/killswitch.git
cd killswitch
```

### 🔐 2. Configure Environment

```bash
cp backend/.env.example backend/.env
# Fill in: Solana RPC URL, Geyser URL, DB credentials, Telegram bot token
```

### 🐘 3. Start Database

```bash
cd backend && docker compose up -d
```

### ⚓ 4. Deploy Guardian Program (Devnet)

```bash
cd contracts/guardian
anchor build
anchor deploy --provider.cluster devnet
# Copy program ID to backend .env
```

### 🚀 5. Run Backend

```bash
cd backend && go run main.go
```

### 🌐 6. Run Frontend

```bash
cd frontend && npm install && npm run dev
```

---

## 🔑 Environment Variables

| Variable | Description |
|----------|------------|
| `APP_PORT` | Backend server port |
| `POSTGRES_USER` | PostgreSQL username |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `POSTGRES_DB` | PostgreSQL database name |
| `DB_HOST` | Database host |
| `DB_PORT` | Database port |
| `SOLANA_RPC_URL` | Solana RPC endpoint (devnet/mainnet) |
| `SOLANA_WS_URL` | Solana WebSocket endpoint for TX streaming |
| `GUARDIAN_PROGRAM_ID` | Deployed Guardian Program address |
| `SENTINEL_KEYPAIR` | Sentinel's keypair path (authorized to trigger pause) |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token for alerts |
| `ALLOWED_ORIGINS` | CORS allowed origins |

---

## 📡 API Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|------------|
| GET | `/api/health` | Health check |
| GET | `/api/simulate/drift` | Run Drift hack simulation (public demo) |

### Protected (Wallet Auth)
| Method | Endpoint | Description |
|--------|----------|------------|
| POST | `/api/auth/verify` | Verify wallet signature |
| POST | `/api/protocols` | Register a new protocol |
| GET | `/api/protocols` | List user's registered protocols |
| GET | `/api/protocols/:id` | Get protocol detail + status |
| POST | `/api/protocols/:id/invariants` | Add invariant rule |
| GET | `/api/protocols/:id/invariants` | List invariant rules |
| POST | `/api/protocols/:id/resume` | Resume paused protocol (requires wallet sign) |

### WebSocket
| Endpoint | Description |
|----------|------------|
| `ws://host/ws?protocol_id=ID` | Real-time TX feed + invariant status + alerts |

---

## 🔥 The Drift Hack Simulation

The killer demo:

| Time | Event | Killswitch Response |
|---|---|---|
| T+0:00 | Admin key changed | ⚠️ Alert: "Admin key change detected" |
| T+0:30 | Safety parameters removed | 🔴 Alert: "Withdrawal limits disabled" |
| T+1:00 | $2M withdrawn | 🟡 Warning: withdrawal rate 40% of limit |
| T+2:00 | $6M total withdrawn | 🛑 **CIRCUIT BREAKER** — program paused |
| T+2:01 | Alert sent to team | Telegram notification |
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
