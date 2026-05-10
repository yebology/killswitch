# Implementation Plan: Killswitch Backend (Sentinel Service)

## Overview

Implementasi Sentinel Service menggunakan **Python 3.12+ dan FastAPI** mengikuti clean architecture. Tasks disusun secara incremental — setiap task membangun di atas task sebelumnya, dimulai dari infrastructure foundation hingga wiring semua komponen. Scope di-trim untuk hackathon: 3 entitas (Protocol, Invariant, Incident), Telegram only alerts, wallet-based auth (simplified), POST+GET invariant only, severity escalation, dan adjustable replay parameters.

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (Python 3.12+) |
| ORM | SQLAlchemy 2.0 (async) + Alembic |
| Database | PostgreSQL |
| Async | asyncio + uvicorn |
| Solana SDK | solders + solana-py |
| WebSocket | FastAPI WebSocket |
| Telegram | httpx (async HTTP client) |
| Validation | Pydantic v2 |
| Testing | pytest + hypothesis |
| Auth | ed25519 via solders/nacl |

## Tasks

- [x] 1. Infrastructure Foundation
  - [x] 1.1 Init Python project dan install dependencies
    - Buat `backend/requirements.txt` dengan: fastapi, uvicorn[standard], sqlalchemy[asyncio], asyncpg, alembic, pydantic-settings, httpx, websockets, solders, solana, python-dotenv, hypothesis, pytest, pytest-asyncio, pytest-mock
    - Buat `backend/pyproject.toml` atau `backend/setup.cfg` untuk project metadata
    - _Requirements: 1.1_

  - [x] 1.2 Create `backend/app/core/config.py` — Pydantic Settings config
    - Buat Settings class (BaseSettings) dengan semua env vars: app_port, postgres_user, postgres_password, postgres_db, db_host, db_port, solana_rpc_url, solana_ws_url, guardian_program_id, sentinel_keypair, telegram_bot_token, telegram_chat_id, allowed_origins
    - Property `database_url` untuk async SQLAlchemy connection string (postgresql+asyncpg://...)
    - Property `cors_origins` untuk parsed CORS origins list
    - Pydantic-settings otomatis terminate dengan descriptive error jika required var missing
    - _Requirements: 1.1, 1.2_

  - [x] 1.3 Create `backend/app/core/exceptions.py` — Custom exception classes
    - Implement AppError(HTTPException) dengan status_code, message, details
    - Implement global exception handler untuk FastAPI app
    - _Requirements: 15.4_

  - [x] 1.4 Create `backend/app/constants.py` — Invariant types, errors, success messages
    - Define INVARIANT_TYPES set: {"WITHDRAWAL_RATE", "TVL_DROP", "ADMIN_ACTION", "", ""}
    - Define error message constants dan success message constants
    - _Requirements: 6.2_

  - [x] 1.5 Create `backend/app/api/response.py` — API response envelope helpers
    - Implement APIResponse Pydantic model (status, message, data)
    - Implement success_response() dan error_response() helper functions
    - _Requirements: 14.2, 14.3_

  - [ ]* 1.6 Write property test for config loader (Property 1: Missing Config Error Identification)
    - **Property 1: Missing Config Error Identification**
    - Test bahwa menghapus required env var menghasilkan ValidationError yang menyebut nama var
    - **Validates: Requirements 1.2**

- [x] 2. Database Setup dan Models
  - [x] 2.1 Create `backend/app/core/database.py` — SQLAlchemy async engine + session
    - Buat Base (DeclarativeBase), async engine, async_sessionmaker
    - Implement init_db() untuk inisialisasi engine
    - Implement get_session() sebagai FastAPI dependency (async generator)
    - _Requirements: 1.3_

  - [x] 2.2 Create `backend/app/models/protocol.py` — Protocol SQLAlchemy model
    - Fields: id (UUID PK, default uuid4), program_address (String(64), unique, not null, indexed), name (String(255), not null), guardian_wallet (String(64), not null, indexed), telegram_chat_id (String(64), nullable), status (String(20), default "active"), created_at (DateTime, server_default now)
    - Relationships: invariants (one-to-many, cascade delete), incidents (one-to-many, cascade delete)
    - _Requirements: 3.1_

  - [x] 2.3 Create `backend/app/models/invariant.py` — Invariant SQLAlchemy model
    - Fields: id (UUID PK), protocol_id (FK to protocols.id, cascade delete), type (String(50), not null), threshold (Float, not null), time_window (Integer, not null), action (String(20), not null), enabled (Boolean, default True)
    - Relationship: protocol (many-to-one)
    - _Requirements: 3.2_

  - [x] 2.4 Create `backend/app/models/incident.py` — Incident SQLAlchemy model
    - Fields: id (UUID PK), protocol_id (FK), invariant_id (FK), trigger_time (DateTime, not null), tx_hashes (JSONB, default list), action_taken (String(20), not null), damage_estimate (Float, default 0.0), escalation_reason (Text, nullable)
    - Relationships: protocol (many-to-one), invariant (many-to-one)
    - _Requirements: 3.3_

  - [x] 2.5 Create `backend/app/models/__init__.py` — Export all models
    - Import Protocol, Invariant, Incident untuk Alembic auto-detection
    - _Requirements: 2.1_

  - [x] 2.6 Setup Alembic migrations
    - `alembic init backend/alembic`
    - Configure `alembic.ini` dan `alembic/env.py` untuk async SQLAlchemy
    - Generate initial migration: `alembic revision --autogenerate -m "initial"`
    - _Requirements: 2.1_

  - [x] 2.7 Create `backend/seeds/seed.py` — Seed sample data
    - Seed sample Protocol (program address, name, guardian wallet, telegram_chat_id)
    - Seed sample Invariants (WITHDRAWAL_RATE + TVL_DROP dengan default thresholds)
    - Async function yang bisa dipanggil dari CLI
    - _Requirements: 2.2, 2.3_

  - [ ]* 2.8 Write property test for entity round-trip (Property 2: Entity Database Round-Trip)
    - **Property 2: Entity Database Round-Trip**
    - Test save + read untuk Protocol, Invariant, Incident (termasuk dengan/tanpa escalation_reason)
    - Gunakan hypothesis strategies untuk generate random valid entities
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Pydantic Schemas (Request/Response DTOs)
  - [x] 4.1 Create `backend/app/schemas/requests.py` — Request schemas
    - RegisterProtocolRequest: program_address (str, min 1, max 64), name (str, min 1, max 255), telegram_chat_id (str | None)
    - CreateInvariantRequest: type (Literal[5 types]), threshold (float, gt=0), time_window (int, gt=0), action (Literal["pause", "alert"])
    - VerifyWalletRequest: wallet_address (str), message (str), signature (str, Base58-encoded)
    - SimulationParams: withdrawal_rate_threshold (float | None), withdrawal_rate_window (int | None), tvl_drop_threshold (float | None), tvl_drop_window (int | None)
    - _Requirements: 4.1, 5.1, 6.1, 13.2_

  - [x] 4.2 Create `backend/app/schemas/responses.py` — Response schemas
    - ProtocolResponse (model_config from_attributes=True), InvariantResponse, AuthResponse
    - SimulationResult: timeline (list[SimulationEvent]), damage_with_killswitch, damage_without ($285M), amount_saved, rules_used
    - SimulationEvent: timestamp, event_type, description, tx_details, eval_result, threat_level, response_action, cumulative_drain
    - APIResponse: status, message, data (Any)
    - _Requirements: 5.3, 5.4, 6.5, 13.3, 13.5_

- [x] 5. Repository Implementations
  - [x] 5.1 Create `backend/app/repositories/protocol.py`
    - Implement ProtocolRepository dengan AsyncSession dependency
    - Methods: create, find_by_id, find_by_guardian_wallet, find_by_program_address, find_all_active, update_status
    - Gunakan SQLAlchemy async select/insert statements
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 5.2 Create `backend/app/repositories/invariant.py`
    - Implement InvariantRepository dengan AsyncSession dependency
    - Methods: create, find_by_id, find_by_protocol_id, find_enabled_by_protocol_id
    - _Requirements: 6.1, 6.5_

  - [x] 5.3 Create `backend/app/repositories/incident.py`
    - Implement IncidentRepository dengan AsyncSession dependency
    - Methods: create, find_by_id, find_by_protocol_id
    - _Requirements: 10.4_

- [x] 6. External Clients
  - [x] 6.1 Create `backend/app/clients/geyser.py` — Geyser/WebSocket TX stream client
    - Async WebSocket connection ke SOLANA_WS_URL menggunakan `websockets` library
    - Subscribe/unsubscribe per program address
    - Parse transaction data (instruction type, accounts, amounts)
    - ParsedTransaction dataclass: hash, program_address, instruction_type, amount, accounts, timestamp
    - Reconnect setelah 5 detik (asyncio.sleep) jika connection lost
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 6.2 Create `backend/app/clients/solana.py` — Solana RPC client
    - Async client menggunakan solders + solana-py
    - trigger_pause: construct + sign + send trigger_pause TX ke Guardian Program
    - resume: construct + send resume TX
    - Sign dengan SENTINEL_KEYPAIR (parsed via solders.Keypair)
    - _Requirements: 10.1, 10.2, 10.6_

  - [x] 6.3 Create `backend/app/clients/telegram.py` — Telegram Bot API client
    - Async HTTP client menggunakan httpx
    - send_message: POST ke https://api.telegram.org/bot{token}/sendMessage
    - _Requirements: 11.1_

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Core Services — Protocol, Invariant, Incident
  - [x] 8.1 Create `backend/app/services/protocol.py` — Protocol service
    - register_protocol: create protocol dengan guardian_wallet dari authenticated user
    - get_protocol: get by ID, verify ownership via guardian_wallet
    - list_protocols: list by guardian_wallet
    - resume_protocol: verify ownership → call Solana client resume → update status to "active"
    - Raise HTTPException(409) untuk duplicate program_address
    - Raise HTTPException(404) untuk not found
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 10.6, 10.7_

  - [ ]* 8.2 Write property tests for Protocol service
    - **Property 4: Protocol Ownership Isolation**
    - **Property 5: Protocol Address Uniqueness**
    - Gunakan hypothesis untuk generate random wallets dan program addresses
    - **Validates: Requirements 4.4, 5.2, 5.3**

  - [x] 8.3 Create `backend/app/services/invariant.py` — Invariant service
    - create_invariant: validate type (Pydantic Literal handles this), validate threshold > 0 (Pydantic gt=0), create record
    - list_invariants: list by protocol ID
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 8.4 Write property test for Invariant validation (Property 6: Invariant Input Validation)
    - **Property 6: Invariant Input Validation**
    - Test valid types succeed, invalid types fail, threshold <= 0 fails
    - **Validates: Requirements 6.2, 6.3, 6.4**

  - [x] 8.5 Create `backend/app/services/incident.py` — Incident service
    - create_incident: create incident record dengan tx_hashes, action_taken, damage_estimate, escalation_reason
    - _Requirements: 10.4_

- [x] 9. Core Services — Evaluator with Severity Escalation
  - [x] 9.1 Create `backend/app/services/evaluator.py` — Invariant evaluation engine
    - Strategy pattern: dict mapping invariant type → async evaluation function
    - WITHDRAWAL_RATE: sum withdrawals in time_window, compare threshold
    - TVL_DROP: calculate % TVL change in time_window, compare threshold
    - ADMIN_ACTION: detect admin/authority instruction changes
    - : compare individual tx amount vs threshold
    - : detect safety parameter modifications
    - Return RuleResult dataclass per rule
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x] 9.2 Implement severity escalation logic in evaluator
    - Calculate warning count (measured_value > 50% * threshold)
    - Classify threat level: LOW (0), ELEVATED (1), HIGH (2+), CRITICAL (breach/escalation)
    - Auto-escalate: 2+ warnings → CRITICAL
    - Auto-escalate: ADMIN_ACTION/ + any warning → CRITICAL
    - Return EvaluationResult dataclass dengan all contributing rule IDs dan escalation_reason
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 9.3 Write property tests for Evaluator
    - **Property 7: WITHDRAWAL_RATE Evaluation Correctness**
    - **Property 8: TVL_DROP Evaluation Correctness**
    - **Property 9:  Evaluation Correctness**
    - Gunakan hypothesis @given() dengan float/list strategies
    - **Validates: Requirements 8.2, 8.3, 8.5**

  - [ ]* 9.4 Write property test for severity escalation (Property 10)
    - **Property 10: Severity Escalation and Threat Level Classification**
    - Generate random sets of RuleResults, verify threat level classification
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [x] 10. Core Services — Circuit Breaker, Telegram Dispatcher, Simulator
  - [x] 10.1 Create `backend/app/services/circuit_breaker.py` — Circuit breaker service
    - trigger_pause: call Solana client → update protocol status to "paused" → create incident record
    - Handle on-chain TX failure: log error + dispatch emergency Telegram alert
    - resume: call Solana client → update protocol status to "active"
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 10.2 Create `backend/app/services/telegram.py` — Telegram alert dispatcher
    - dispatch_incident_alert: format message (protocol name, incident type, invariant details, action, damage, timestamp)
    - dispatch_escalation_alert: include escalation_reason dan contributing rules
    - dispatch_emergency_alert: for circuit breaker failures
    - Log failure jika Telegram API call gagal (logging.error)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 10.3 Write property test for Telegram message completeness (Property 11)
    - **Property 11: Telegram Alert Message Completeness**
    - Generate random incidents/protocols, verify message contains all required fields
    - **Validates: Requirements 11.2, 11.3**

  - [x] 10.4 Create `backend/app/services/simulator.py` — Drift hack replay engine
    - run_drift_simulation: accept SimulationParams (optional fields, use defaults if None)
    - Defaults: withdrawal_rate_threshold=$5M, withdrawal_rate_window=60s, tvl_drop_threshold=10%, tvl_drop_window=300s
    - Replay pre-configured Drift hack timeline events through evaluator
    - Return SimulationResult: timeline + summary (damage with/without Killswitch, amount saved, rules used)
    - Timeline events: admin key change, parameter modification, progressive withdrawals, circuit breaker trigger, alert dispatch
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 10.5 Write property test for simulation output (Property 12)
    - **Property 12: Simulation Output Correctness**
    - Verify: amount_saved = damage_without - damage_with_killswitch, timeline entries complete
    - **Validates: Requirements 13.2, 13.3, 13.5**

- [x] 11. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Auth — Security Utilities, Dependency, Route
  - [x] 12.1 Create `backend/app/core/security.py` — Ed25519 signature verification
    - verify_signature(wallet_address, message, signature) → bool
    - Gunakan solders atau nacl untuk ed25519 verification
    - Decode Base58 signature dan public key
    - _Requirements: 4.1_

  - [x] 12.2 Create `backend/app/api/deps.py` — FastAPI dependencies
    - get_current_wallet: extract wallet address dari request header, verify against guardian_wallets
    - get_db_session: yield AsyncSession dari session factory
    - get_protocol_service, get_invariant_service, get_simulator_service: factory dependencies
    - Raise HTTPException(401) jika wallet invalid atau bukan guardian
    - _Requirements: 4.4_

  - [x] 12.3 Create `backend/app/api/routes/auth.py` — Auth router
    - POST /api/auth/verify: verify wallet signature via security.verify_signature, return AuthResponse
    - Return 401 jika signature invalid
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 12.4 Write property test for ed25519 verification (Property 3)
    - **Property 3: Ed25519 Signature Verification**
    - Generate random keypairs + messages, sign, verify. Also test corrupted signatures fail.
    - **Validates: Requirements 4.1, 4.2**

- [x] 13. API Routes (Handlers)
  - [x] 13.1 Create `backend/app/api/routes/protocol.py` — Protocol router
    - POST /api/protocols: register protocol (Depends get_current_wallet, body: RegisterProtocolRequest)
    - GET /api/protocols: list protocols by guardian wallet
    - GET /api/protocols/{id}: get protocol detail + invariants
    - POST /api/protocols/{id}/resume: resume paused protocol
    - Semua route protected via Depends(get_current_wallet)
    - Return APIResponse envelope via success_response/error_response helpers
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 10.6_

  - [x] 13.2 Create `backend/app/api/routes/invariant.py` — Invariant router
    - POST /api/protocols/{id}/invariants: add invariant rule (body: CreateInvariantRequest)
    - GET /api/protocols/{id}/invariants: list invariant rules
    - Protected via Depends(get_current_wallet)
    - _Requirements: 6.1, 6.3, 6.4, 6.5_

  - [x] 13.3 Create `backend/app/api/routes/simulate.py` — Simulation router
    - GET /api/simulate/drift: run Drift hack replay (query params: SimulationParams)
    - No auth required (public endpoint)
    - _Requirements: 13.1, 13.2, 13.6_

  - [x] 13.4 Create `backend/app/api/routes/health.py` — Health check router
    - GET /api/health: return status "ok" + timestamp, no auth
    - _Requirements: 14.1_

  - [ ]* 13.5 Write property test for API response envelope (Property 13)
    - **Property 13: API Response Envelope Consistency**
    - Test success responses have status="success" + data, error responses have status="error" + data=null
    - **Validates: Requirements 14.2, 14.3**

- [x] 14. WebSocket Manager
  - [x] 14.1 Create `backend/app/ws/manager.py` — WebSocket connection manager
    - Per-protocol client management (dict[UUID, set[WebSocket]])
    - connect: accept + register WebSocket for protocol_id
    - disconnect: remove WebSocket from protocol subscription
    - broadcast_to_protocol: send JSON message to all clients for a protocol
    - Handle disconnected clients gracefully (remove on send failure)
    - asyncio.Lock untuk thread-safe access
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 14.2 Create `backend/app/ws/routes.py` — WebSocket route
    - ws://host/ws?protocol_id=ID
    - Accept WebSocket connection, register with manager
    - Keep-alive loop, handle disconnect
    - _Requirements: 12.1_

- [x] 15. Sentinel Service (Orchestrator)
  - [x] 15.1 Create `backend/app/services/sentinel.py` — Sentinel monitoring loop
    - start: load active protocols → subscribe to Geyser → register on_transaction callback
    - on_transaction: match to protocol → evaluate via Evaluator → handle result
    - If CRITICAL + action "pause": trigger circuit breaker → create incident → dispatch Telegram → broadcast WS
    - If breach + action "alert": dispatch Telegram → broadcast WS
    - If pass: broadcast TX + threat level via WS
    - stop: cancel asyncio.Task → close Geyser connection
    - Jalankan sebagai asyncio.Task (background task)
    - _Requirements: 7.1, 7.2, 7.4, 8.1, 9.3, 10.1, 11.1, 11.5, 12.2, 12.3_

- [x] 16. Application Wiring dan Entry Point
  - [x] 16.1 Create `backend/app/api/routes/__init__.py` — Route aggregator
    - Import dan include semua routers (auth, protocol, invariant, simulate, health)
    - Create main api_router yang includes semua sub-routers dengan prefix /api
    - _Requirements: 15.2_

  - [x] 16.2 Create `backend/app/api/middleware.py` — CORS dan exception handlers
    - Configure CORSMiddleware dengan allowed_origins dari Settings
    - Register global exception handler untuk AppError → APIResponse envelope
    - _Requirements: 1.5, 15.4_

  - [x] 16.3 Create `backend/main.py` — FastAPI application entry point
    - Create FastAPI app instance
    - Add CORS middleware
    - Include api_router
    - Lifespan handler: init_db → run Alembic migrations → start Sentinel as background task
    - Shutdown handler: stop Sentinel → close DB engine
    - Uvicorn runner: `uvicorn main:app --host 0.0.0.0 --port {APP_PORT}`
    - _Requirements: 1.3, 1.4, 1.5, 15.2, 15.3_

- [x] 17. Docker dan Environment Setup
  - [x] 17.1 Create `backend/Dockerfile` dan `backend/docker-compose.yml`
    - Dockerfile: Python 3.12 slim base, pip install requirements, copy app, uvicorn entrypoint
    - docker-compose: PostgreSQL service + backend service + volume for DB data
    - _Requirements: 1.1_

  - [x] 17.2 Create `backend/.env.example` — Environment variable template
    - Document semua required env vars dengan contoh values
    - _Requirements: 1.1_

- [x] 18. CLI Commands dan Utilities
  - [x] 18.1 Create `backend/seeds/__init__.py` dan update seed script
    - Async seed function yang bisa dipanggil via `python -m seeds.seed`
    - Load config → connect DB → run seed → close
    - _Requirements: 2.2, 2.3_

  - [x] 18.2 Create `backend/Makefile` — Development commands
    - Targets: help, install, dev, build, test, lint, clean, migrate, seed, docker-up, docker-down
    - `make dev` → uvicorn main:app --reload
    - `make test` → pytest tests/ -v
    - `make migrate` → alembic upgrade head
    - `make seed` → python -m seeds.seed
    - _Requirements: 15.3_

- [x] 19. Test Configuration
  - [x] 19.1 Create `backend/tests/conftest.py` — Shared pytest fixtures
    - Async database session fixture (SQLite in-memory atau test PostgreSQL)
    - FastAPI TestClient fixture
    - Mock client fixtures (Geyser, Solana, Telegram)
    - Sample data fixtures (protocol, invariant, incident)
    - pytest-asyncio configuration
    - _Requirements: Testing infrastructure_

  - [x] 19.2 Create `backend/pytest.ini` atau `backend/pyproject.toml` [tool.pytest] — pytest config
    - Configure asyncio_mode = "auto"
    - Configure test paths
    - Configure hypothesis settings (max_examples=100)
    - _Requirements: Testing infrastructure_

- [x] 20. Final Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks bertanda `*` bersifat optional dan bisa di-skip untuk MVP yang lebih cepat
- Setiap task mereferensikan requirements spesifik (1-15) untuk traceability
- Checkpoints memastikan validasi incremental
- Property tests menggunakan hypothesis library dengan @given() decorator dan minimum 100 examples
- Unit tests menggunakan pytest dengan AAA pattern (Arrange-Act-Assert)
- Pydantic v2 handles banyak validasi secara otomatis (type checking, gt=0, Literal types) — mengurangi boilerplate
- FastAPI Depends() menggantikan manual DI container — lebih deklaratif dan type-safe
- Semua database operations async via SQLAlchemy 2.0 async API
- Alembic menggantikan GORM auto-migrate — version-controlled migrations
- Scope di-trim: 3 entitas saja, Telegram only, POST+GET invariant, wallet-based auth simplified, severity escalation, adjustable simulation