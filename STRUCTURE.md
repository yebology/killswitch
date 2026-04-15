# Killswitch — Project Structure

Struktur folder mengikuti pola clean architecture yang sama dengan Miora.

---

```
killswitch/
├── backend/
│   ├── app/
│   │   ├── clients/            # External service clients
│   │   │   ├── geyser.go       # Solana Geyser/WebSocket TX stream listener
│   │   │   ├── solana.go       # Solana RPC client (send transactions, read accounts)
│   │   │   └── telegram.go     # Telegram Bot API client for alerts
│   │   │
│   │   ├── dto/
│   │   │   ├── requests/
│   │   │   │   ├── protocol.go     # Register protocol request
│   │   │   │   ├── invariant.go    # Create/update invariant request
│   │   │   │   └── alert.go        # Alert config request
│   │   │   └── responses/
│   │   │       ├── protocol.go     # Protocol status response
│   │   │       ├── invariant.go    # Invariant evaluation response
│   │   │       └── incident.go     # Incident timeline response
│   │   │
│   │   ├── entities/           # Database models (GORM)
│   │   │   ├── protocol.go    # Registered protocol (address, name, guardian key, telegram_chat_id, status)
│   │   │   ├── invariant.go   # Invariant rule (type, threshold, time_window, protocol_id)
│   │   │   └── incident.go    # Incident log (trigger_time, invariant_id, tx_hashes, action_taken, escalation_reason)
│   │   │
│   │   ├── handlers/           # HTTP request handlers
│   │   │   ├── protocol.go    # Register/get/list protocols
│   │   │   ├── invariant.go   # Add/list invariants
│   │   │   ├── simulate.go    # Run Drift hack simulation
│   │   │   └── auth.go        # Verify wallet signature
│   │   │
│   │   ├── http/               # Route registration per domain
│   │   │   ├── protocol.go
│   │   │   ├── invariant.go
│   │   │   ├── simulate.go
│   │   │   └── auth.go
│   │   │
│   │   ├── interfaces/         # Service & repository contracts
│   │   │   ├── solana.go      # ISolanaClient interface
│   │   │   ├── geyser.go     # IGeyserClient interface
│   │   │   ├── protocol.go    # IProtocolRepository interface
│   │   │   ├── invariant.go   # IInvariantRepository interface
│   │   │   └── incident.go    # IIncidentRepository interface
│   │   │
│   │   ├── middleware/
│   │   │   └── auth.go        # API key auth middleware (for dashboard)
│   │   │
│   │   ├── output/             # Standardized API response envelope
│   │   │   └── response.go
│   │   │
│   │   ├── repositories/       # Database access layer
│   │   │   ├── protocol.go
│   │   │   ├── invariant.go
│   │   │   └── incident.go
│   │   │
│   │   ├── services/           # Business logic
│   │   │   ├── sentinel.go        # Core: TX stream → evaluate invariants → trigger actions
│   │   │   ├── evaluator.go       # Invariant evaluation engine + severity escalation
│   │   │   ├── circuit_breaker.go # Trigger on-chain pause via guardian program
│   │   │   ├── telegram.go        # Dispatch alerts via Telegram Bot API
│   │   │   ├── protocol.go        # Protocol registration + management
│   │   │   ├── invariant.go       # Invariant add + validation
│   │   │   ├── incident.go        # Incident logging
│   │   │   └── simulator.go       # Drift hack replay simulation
│   │   │
│   │   └── ws/                 # WebSocket hub (real-time dashboard updates)
│   │       ├── hub.go
│   │       └── handler.go
│   │
│   ├── cmd/
│   │   ├── seed/
│   │   │   └── main.go        # Seed DB with sample protocol + invariants
│   │   └── simulate/
│   │       └── main.go        # CLI: run Drift hack simulation standalone
│   │
│   ├── config/
│   │   └── config.go          # Env config loader (RPC URL, Geyser URL, DB, Telegram token)
│   │
│   ├── constants/
│   │   ├── invariants.go      # Invariant types (WITHDRAWAL_RATE, TVL_DROP, ADMIN_CHANGE, etc.)
│   │   ├── error.go
│   │   └── success.go
│   │
│   ├── migrations/
│   │   ├── migrations.go      # Auto-migrate all entities
│   │   └── seed.go            # Seed data for demo
│   │
│   ├── router/
│   │   ├── container.go       # DI container: clients → repos → services → handlers
│   │   └── routes.go          # Route setup + sentinel start
│   │
│   ├── utils/
│   │   ├── helper.go
│   │   └── math.go
│   │
│   ├── pkg/
│   │   └── error.go           # AppError type
│   │
│   ├── main.go                # Entry point
│   ├── Dockerfile
│   ├── docker-compose.yml     # PostgreSQL
│   ├── go.mod
│   ├── go.sum
│   └── .env
│
├── frontend/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # Landing page
│   │   ├── dashboard/
│   │   │   └── page.tsx       # Main monitoring dashboard
│   │   ├── protocols/
│   │   │   └── [id]/
│   │   │       └── page.tsx   # Protocol detail + invariant config
│   │   ├── simulate/
│   │   │   └── page.tsx       # Drift hack simulation page
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components (button, card, badge, dialog, etc.)
│   │   ├── layout/
│   │   │   ├── navbar.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── footer.tsx
│   │   ├── dashboard/
│   │   │   ├── status-indicator.tsx    # Green/yellow/red protocol health + combined threat level
│   │   │   ├── tx-feed.tsx             # Real-time transaction feed
│   │   │   └── invariant-status.tsx    # Invariant check results (pass/warn/breach)
│   │   ├── protocol/
│   │   │   ├── register-form.tsx       # Register new protocol
│   │   │   └── invariant-editor.tsx    # Add invariant rules
│   │   ├── simulate/
│   │   │   ├── drift-replay.tsx        # Drift hack simulation visualizer
│   │   │   └── simulation-controls.tsx # Play/pause/speed controls
│   │   └── providers/
│   │       └── theme-provider.tsx
│   │
│   ├── constants/
│   │   ├── invariant-types.ts  # Invariant type definitions + descriptions
│   │   ├── nav.ts
│   │   └── landing.ts
│   │
│   ├── hooks/
│   │   ├── use-websocket.ts    # WebSocket hook for real-time dashboard
│   │   └── use-simulation.ts   # Simulation playback hook
│   │
│   ├── types/
│   │   ├── protocol.ts
│   │   ├── invariant.ts
│   │   ├── incident.ts
│   │   └── api.ts
│   │
│   ├── lib/
│   │   ├── utils.ts
│   │   └── api.ts              # API client (fetch wrapper)
│   │
│   ├── public/
│   │   └── killswitch-logo.svg
│   │
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── .env
│
├── contracts/
│   └── guardian/                # Anchor program (Solana smart contract)
│       ├── programs/
│       │   └── guardian/
│       │       └── src/
│       │           ├── lib.rs              # Program entry point
│       │           ├── instructions/
│       │           │   ├── mod.rs
│       │           │   ├── register_protocol.rs    # Register protocol + set guardian key
│       │           │   ├── add_invariant.rs         # Add invariant rule to protocol
│       │           │   ├── remove_invariant.rs      # Remove invariant rule
│       │           │   ├── trigger_pause.rs         # Guardian triggers emergency pause
│       │           │   ├── resume.rs                # Protocol owner resumes after review
│       │           │   └── update_config.rs         # Update guardian config
│       │           ├── state/
│       │           │   ├── mod.rs
│       │           │   ├── protocol_config.rs  # PDA: protocol address, guardian key, status
│       │           │   └── invariant_rule.rs   # PDA: invariant type, threshold, time_window
│       │           ├── error.rs            # Custom error codes
│       │           └── constants.rs        # Seeds, limits
│       │
│       ├── tests/
│       │   └── guardian.ts     # Anchor test suite
│       │
│       ├── migrations/
│       │   └── deploy.ts
│       │
│       ├── Anchor.toml
│       ├── Cargo.toml
│       └── package.json
│
├── Makefile
├── README.md
├── KILLSWITCH_CONCEPT.md
└── .gitignore
```

---

## Mapping ke Miora Structure

| Miora | Killswitch | Sama/Beda |
|---|---|---|
| `backend/app/clients/` | `backend/app/clients/` | Sama — external API clients |
| `backend/app/dto/` | `backend/app/dto/` | Sama — request/response objects |
| `backend/app/entities/` | `backend/app/entities/` | Sama — GORM database models |
| `backend/app/handlers/` | `backend/app/handlers/` | Sama — HTTP handlers |
| `backend/app/http/` | `backend/app/http/` | Sama — route registration |
| `backend/app/interfaces/` | `backend/app/interfaces/` | Sama — contracts |
| `backend/app/services/` | `backend/app/services/` | Sama — business logic |
| `backend/app/ws/` | `backend/app/ws/` | Sama — WebSocket hub |
| `backend/router/` | `backend/router/` | Sama — DI container + routes |
| `backend/config/` | `backend/config/` | Sama — env config |
| `backend/constants/` | `backend/constants/` | Sama — constants |
| `backend/migrations/` | `backend/migrations/` | Sama — auto-migrate |
| `backend/pkg/` | `backend/pkg/` | Sama — AppError |
| `backend/app/services/monitor.go` | `backend/app/services/sentinel.go` | Mirip — background service yang monitor |
| `backend/app/services/scoring.go` | `backend/app/services/evaluator.go` | Mirip — evaluate data against rules |
| `backend/app/services/ai.go` | `backend/app/services/alert.go` | Mirip — generate output dari analysis |
| — | `backend/app/services/circuit_breaker.go` | Baru — trigger on-chain pause |
| — | `backend/app/services/simulator.go` | Baru — Drift hack replay |
| `contracts/evm/` (Foundry) | `contracts/guardian/` (Anchor) | Beda framework — Anchor untuk Solana |
| `frontend/` (Next.js) | `frontend/` (Next.js) | Sama — Next.js + Tailwind + shadcn |

---

## Key Differences dari Miora

1. **Sentinel service** menggantikan wallet monitor — sama-sama background polling, tapi monitor TX stream bukan wallet-specific
2. **Evaluator** menggantikan scoring engine — sama-sama evaluate data against rules, tapi invariant rules bukan wallet scores
3. **Circuit breaker** adalah komponen baru — interact dengan on-chain program untuk pause
4. **Simulator** adalah komponen baru — replay historical transactions untuk demo
5. **Smart contract** pakai Anchor (Solana) bukan Foundry (EVM)
6. **No AI layer** — rule-based evaluation, tidak perlu Gemini/LLM
7. **No auth (Firebase)** — API key auth saja untuk MVP, bukan user accounts


---

## Tech Stack

| Layer | Technology | Kenapa |
|---|---|---|
| **Backend** | Go + Fiber | Sama dengan Miora — fast, lightweight, familiar |
| **ORM** | GORM | Sama dengan Miora — auto-migrate, clean query |
| **Database** | PostgreSQL | Sama dengan Miora — store protocols, invariants, incidents |
| **Real-time (backend)** | WebSocket (Fiber) | Sama dengan Miora — push updates ke dashboard |
| **TX Streaming** | Solana WebSocket / Yellowstone gRPC (Geyser) | Subscribe ke semua transaksi real-time dari Solana node |
| **Solana RPC** | solana-go (gagliardetto) | Go SDK untuk interact dengan Solana — send TX, read accounts |
| **Smart Contract** | Anchor (Rust) | Standard Solana program framework — guardian program |
| **Frontend** | Next.js 16 + TypeScript | Sama dengan Miora |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Sama dengan Miora |
| **Frontend Solana** | @solana/web3.js + @solana/wallet-adapter | Connect wallet, read on-chain state |
| **Auth** | Wallet-based (Phantom/Solflare) | Connect wallet = login. Wallet address = identity. No Firebase, no API keys |
| **Alerts** | Telegram Bot API | Dimana protocol teams sudah ada |
| **Infra** | Docker + Docker Compose | Sama dengan Miora |
| **Testing (contract)** | Anchor test (Mocha + Chai) | Standard Anchor testing |
| **Deployment (contract)** | Solana CLI + Anchor CLI | Deploy ke devnet/mainnet |

### Tidak Dipakai (vs Miora)

| Miora Punya | Killswitch Tidak Perlu | Alasan |
|---|---|---|
| Google Gemini (AI) | ❌ | Rule-based evaluation, tidak perlu LLM |
| Firebase Auth | ❌ | Wallet-based auth — connect wallet = login. Guardian wallet = identity |
| Alchemy | ❌ | Pakai Solana RPC langsung + Geyser |
| DexScreener | ❌ | Tidak perlu market data |
| Moralis / Birdeye | ❌ | Tidak perlu historical prices |
| 1inch / Jupiter | ❌ | Tidak ada swap functionality |
| Resend (email) | ❌ | Telegram cukup untuk alerts |
