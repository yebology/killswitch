# Requirements Document — Killswitch Backend (Sentinel Service)

## Introduction

Dokumen ini mendefinisikan requirements untuk **Sentinel Service**, yaitu backend server dari Killswitch — sistem deteksi eksploit real-time dan auto-pause untuk protokol DeFi di Solana. Sentinel Service dibangun menggunakan Go + Fiber dan bertanggung jawab untuk:

- Menerima stream transaksi Solana secara real-time (Geyser/WebSocket)
- Mengevaluasi transaksi terhadap invariant rules yang terdaftar
- Memicu circuit breaker on-chain (Guardian Program) saat threshold dilanggar
- Mengirim alert ke Telegram
- Menyediakan REST API + WebSocket untuk dashboard frontend
- Menyediakan engine simulasi replay serangan Drift hack

Scope dokumen ini mencakup MVP untuk hackathon Solana Frontier, di-trim untuk fokus pada demo path: working circuit breaker end-to-end, Drift simulation, dan Telegram alerts.

## Glossary

- **Sentinel_Service**: Backend server Go + Fiber yang memonitor transaksi Solana secara real-time, mengevaluasi invariant rules, dan memicu aksi protektif
- **Evaluator**: Komponen dalam Sentinel_Service yang memeriksa setiap transaksi terhadap invariant rules yang aktif
- **Circuit_Breaker**: Komponen yang memanggil Guardian Program on-chain untuk memicu pause pada protokol yang dilindungi
- **Alert_Dispatcher**: Komponen yang mengirim notifikasi ke Telegram
- **Guardian_Program**: Smart contract Anchor di Solana yang menyimpan konfigurasi protokol, invariant rules, dan state circuit breaker sebagai PDA
- **Geyser_Client**: Client yang subscribe ke Solana transaction stream secara real-time via Geyser/WebSocket
- **Solana_RPC_Client**: Client untuk berinteraksi dengan Solana blockchain (kirim transaksi, baca akun)
- **Telegram_Client**: Client untuk mengirim pesan alert via Telegram Bot API
- **Protocol**: Entitas yang merepresentasikan program Solana yang terdaftar untuk dimonitor oleh Killswitch
- **Invariant**: Aturan keamanan yang mendefinisikan kondisi yang tidak boleh dilanggar (threshold, time window, aksi)
- **Incident**: Record kejadian saat invariant rule dilanggar, termasuk aksi yang diambil
- **Guardian_Wallet**: Wallet Solana yang memiliki otoritas untuk mengelola protokol di Killswitch (register, resume, configure)
- **WebSocket_Hub**: Komponen yang mengelola koneksi WebSocket per protokol untuk push update real-time ke dashboard
- **DI_Container**: Dependency injection container yang menghubungkan clients → repositories → services → handlers
- **Simulator**: Komponen yang memutar ulang data transaksi historis serangan Drift melalui Evaluator
- **API_Response_Envelope**: Format standar untuk semua response API (`output/response.go`)

## Requirements

### Requirement 1: Konfigurasi dan Inisialisasi Server

**User Story:** Sebagai developer, saya ingin server backend dapat dimulai dengan konfigurasi dari environment variables, sehingga deployment dapat disesuaikan tanpa mengubah kode.

#### Acceptance Criteria

1. WHEN the application starts, THE Sentinel_Service SHALL load configuration from environment variables including APP_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, DB_HOST, DB_PORT, SOLANA_RPC_URL, SOLANA_WS_URL, GUARDIAN_PROGRAM_ID, SENTINEL_KEYPAIR, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, and ALLOWED_ORIGINS
2. IF a required environment variable is missing, THEN THE Sentinel_Service SHALL terminate with a descriptive error message identifying the missing variable
3. WHEN the application starts, THE Sentinel_Service SHALL initialize the DI_Container wiring clients, repositories, services, and handlers in the correct dependency order
4. WHEN the application starts, THE Sentinel_Service SHALL start the Fiber HTTP server on the configured APP_PORT
5. WHEN the application starts, THE Sentinel_Service SHALL configure CORS with the origins specified in ALLOWED_ORIGINS

### Requirement 2: Database Migrasi dan Seed

**User Story:** Sebagai developer, saya ingin database schema otomatis dibuat dan data demo tersedia, sehingga setup development dan demo menjadi mudah.

#### Acceptance Criteria

1. WHEN the application starts, THE Sentinel_Service SHALL auto-migrate all entity schemas (Protocol, Invariant, Incident) to PostgreSQL using GORM
2. WHEN the seed command is executed, THE Sentinel_Service SHALL populate the database with a sample Protocol record including program address, name, guardian wallet, and telegram chat ID
3. WHEN the seed command is executed, THE Sentinel_Service SHALL create sample Invariant records for the seeded Protocol including WITHDRAWAL_RATE and TVL_DROP rules with default thresholds

### Requirement 3: Entitas Database

**User Story:** Sebagai developer, saya ingin model database yang terstruktur untuk menyimpan data protokol, invariant, dan insiden, sehingga semua data monitoring tersimpan dengan relasi yang benar.

#### Acceptance Criteria

1. THE Sentinel_Service SHALL store Protocol records with fields: id (UUID primary key), program_address (string, unique, required), name (string, required), guardian_wallet (string, required), telegram_chat_id (string), status (string, default "active"), and created_at (timestamp)
2. THE Sentinel_Service SHALL store Invariant records with fields: id (UUID primary key), protocol_id (foreign key to Protocol), type (string, required), threshold (float64, required), time_window (integer in seconds, required), action (string, required — "pause" or "alert"), and enabled (boolean, default true)
3. THE Sentinel_Service SHALL store Incident records with fields: id (UUID primary key), protocol_id (foreign key to Protocol), invariant_id (foreign key to Invariant), trigger_time (timestamp), tx_hashes (JSON array of strings), action_taken (string), damage_estimate (float64), and escalation_reason (string, nullable)

### Requirement 4: Autentikasi Berbasis Wallet (Simplified)

**User Story:** Sebagai pemilik protokol, saya ingin login menggunakan wallet Solana saya, sehingga tidak perlu membuat akun atau mengingat password.

#### Acceptance Criteria

1. WHEN a POST request is received at /api/auth/verify with a wallet address, signed message, and signature, THE Sentinel_Service SHALL verify the ed25519 signature against the provided wallet address and message
2. IF the signature verification fails, THEN THE Sentinel_Service SHALL return HTTP 401 with an error message "Invalid wallet signature"
3. WHEN the signature is valid, THE Sentinel_Service SHALL return the wallet address as the authenticated identity
4. WHEN a protected endpoint receives a request, THE Sentinel_Service SHALL verify the wallet address from the request header against registered guardian_wallets

### Requirement 5: Manajemen Protokol

**User Story:** Sebagai pemilik protokol, saya ingin mendaftarkan protokol saya di Killswitch dan melihat statusnya, sehingga program Solana saya dapat dimonitor.

#### Acceptance Criteria

1. WHEN a POST request is received at /api/protocols with program_address, name, and telegram_chat_id, THE Sentinel_Service SHALL create a new Protocol record with status "active" and associate the authenticated wallet as guardian_wallet
2. IF a Protocol with the same program_address already exists, THEN THE Sentinel_Service SHALL return HTTP 409 with an error message "Protocol already registered"
3. WHEN a GET request is received at /api/protocols, THE Sentinel_Service SHALL return a list of all Protocol records associated with the authenticated guardian_wallet
4. WHEN a GET request is received at /api/protocols/:id, THE Sentinel_Service SHALL return the Protocol record including its current status and associated invariant rules

### Requirement 6: Manajemen Invariant Rules

**User Story:** Sebagai pemilik protokol, saya ingin menambahkan aturan keamanan (invariant rules) untuk protokol saya, sehingga Sentinel dapat mendeteksi anomali berdasarkan threshold yang saya tentukan.

#### Acceptance Criteria

1. WHEN a POST request is received at /api/protocols/:id/invariants with type, threshold, time_window, and action, THE Sentinel_Service SHALL create a new Invariant record associated with the specified Protocol
2. THE Sentinel_Service SHALL support the following invariant types: WITHDRAWAL_RATE, TVL_DROP, ADMIN_KEY_CHANGE, SINGLE_TX_SIZE, and PARAMETER_CHANGE
3. IF the invariant type is not one of the supported types, THEN THE Sentinel_Service SHALL return HTTP 400 with an error message "Invalid invariant type"
4. IF the threshold value is zero or negative, THEN THE Sentinel_Service SHALL return HTTP 400 with an error message "Threshold must be a positive number"
5. WHEN a GET request is received at /api/protocols/:id/invariants, THE Sentinel_Service SHALL return a list of all Invariant records for the specified Protocol

### Requirement 7: Geyser/WebSocket Transaction Stream

**User Story:** Sebagai sistem monitoring, saya ingin menerima stream transaksi Solana secara real-time, sehingga setiap transaksi ke program yang terdaftar dapat dievaluasi segera.

#### Acceptance Criteria

1. WHEN the Sentinel_Service starts and at least one Protocol is registered, THE Geyser_Client SHALL establish a WebSocket connection to the Solana transaction stream endpoint configured in SOLANA_WS_URL
2. WHILE the Geyser_Client is connected, THE Geyser_Client SHALL subscribe to transactions targeting the program addresses of all registered and active Protocol records
3. WHEN a new transaction is received from the stream, THE Geyser_Client SHALL parse the transaction data including instruction type, involved accounts, and transfer amounts
4. WHEN a parsed transaction matches a registered Protocol program address, THE Sentinel_Service SHALL forward the transaction to the Evaluator for invariant checking
5. IF the WebSocket connection is lost, THEN THE Geyser_Client SHALL attempt to reconnect after a 5-second delay

### Requirement 8: Evaluasi Invariant

**User Story:** Sebagai sistem keamanan, saya ingin setiap transaksi dievaluasi terhadap semua invariant rules yang aktif, sehingga pelanggaran dapat terdeteksi secara real-time.

#### Acceptance Criteria

1. WHEN a transaction is forwarded to the Evaluator, THE Evaluator SHALL retrieve all enabled Invariant records for the associated Protocol
2. WHEN evaluating a WITHDRAWAL_RATE invariant, THE Evaluator SHALL sum all withdrawal amounts for the Protocol within the configured time_window and compare the total against the threshold
3. WHEN evaluating a TVL_DROP invariant, THE Evaluator SHALL calculate the percentage change in total value locked for the Protocol within the configured time_window and compare the percentage against the threshold
4. WHEN evaluating an ADMIN_KEY_CHANGE invariant, THE Evaluator SHALL detect if the transaction modifies authority or admin keys for the monitored program
5. WHEN evaluating a SINGLE_TX_SIZE invariant, THE Evaluator SHALL compare the individual transaction amount against the threshold
6. WHEN evaluating a PARAMETER_CHANGE invariant, THE Evaluator SHALL detect if the transaction modifies safety parameters (withdrawal limits, collateral ratios) for the monitored program
7. WHEN an invariant evaluation passes, THE Evaluator SHALL return a "pass" result
8. WHEN an invariant evaluation detects a breach, THE Evaluator SHALL return a "breach" result including the breached invariant ID, the measured value, and the threshold value

### Requirement 9: Severity Escalation (Multi-Signal Correlation)

**User Story:** Sebagai sistem keamanan, saya ingin mendeteksi serangan yang melibatkan multiple sinyal mencurigakan bersamaan, sehingga serangan yang "pelan-pelan" (masing-masing rule belum breach) tetap bisa terdeteksi.

#### Acceptance Criteria

1. WHEN the Evaluator completes evaluation of all enabled Invariant rules for a transaction, THE Evaluator SHALL calculate a combined threat level based on the number of rules in warning state (measured value exceeds 50% of threshold)
2. THE Evaluator SHALL classify the combined threat level as: LOW (0 warnings), ELEVATED (1 warning), HIGH (2+ warnings), or CRITICAL (any single rule breach OR escalation trigger)
3. WHEN 2 or more rules are in warning state simultaneously, THE Evaluator SHALL escalate the combined threat level to CRITICAL and trigger the same action as a single rule breach
4. WHEN an ADMIN_KEY_CHANGE or PARAMETER_CHANGE invariant is triggered AND at least 1 other rule is in warning state, THE Evaluator SHALL escalate the combined threat level to CRITICAL
5. WHEN the Evaluator escalates to CRITICAL due to multi-signal correlation, THE Evaluator SHALL return a "breach" result that includes all contributing rule IDs, their measured values, and the escalation reason

### Requirement 10: Circuit Breaker (Auto-Pause On-Chain)

**User Story:** Sebagai sistem proteksi, saya ingin protokol otomatis di-pause on-chain saat threshold dilanggar, sehingga dana terlindungi sebelum kerusakan lebih lanjut terjadi.

#### Acceptance Criteria

1. WHEN the Evaluator returns a "breach" result for an Invariant with action "pause", THE Circuit_Breaker SHALL construct and send a trigger_pause transaction to the Guardian_Program on Solana
2. THE Circuit_Breaker SHALL sign the trigger_pause transaction using the sentinel keypair configured in SENTINEL_KEYPAIR
3. WHEN the trigger_pause transaction is confirmed on-chain, THE Sentinel_Service SHALL update the Protocol status to "paused" in the database
4. WHEN the trigger_pause transaction is confirmed, THE Sentinel_Service SHALL create an Incident record with the trigger_time, breached invariant_id, associated tx_hashes, action_taken as "pause", damage_estimate, and escalation_reason if applicable
5. IF the trigger_pause transaction fails on-chain, THEN THE Circuit_Breaker SHALL log the error and THE Alert_Dispatcher SHALL send an emergency Telegram alert indicating the pause attempt failed
6. WHEN a POST request is received at /api/protocols/:id/resume from the authenticated guardian wallet, THE Sentinel_Service SHALL construct and send a resume transaction to the Guardian_Program
7. WHEN the resume transaction is confirmed on-chain, THE Sentinel_Service SHALL update the Protocol status to "active" in the database

### Requirement 11: Telegram Alert

**User Story:** Sebagai pemilik protokol, saya ingin menerima notifikasi Telegram instan saat terjadi anomali atau pause, sehingga tim saya dapat merespons dengan cepat.

#### Acceptance Criteria

1. WHEN an Incident is created, THE Telegram_Client SHALL send an alert message to the telegram_chat_id configured on the Protocol record
2. THE Telegram_Client SHALL format the message including: protocol name, incident type, breached invariant details (type, measured value, threshold), action taken, damage estimate, and timestamp
3. IF the Incident was triggered by severity escalation, THE Telegram_Client SHALL include the escalation reason and all contributing rules in the message
4. IF the Telegram alert delivery fails, THEN THE Telegram_Client SHALL log the failure with the error message
5. WHEN the Evaluator detects a breach for an Invariant with action "alert" (not "pause"), THE Telegram_Client SHALL send an alert message without triggering the Circuit_Breaker

### Requirement 12: WebSocket Real-Time Dashboard Updates

**User Story:** Sebagai pengguna dashboard, saya ingin menerima update real-time tentang transaksi dan status protokol, sehingga saya dapat memonitor protokol tanpa refresh halaman.

#### Acceptance Criteria

1. WHEN a client connects to ws://host/ws with a protocol_id query parameter, THE WebSocket_Hub SHALL register the connection and associate it with the specified Protocol
2. WHEN a transaction is evaluated for a Protocol, THE WebSocket_Hub SHALL broadcast the transaction data, evaluation result, and combined threat level to all connected clients for that Protocol
3. WHEN a Protocol status changes (active to paused or paused to active), THE WebSocket_Hub SHALL broadcast the status change to all connected clients for that Protocol
4. IF a WebSocket client disconnects, THEN THE WebSocket_Hub SHALL remove the connection from the Protocol subscription

### Requirement 13: Simulasi Drift Hack

**User Story:** Sebagai pengunjung (tanpa auth), saya ingin melihat simulasi bagaimana Killswitch akan mendeteksi serangan Drift hack dengan parameter yang bisa saya sesuaikan, sehingga saya memahami value proposition dan fleksibilitas sistem ini.

#### Acceptance Criteria

1. WHEN a GET request is received at /api/simulate/drift without query parameters, THE Simulator SHALL replay pre-configured Drift hack transaction data through the Evaluator using default invariant rules (WITHDRAWAL_RATE: $5M per minute, TVL_DROP: 10% in 5 minutes)
2. WHEN a GET request is received at /api/simulate/drift with optional query parameters withdrawal_rate_threshold, withdrawal_rate_window, tvl_drop_threshold, and tvl_drop_window, THE Simulator SHALL use the provided values instead of the defaults
3. THE Simulator SHALL return a timeline array where each entry contains: timestamp, event description, transaction details, invariant evaluation results (pass/warning/breach), combined threat level, and Killswitch response action
4. THE Simulator SHALL include the following events in the timeline: admin key change detection, safety parameter modification detection, progressive withdrawal detection with escalating severity, circuit breaker trigger point, and alert dispatch
5. THE Simulator SHALL calculate and return a summary including: total damage with Killswitch, total damage without Killswitch ($285M), estimated amount saved, and the invariant rules used
6. THE Sentinel_Service SHALL serve the /api/simulate/drift endpoint without requiring authentication

### Requirement 14: Health Check dan API Response

**User Story:** Sebagai developer, saya ingin health check endpoint dan format API response yang konsisten.

#### Acceptance Criteria

1. WHEN a GET request is received at /api/health, THE Sentinel_Service SHALL return HTTP 200 with status "ok" and current timestamp without requiring authentication
2. THE Sentinel_Service SHALL wrap all successful API responses in an envelope containing: status ("success"), message (string), and data (object or array)
3. THE Sentinel_Service SHALL wrap all error API responses in an envelope containing: status ("error"), message (string), and data (null)
4. THE Sentinel_Service SHALL return appropriate HTTP status codes: 200 for GET, 201 for POST creation, 400 for validation errors, 401 for auth errors, 404 for not found, 409 for conflicts, and 500 for internal errors

### Requirement 15: Routing, DI, dan Error Handling

**User Story:** Sebagai developer, saya ingin routing dan dependency injection terstruktur mengikuti clean architecture dengan error handling yang konsisten.

#### Acceptance Criteria

1. THE DI_Container SHALL initialize dependencies in order: config → database connection → clients (Geyser_Client, Solana_RPC_Client, Telegram_Client) → repositories → services → handlers
2. THE Sentinel_Service SHALL register routes grouped by domain: auth routes (public), protocol routes (protected), invariant routes (protected), simulate routes (public), health routes (public), and WebSocket routes
3. WHEN the application starts, THE Sentinel_Service SHALL start the Sentinel monitoring loop as a background goroutine after route registration is complete
4. THE Sentinel_Service SHALL use the AppError type from pkg/error.go for all internal error handling
5. THE Sentinel_Service SHALL log all significant events including: server startup, Geyser connection status, breach detections, circuit breaker triggers, and alert dispatch results
