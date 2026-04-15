# Killswitch — User Flow (End-to-End)

Dokumen ini menjelaskan semua user flow secara detail, termasuk interaksi antar komponen (Frontend, Backend, Smart Contract, Solana, Telegram).

---

## Flow 1: Pengunjung Melihat Landing Page

**Aktor:** Pengunjung (tanpa wallet)
**Route:** `/`

```
1. Pengunjung buka killswitch.xyz
2. Browser load Landing Page
3. Tampil:
   - Hero: "The $285M Drift hack took 12 minutes. Killswitch would have stopped it in 30 seconds."
   - Features: Real-time Monitoring, Anomaly Detection, Auto-Pause, Instant Alerts
   - CTA: "Connect Wallet" button
   - Secondary CTA: "Try Drift Simulation →" link ke /simulate
4. Pengunjung bisa:
   a. Klik "Connect Wallet" → masuk Flow 2
   b. Klik "Try Drift Simulation" → masuk Flow 7
   c. Tutup browser → selesai
```

**Komponen yang terlibat:**
- Frontend: `app/page.tsx`, `components/layout/navbar.tsx`

---

## Flow 2: Connect Wallet & Login

**Aktor:** Pemilik protokol
**Route:** `/` → `/dashboard`

```
1. User klik "Connect Wallet" di Navbar
2. Frontend trigger @solana/wallet-adapter dialog
3. Popup muncul: pilih Phantom atau Solflare
4. User pilih wallet → wallet extension popup muncul
5. User approve koneksi → wallet connected
6. Frontend otomatis minta user sign verification message:
   "Sign this message to verify your wallet ownership for Killswitch"
7. User sign message di wallet popup
8. Frontend kirim ke backend:
   POST /api/auth/verify
   Body: { wallet_address, message, signature }
9. Backend verify ed25519 signature:
   a. Signature valid → return { wallet_address, is_guardian: true/false }
   b. Signature invalid → return 401 "Invalid wallet signature"
10. Frontend terima response:
    a. Sukses → simpan wallet address sebagai identity
    b. Gagal → tampilkan error "Verifikasi wallet gagal", user bisa retry
11. Navbar berubah: "Connect Wallet" → "AbCd...WxYz" (truncated address) + Disconnect dropdown
12. Redirect ke /dashboard
```

**Komponen yang terlibat:**
- Frontend: `components/providers/wallet-provider.tsx`, `components/layout/navbar.tsx`, `lib/api.ts`
- Backend: `handlers/auth.go`, `middleware/auth.go`, `utils/crypto.go`

**Error handling:**
- Wallet extension tidak terinstall → wallet-adapter tampilkan "Install Phantom"
- User reject sign → tetap di landing page, bisa retry
- Signature invalid → error message, bisa retry
- Network error → "Koneksi gagal. Periksa jaringan Anda."

---

## Flow 3: Register Protokol Baru

**Aktor:** Pemilik protokol (wallet connected)
**Route:** `/protocols/[id]`

```
1. User masuk dashboard → belum ada protokol terdaftar
2. Tampil empty state: "Belum ada protokol terdaftar" + "Register Protocol" button
3. User klik "Register Protocol"
4. Form muncul:
   - Program Address: [input text] (Solana public key)
   - Protocol Name: [input text]
   - Telegram Chat ID: [input text] (optional)
5. User isi form:
   - Program Address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
   - Protocol Name: "My DeFi Protocol"
   - Telegram Chat ID: "-1001234567890"
6. Frontend validasi:
   - Program address format valid? (base58, 32-44 chars) → ✅
   - Name tidak kosong? → ✅
7. User klik "Submit"
8. Frontend kirim ke backend:
   POST /api/protocols
   Headers: { X-Wallet-Address: "user_wallet_address" }
   Body: { program_address, name, telegram_chat_id }
9. Backend proses:
   a. Verify wallet dari header → valid
   b. Check program_address sudah terdaftar? → belum
   c. Create Protocol record di database:
      - id: auto-generated UUID
      - program_address: "7xKXtg..."
      - name: "My DeFi Protocol"
      - guardian_wallet: "user_wallet_address"
      - telegram_chat_id: "-1001234567890"
      - status: "active"
      - created_at: now()
   d. Return 201 + protocol data
10. Frontend redirect ke /protocols/[id] → Protocol Detail Page
11. Backend Sentinel: subscribe ke program address baru di Geyser stream
```

**Komponen yang terlibat:**
- Frontend: `components/protocol/register-form.tsx`, `lib/api.ts`
- Backend: `handlers/protocol.go`, `services/protocol.go`, `repositories/protocol.go`
- Backend: `services/sentinel.go` (subscribe program address baru)

**Error handling:**
- Program address invalid format → frontend validation error
- Program address sudah terdaftar → 409 "Protocol already registered"
- Network error → retry option

---

## Flow 4: Tambah Invariant Rule

**Aktor:** Pemilik protokol (wallet connected, protocol terdaftar)
**Route:** `/protocols/[id]`

```
1. User di Protocol Detail Page
2. Tampil:
   - Protocol name, program address, status (🟢 Active)
   - Invariant Rules: (kosong)
   - "Add Rule" button
3. User klik "Add Rule"
4. Form muncul:
   - Type: [dropdown]
     - Withdrawal Rate
     - TVL Drop
     - Admin Key Change
     - Single TX Size
     - Parameter Change
   - Threshold: [numeric input]
   - Time Window (seconds): [numeric input]
   - Action: [radio] Pause / Alert
5. User isi:
   - Type: "Withdrawal Rate"
   - Threshold: 5000000 ($5M)
   - Time Window: 60 (1 menit)
   - Action: "Pause"
6. User klik "Submit"
7. Frontend kirim ke backend:
   POST /api/protocols/:id/invariants
   Body: { type: "WITHDRAWAL_RATE", threshold: 5000000, time_window: 60, action: "pause" }
8. Backend proses:
   a. Validate type → valid (WITHDRAWAL_RATE)
   b. Validate threshold > 0 → valid
   c. Create Invariant record di database
   d. Return 201 + invariant data
9. Frontend update list: rule baru muncul di daftar
10. User ulangi untuk tambah rule lain (misal TVL_DROP)
11. Evaluator sekarang akan cek transaksi terhadap rule-rule ini
```

**Komponen yang terlibat:**
- Frontend: `components/protocol/invariant-editor.tsx`, `lib/api.ts`
- Backend: `handlers/invariant.go`, `services/invariant.go`, `repositories/invariant.go`

**Error handling:**
- Type tidak valid → 400 "Invalid invariant type"
- Threshold ≤ 0 → 400 "Threshold must be a positive number"
- Network error → retry option

---

## Flow 5: Monitoring Normal (Tidak Ada Serangan)

**Aktor:** Pemilik protokol (wallet connected, protocol + rules terdaftar)
**Route:** `/dashboard`

```
1. User buka /dashboard
2. Frontend establish WebSocket connection:
   ws://host/ws?protocol_id=UUID
3. Dashboard tampil:
   ┌─────────────────────────────────────────┐
   │  🛡️ Combined Threat Level: 🟢 LOW      │
   ├─────────────────────────────────────────┤
   │  Protocol: My DeFi Protocol             │
   │  Status: 🟢 Active                      │
   ├─────────────────────────────────────────┤
   │  Invariant Rules:                        │
   │  Withdrawal Rate  ██░░░░░░░░  15%  🟢   │
   │  TVL Drop         █░░░░░░░░░   8%  🟢   │
   ├─────────────────────────────────────────┤
   │  Live TX Feed:                           │
   │  AbCd...1234  transfer  $50,000  12:01   │
   │  EfGh...5678  transfer  $25,000  12:01   │
   │  IjKl...9012  swap      $10,000  12:00   │
   └─────────────────────────────────────────┘

4. Di belakang layar (setiap transaksi):
   a. Solana TX stream → Geyser Client menerima transaksi
   b. Sentinel match ke protocol yang terdaftar
   c. Evaluator cek semua rules:
      - WITHDRAWAL_RATE: total $750K dalam 1 menit (15% of $5M threshold) → PASS
      - TVL_DROP: 0.8% drop (8% of 10% threshold) → PASS
   d. Hitung combined threat level:
      - 0 warnings → LOW
   e. Broadcast via WebSocket ke dashboard:
      { type: "transaction", data: { hash, instruction, amount, eval_result: "pass", threat_level: "LOW" } }
   f. Dashboard update: TX muncul di feed, progress bar update, threat level tetap LOW

5. Ini berlangsung terus selama tidak ada anomali
```

**Komponen yang terlibat:**
- Frontend: `app/dashboard/page.tsx`, `hooks/use-websocket.ts`, semua dashboard components
- Backend: `services/sentinel.go`, `services/evaluator.go`, `clients/geyser.go`, `ws/hub.go`
- Solana: TX stream via Geyser/WebSocket

---

## Flow 6: Serangan Terdeteksi → Auto-Pause → Telegram Alert

**Aktor:** Sistem (otomatis), Pemilik protokol (menerima alert)
**Route:** `/dashboard` (real-time update)

```
SKENARIO: Attacker mulai drain dana dari protocol

=== T+0:00 — Admin Key Change ===
1. Attacker kirim TX: ubah admin key
2. Geyser Client terima TX → forward ke Sentinel
3. Evaluator cek rules:
   - ADMIN_KEY_CHANGE: admin key berubah → BREACH (action: alert)
   - WITHDRAWAL_RATE: $0 (0%) → PASS
   - TVL_DROP: 0% → PASS
4. Combined threat level: ELEVATED (1 breach tapi action = alert, bukan pause)
5. Sentinel:
   - TIDAK trigger circuit breaker (action = alert)
   - Kirim Telegram alert:
     "⚠️ ALERT — My DeFi Protocol
      Admin key change detected
      TX: AbCd...1234
      Action: Alert only (no pause)
      Time: 2026-04-15 12:00:00 UTC"
   - Broadcast via WebSocket
6. Dashboard update:
   - Threat level: 🟡 ELEVATED
   - TX feed: admin key change (kuning)
   - Telegram notifikasi masuk ke HP tim

=== T+0:30 — Parameter Change + Withdrawal Mulai ===
7. Attacker kirim TX: hapus withdrawal limits
8. Evaluator cek rules:
   - PARAMETER_CHANGE: safety params modified → BREACH (action: alert)
   - WITHDRAWAL_RATE: $500K (10% of $5M) → WARNING (>50% = false, tapi ada withdrawal)
   - TVL_DROP: 0.5% → PASS
9. Combined threat level:
   - PARAMETER_CHANGE triggered + withdrawal mulai naik
   - Belum escalate karena withdrawal belum >50% threshold
   - Threat level: HIGH
10. Telegram alert: "🔴 ALERT — Safety parameters modified"
11. Dashboard: threat level 🟠 HIGH

=== T+1:00 — Withdrawal Meningkat ===
12. Attacker drain $3M dalam 30 detik terakhir
13. Evaluator cek rules:
    - WITHDRAWAL_RATE: $3M (60% of $5M threshold) → WARNING (>50%)
    - TVL_DROP: 4% (40% of 10% threshold) → PASS
    - PARAMETER_CHANGE: masih aktif dari sebelumnya
14. Combined threat level:
    - PARAMETER_CHANGE triggered + WITHDRAWAL_RATE warning (>50%)
    - ESCALATION RULE: admin/parameter change + any warning → CRITICAL
    - 🔴 ESCALATE KE CRITICAL
15. Sentinel:
    a. Evaluator return breach result:
       { status: "breach", threat_level: "CRITICAL",
         escalation_reason: "Parameter change + withdrawal rate warning (60%)",
         contributing_rules: [PARAMETER_CHANGE, WITHDRAWAL_RATE] }
    b. Circuit Breaker:
       - Construct trigger_pause transaction
       - Sign dengan SENTINEL_KEYPAIR
       - Kirim ke Guardian Program on-chain
    c. Guardian Program on-chain:
       - Verify: caller = sentinel_key ✅
       - Set ProtocolConfig.status = Paused
       - Emit log: "Protocol 7xKXtg... paused"
    d. Backend update database: Protocol.status = "paused"
    e. Create Incident record:
       { protocol_id, invariant_id, trigger_time: now(),
         tx_hashes: ["hash1", "hash2", "hash3"],
         action_taken: "pause", damage_estimate: 3000000,
         escalation_reason: "Parameter change + withdrawal rate warning (60%)" }
    f. Telegram alert:
       "🛑 EMERGENCY PAUSE — My DeFi Protocol
        Circuit breaker triggered!
        
        Reason: Multi-signal escalation
        - Parameter change detected
        - Withdrawal rate at 60% ($3M / $5M threshold)
        
        Damage estimate: $3,000,000
        TX hashes: AbCd...1234, EfGh...5678, IjKl...9012
        
        Action: Protocol PAUSED on-chain
        Time: 2026-04-15 12:01:00 UTC
        
        → Review and resume at killswitch.xyz/dashboard"
    g. WebSocket broadcast:
       { type: "incident", data: { ... } }
       { type: "status_change", data: { status: "paused" } }

16. Dashboard update real-time:
    ┌─────────────────────────────────────────┐
    │  🛡️ Combined Threat Level: 🔴 CRITICAL │
    │  🛑 AUTO-PAUSE TRIGGERED                │
    │  Parameter change + withdrawal warning   │
    ├─────────────────────────────────────────┤
    │  Protocol: My DeFi Protocol             │
    │  Status: 🔴 PAUSED                      │
    ├─────────────────────────────────────────┤
    │  Invariant Rules:                        │
    │  Withdrawal Rate  ██████░░░░  60%  🟡   │
    │  TVL Drop         ████░░░░░░  40%  🟢   │
    │  Param Change     CHANGED!         🔴   │
    ├─────────────────────────────────────────┤
    │  [Resume Protocol] button visible        │
    └─────────────────────────────────────────┘

17. Semua transaksi berikutnya ke protocol → DITOLAK oleh blockchain
    (karena Guardian Program sudah set status = Paused)

18. Attacker tidak bisa drain lebih lanjut → $3M lost, sisa dana AMAN
```

**Komponen yang terlibat:**
- Frontend: `app/dashboard/page.tsx`, semua dashboard components, `hooks/use-websocket.ts`
- Backend: `services/sentinel.go`, `services/evaluator.go`, `services/circuit_breaker.go`, `services/telegram.go`, `services/incident.go`, `ws/hub.go`
- Backend: `clients/geyser.go`, `clients/solana.go`, `clients/telegram.go`
- Smart Contract: Guardian Program `trigger_pause` instruction
- Solana: TX stream, on-chain state change
- Telegram: Bot API send message

---

## Flow 7: Resume Protocol Setelah Review

**Aktor:** Pemilik protokol (wallet connected)
**Route:** `/protocols/[id]`

```
1. Tim protokol terima Telegram alert → buka dashboard
2. Dashboard menunjukkan: Status 🔴 PAUSED, detail incident
3. Tim investigate:
   - Lihat TX hashes yang trigger pause
   - Lihat invariant mana yang breach/escalate
   - Lihat escalation reason
4. Tim konfirmasi: ini memang serangan → hubungi security team, trace funds
   ATAU: ini false alarm → proceed to resume

5. User klik "Resume Protocol" button
6. Frontend:
   a. Tampilkan konfirmasi dialog: "Apakah Anda yakin ingin resume protocol?"
   b. User konfirmasi
   c. Minta user sign transaction dengan guardian wallet
   d. Kirim ke backend:
      POST /api/protocols/:id/resume
      Headers: { X-Wallet-Address: "guardian_wallet_address" }
7. Backend proses:
   a. Verify wallet = guardian_wallet untuk protocol ini ✅
   b. Construct resume transaction
   c. Kirim ke Guardian Program on-chain
   d. Guardian Program:
      - Verify: caller = guardian_key ✅
      - Set ProtocolConfig.status = Active
      - Emit log: "Protocol 7xKXtg... resumed"
   e. Update database: Protocol.status = "active"
   f. Return 200 success
8. WebSocket broadcast: { type: "status_change", data: { status: "active" } }
9. Dashboard update:
   - Status: 🟢 Active
   - Threat level: 🟢 LOW (reset)
   - "Resume Protocol" button hilang
   - TX feed mulai terisi lagi
10. Protocol kembali beroperasi normal
11. Sentinel kembali monitoring
```

**Komponen yang terlibat:**
- Frontend: `app/protocols/[id]/page.tsx`, `lib/api.ts`
- Backend: `handlers/protocol.go`, `services/protocol.go`, `clients/solana.go`
- Smart Contract: Guardian Program `resume` instruction
- Solana: on-chain state change

**Error handling:**
- Wallet bukan guardian → 401 "Unauthorized"
- Protocol sudah active → Guardian Program return AlreadyActive error
- On-chain TX gagal → error message, user bisa retry

---

## Flow 8: Drift Hack Simulation (Demo Publik)

**Aktor:** Pengunjung (tanpa wallet, tanpa auth)
**Route:** `/simulate`

```
1. Pengunjung buka /simulate (atau klik "Try Drift Simulation" dari landing page)
2. Halaman tampil:
   ┌─────────────────────────────────────────┐
   │  🔄 Drift Hack Simulation               │
   │                                          │
   │  Adjust Parameters:                      │
   │  Withdrawal Rate: [$5,000,000] per [60]s │
   │  TVL Drop: [10]% per [300]s              │
   │                                          │
   │  [Run Simulation]                        │
   └─────────────────────────────────────────┘

3. User bisa adjust parameter atau pakai default
4. User klik "Run Simulation"
5. Frontend kirim ke backend:
   GET /api/simulate/drift?withdrawal_rate_threshold=5000000&withdrawal_rate_window=60&tvl_drop_threshold=10&tvl_drop_window=300
6. Backend Simulator proses:
   a. Buat temporary invariant rules dari parameter
   b. Replay pre-configured Drift hack timeline:
      - T+0:00: Admin key change
      - T+0:30: Safety parameters removed
      - T+1:00: $2M withdrawn
      - T+1:30: $4M total withdrawn
      - T+2:00: $6M total withdrawn → BREACH / ESCALATION
      - T+2:01: Circuit breaker triggered
   c. Untuk setiap event, evaluasi melalui Evaluator
   d. Hitung summary:
      - Damage with Killswitch: $6M
      - Damage without: $285M
      - Saved: $279M
   e. Return timeline + summary + rules used
7. Frontend terima data → mulai playback

8. Playback visual (otomatis atau user kontrol):
   ┌─────────────────────────────────────────┐
   │  Controls: [▶ Play] [1x ▼] [↺ Reset]   │
   │  Progress: ████████░░░░░░░░  T+1:30     │
   ├─────────────────────────────────────────┤
   │  Timeline:                               │
   │                                          │
   │  T+0:00  🟡 Admin key changed            │
   │          ⚠️ Alert: admin key change       │
   │                                          │
   │  T+0:30  🟡 Safety params removed        │
   │          🔴 Alert: withdrawal limits off  │
   │                                          │
   │  T+1:00  🟡 $2M withdrawn                │
   │          Warning: 40% of threshold        │
   │          Threat: ELEVATED                 │
   │                                          │
   │  T+1:30  🟠 $4M total withdrawn          │
   │          Warning: 80% of threshold        │
   │          Threat: HIGH                     │
   │          ← YOU ARE HERE                   │
   │                                          │
   │  T+2:00  🔴 $6M total → BREACH           │
   │          🛑 CIRCUIT BREAKER TRIGGERED     │
   │          Protocol PAUSED                  │
   │                                          │
   │  T+2:01  📢 Telegram alert sent           │
   └─────────────────────────────────────────┘

9. Saat playback selesai, tampil summary:
   ┌─────────────────────────────────────────┐
   │  📊 Simulation Result                    │
   │                                          │
   │  Without Killswitch:  $285,000,000  🔴   │
   │  With Killswitch:     $6,000,000    🟢   │
   │  Amount Saved:        $279,000,000  💰   │
   │                                          │
   │  Rules Used:                             │
   │  - Withdrawal Rate: $5M / 60s            │
   │  - TVL Drop: 10% / 300s                  │
   │                                          │
   │  [Adjust Parameters & Re-run]            │
   └─────────────────────────────────────────┘

10. User bisa:
    a. Adjust parameter (misal: threshold lebih ketat $2M) → re-run → lihat hasil berbeda
    b. Klik "Connect Wallet" → masuk Flow 2
    c. Tutup browser → selesai
```

**Komponen yang terlibat:**
- Frontend: `app/simulate/page.tsx`, `components/simulate/drift-replay.tsx`, `components/simulate/simulation-controls.tsx`, `hooks/use-simulation.ts`, `lib/api.ts`
- Backend: `handlers/simulate.go`, `services/simulator.go`, `services/evaluator.go`

---

## Flow 9: Disconnect Wallet

**Aktor:** Pemilik protokol (wallet connected)
**Route:** Any → `/`

```
1. User klik wallet address di Navbar → dropdown muncul
2. User klik "Disconnect"
3. Frontend:
   a. Clear stored wallet identity
   b. Disconnect wallet via wallet-adapter
   c. Redirect ke Landing Page (/)
4. Navbar kembali ke "Connect Wallet" button
5. Protected routes tidak bisa diakses lagi
```

**Komponen yang terlibat:**
- Frontend: `components/layout/navbar.tsx`, `app/layout.tsx`

---

## Flow 10: Akses Protected Route Tanpa Wallet

**Aktor:** Pengunjung (tanpa wallet)
**Route:** `/dashboard`, `/protocols/*`

```
1. Pengunjung coba akses /dashboard langsung (via URL)
2. Frontend check: wallet connected? → TIDAK
3. Redirect ke Landing Page (/)
4. Tampil prompt: "Connect your wallet to access the dashboard"
```

**Komponen yang terlibat:**
- Frontend: `app/layout.tsx` (route protection logic)

---

## Flow 11: WebSocket Disconnect & Reconnect

**Aktor:** Pemilik protokol (di dashboard)
**Route:** `/dashboard`

```
1. User di dashboard, WebSocket aktif
2. Koneksi terputus (network issue, server restart, dll)
3. Dashboard tampil: "⚠️ Koneksi terputus" indicator
4. TX feed berhenti update
5. Frontend coba reconnect setelah delay
6. Koneksi berhasil → indicator hilang, feed resume
7. Koneksi gagal → indicator tetap tampil, user bisa refresh manual
```

**Komponen yang terlibat:**
- Frontend: `hooks/use-websocket.ts`, `app/dashboard/page.tsx`
- Backend: `ws/hub.go`, `ws/handler.go`

---

## Ringkasan Interaksi Antar Komponen

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER FLOWS                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Landing ──→ Connect Wallet ──→ Register Protocol ──→ Add Rules  │
│     │              │                    │                  │      │
│     │              ▼                    ▼                  ▼      │
│     │         Dashboard ◄──── Sentinel Monitoring ────► Evaluator │
│     │              │                    │                  │      │
│     │              │              ┌─────┴─────┐           │      │
│     │              │              ▼           ▼           │      │
│     │              │        Circuit      Telegram         │      │
│     │              │        Breaker       Alert           │      │
│     │              │           │                          │      │
│     │              │           ▼                          │      │
│     │              │      Guardian Program                │      │
│     │              │      (On-chain Pause)                │      │
│     │              │           │                          │      │
│     │              │           ▼                          │      │
│     │              ◄── WebSocket Push ◄──────────────────┘      │
│     │              │                                             │
│     │              ▼                                             │
│     │         Resume Protocol                                    │
│     │              │                                             │
│     │              ▼                                             │
│     │      Guardian Program (On-chain Resume)                    │
│     │                                                            │
│     ▼                                                            │
│  Drift Simulation (Public Demo)                                  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow per Komponen

| Step | Frontend | Backend | Smart Contract | Solana | Telegram |
|------|----------|---------|----------------|--------|----------|
| Connect Wallet | wallet-adapter dialog | verify signature | — | — | — |
| Register Protocol | POST /api/protocols | create DB record | — | — | — |
| Add Rule | POST /api/protocols/:id/invariants | create DB record | — | — | — |
| Normal TX | WebSocket receive | Geyser → Evaluate → WS broadcast | — | TX stream | — |
| Breach Detected | WebSocket receive | Evaluate → Circuit Breaker | trigger_pause | TX confirmed | Send alert |
| Auto-Pause | Dashboard update (🔴) | Update DB status | Set status=Paused | State change | Alert sent |
| Resume | POST /api/protocols/:id/resume | Send resume TX | resume instruction | TX confirmed | — |
| Simulation | GET /api/simulate/drift | Replay through Evaluator | — | — | — |
