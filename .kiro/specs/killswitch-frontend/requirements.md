# Requirements Document — Killswitch Frontend Dashboard

## Introduction

Dokumen ini mendefinisikan requirements untuk **Killswitch Frontend Dashboard**, yaitu antarmuka web dari Killswitch — sistem deteksi eksploit real-time dan auto-pause untuk protokol DeFi di Solana. Dashboard dibangun menggunakan Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui.

Scope dokumen ini di-trim untuk fokus pada demo path hackathon Solana Frontier: landing page, wallet connect, dashboard monitoring, protocol registration, invariant config, dan Drift hack simulation.

## Glossary

- **Dashboard_App**: Aplikasi frontend Next.js 16 yang menyediakan antarmuka web untuk Killswitch
- **Wallet_Provider**: Komponen React yang mengintegrasikan @solana/wallet-adapter untuk koneksi wallet Phantom dan Solflare
- **Theme_Provider**: Komponen React yang mengelola dark theme sebagai default
- **Navbar**: Komponen navigasi atas yang menampilkan logo Killswitch dan tombol Connect Wallet
- **Sidebar**: Komponen navigasi samping untuk halaman protected
- **Landing_Page**: Halaman publik di route `/` — hero section, fitur, CTA
- **Monitoring_Dashboard**: Halaman protected di route `/dashboard` — status real-time, TX feed, invariant status
- **Protocol_Detail_Page**: Halaman protected di route `/protocols/[id]` — detail protokol + invariant editor
- **Simulation_Page**: Halaman publik di route `/simulate` — simulasi Drift hack
- **API_Client**: Modul di `lib/api.ts` — fetch wrapper dengan wallet address header
- **WebSocket_Hook**: Custom hook `useWebSocket` untuk real-time updates dari backend
- **Simulation_Hook**: Custom hook `useSimulation` untuk playback state simulasi
- **Status_Indicator**: Komponen visual hijau/kuning/merah untuk status protokol
- **TX_Feed**: Komponen scrolling feed transaksi real-time
- **Invariant_Status**: Komponen hasil evaluasi invariant (pass/warning/breach)
- **Register_Form**: Form untuk mendaftarkan protokol baru
- **Invariant_Editor**: UI untuk menambah invariant rules
- **Drift_Replay**: Visualizer timeline simulasi Drift hack
- **Simulation_Controls**: Kontrol playback simulasi (play/pause/speed/reset)

## Requirements

### Requirement 1: Setup Proyek dan Konfigurasi Dasar

**User Story:** Sebagai developer, saya ingin proyek frontend terstruktur dengan baik, sehingga development dapat berjalan efisien.

#### Acceptance Criteria

1. THE Dashboard_App SHALL use Next.js 16 with App Router for page routing
2. THE Dashboard_App SHALL use TypeScript for type safety across all source files
3. THE Dashboard_App SHALL use Tailwind CSS v4 for styling with a dark theme as default
4. THE Dashboard_App SHALL use shadcn/ui as the component library
5. THE Dashboard_App SHALL define TypeScript types for Protocol, Invariant, Incident, and API response objects in the `types/` directory
6. THE Dashboard_App SHALL define constants for invariant type definitions, navigation items, and landing page content in the `constants/` directory

### Requirement 2: Provider dan Layout Global

**User Story:** Sebagai pengguna, saya ingin aplikasi memiliki layout yang konsisten dengan navigasi yang jelas dan dukungan wallet Solana.

#### Acceptance Criteria

1. THE Wallet_Provider SHALL wrap the application with @solana/wallet-adapter-react provider configured for Phantom and Solflare wallets on Solana devnet
2. THE Theme_Provider SHALL apply a dark theme by default with a crypto/security aesthetic color palette
3. THE Dashboard_App SHALL render a root layout in `app/layout.tsx` that includes the Theme_Provider, Wallet_Provider, Navbar, and conditional Sidebar
4. THE Navbar SHALL display the Killswitch logo and a Connect Wallet button
5. THE Sidebar SHALL display navigation menu items for Dashboard, Protocols, and Simulate pages
6. WHILE a user is on the Landing_Page or Simulation_Page, THE Dashboard_App SHALL hide the Sidebar

### Requirement 3: Autentikasi Berbasis Wallet (Simplified)

**User Story:** Sebagai pemilik protokol, saya ingin login menggunakan wallet Solana saya — connect wallet = langsung masuk.

#### Acceptance Criteria

1. WHEN a user clicks the Connect Wallet button, THE Dashboard_App SHALL trigger the @solana/wallet-adapter connection dialog showing Phantom and Solflare options
2. WHEN a wallet is connected, THE Dashboard_App SHALL prompt the user to sign a verification message
3. WHEN the user signs the message, THE API_Client SHALL send a POST request to `/api/auth/verify` with the wallet address, signed message, and signature
4. WHEN the backend returns success, THE Dashboard_App SHALL store the wallet address as the authenticated identity and allow access to protected pages
5. IF the backend returns HTTP 401, THEN THE Dashboard_App SHALL display an error message "Verifikasi wallet gagal"
6. WHEN a user clicks Disconnect Wallet, THE Dashboard_App SHALL clear the stored identity and redirect to the Landing_Page
7. IF a user navigates to a protected page without a connected wallet, THE Dashboard_App SHALL redirect to the Landing_Page

### Requirement 4: API Client

**User Story:** Sebagai developer, saya ingin API client yang konsisten untuk komunikasi dengan backend.

#### Acceptance Criteria

1. THE API_Client SHALL provide a fetch wrapper that automatically includes the base URL, Content-Type header, and wallet address header
2. WHEN the API_Client receives a successful response, THE API_Client SHALL parse the response body according to the backend envelope format (status, message, data)
3. IF the API_Client receives HTTP 4xx or 5xx, THE API_Client SHALL extract the error message from the response envelope and return it for display
4. WHILE an API request is in progress, THE Dashboard_App SHALL display a loading indicator

### Requirement 5: Landing Page

**User Story:** Sebagai pengunjung, saya ingin melihat halaman landing yang menjelaskan masalah Drift hack dan solusi Killswitch.

#### Acceptance Criteria

1. THE Landing_Page SHALL be accessible at route `/` without requiring authentication
2. THE Landing_Page SHALL display a hero section referencing the Drift Protocol hack ($285M lost in 12 minutes) and how Killswitch would have stopped it
3. THE Landing_Page SHALL display a features section highlighting real-time monitoring, anomaly detection, auto-pause circuit breaker, and instant alerts
4. THE Landing_Page SHALL display a "Connect Wallet" CTA button and a secondary CTA linking to the Simulation_Page
5. THE Landing_Page SHALL be responsive with a desktop-first layout

### Requirement 6: Dashboard Monitoring Real-Time

**User Story:** Sebagai pemilik protokol, saya ingin melihat status monitoring real-time termasuk feed transaksi, status invariant, dan combined threat level.

#### Acceptance Criteria

1. THE Monitoring_Dashboard SHALL be accessible at route `/dashboard` and require a connected wallet
2. WHEN the dashboard loads, THE WebSocket_Hook SHALL establish a WebSocket connection to `ws://host/ws?protocol_id=ID`
3. THE Status_Indicator SHALL display protocol health: green (active), yellow (warning), red (paused)
4. THE TX_Feed SHALL display incoming transactions in a scrolling feed showing hash, instruction type, amount, and timestamp
5. THE TX_Feed SHALL auto-scroll and retain a maximum of 100 visible entries
6. THE Invariant_Status SHALL display each active rule with its evaluation result: pass (green), warning (yellow, >50% of threshold), or breach (red)
7. THE Dashboard_App SHALL display a Combined Threat Level indicator: LOW (green), ELEVATED (yellow), HIGH (orange), CRITICAL (red)
8. WHEN threat level is CRITICAL due to escalation, THE Dashboard_App SHALL display the escalation reason
9. IF the WebSocket connection is lost, THE Dashboard_App SHALL display a "Koneksi terputus" indicator

### Requirement 7: Registrasi Protokol dan Konfigurasi Invariant

**User Story:** Sebagai pemilik protokol, saya ingin mendaftarkan program Solana saya dan menambahkan invariant rules melalui UI.

#### Acceptance Criteria

1. THE Register_Form SHALL collect: program address (Solana public key, required), protocol name (required), and Telegram chat ID
2. THE Register_Form SHALL validate that the program address is a valid Solana public key format
3. WHEN the user submits, THE API_Client SHALL POST to `/api/protocols`
4. THE Protocol_Detail_Page at `/protocols/[id]` SHALL display protocol name, program address, status, and list of invariant rules
5. WHEN a user clicks "Add Rule", THE Invariant_Editor SHALL display a form with: invariant type (dropdown), threshold (numeric), time window in seconds (numeric), and action (pause/alert)
6. WHEN the user submits the add rule form, THE API_Client SHALL POST to `/api/protocols/:id/invariants`
7. IF the protocol status is "paused", THE Protocol_Detail_Page SHALL display a "Resume Protocol" button that triggers a POST to `/api/protocols/:id/resume`

### Requirement 8: Simulasi Drift Hack

**User Story:** Sebagai pengunjung (tanpa auth), saya ingin melihat simulasi visual Drift hack dengan parameter yang bisa disesuaikan.

#### Acceptance Criteria

1. THE Simulation_Page SHALL be accessible at route `/simulate` without authentication
2. THE Simulation_Page SHALL display input fields for adjustable parameters: withdrawal rate threshold (default $5M), withdrawal rate window (default 60s), TVL drop threshold (default 10%), TVL drop window (default 300s)
3. WHEN "Run Simulation" is clicked, THE API_Client SHALL GET `/api/simulate/drift` with the configured parameters
4. THE Drift_Replay SHALL display a visual timeline with color-coded events: green (normal), yellow (warning), red (breach/pause)
5. THE Simulation_Controls SHALL provide: play, pause, speed (1x/2x/4x), and reset
6. WHEN the simulation reaches circuit breaker trigger, THE Drift_Replay SHALL display a prominent pause indicator
7. WHEN simulation completes, THE Drift_Replay SHALL show summary: damage with Killswitch, damage without ($285M), amount saved, and rules used
8. User can adjust parameters and re-run to see different outcomes

### Requirement 9: WebSocket dan Simulation Hooks

**User Story:** Sebagai developer, saya ingin custom hooks untuk WebSocket dan simulation playback.

#### Acceptance Criteria

1. THE WebSocket_Hook SHALL accept protocol_id and establish connection to `ws://host/ws?protocol_id=ID`
2. THE WebSocket_Hook SHALL parse messages by type: transaction update, status change, threat level update
3. THE WebSocket_Hook SHALL provide connection status (connected/connecting/disconnected) for UI display
4. THE Simulation_Hook SHALL manage playback state: current event index, is_playing, speed multiplier, elapsed time
5. THE Simulation_Hook SHALL advance events at intervals determined by playback speed
6. WHEN the last event is reached, THE Simulation_Hook SHALL stop playback and retain final state

### Requirement 10: Desain Visual dan Routing

**User Story:** Sebagai pengguna, saya ingin dark theme yang profesional dengan routing yang terproteksi.

#### Acceptance Criteria

1. THE Dashboard_App SHALL use dark color scheme with green (#22c55e), yellow (#eab308), and red (#ef4444) as status colors
2. THE Dashboard_App SHALL implement desktop-first responsive layout using Tailwind CSS v4
3. WHILE viewport width is below 768px, THE Sidebar SHALL collapse into a hamburger menu
4. THE Dashboard_App SHALL display loading skeletons while data is being fetched
5. THE Dashboard_App SHALL define routes: `/` (public), `/dashboard` (protected), `/protocols/[id]` (protected), `/simulate` (public)
6. WHEN a user without connected wallet navigates to a protected route, redirect to Landing_Page
7. THE Navbar SHALL display connected wallet address truncated (first 4 + last 4 chars) with Disconnect option
