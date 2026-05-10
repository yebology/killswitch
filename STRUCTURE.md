# Killswitch — Project Structure

Backend menggunakan Python + FastAPI dengan clean architecture pattern.

---

```
killswitch/
├── backend/
│   ├── app/
│   │   ├── api/                    # API layer
│   │   │   ├── __init__.py
│   │   │   ├── deps.py            # FastAPI dependencies (DI, auth, session)
│   │   │   ├── middleware.py      # CORS setup + exception handlers
│   │   │   ├── response.py       # Standardized JSON response envelope
│   │   │   └── routes/
│   │   │       ├── __init__.py    # Route aggregator (prefix /api)
│   │   │       ├── auth.py       # POST /api/auth/verify — wallet signature verification
│   │   │       ├── health.py     # GET /api/health — health check
│   │   │       ├── internal.py   # POST /api/_internal/attack_test, inject_tx (demo only)
│   │   │       ├── invariant.py  # POST /api/protocols/:id/invariants — add rule
│   │   │       ├── protocol.py   # CRUD protocols + resume
│   │   │       └── simulate.py   # GET /api/simulate/drift — Drift hack replay
│   │   │
│   │   ├── clients/               # External service clients
│   │   │   ├── geyser.py         # Solana TX stream (WebSocket, mock mode for demo)
│   │   │   ├── solana.py         # Solana RPC client (trigger_pause, resume stubs)
│   │   │   └── telegram.py       # Telegram Bot API client (httpx async)
│   │   │
│   │   ├── core/                  # Application core
│   │   │   ├── config.py         # Pydantic Settings — loads .env
│   │   │   ├── database.py       # SQLAlchemy async engine + session factory
│   │   │   ├── exceptions.py     # AppError class
│   │   │   └── security.py       # Ed25519 signature verification
│   │   │
│   │   ├── models/                # SQLAlchemy ORM models
│   │   │   ├── protocol.py       # Protocol: program_address, name, guardian_wallet, status, telegram_chat_id
│   │   │   ├── invariant.py      # Invariant: type, threshold, time_window, action, enabled
│   │   │   └── incident.py       # Incident: trigger_time, tx_hashes, action_taken, damage_estimate, escalation_reason
│   │   │
│   │   ├── repositories/          # Database access layer (async)
│   │   │   ├── protocol.py       # find_by_id, find_by_program_address, find_all_active, update_status
│   │   │   ├── invariant.py      # find_enabled_by_protocol_id, create
│   │   │   └── incident.py       # create, find_by_protocol_id
│   │   │
│   │   ├── schemas/               # Pydantic request/response schemas
│   │   │   ├── requests.py       # RegisterProtocolRequest, CreateInvariantRequest, SimulationParams
│   │   │   └── responses.py      # ProtocolResponse, InvariantResponse, SimulationResult
│   │   │
│   │   ├── services/              # Business logic
│   │   │   ├── sentinel.py       # Core orchestrator: TX stream → evaluate → trigger actions
│   │   │   ├── evaluator.py      # Invariant evaluation engine + severity escalation
│   │   │   ├── circuit_breaker.py # On-chain pause/resume + incident recording
│   │   │   ├── telegram.py       # Alert message formatting + dispatch
│   │   │   ├── protocol.py       # Protocol registration + management
│   │   │   ├── invariant.py      # Invariant CRUD + validation
│   │   │   ├── incident.py       # Incident queries
│   │   │   └── simulator.py      # Drift hack replay engine (hardcoded timeline)
│   │   │
│   │   ├── ws/                    # WebSocket real-time updates
│   │   │   ├── manager.py        # WebSocketManager — connection tracking + broadcast
│   │   │   └── routes.py         # ws://host/ws?protocol_id=ID
│   │   │
│   │   └── constants.py           # Invariant types, protocol statuses, threat levels, messages
│   │
│   ├── seeds/
│   │   ├── __main__.py           # python -m seeds
│   │   └── seed.py               # Seed DB with sample protocol + invariants
│   │
│   ├── scripts/
│   │   └── simulate_attack.py    # CLI attack simulator (calls /api/_internal/inject_tx)
│   │
│   ├── main.py                    # FastAPI app + lifespan (startup/shutdown)
│   ├── requirements.txt           # Python dependencies
│   ├── Dockerfile                 # Python 3.12 slim
│   ├── Makefile
│   └── .env                       # Environment variables
│
├── frontend/
│   ├── app/                       # Next.js 16 App Router
│   │   ├── page.tsx              # Landing page (hero, features, CTA)
│   │   ├── layout.tsx            # Root layout (fonts, providers, navbar)
│   │   ├── globals.css           # Tailwind CSS v4 + custom theme
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Main monitoring dashboard (threat level, invariant status)
│   │   ├── protocols/
│   │   │   ├── page.tsx          # Protocol list (cards with status)
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Protocol detail + invariant rules + attack test button
│   │   └── simulate/
│   │       └── page.tsx          # Drift hack replay (timeline + controls + summary)
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn/ui (button, card, badge, input, etc.)
│   │   ├── layout/
│   │   │   └── navbar.tsx        # Top navbar (logo, nav links, wallet connect)
│   │   ├── dashboard/
│   │   │   ├── combined-threat-level.tsx  # Threat level indicator (LOW/ELEVATED/HIGH/CRITICAL)
│   │   │   └── invariant-status.tsx       # Per-rule status bars
│   │   ├── protocol/
│   │   │   ├── register-form.tsx          # Register new protocol form
│   │   │   └── invariant-editor.tsx       # Add invariant rule form
│   │   ├── simulate/
│   │   │   └── drift-replay.tsx           # Drift hack replay visualizer
│   │   └── providers/
│   │       ├── wallet-provider.tsx        # @solana/wallet-adapter setup
│   │       └── auth-provider.tsx          # Wallet-based auth context
│   │
│   ├── hooks/
│   │   └── use-websocket.ts      # WebSocket hook for real-time dashboard updates
│   │
│   ├── types/
│   │   └── index.ts              # Protocol, Invariant, Incident, SimulationEvent types
│   │
│   ├── constants/
│   │   └── index.ts              # INVARIANT_TYPES, NAV_ITEMS, LANDING content
│   │
│   ├── lib/
│   │   ├── api.ts                # Fetch wrapper (get, post with wallet header)
│   │   └── utils.ts              # truncateAddress, getStatusColor, cn
│   │
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env
│
├── contracts/
│   └── guardian/                  # Anchor program (Solana smart contract)
│       ├── programs/
│       │   └── guardian/
│       │       └── src/
│       │           ├── lib.rs              # Program entry: 6 instructions
│       │           ├── instructions/
│       │           │   ├── mod.rs
│       │           │   ├── register_protocol.rs
│       │           │   ├── add_invariant.rs
│       │           │   ├── remove_invariant.rs
│       │           │   ├── trigger_pause.rs
│       │           │   ├── resume.rs
│       │           │   └── update_config.rs
│       │           ├── state/
│       │           │   ├── mod.rs
│       │           │   ├── protocol_config.rs  # PDA: protocol address, guardian key, status
│       │           │   └── invariant_rule.rs   # PDA: type, threshold, time_window
│       │           ├── error.rs            # Custom error codes
│       │           └── constants.rs        # Seeds, limits
│       │
│       ├── tests/
│       │   └── guardian.ts        # Anchor test suite (Mocha + Chai)
│       ├── migrations/deploy.ts
│       ├── Anchor.toml
│       ├── Cargo.toml
│       └── package.json
│
├── docker-compose.yml             # PostgreSQL (5434) + Backend (8002) + Frontend (3003)
├── Makefile                       # make docker-up, make docker-down, make help
├── README.md
├── CONCEPT.md                     # Full concept document
├── USER_FLOW.md                   # End-to-end user flows
├── STRUCTURE.md                   # This file
└── .gitignore
```

---

## Key Architecture Decisions

### Session-per-Transaction Pattern
The Sentinel service uses `session_factory` to create fresh database sessions for each transaction evaluation. This prevents stale session issues that occur with long-lived background services.

### Severity Escalation (Multi-Signal Correlation)
The Evaluator doesn't just check individual rules — it correlates signals:
- 0 warnings → LOW
- 1 warning → ELEVATED
- 2+ warnings → auto-escalate to CRITICAL → pause
- Admin action + any warning → auto-escalate to CRITICAL → pause

### Attack Test (Fire Drill)
The `/api/_internal/attack_test` endpoint bypasses the normal Sentinel flow. It:
1. Reads user-configured thresholds from DB
2. Generates attack amounts scaled to those thresholds (40%, 70%, 120%)
3. Evaluates all steps without pausing mid-sequence
4. Pauses + sends one comprehensive Telegram alert with ALL indicators

### TVL Drop Calculation
TVL Drop uses an estimated baseline TVL ($50M) to convert raw dollar amounts to percentages. This makes the threshold (e.g., 10%) meaningful — a $5M withdrawal = 10% TVL drop.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Backend** | Python 3.12 + FastAPI | Async-first, fast development, great for hackathon |
| **ORM** | SQLAlchemy (async) | Mature, async support, flexible |
| **Database** | PostgreSQL | Reliable, JSON support for tx_hashes |
| **Real-time** | WebSocket (FastAPI) | Push updates to dashboard |
| **TX Streaming** | Solana WebSocket (mock mode) | Subscribe to program transactions |
| **Solana RPC** | solders / solana-py | Python SDK for Solana interaction |
| **Smart Contract** | Anchor (Rust) | Standard Solana program framework |
| **Frontend** | Next.js 16 + TypeScript | App Router, server components |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Rapid UI development |
| **Wallet** | @solana/wallet-adapter | Phantom, Solflare support |
| **Alerts** | Telegram Bot API (httpx) | Where protocol teams already are |
| **Infra** | Docker + Docker Compose | One command to run everything |

---

## Guardian Program (On-chain)

**Program ID:** `8uSSf1TnE6Bqz1qGt3uZVAwU5Za9f1Sgp7sxtBQJ5HyJ` (devnet)

### Instructions
| Instruction | Description |
|---|---|
| `register_protocol` | Register a new protocol with guardian key |
| `add_invariant` | Add an invariant rule to a protocol |
| `remove_invariant` | Remove an invariant rule |
| `update_config` | Update protocol configuration |
| `trigger_pause` | Emergency pause (called by Sentinel) |
| `resume` | Resume protocol (requires guardian signature) |

### State (PDAs)
- **ProtocolConfig** — protocol address, guardian key, sentinel key, status, invariant count
- **InvariantRule** — type (enum), threshold, time_window, enabled
