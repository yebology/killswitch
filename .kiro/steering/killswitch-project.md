# Killswitch — Project Steering

## Project Overview

Killswitch is a real-time exploit detection and auto-pause system for Solana DeFi protocols. It monitors on-chain activity, detects anomalous transaction patterns, and auto-pauses programs before exploits drain funds.

Built as a direct response to the Drift Protocol hack (April 1, 2026 — $285M lost in 12 minutes).

**Hackathon:** Solana Frontier — Deadline May 11, 2026

## Reference Documents

All project documentation lives in the workspace root:
- #[[file:RESEARCH.md]] — Semua hasil riset yang mendasari konsep Killswitch (competitive analysis, gap analysis, Drift hack deep dive, Copilot API queries, academic validation, judge analysis)
- #[[file:CONCEPT.md]] — Full concept, business flows, demo script, revenue model, competitive analysis
- #[[file:README.md]] — Technical README with architecture, API endpoints, tech stack, how to run
- #[[file:STRUCTURE.md]] — Detailed folder structure, file-by-file breakdown, Miora mapping
- #[[file:PROGRESS.md]] — Implementation checklist and hackathon priority timeline

## Research Foundation

Killswitch lahir dari riset mendalam menggunakan Colosseum Copilot API, browser scanning, dan analisis multi-sumber. Berikut ringkasan temuan kunci:

### Proses Riset
1. Baca kriteria hackathon Solana Frontier (colosseum.com/frontier)
2. Analisis pemenang 4 hackathon sebelumnya (Renaissance, Radar, Breakout, Cypherpunk) via Hall of Fame
3. Riset ekosistem Solana 2026 (tren, narrative, gap)
4. Competitive validation via Copilot API (search 5,400+ submissions)
5. Academic validation via Copilot Archives (84,000+ docs)
6. Deep dive Drift Protocol hack ($285M, April 1, 2026)
7. Analisis judges Frontier hackathon

### Gap Analysis (dari Copilot API)
| Category | Projects | Winners | Status |
|---|---|---|---|
| **Security / Circuit Breaker** | 13+ | **0** | 🔴 Full gap — biggest untapped |
| Recurring Payments | 3+ | 0 | 🟠 Partial gap |
| AI Agent Treasury | 5+ | 1 | 🟡 Adjacent winners exist |
| Yield Aggregator | 10+ | 0 | ❌ Crowded (257 cluster) |

### Kenapa Security Dipilih
1. **0 pemenang** di kategori security across 4 hackathon Colosseum
2. **Drift hack $285M** terjadi 12 hari sebelum Frontier dimulai — timing sempurna
3. **Judge w.sol dari Drift** — personal connection ke masalah
4. **a16z research** memvalidasi pendekatan runtime enforcement (similarity: 0.658)
5. **Guardrail.ai** sudah ada untuk EVM — market validated, tapi belum ada untuk Solana
6. **Setiap DeFi protocol** adalah potential customer post-Drift

### Drift Hack Facts
- Tanggal: 1 April 2026
- Jumlah: $285M drained dalam 12 menit
- Pelaku: UNC4736 (kelompok Korea Utara)
- Metode: Social engineering → compromised 2/5 multisig → pre-signed malicious TX → hijacked admin → drained 3 vaults
- Dampak: $3B drop di Solana TVL, SOL di bawah $80
- Root cause: Tidak ada runtime defense, tidak ada timelock pada admin actions, tidak ada anomaly detection

### Pola Pemenang Colosseum
- Solve very specific problem (bukan platform generik)
- Novel primitive/mechanism
- Solana-native (leverage speed, low cost, fitur unik Solana)
- Clear business model (bukan research project)
- Working demo (bukan mockup)
- Founder intent (serius mau build full-time)

### Academic Validation
- **a16z crypto**: "Runtime enforcement: A new line of defense against subtle numerical exploits" — validates runtime defense approach
- **arxiv**: "BLOCKEYE: Hunting For DeFi Attacks on Blockchain" — related work
- **BlockEden**: "How AI-Assisted Formal Verification and Runtime Guardrails Are Reshaping DeFi Security"

### Competitor Landscape
| Competitor | Platform | Killswitch Difference |
|---|---|---|
| Guardrail.ai | EVM | Killswitch = Solana-native |
| Forta Network | EVM | Not on Solana |
| OpenZeppelin Defender | EVM | Not on Solana |
| Tossbounty (hackathon) | Solana | Concept only, no prize |
| Bulwark (hackathon) | Solana | Pre-deployment, not runtime |

## System Architecture

Three components:

1. **Guardian Program (On-chain)** — Anchor/Rust smart contract on Solana. Stores protocol configs, invariant rules, and circuit breaker state as PDAs. Triggers pause/resume via CPI.
2. **Sentinel Service (Off-chain)** — Go + Fiber backend. Subscribes to Solana TX stream, evaluates transactions against invariant rules, triggers on-chain circuit breaker, dispatches alerts.
3. **Dashboard (Frontend)** — Next.js 16 + Tailwind CSS v4 + shadcn/ui. Real-time monitoring, rule configuration, incident timeline, Drift hack replay.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.25+, Fiber, GORM, WebSocket |
| Database | PostgreSQL (Docker Compose) |
| TX Streaming | Solana Geyser / Yellowstone gRPC / WebSocket |
| Solana RPC | solana-go (gagliardetto) |
| Smart Contract | Anchor (Rust) on Solana |
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui |
| Wallet Auth | @solana/wallet-adapter (Phantom, Solflare) |
| Alerts | Telegram Bot API |
| Infra | Docker, Docker Compose |

## Architecture Pattern

Backend follows **clean architecture** (same pattern as Miora project):

```
backend/
├── app/
│   ├── clients/        → External service clients (Geyser, Solana RPC, Telegram)
│   ├── dto/            → Request/response objects (requests/, responses/)
│   ├── entities/       → GORM database models
│   ├── handlers/       → HTTP request handlers
│   ├── http/           → Route registration per domain
│   ├── interfaces/     → Service & repository contracts (interfaces)
│   ├── middleware/      → Wallet signature verification
│   ├── output/         → Standardized API response envelope
│   ├── repositories/   → Database access layer
│   ├── services/       → Business logic
│   └── ws/             → WebSocket hub for real-time updates
├── cmd/                → CLI commands (seed, simulate)
├── config/             → Environment config loader
├── constants/          → Invariant types, errors, success messages
├── migrations/         → Auto-migrate + seed data
├── router/             → DI container + route setup
├── utils/              → Shared utilities
├── pkg/                → Shared packages (AppError)
└── main.go             → Entry point
```

## Coding Conventions

### Go Backend
- Use Fiber v2 for HTTP framework
- Use GORM for ORM with PostgreSQL
- Follow interface-based dependency injection (interfaces/ → services/ → handlers/)
- DI container in `router/container.go` wires everything together
- Standardized API responses via `output/response.go`
- Error handling via `pkg/error.go` (AppError type)
- Environment config loaded via `config/config.go`
- Constants for invariant types, error messages, success messages in `constants/`
- WebSocket hub pattern for real-time dashboard push (`ws/hub.go`, `ws/handler.go`)

### Anchor Smart Contract
- Use Anchor framework for Solana program
- PDA-based state storage (ProtocolConfig, InvariantRule)
- Instructions: register_protocol, add_invariant, remove_invariant, trigger_pause, resume, update_config
- Custom error codes in `error.rs`
- Seeds and limits in `constants.rs`
- Tests using Anchor test framework (Mocha + Chai)

### Next.js Frontend
- Next.js 16 with App Router
- Tailwind CSS v4 for styling
- shadcn/ui for component library
- @solana/wallet-adapter for wallet connection
- Wallet-based auth: connect wallet = login, no Firebase/API keys
- Components organized by domain: layout/, dashboard/, protocol/, incident/, simulate/, providers/
- Custom hooks: useWebSocket (real-time updates), useSimulation (playback state)
- API client in `lib/api.ts` with fetch wrapper

## Authentication

Wallet-based authentication — no Firebase, no API keys, no passwords:
1. User connects wallet (Phantom/Solflare)
2. Signs a message to prove ownership
3. Backend verifies signature
4. Checks if wallet is a registered guardian key
5. If yes → show protocol dashboard. If no → show "Register Protocol" page.

## Key Business Flows

1. **Protocol Onboarding** — Connect wallet → Register protocol (program address, name, alert channels) → On-chain PDA created → Dashboard ready
2. **Configure Rules** — Add invariant rules (withdrawal rate, TVL drop, admin change, custom) → Stored in DB + on-chain PDA → Sentinel starts evaluating
3. **Normal Monitoring** — Sentinel subscribes to TX stream → Parse + evaluate each TX → All pass → Log + update dashboard via WebSocket
4. **Attack Detection** — Rule breached → Sentinel calls Guardian Program → trigger_pause → Protocol paused on-chain → Alert dispatched → Dashboard shows incident
5. **Incident Review & Resume** — Team reviews incident timeline → Confirm attack or false alarm → Resume via guardian wallet signature
6. **Drift Replay** — Public demo page → Replay Drift hack transactions → Show detection timeline → "Saved $279M"

## Invariant Types

- `WITHDRAWAL_RATE` — Max withdrawal amount per time window
- `TVL_DROP` — Max TVL percentage drop in time window
- `ADMIN_ACTION` — Detect any admin activity (key change, parameter modification, config update)

### Severity Escalation (Multi-Signal Correlation)

Evaluator otomatis correlate multiple signals:
- Warning = measured value > 50% of user-set threshold
- Combined Threat Level: LOW (0 warnings), ELEVATED (1), HIGH (2+), CRITICAL (breach/escalation)
- 2+ rules warning bersamaan → auto-escalate ke CRITICAL → trigger pause
- Admin action + any other warning → auto-escalate ke CRITICAL
- User tidak perlu configure — logic otomatis di evaluator

## API Structure

### Public Endpoints
- `GET /api/health` — Health check
- `GET /api/simulate/drift` — Drift hack replay (public demo)

### Protected Endpoints (Wallet Auth)
- `POST /api/auth/verify` — Verify wallet signature
- `POST /api/protocols` — Register protocol
- `GET /api/protocols` — List protocols
- `GET /api/protocols/:id` — Protocol detail
- `POST /api/protocols/:id/invariants` — Add rule
- `PUT /api/protocols/:id/invariants/:rid` — Update rule
- `DELETE /api/protocols/:id/invariants/:rid` — Remove rule
- `POST /api/protocols/:id/resume` — Resume paused protocol
- `GET /api/protocols/:id/incidents` — Incident history
- `GET /api/protocols/:id/incidents/:iid` — Incident detail
- `GET /api/protocols/:id/monitor` — Monitor status

### WebSocket
- `ws://host/ws?protocol_id=ID` — Real-time TX feed + invariant status + alerts

## MVP Scope (Hackathon)

### Must Have
- Guardian Program on devnet (register, pause, resume)
- Sentinel with at least 2 invariant types (withdrawal rate + TVL drop)
- Auto-pause working end-to-end
- Telegram alerts
- Dashboard with real-time monitoring
- Drift hack replay demo
- Pitch video + technical demo video

### Not in MVP
- ML-based anomaly detection (rule-based is enough)
- Multi-protocol monitoring (focus on one protocol demo)
- Decentralized sentinel network (centralized is fine)
- Production mainnet deployment (devnet demo is sufficient)

## Implementation Priority

1. **Backend Core** — Config, entities, repos, DI container, routes, main.go, protocol + invariant CRUD, sentinel service, evaluator, alert dispatcher, WebSocket hub, wallet auth, simulator
2. **Smart Contract** — Guardian Program instructions, PDA state, error codes, tests, deploy to devnet, circuit breaker integration
3. **Frontend** — Next.js setup, wallet auth, landing page, dashboard, protocol config UI, incident timeline, Drift replay page
4. **Polish + Demo** — End-to-end testing, UI polish, pitch video, technical demo, deploy to Vercel + Railway
