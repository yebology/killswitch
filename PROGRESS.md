# Killswitch — Progress

## 📌 Status: Pre-development (Concept & Architecture Done)

---

## 🔲 Smart Contract — Guardian Program (Anchor)

### Instructions
- [ ] `register_protocol` — Protocol team registers program address + guardian key → creates PDA config
- [ ] `add_invariant` — Add invariant rule to protocol (type, threshold, time_window, action)
- [ ] `remove_invariant` — Remove invariant rule
- [ ] `update_config` — Update guardian key or alert settings
- [ ] `trigger_pause` — Sentinel triggers emergency pause (verify sentinel key → set status = paused)
- [ ] `resume` — Protocol owner resumes after review (verify guardian wallet → set status = active)

### State (PDAs)
- [ ] `ProtocolConfig` — program_address, guardian_key, sentinel_key, status (active/paused), created_at
- [ ] `InvariantRule` — protocol_config (ref), invariant_type, threshold, time_window, action (pause/alert), enabled

### Other
- [ ] Error codes (unauthorized, already_paused, already_active, invalid_invariant)
- [ ] Constants (seeds, max invariants per protocol)
- [ ] Tests (register, add invariant, trigger pause, resume, unauthorized access)
- [ ] Deploy to devnet

---

## 🔲 Backend — Sentinel Service (Go + Fiber)

### Clients
- [ ] `clients/geyser.go` — Solana Geyser/WebSocket TX stream listener (subscribe to program transactions)
- [ ] `clients/solana.go` — Solana RPC client (send transactions, read accounts, call Guardian Program)
- [ ] `clients/telegram.go` — Telegram Bot API client (send alert messages)

### Entities (Database Models)
- [ ] `entities/protocol.go` — Protocol record (id, program_address, name, guardian_wallet, telegram_chat_id, status, created_at)
- [ ] `entities/invariant.go` — Invariant rule (id, protocol_id, type, threshold, time_window, action, enabled)
- [ ] `entities/incident.go` — Incident log (id, protocol_id, invariant_id, trigger_time, tx_hashes, action_taken, damage_estimate, escalation_reason)

### Repositories
- [ ] `repositories/protocol.go` — CRUD protocol records
- [ ] `repositories/invariant.go` — CRUD invariant rules
- [ ] `repositories/incident.go` — Create incidents

### Services (Business Logic)
- [ ] `services/sentinel.go` — Core loop: subscribe TX stream → filter by registered programs → evaluate → trigger actions
- [ ] `services/evaluator.go` — Invariant evaluation engine:
  - [ ] WITHDRAWAL_RATE: sum withdrawals in time window, compare to threshold
  - [ ] TVL_DROP: track TVL changes over time window, compare to threshold
  - [ ] ADMIN_ACTION: detect authority/admin instruction changes and parameter modifications
  - [ ] Severity escalation: calculate combined threat level (LOW/ELEVATED/HIGH/CRITICAL), auto-escalate when 2+ warnings or admin action + any warning
- [ ] `services/circuit_breaker.go` — Call Guardian Program on-chain to trigger pause
- [ ] `services/alert.go` — Dispatch alerts to Telegram
- [ ] `services/protocol.go` — Protocol registration + management logic
- [ ] `services/invariant.go` — Invariant add + validation logic
- [ ] `services/incident.go` — Incident logging
- [ ] `services/simulator.go` — Drift hack replay: feed historical TX data through evaluator

### Handlers
- [ ] `handlers/protocol.go` — Register/get/list protocols
- [ ] `handlers/invariant.go` — Add/list invariants
- [ ] `handlers/simulate.go` — Run Drift hack replay
- [ ] `handlers/auth.go` — Verify wallet signature

### HTTP Routes
- [ ] `http/protocol.go` — Protocol routes (protected)
- [ ] `http/invariant.go` — Invariant routes (protected)
- [ ] `http/simulate.go` — Simulation routes (public)
- [ ] `http/auth.go` — Auth routes (public)

### Middleware
- [ ] `middleware/auth.go` — Wallet signature verification (simplified — wallet address as identity)

### WebSocket
- [ ] `ws/hub.go` — WebSocket hub (manage connections per protocol)
- [ ] `ws/handler.go` — WebSocket upgrade + connect handler

### Infrastructure
- [ ] `config/config.go` — Env config (RPC URL, Geyser URL, DB, Telegram token, Guardian Program ID)
- [ ] `constants/invariants.go` — Invariant type constants
- [ ] `constants/error.go` — Error messages
- [ ] `constants/success.go` — Success messages
- [ ] `router/container.go` — DI container (clients → repos → services → handlers)
- [ ] `router/routes.go` — Route setup + sentinel start
- [ ] `migrations/migrations.go` — Auto-migrate all entities
- [ ] `migrations/seed.go` — Seed sample protocol + invariants for demo
- [ ] `pkg/error.go` — AppError type
- [ ] `main.go` — Entry point
- [ ] `Dockerfile`
- [ ] `docker-compose.yml` — PostgreSQL
- [ ] `.env` — Environment variables

---

## 🔲 Frontend — Dashboard (Next.js)

### Pages
- [ ] `app/page.tsx` — Landing page (hero: "The $285M Drift hack took 12 minutes. Killswitch would have stopped it in 30 seconds.")
- [ ] `app/dashboard/page.tsx` — Main monitoring dashboard (real-time TX feed, invariant status, combined threat level)
- [ ] `app/protocols/[id]/page.tsx` — Protocol detail + invariant config editor
- [ ] `app/simulate/page.tsx` — Drift hack replay (public, no auth, adjustable parameters)
- [ ] `app/layout.tsx` — Root layout with sidebar + wallet provider

### Components
- [ ] `components/layout/navbar.tsx` — Top navbar with wallet connect
- [ ] `components/layout/sidebar.tsx` — Side navigation
- [ ] `components/dashboard/status-indicator.tsx` — Green/yellow/red protocol health + combined threat level
- [ ] `components/dashboard/tx-feed.tsx` — Real-time scrolling transaction feed
- [ ] `components/dashboard/invariant-status.tsx` — Invariant check results (pass/warn/breach)
- [ ] `components/protocol/register-form.tsx` — Register new protocol form
- [ ] `components/protocol/invariant-editor.tsx` — Add invariant rules UI
- [ ] `components/simulate/drift-replay.tsx` — Drift hack replay visualizer (timeline + status progression)
- [ ] `components/simulate/simulation-controls.tsx` — Play/pause/speed/reset controls
- [ ] `components/providers/theme-provider.tsx`
- [ ] `components/providers/wallet-provider.tsx` — Solana wallet adapter provider
- [ ] `components/ui/*` — shadcn/ui components (button, card, badge, dialog, input, select, etc.)

### Data Layer
- [ ] `lib/api.ts` — API client (fetch wrapper with auth header)
- [ ] `hooks/use-websocket.ts` — WebSocket hook for real-time dashboard updates
- [ ] `hooks/use-simulation.ts` — Simulation playback state management
- [ ] `types/protocol.ts` — Protocol types
- [ ] `types/invariant.ts` — Invariant types
- [ ] `types/incident.ts` — Incident types
- [ ] `types/api.ts` — API response types
- [ ] `constants/invariant-types.ts` — Invariant type definitions + descriptions + icons
- [ ] `constants/nav.ts` — Navigation items
- [ ] `constants/landing.ts` — Landing page content

---

## 🔲 Demo & Submission

- [ ] Drift hack replay data (actual transaction patterns to replay)
- [ ] Record pitch video (< 3 min)
- [ ] Record technical demo video (2-3 min)
- [ ] Deploy frontend (Vercel)
- [ ] Deploy backend (Railway/Render)
- [ ] Guardian Program on devnet (already deployed)
- [ ] Submit to Colosseum Arena

---

## 📋 Hackathon Priority (Solana Frontier — Due May 11)

### Week 1-2: Backend Core
- [ ] Backend skeleton (config, entities, repos, DI container, routes, main.go)
- [ ] Protocol + invariant handlers + CRUD
- [ ] Sentinel service (TX stream listener + basic evaluator)
- [ ] Invariant evaluator (WITHDRAWAL_RATE, TVL_DROP, ADMIN_ACTION)
- [ ] Alert dispatcher (Telegram)
- [ ] WebSocket hub for real-time dashboard push
- [ ] Wallet-based auth middleware (verify signature)
- [ ] Simulator service (Drift hack replay with mock TX data)

### Week 2-3: Smart Contract
- [ ] Guardian Program (register_protocol, add_invariant, trigger_pause, resume)
- [ ] PDA state (ProtocolConfig, InvariantRule)
- [ ] Error codes + constants
- [ ] Tests (register, pause, resume, unauthorized)
- [ ] Deploy to devnet
- [ ] Backend circuit_breaker service (call on-chain pause from Sentinel)
- [ ] End-to-end: Sentinel detect → call Guardian Program → program paused

### Week 3-4: Frontend
- [ ] Project setup (Next.js + Tailwind + shadcn + wallet adapter)
- [ ] Wallet-based auth (connect wallet = login)
- [ ] Landing page
- [ ] Dashboard (real-time TX feed, invariant status, protocol health)
- [ ] Protocol registration + invariant config UI
- [ ] Incident timeline page
- [ ] Drift hack replay page (visual timeline + controls)

### Week 4-5: Polish + Demo
- [ ] Drift simulation with real transaction patterns
- [ ] End-to-end test: register → set rules → simulate attack → auto-pause → alert → review → resume
- [ ] Polish UI, fix bugs
- [ ] Record pitch video (< 3 min)
- [ ] Record technical demo video (2-3 min)
- [ ] Deploy frontend (Vercel) + backend (Railway/Render)
- [ ] Submit to Colosseum Arena

### Must Have (MVP)
- [ ] Guardian Program on devnet (register, pause, resume)
- [ ] Sentinel with at least 2 invariant types (withdrawal rate + TVL drop)
- [ ] Auto-pause working end-to-end
- [ ] Telegram alerts
- [ ] Dashboard with real-time monitoring
- [ ] Drift hack replay demo
- [ ] Pitch video + technical demo video

### Nice to Have
- [ ] Discord webhook alerts
- [ ] More invariant types (oracle manipulation, flash loan detection)
- [ ] Incident timeline page with detailed TX breakdown
- [ ] Multiple protocol monitoring simultaneously
- [ ] Full session token auth management
