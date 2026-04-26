# Implementation Plan: Killswitch Frontend Dashboard

## Overview

Implementasi frontend dashboard Killswitch menggunakan Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui. Tasks disusun secara incremental: types & constants → lib utilities → providers & layout → pages & components → hooks → integration & wiring. Setiap task mereferensikan requirements spesifik dan property tests menggunakan fast-check + Vitest.

## Tasks

- [x] 1. Project setup, types, and constants
  - [x] 1.1 Initialize Next.js 16 project with TypeScript, Tailwind CSS v4, and shadcn/ui in `frontend/`
    - Install dependencies: next, react, tailwindcss v4, @solana/wallet-adapter-react, @solana/wallet-adapter-wallets, @solana/web3.js, next-themes
    - Install dev dependencies: vitest, @testing-library/react, @testing-library/jest-dom, fast-check, jsdom
    - Configure `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`
    - Set up dark theme color palette in Tailwind config (backgrounds: #0a0a0a, #1a1a1a, #262626; status: green #22c55e, yellow #eab308, orange #f97316, red #ef4444)
    - Configure Vitest in `vitest.config.ts` with jsdom environment
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 10.1, 10.2_

  - [x] 1.2 Create TypeScript type definitions in `frontend/types/`
    - Create `types/protocol.ts` — Protocol interface (id, program_address, name, guardian_wallet, status, created_at, invariants)
    - Create `types/invariant.ts` — InvariantType union, InvariantAction union, Invariant interface
    - Create `types/incident.ts` — Incident interface
    - Create `types/api.ts` — APIEnvelope, AuthVerifyRequest/Response, RegisterProtocolRequest, CreateInvariantRequest, SimulationResult, SimulationEvent, WSMessage types (WSTransactionData, WSStatusChangeData, WSThreatLevelData)
    - _Requirements: 1.5_

  - [x] 1.3 Create constants in `frontend/constants/`
    - Create `constants/invariant-types.ts` — INVARIANT_TYPES array with InvariantTypeInfo (value, label, description, unit, defaultThreshold, defaultTimeWindow) for all 5 types
    - Create `constants/nav.ts` — Navigation items (Dashboard, Protocols, Simulate) with paths and icons
    - Create `constants/landing.ts` — Landing page content (hero text referencing Drift hack $285M, features list, CTA text)
    - _Requirements: 1.6_

- [x] 2. Library utilities and API client
  - [x] 2.1 Create utility functions in `frontend/lib/utils.ts`
    - Implement `truncateAddress(address: string)` — returns `{first4}...{last4}` format
    - Implement `classifyInvariantStatus(measuredValue: number, threshold: number)` — returns "pass" (<50%), "warning" (50-99%), "breach" (≥100%)
    - Implement `isValidSolanaPublicKey(address: string)` — base58 validation, 32-44 chars, no 0/O/I/l
    - Implement `getStatusColor(status: string)` — maps status/threat/eval to hex colors (#22c55e, #eab308, #f97316, #ef4444)
    - Implement `cn()` utility for Tailwind class merging (clsx + tailwind-merge)
    - _Requirements: 7.2, 6.3, 6.6, 6.7, 10.1, 10.7_

  - [ ]* 2.2 Write property tests for wallet address truncation (Property 1)
    - **Property 1: Wallet Address Truncation**
    - For any string with length ≥ 8, truncateAddress SHALL return `{first4}...{last4}`
    - Use fast-check arbitrary for strings of length ≥ 8
    - **Validates: Requirements 10.7**

  - [ ]* 2.3 Write property tests for Solana public key validation (Property 5)
    - **Property 5: Solana Public Key Validation**
    - Valid base58 strings (32-44 chars, no 0/O/I/l) SHALL be accepted; invalid SHALL be rejected
    - Use fast-check arbitrary for base58 character set
    - **Validates: Requirements 7.2**

  - [ ]* 2.4 Write property tests for invariant evaluation classification (Property 6)
    - **Property 6: Invariant Evaluation Classification**
    - For any measuredValue and threshold > 0: <50% → "pass", 50-99% → "warning", ≥100% → "breach"
    - Use fast-check arbitrary for positive floats
    - **Validates: Requirements 6.6**

  - [ ]* 2.5 Write property tests for status-to-color mapping (Property 7)
    - **Property 7: Status and Eval Result to Visual Mapping**
    - active/LOW/pass → #22c55e, warning/ELEVATED/warning → #eab308, HIGH → #f97316, paused/CRITICAL/breach → #ef4444
    - Use fast-check oneof for all valid status values
    - **Validates: Requirements 6.3, 6.7, 8.4**

  - [x] 2.6 Create API client in `frontend/lib/api.ts`
    - Implement fetch wrapper with configurable baseUrl
    - Auto-include `Content-Type: application/json` header
    - Auto-include `X-Wallet-Address` header when wallet is connected
    - Parse response envelope (`{ status, message, data }`)
    - Extract and throw error message for 4xx/5xx responses
    - Export `get<T>(path)` and `post<T>(path, body)` methods
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 2.7 Write property tests for API response envelope parsing (Property 2)
    - **Property 2: API Response Envelope Parsing**
    - For any valid envelope JSON, API client SHALL correctly extract status, message, and data fields
    - For 2xx → return data; for 4xx/5xx → throw with message from envelope
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 2.8 Write property tests for API client header inclusion (Property 3)
    - **Property 3: API Client Header Inclusion**
    - For any request path and wallet address, fetch wrapper SHALL include Content-Type and X-Wallet-Address headers; base URL SHALL be prepended
    - **Validates: Requirements 4.1**

- [x] 3. Checkpoint — Verify types, constants, utilities, and API client
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Providers and root layout
  - [x] 4.1 Create ThemeProvider in `frontend/components/providers/theme-provider.tsx`
    - Wrap children with dark theme using next-themes or class-based approach
    - Dark theme as default with crypto/security aesthetic
    - _Requirements: 2.2_

  - [x] 4.2 Create WalletProvider in `frontend/components/providers/wallet-provider.tsx`
    - Wrap children with @solana/wallet-adapter-react provider
    - Configure for Solana devnet with Phantom and Solflare wallets
    - Auto-connect disabled
    - _Requirements: 2.1_

  - [x] 4.3 Create Navbar in `frontend/components/layout/navbar.tsx`
    - Display Killswitch logo on the left
    - Display Connect Wallet button on the right (using wallet-adapter UI)
    - When connected: show truncated address (first 4 + last 4 chars) with Disconnect option
    - Fixed top, full width
    - _Requirements: 2.4, 10.7_

  - [x] 4.4 Create Sidebar in `frontend/components/layout/sidebar.tsx`
    - Display navigation menu items: Dashboard, Protocols, Simulate
    - Accept `isCollapsed` prop for responsive behavior
    - Collapse to hamburger menu on viewport < 768px
    - _Requirements: 2.5, 10.3_

  - [x] 4.5 Create root layout in `frontend/app/layout.tsx`
    - Wrap with ThemeProvider → WalletProvider → Navbar
    - Conditionally render Sidebar (hidden on `/` and `/simulate` routes)
    - Implement wallet-based auth context: store wallet address as identity after verification
    - Implement route protection: redirect to `/` if wallet not connected on protected routes (`/dashboard`, `/protocols/*`)
    - _Requirements: 2.3, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 10.5, 10.6_

  - [ ]* 4.6 Write property tests for route protection logic (Property 4)
    - **Property 4: Route Protection**
    - Protected routes without wallet → redirect to `/`; public routes without wallet → render page
    - Use fast-check oneof for route paths
    - **Validates: Requirements 3.7, 10.5, 10.6**

- [x] 5. Landing page
  - [x] 5.1 Create Landing Page in `frontend/app/page.tsx`
    - Hero section: reference Drift Protocol hack ($285M lost in 12 minutes), how Killswitch would have stopped it
    - Features section: real-time monitoring, anomaly detection, auto-pause circuit breaker, instant alerts
    - CTA: "Connect Wallet" button + secondary CTA linking to `/simulate`
    - Desktop-first responsive layout
    - Public route, no auth required
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Dashboard monitoring components and page
  - [x] 6.1 Create StatusIndicator in `frontend/components/dashboard/status-indicator.tsx`
    - Accept status ("active" | "paused" | "warning"), protocolName, programAddress
    - Green dot + "Active", yellow dot + "Warning", red dot + "Paused"
    - Pulsing animation on dot
    - _Requirements: 6.3_

  - [x] 6.2 Create TxFeed in `frontend/components/dashboard/tx-feed.tsx`
    - Accept transactions array and maxEntries (default 100)
    - Scrolling feed, newest on top, auto-scroll on new TX
    - Display: truncated hash (8...8), instruction type, amount, timestamp
    - Color-coded per evalResult: green/yellow/red
    - FIFO: remove oldest when exceeding maxEntries
    - _Requirements: 6.4, 6.5_

  - [ ]* 6.3 Write property tests for TX feed maximum entries (Property 8)
    - **Property 8: TX Feed Maximum Entries**
    - For any sequence of N transactions, visible entries SHALL always ≤ 100; if N > 100, only 100 most recent shown
    - **Validates: Requirements 6.5**

  - [ ]* 6.4 Write property tests for TX feed entry completeness (Property 9)
    - **Property 9: TX Feed Entry Completeness**
    - For any valid transaction with non-empty hash, instruction, amount, timestamp, rendered entry SHALL contain all four fields
    - **Validates: Requirements 6.4**

  - [x] 6.5 Create InvariantStatus in `frontend/components/dashboard/invariant-status.tsx`
    - Accept invariants array (InvariantEvaluation[])
    - Card per invariant rule with progress bar (measured/threshold ratio)
    - Green (<50%), yellow (50-99%), red (≥100%)
    - Display: type, threshold, current value
    - _Requirements: 6.6_

  - [x] 6.6 Create CombinedThreatLevel in `frontend/components/dashboard/combined-threat-level.tsx`
    - Accept level ("LOW" | "ELEVATED" | "HIGH" | "CRITICAL") and optional escalationReason
    - Large badge: LOW=green, ELEVATED=yellow, HIGH=orange, CRITICAL=red
    - Show escalation reason when CRITICAL
    - Pulsing/glowing animation on CRITICAL
    - _Requirements: 6.7, 6.8_

  - [x] 6.7 Create Dashboard page in `frontend/app/dashboard/page.tsx`
    - Protected route — require connected wallet
    - Compose: StatusIndicator, TxFeed, InvariantStatus, CombinedThreatLevel
    - Display loading skeletons while data is being fetched
    - Display "Koneksi terputus" indicator when WebSocket disconnected
    - Wire to useWebSocket hook for real-time data
    - _Requirements: 6.1, 6.2, 6.9, 10.4_

- [x] 7. Checkpoint — Verify providers, layout, landing, and dashboard components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Protocol registration and detail page
  - [x] 8.1 Create RegisterForm in `frontend/components/protocol/register-form.tsx`
    - Fields: Program Address (required, Solana public key validation), Protocol Name (required), Telegram Chat ID (optional)
    - Validate program address: base58 format, 32-44 chars
    - Submit: POST to `/api/protocols` via API client
    - Loading state on submit, toast on success/error
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 8.2 Create InvariantEditor in `frontend/components/protocol/invariant-editor.tsx`
    - Fields: Type (dropdown from INVARIANT_TYPES constant), Threshold (numeric, > 0), Time Window in seconds (numeric, > 0), Action (radio: "pause" / "alert")
    - Submit: POST to `/api/protocols/:id/invariants` via API client
    - Loading state on submit, toast on success/error
    - _Requirements: 7.5, 7.6_

  - [x] 8.3 Create Protocol Detail page in `frontend/app/protocols/[id]/page.tsx`
    - Protected route — require connected wallet
    - Display: protocol name, program address, status, list of invariant rules
    - "Add Rule" button opens InvariantEditor
    - If status is "paused": show "Resume Protocol" button → POST `/api/protocols/:id/resume`
    - Loading skeletons while fetching
    - _Requirements: 7.4, 7.7_

  - [ ]* 8.4 Write property tests for protocol detail rendering completeness (Property 10)
    - **Property 10: Protocol Detail Rendering Completeness**
    - For any valid protocol object, rendered page SHALL contain protocol name, program address, status, and invariant rules list
    - **Validates: Requirements 7.4**

- [x] 9. Simulation page and components
  - [x] 9.1 Create SimulationControls in `frontend/components/simulate/simulation-controls.tsx`
    - Props: isPlaying, speed, currentIndex, totalEvents, onPlay, onPause, onReset, onSpeedChange
    - Play/Pause toggle button, speed selector (1x/2x/4x), reset button
    - Progress bar showing current position
    - _Requirements: 8.5_

  - [x] 9.2 Create DriftReplay in `frontend/components/simulate/drift-replay.tsx`
    - Props: events (SimulationEvent[]), currentIndex, isPlaying
    - Vertical timeline with color-coded nodes: green (pass), yellow (warning), red (breach/pause)
    - Prominent "CIRCUIT BREAKER TRIGGERED" indicator on pause event
    - Running cumulative drain counter
    - Events appear one by one per playback
    - _Requirements: 8.4, 8.6_

  - [x] 9.3 Create SimulationSummary in `frontend/components/simulate/simulation-summary.tsx`
    - Props: damageWithKillswitch, damageWithout, amountSaved, rulesUsed
    - Side-by-side comparison: "Without Killswitch: $285M lost" (red) vs "With Killswitch: $XM lost" (green)
    - "Amount Saved: $XM" highlighted
    - List of rules used
    - _Requirements: 8.7_

  - [ ]* 9.4 Write property tests for simulation summary correctness (Property 11)
    - **Property 11: Simulation Summary Correctness**
    - amount_saved SHALL equal damage_without - damage_with_killswitch; damage_without SHALL be $285M; damage_with_killswitch SHALL be ≥ 0 and < damage_without
    - **Validates: Requirements 8.7**

  - [x] 9.5 Create Simulation page in `frontend/app/simulate/page.tsx`
    - Public route — no auth required
    - Input fields: withdrawal rate threshold (default $5M), withdrawal rate window (default 60s), TVL drop threshold (default 10%), TVL drop window (default 300s)
    - "Run Simulation" button → GET `/api/simulate/drift` with params
    - Compose: SimulationControls, DriftReplay, SimulationSummary
    - Loading state during API call
    - Allow parameter adjustment and re-run
    - _Requirements: 8.1, 8.2, 8.3, 8.8_

- [x] 10. Custom hooks (WebSocket and Simulation)
  - [x] 10.1 Create useWebSocket hook in `frontend/hooks/use-websocket.ts`
    - Accept protocolId and optional enabled flag
    - Connect to `ws://host/ws?protocol_id=ID`
    - Parse messages by type: "transaction", "status_change", "threat_level"
    - Maintain state: transactions[], threatLevel, invariantResults[], protocolStatus, escalationReason
    - Provide connection status: "connected" | "connecting" | "disconnected"
    - Auto-reconnect on disconnect (3s delay)
    - Cleanup on unmount
    - _Requirements: 9.1, 9.2, 9.3, 6.2_

  - [ ]* 10.2 Write property tests for WebSocket message parsing (Property 12)
    - **Property 12: WebSocket Message Parsing**
    - For any valid WS message JSON with type and data, parser SHALL extract fields correctly per message type
    - Transaction messages SHALL contain hash, instruction, amount, timestamp, eval_result
    - Threat level messages SHALL contain level and invariant_results
    - **Validates: Requirements 9.1, 9.2**

  - [x] 10.3 Create useSimulation hook in `frontend/hooks/use-simulation.ts`
    - Accept events array (SimulationEvent[])
    - Manage state: currentIndex, isPlaying, speed, elapsedTime
    - Advance events via setInterval: base interval 1500ms / speed (1x=1500ms, 2x=750ms, 4x=375ms)
    - Stop at last event, retain final state
    - Expose: play(), pause(), reset(), setSpeed()
    - Reset returns to index 0
    - _Requirements: 9.4, 9.5, 9.6_

  - [ ]* 10.4 Write property tests for simulation hook state machine (Property 13)
    - **Property 13: Simulation Hook State Machine**
    - currentIndex always in [0, N-1]; speed always in {1, 2, 4}; at index N-1 isPlaying becomes false; reset returns to 0; interval = baseInterval / speed
    - Use fast-check to generate action sequences (play, pause, reset, setSpeed)
    - **Validates: Requirements 9.4, 9.5, 9.6**

- [x] 11. Checkpoint — Verify all components, pages, and hooks
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Integration and wiring
  - [x] 12.1 Wire dashboard page to useWebSocket hook
    - Connect StatusIndicator, TxFeed, InvariantStatus, CombinedThreatLevel to live WebSocket data
    - Handle connection status display ("Koneksi terputus" indicator)
    - Handle loading skeletons during initial connection
    - _Requirements: 6.1, 6.2, 6.9_

  - [x] 12.2 Wire simulation page to useSimulation hook
    - Connect DriftReplay and SimulationControls to hook state and actions
    - Wire "Run Simulation" to API client GET call
    - Display SimulationSummary after simulation completes
    - _Requirements: 8.3, 8.5, 8.6, 8.7_

  - [x] 12.3 Wire wallet auth flow end-to-end
    - Connect Wallet button → wallet-adapter dialog → sign verification message → POST `/api/auth/verify` → store identity
    - Handle 401 error: display "Verifikasi wallet gagal"
    - Disconnect: clear identity, redirect to `/`
    - Protected route redirect logic
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 12.4 Wire protocol registration and invariant config
    - RegisterForm → POST `/api/protocols` → navigate to protocol detail
    - InvariantEditor → POST `/api/protocols/:id/invariants` → refresh invariant list
    - Resume button → POST `/api/protocols/:id/resume` → refresh status
    - Toast notifications for success/error
    - _Requirements: 7.1, 7.3, 7.5, 7.6, 7.7_

  - [ ]* 12.5 Write integration tests for key user flows
    - Test wallet connect → dashboard access flow
    - Test simulation parameter input → run → timeline display flow
    - Test protocol register → add invariant flow
    - _Requirements: 3.1-3.7, 8.1-8.8, 7.1-7.7_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (13 properties total)
- Unit tests validate specific examples and edge cases
- All code uses TypeScript with fast-check + Vitest for property-based testing
- Follow project structure defined in STRUCTURE.md (`frontend/` directory)
