# Implementation Plan: Killswitch Backend (Sentinel Service)

## Overview

Implementasi Sentinel Service menggunakan Go + Fiber mengikuti clean architecture. Tasks disusun secara incremental — setiap task membangun di atas task sebelumnya, dimulai dari infrastructure foundation hingga wiring semua komponen. Scope di-trim untuk hackathon: 3 entitas (Protocol, Invariant, Incident), Telegram only alerts, wallet-based auth (simplified), POST+GET invariant only, severity escalation, dan adjustable simulation parameters.

## Tasks

- [ ] 1. Infrastructure Foundation
  - [ ] 1.1 Init Go module dan install dependencies (fiber, gorm, postgres driver, uuid, godotenv, gorilla/websocket, solana-go, rapid)
    - Buat `backend/go.mod` dengan semua dependencies
    - _Requirements: 1.1_

  - [ ] 1.2 Create `backend/config/config.go` — Environment config loader
    - Load semua env vars: APP_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, DB_HOST, DB_PORT, SOLANA_RPC_URL, SOLANA_WS_URL, GUARDIAN_PROGRAM_ID, SENTINEL_KEYPAIR, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, ALLOWED_ORIGINS
    - Terminate dengan descriptive error jika required var missing
    - _Requirements: 1.1, 1.2_

  - [ ] 1.3 Create `backend/pkg/error.go` — AppError type
    - Implement AppError struct dengan StatusCode, Message, Details
    - Implement NewAppError dan NewAppErrorWithDetails constructors
    - _Requirements: 15.4_

  - [ ] 1.4 Create `backend/constants/` — invariants.go, error.go, success.go
    - Define invariant type constants: WITHDRAWAL_RATE, TVL_DROP, ADMIN_KEY_CHANGE, SINGLE_TX_SIZE, PARAMETER_CHANGE
    - Define error message constants dan success message constants
    - _Requirements: 6.2_

  - [ ] 1.5 Create `backend/app/output/response.go` — API response envelope
    - Implement APIResponse struct (status, message, data)
    - Implement Success() dan Error() helper functions
    - _Requirements: 14.2, 14.3_

  - [ ]* 1.6 Write property test for config loader (Property 1: Missing Config Error Identification)
    - **Property 1: Missing Config Error Identification**
    - **Validates: Requirements 1.2**

- [ ] 2. Database Entities and Migrations
  - [ ] 2.1 Create `backend/app/entities/protocol.go` — Protocol entity
    - Fields: id (UUID PK), program_address (unique, required), name (required), guardian_wallet (required, indexed), telegram_chat_id, status (default "active"), created_at
    - GORM associations: has many Invariants, has many Incidents
    - _Requirements: 3.1_

  - [ ] 2.2 Create `backend/app/entities/invariant.go` — Invariant entity
    - Fields: id (UUID PK), protocol_id (FK), type (required), threshold (float64, required), time_window (int, required), action (required: "pause"/"alert"), enabled (default true)
    - _Requirements: 3.2_

  - [ ] 2.3 Create `backend/app/entities/incident.go` — Incident entity
    - Fields: id (UUID PK), protocol_id (FK), invariant_id (FK), trigger_time, tx_hashes (JSONB), action_taken, damage_estimate, escalation_reason (nullable)
    - _Requirements: 3.3_

  - [ ] 2.4 Create `backend/migrations/migrations.go` — Auto-migrate all 3 entities
    - Auto-migrate Protocol, Invariant, Incident ke PostgreSQL via GORM
    - _Requirements: 2.1_

  - [ ] 2.5 Create `backend/migrations/seed.go` — Seed sample data
    - Seed sample Protocol (program address, name, guardian wallet, telegram_chat_id)
    - Seed sample Invariants (WITHDRAWAL_RATE + TVL_DROP dengan default thresholds)
    - _Requirements: 2.2, 2.3_

  - [ ]* 2.6 Write property test for entity round-trip (Property 2: Entity Database Round-Trip)
    - **Property 2: Entity Database Round-Trip**
    - Test save + read untuk Protocol, Invariant, Incident (termasuk dengan/tanpa escalation_reason)
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Interface Definitions
  - [ ] 4.1 Create repository interfaces di `backend/app/interfaces/`
    - IProtocolRepository: Create, FindByID, FindByGuardianWallet, FindByProgramAddress, FindAllActive, UpdateStatus
    - IInvariantRepository: Create, FindByID, FindByProtocolID, FindEnabledByProtocolID
    - IIncidentRepository: Create, FindByID, FindByProtocolID
    - _Requirements: 5, 6, 10_

  - [ ] 4.2 Create client interfaces di `backend/app/interfaces/`
    - IGeyserClient: Connect, Subscribe, Unsubscribe, OnTransaction, Reconnect, Close
    - ISolanaClient: TriggerPause, Resume, GetAccountInfo
    - ITelegramClient: SendMessage
    - ParsedTransaction struct: Hash, ProgramAddress, InstructionType, Amount, Accounts, Timestamp
    - _Requirements: 7, 10, 11_

  - [ ] 4.3 Create service interfaces di `backend/app/interfaces/`
    - IProtocolService: RegisterProtocol, GetProtocol, ListProtocols, ResumeProtocol
    - IInvariantService: CreateInvariant, ListInvariants
    - IEvaluator: Evaluate (returns EvaluationResult with ThreatLevel, BreachedRules, EscalationReason)
    - ICircuitBreaker: TriggerPause, Resume
    - ITelegramDispatcher: DispatchIncidentAlert, DispatchEscalationAlert, DispatchEmergencyAlert
    - ISentinel: Start, Stop, AddProtocol, RemoveProtocol
    - ISimulator: RunDriftSimulation
    - _Requirements: 5, 6, 8, 9, 10, 11, 13_

- [ ] 5. DTO Definitions
  - [ ] 5.1 Create request DTOs di `backend/app/dto/requests/`
    - RegisterProtocolRequest: program_address, name, telegram_chat_id
    - CreateInvariantRequest: type, threshold, time_window, action (dengan validation tags)
    - VerifyWalletRequest: wallet_address, message, signature
    - SimulationParams: withdrawal_rate_threshold, withdrawal_rate_window, tvl_drop_threshold, tvl_drop_window (semua optional query params)
    - _Requirements: 4.1, 5.1, 6.1, 13.2_

  - [ ] 5.2 Create response DTOs di `backend/app/dto/responses/`
    - ProtocolResponse, InvariantResponse, AuthResponse
    - SimulationResult: timeline array, damage_with_killswitch, damage_without ($285M), amount_saved, rules_used
    - SimulationEvent: timestamp, event_type, description, tx_details, eval_result, threat_level, response_action, cumulative_drain
    - _Requirements: 5.3, 5.4, 6.5, 13.3, 13.5_

- [ ] 6. Repository Implementations
  - [ ] 6.1 Create `backend/app/repositories/protocol.go`
    - Implement IProtocolRepository: Create, FindByID, FindByGuardianWallet, FindByProgramAddress, FindAllActive, UpdateStatus
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 6.2 Create `backend/app/repositories/invariant.go`
    - Implement IInvariantRepository: Create, FindByID, FindByProtocolID, FindEnabledByProtocolID
    - _Requirements: 6.1, 6.5_

  - [ ] 6.3 Create `backend/app/repositories/incident.go`
    - Implement IIncidentRepository: Create, FindByID, FindByProtocolID
    - _Requirements: 10.4_

- [ ] 7. External Clients
  - [ ] 7.1 Create `backend/app/clients/geyser.go` — Geyser/WebSocket TX stream client
    - WebSocket connection ke SOLANA_WS_URL
    - Subscribe/unsubscribe per program address
    - Parse transaction data (instruction type, accounts, amounts)
    - Reconnect setelah 5 detik jika connection lost
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 7.2 Create `backend/app/clients/solana.go` — Solana RPC client
    - TriggerPause: construct + sign + send trigger_pause TX ke Guardian Program
    - Resume: construct + send resume TX
    - Sign dengan SENTINEL_KEYPAIR
    - _Requirements: 10.1, 10.2, 10.6_

  - [ ] 7.3 Create `backend/app/clients/telegram.go` — Telegram Bot API client
    - SendMessage: kirim pesan ke chat ID via Telegram Bot API
    - _Requirements: 11.1_

- [ ] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Core Services — Protocol, Invariant, Incident
  - [ ] 9.1 Create `backend/app/services/protocol.go` — Protocol service
    - RegisterProtocol: create protocol dengan guardian_wallet dari authenticated user
    - GetProtocol: get by ID, verify ownership via guardian_wallet
    - ListProtocols: list by guardian_wallet
    - ResumeProtocol: verify ownership → call Solana client resume → update status to "active"
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 10.6, 10.7_

  - [ ]* 9.2 Write property tests for Protocol service
    - **Property 4: Protocol Ownership Isolation**
    - **Property 5: Protocol Address Uniqueness**
    - **Validates: Requirements 4.4, 5.2, 5.3**

  - [ ] 9.3 Create `backend/app/services/invariant.go` — Invariant service
    - CreateInvariant: validate type (5 supported types), validate threshold > 0, create record
    - ListInvariants: list by protocol ID
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 9.4 Write property test for Invariant validation (Property 6: Invariant Input Validation)
    - **Property 6: Invariant Input Validation**
    - **Validates: Requirements 6.2, 6.3, 6.4**

  - [ ] 9.5 Create `backend/app/services/incident.go` — Incident service
    - CreateIncident: create incident record dengan tx_hashes, action_taken, damage_estimate, escalation_reason
    - _Requirements: 10.4_

- [ ] 10. Core Services — Evaluator with Severity Escalation
  - [ ] 10.1 Create `backend/app/services/evaluator.go` — Invariant evaluation engine
    - Strategy pattern: map invariant type → evaluation function
    - WITHDRAWAL_RATE: sum withdrawals in time_window, compare threshold
    - TVL_DROP: calculate % TVL change in time_window, compare threshold
    - ADMIN_KEY_CHANGE: detect admin/authority instruction changes
    - SINGLE_TX_SIZE: compare individual tx amount vs threshold
    - PARAMETER_CHANGE: detect safety parameter modifications
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [ ] 10.2 Implement severity escalation logic in evaluator
    - Calculate warning count (measured value > 50% threshold)
    - Classify threat level: LOW (0), ELEVATED (1), HIGH (2+), CRITICAL (breach/escalation)
    - Auto-escalate: 2+ warnings → CRITICAL
    - Auto-escalate: ADMIN_KEY_CHANGE/PARAMETER_CHANGE + any warning → CRITICAL
    - Return breach result dengan all contributing rule IDs dan escalation_reason
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 10.3 Write property tests for Evaluator
    - **Property 7: WITHDRAWAL_RATE Evaluation Correctness**
    - **Property 8: TVL_DROP Evaluation Correctness**
    - **Property 9: SINGLE_TX_SIZE Evaluation Correctness**
    - **Validates: Requirements 8.2, 8.3, 8.5**

  - [ ]* 10.4 Write property test for severity escalation (Property 10: Severity Escalation and Threat Level Classification)
    - **Property 10: Severity Escalation and Threat Level Classification**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [ ] 11. Core Services — Circuit Breaker, Telegram Dispatcher, Simulator
  - [ ] 11.1 Create `backend/app/services/circuit_breaker.go` — Circuit breaker service
    - TriggerPause: call Solana client → update protocol status to "paused" → create incident record
    - Handle on-chain TX failure: log error + dispatch emergency Telegram alert
    - Resume: call Solana client → update protocol status to "active"
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [ ] 11.2 Create `backend/app/services/telegram.go` — Telegram alert dispatcher
    - DispatchIncidentAlert: format message (protocol name, incident type, invariant details, action, damage, timestamp)
    - DispatchEscalationAlert: include escalation_reason dan contributing rules
    - DispatchEmergencyAlert: for circuit breaker failures
    - Log failure jika Telegram API call gagal
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 11.3 Write property test for Telegram message completeness (Property 11)
    - **Property 11: Telegram Alert Message Completeness**
    - **Validates: Requirements 11.2, 11.3**

  - [ ] 11.4 Create `backend/app/services/simulator.go` — Drift hack replay engine
    - RunDriftSimulation: accept optional params (withdrawal_rate_threshold, withdrawal_rate_window, tvl_drop_threshold, tvl_drop_window)
    - Use defaults jika params tidak diberikan ($5M/min, 10%/5min)
    - Replay pre-configured Drift hack timeline events through evaluator
    - Return timeline array + summary (damage with/without Killswitch, amount saved, rules used)
    - Timeline events: admin key change, parameter modification, progressive withdrawals, circuit breaker trigger, alert dispatch
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 11.5 Write property test for simulation output (Property 12: Simulation Output Correctness)
    - **Property 12: Simulation Output Correctness**
    - **Validates: Requirements 13.2, 13.3, 13.5**

- [ ] 12. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Auth Middleware and Handler
  - [ ] 13.1 Create `backend/utils/crypto.go` — Ed25519 signature verification utility
    - Verify ed25519 signature against wallet address dan message
    - _Requirements: 4.1_

  - [ ] 13.2 Create `backend/app/middleware/auth.go` — Wallet auth middleware
    - Verify wallet address dari request header
    - Check wallet against registered guardian_wallets
    - Return 401 jika invalid
    - _Requirements: 4.4_

  - [ ] 13.3 Create `backend/app/handlers/auth.go` — Auth handler
    - POST /api/auth/verify: verify wallet signature, return wallet address as identity
    - Return 401 jika signature invalid
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 13.4 Write property test for ed25519 verification (Property 3)
    - **Property 3: Ed25519 Signature Verification**
    - **Validates: Requirements 4.1, 4.2**

- [ ] 14. HTTP Handlers
  - [ ] 14.1 Create `backend/app/handlers/protocol.go` — Protocol handler
    - POST /api/protocols: register protocol (program_address, name, telegram_chat_id)
    - GET /api/protocols: list protocols by guardian wallet
    - GET /api/protocols/:id: get protocol detail + invariants
    - POST /api/protocols/:id/resume: resume paused protocol
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 10.6_

  - [ ] 14.2 Create `backend/app/handlers/invariant.go` — Invariant handler
    - POST /api/protocols/:id/invariants: add invariant rule
    - GET /api/protocols/:id/invariants: list invariant rules
    - _Requirements: 6.1, 6.3, 6.4, 6.5_

  - [ ] 14.3 Create `backend/app/handlers/simulate.go` — Simulation handler
    - GET /api/simulate/drift: run Drift hack simulation (with optional query params)
    - No auth required
    - _Requirements: 13.1, 13.2, 13.6_

  - [ ] 14.4 Create health check handler
    - GET /api/health: return status "ok" + timestamp, no auth
    - _Requirements: 14.1_

  - [ ]* 14.5 Write property test for API response envelope (Property 13: API Response Envelope Consistency)
    - **Property 13: API Response Envelope Consistency**
    - **Validates: Requirements 14.2, 14.3**

- [ ] 15. Route Registration
  - [ ] 15.1 Create route files di `backend/app/http/`
    - auth.go: POST /api/auth/verify (public)
    - protocol.go: POST/GET /api/protocols, GET /api/protocols/:id, POST /api/protocols/:id/resume (protected)
    - invariant.go: POST/GET /api/protocols/:id/invariants (protected)
    - simulate.go: GET /api/simulate/drift (public)
    - Health check route (public)
    - WebSocket route (public)
    - _Requirements: 15.2_

- [ ] 16. WebSocket Hub
  - [ ] 16.1 Create `backend/app/ws/hub.go` — WebSocket hub
    - Per-protocol client management (map protocol_id → set of clients)
    - BroadcastToProtocol: send message to all clients subscribed to a protocol
    - Handle register/unregister/disconnect
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ] 16.2 Create `backend/app/ws/handler.go` — WebSocket upgrade handler
    - Accept protocol_id query parameter
    - Upgrade HTTP connection to WebSocket
    - Register client with hub
    - _Requirements: 12.1_

- [ ] 17. Sentinel Service (Orchestrator)
  - [ ] 17.1 Create `backend/app/services/sentinel.go` — Sentinel monitoring loop
    - Start: load active protocols → subscribe to Geyser → register onTransaction callback
    - onTransaction: match to protocol → evaluate via Evaluator → handle result
    - If CRITICAL + action "pause": trigger circuit breaker → create incident → dispatch Telegram → broadcast WS
    - If breach + action "alert": dispatch Telegram → broadcast WS
    - If pass: broadcast TX + threat level via WS
    - Stop: cancel context → close Geyser connection
    - _Requirements: 7.1, 7.2, 7.4, 8.1, 9.3, 10.1, 11.1, 11.5, 12.2, 12.3_

- [ ] 18. DI Container, Router, Entry Point
  - [ ] 18.1 Create `backend/router/container.go` — DI container
    - Initialize in order: config → DB → clients (Geyser, Solana, Telegram) → repos (Protocol, Invariant, Incident) → WS Hub → services → handlers
    - _Requirements: 1.3, 15.1_

  - [ ] 18.2 Create `backend/router/routes.go` — Route setup + sentinel start
    - Register all route groups (public + protected)
    - Start sentinel monitoring loop as background goroutine
    - _Requirements: 15.2, 15.3_

  - [ ] 18.3 Create `backend/main.go` — Entry point
    - Load config → init DB → run migrations → init DI container → setup routes → start Fiber server
    - Configure CORS with ALLOWED_ORIGINS
    - _Requirements: 1.3, 1.4, 1.5_

- [ ] 19. Docker and Environment Setup
  - [ ] 19.1 Create `backend/Dockerfile` dan `backend/docker-compose.yml`
    - Dockerfile: multi-stage build for Go binary
    - docker-compose: PostgreSQL service + backend service
    - _Requirements: 1.1_

  - [ ] 19.2 Create `backend/.env.example` — Environment variable template
    - Document semua required env vars
    - _Requirements: 1.1_

- [ ] 20. CLI Commands and Utilities
  - [ ] 20.1 Create `backend/cmd/seed/main.go` — DB seeder CLI
    - Load config → connect DB → run seed
    - _Requirements: 2.2, 2.3_

  - [ ] 20.2 Create `backend/cmd/simulate/main.go` — CLI simulation runner
    - Run Drift simulation standalone dari command line
    - _Requirements: 13.1_

  - [ ] 20.3 Create `backend/utils/helper.go` dan `backend/utils/math.go`
    - Shared utility functions
    - _Requirements: 15.4_

- [ ] 21. Final Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks bertanda `*` bersifat optional dan bisa di-skip untuk MVP yang lebih cepat
- Setiap task mereferensikan requirements spesifik (1-15) untuk traceability
- Checkpoints memastikan validasi incremental
- Property tests memvalidasi correctness properties universal dari design document
- Unit tests memvalidasi contoh spesifik dan edge cases
- Scope di-trim: 3 entitas saja, Telegram only, POST+GET invariant, wallet-based auth simplified, severity escalation, adjustable simulation
