# Killswitch — Post-Hackathon Roadmap

Dokumen ini berisi semua fitur, improvement, dan rencana yang **tidak masuk MVP hackathon** tapi direncanakan untuk development setelah Solana Frontier (May 11, 2026).

Semua item di sini dikumpulkan dari CONCEPT.md, README.md, RESEARCH.md, STRUCTURE.md, dan diskusi selama spec development.

---

## 📋 Daftar Fitur Post-Hackathon

### 1. Oracle-Based Invariants

**Apa ini:** Invariant rules yang memantau data dari oracle (penyedia harga on-chain seperti Pyth Network dan Switchboard).

**Oracle** = layanan pihak ketiga yang membawa data dunia nyata (harga token, dll) ke dalam blockchain. Blockchain tidak bisa akses internet sendiri, jadi butuh oracle sebagai jembatan.

**Tipe-tipe:**

- **Price Deviation** — "Alarm kalau harga dari oracle berubah > X% dalam Y menit." Contoh: SOL tiba-tiba dari $80 jadi $800 dalam 1 menit = kemungkinan manipulasi oracle.

- **Oracle Staleness** — "Alarm kalau oracle tidak update harga selama > X menit." Contoh: Pyth tidak update harga SOL selama 10 menit = oracle mungkin mati/stuck, data tidak bisa dipercaya.

- **Cross-Oracle Disagreement** — "Alarm kalau Pyth bilang harga SOL $80 tapi Switchboard bilang $800." Kalau dua oracle tidak setuju, salah satu pasti salah = potensi manipulasi.

**Kenapa belum masuk MVP:** Butuh integrasi dengan Pyth SDK dan Switchboard SDK. Lebih kompleks dari sekadar cek "angka > threshold" — perlu baca account data on-chain dari program oracle lain.

**Implementasi nanti:**
- Tambah `ORACLE_PRICE_DEVIATION`, `ORACLE_STALENESS`, `ORACLE_DISAGREEMENT` ke Invariant_Type enum
- Buat oracle client di backend (`clients/pyth.go`, `clients/switchboard.go`)
- Evaluator perlu baca harga dari oracle accounts on-chain dan bandingkan

---

### 2. Pattern-Based Invariants

**Apa ini:** Invariant rules yang mendeteksi pola transaksi mencurigakan, bukan sekadar angka melebihi threshold.

**Tipe-tipe:**

- **Flash Loan Detection** — Deteksi pola: pinjam → manipulasi → untung → bayar balik, semua dalam 1 transaksi atau beberapa transaksi dalam 1 block. Flash loan sering dipakai untuk eksploitasi DeFi.

- **Wash Trading Detection** — Deteksi pola: token A → B → A → B berulang dari wallet yang sama atau wallet terkait. Ini pola "cuci-cuci" untuk inflate volume palsu.

- **Rapid Sequential Withdrawals** — Deteksi pola: 10+ withdrawal berturut-turut dari wallet yang sama dalam waktu singkat. Berbeda dari WITHDRAWAL_RATE yang cek total amount — ini cek frekuensi dari sumber yang sama.

**Kenapa belum masuk MVP:** Butuh analisis pola yang lebih canggih. WITHDRAWAL_RATE cuma cek "total withdrawal > $5M dalam 1 menit" (simpel). Pattern-based perlu track hubungan antar transaksi, identifikasi wallet clusters, dan analisis instruction sequences.

**Implementasi nanti:**
- Tambah `FLASH_LOAN`, `WASH_TRADING`, `SEQUENTIAL_WITHDRAWAL` ke Invariant_Type enum
- Buat pattern analyzer service di backend
- Perlu maintain state lebih kompleks (transaction graph, wallet relationships)

---

### 3. Custom Composable Rules (Level 2 — Full User-Defined)

> **Note:** Level 1 composable rules (severity escalation / multi-signal correlation) sudah masuk MVP. Yang di bawah ini adalah Level 2 — full user-defined composable rules.

**Apa ini:** Rules yang bisa dikombinasikan oleh user sendiri dengan logika AND/OR melalui UI.

**Contoh dari CONCEPT.md:**
```
"IF withdrawal > $1M AND time < 6am UTC THEN pause"
"IF tvl_drop > 5% AND admin_key_changed_recently THEN pause"
```

**Apa bedanya dengan Level 1 (yang sudah di MVP)?**
- **Level 1 (MVP):** Backend otomatis escalate kalau 2+ rules warning bersamaan. User tidak perlu configure apa-apa — logic hardcoded di evaluator.
- **Level 2 (Post-hackathon):** User bisa define sendiri kombinasi rules lewat UI. Misal: "Pause HANYA kalau withdrawal > $1M DAN waktu antara jam 12 malam - 6 pagi."

**Kenapa Level 2 belum masuk MVP:** Butuh rule expression language (DSL) atau visual rule builder, composite evaluator yang handle AND/OR/NOT logic, dan UI drag-and-drop composer.

**Implementasi nanti:**
- Buat rule expression language (DSL) atau visual rule builder
- Evaluator perlu support composite evaluation
- Frontend perlu drag-and-drop rule composer

---

### 4. ML-Based Anomaly Detection

**Apa ini:** Menggunakan machine learning untuk mendeteksi anomali yang tidak bisa ditangkap oleh rules statis.

**Contoh:** ML model yang belajar pola "normal" dari transaksi sebuah protocol selama berminggu-minggu, lalu otomatis flag transaksi yang menyimpang dari pola normal — tanpa perlu set threshold manual.

**Kenapa belum masuk MVP:** Butuh training data, ML infrastructure, dan waktu development yang signifikan. Rule-based sudah cukup untuk demo hackathon.

**Sumber:** CONCEPT.md — "What's NOT in MVP: ML-based anomaly detection (rule-based is enough for hackathon)"

**Implementasi nanti:**
- Collect transaction data selama beta period
- Train anomaly detection model
- Integrate sebagai invariant type tambahan: `ML_ANOMALY`

---

### 5. Multi-Protocol Monitoring

**Apa ini:** Kemampuan untuk monitor banyak protocol sekaligus dari satu Sentinel instance.

**Saat ini (MVP):** Fokus demo satu protocol saja.

**Kenapa belum masuk MVP:** Satu protocol sudah cukup untuk demo. Multi-protocol butuh optimasi performance (subscribe ke banyak program addresses), resource management, dan UI yang lebih kompleks.

**Sumber:** CONCEPT.md — "What's NOT in MVP: Multi-protocol monitoring (focus on one protocol demo)"

**Implementasi nanti:**
- Geyser client subscribe ke multiple program addresses
- Dashboard UI untuk switch antar protocols
- Resource pooling dan rate limiting per protocol

---

### 6. Decentralized Sentinel Network

**Apa ini:** Saat ini Sentinel Service adalah satu server terpusat. Decentralized = banyak node Sentinel yang berjalan independen, sehingga tidak ada single point of failure.

**Kenapa belum masuk MVP:** Centralized sudah cukup untuk demo. Decentralization butuh consensus mechanism, node discovery, dan incentive model.

**Sumber:** CONCEPT.md — "What's NOT in MVP: Decentralized sentinel network (centralized is fine for MVP)"

**Implementasi nanti:**
- Open-source Sentinel sehingga siapa saja bisa run
- Node registry on-chain
- Consensus: majority of sentinels harus agree sebelum trigger pause
- Token incentive untuk sentinel operators

---

### 7. Circuit Breaker Cooldown State

**Apa ini:** Saat ini Guardian Program punya 2 status: Active dan Paused. Cooldown = status transisi setelah resume, dimana protocol aktif tapi masih dalam pengawasan ketat.

**Dari CONCEPT.md:** "Circuit breaker state: active/paused/cooldown"

**Kenapa belum masuk MVP:** Active dan Paused sudah cukup untuk demo flow. Cooldown adalah refinement untuk production use.

**Implementasi nanti:**
- Tambah `Cooldown` variant ke Protocol_Status enum di Guardian Program
- Cooldown period configurable (misal 30 menit setelah resume)
- Selama cooldown, threshold lebih ketat (misal 50% dari normal)
- Auto-transition dari Cooldown ke Active setelah period selesai

---

### 8. Production Mainnet Deployment

**Apa ini:** Deploy ke Solana mainnet (bukan devnet) untuk production use.

**Kenapa belum masuk MVP:** Devnet demo sudah cukup untuk hackathon. Mainnet butuh audit, security review, dan SOC2 compliance.

**Sumber:** CONCEPT.md — "What's NOT in MVP: Production mainnet deployment (devnet demo is sufficient)"

**Implementasi nanti:**
- Security audit oleh pihak ketiga (OtterSec, Neodyme, dll)
- SOC2 compliance
- Mainnet deployment dengan proper key management
- Monitoring dan alerting untuk Sentinel service sendiri

---

### 9. Discord Webhook Alerts (Enhanced)

**Apa ini:** Saat ini Discord alerts sudah ada di spec sebagai basic webhook POST. Enhanced version = rich embeds, interactive buttons, thread creation untuk incident discussion.

**Sumber:** PROGRESS.md — "Nice to Have: Discord webhook alerts"

**Implementasi nanti:**
- Rich embed messages dengan color-coded severity
- Interactive buttons (View Dashboard, Acknowledge, Resume)
- Auto-create thread per incident untuk team discussion

---

### 10. Incident Timeline dengan Detailed TX Breakdown

**Apa ini:** Incident timeline yang lebih detail — setiap transaksi di-breakdown: instruction decoded, accounts involved, token amounts, wallet labels.

**Sumber:** PROGRESS.md — "Nice to Have: Incident timeline with detailed TX breakdown"

**Implementasi nanti:**
- Transaction instruction decoder (parse Anchor IDL)
- Wallet labeling (known wallets: exchanges, protocols, etc.)
- Token amount formatting (convert lamports to SOL, etc.)
- Visual transaction flow diagram

---

### 11. Cross-Program Correlation

**Apa ini:** Mendeteksi serangan yang melibatkan multiple programs. Contoh: attacker manipulasi oracle di Program A, lalu exploit Program B yang pakai data dari Program A.

**Sumber:** CONCEPT.md Post-Hackathon Roadmap Phase 4

**Implementasi nanti:**
- Monitor transaksi across multiple programs
- Correlation engine yang detect related anomalies
- Cross-program alert aggregation

---

### 12. Insurance Integration

**Apa ini:** Integrasi dengan DeFi insurance protocols sehingga protocol yang dilindungi Killswitch bisa dapat coverage/diskon.

**Sumber:** CONCEPT.md Post-Hackathon Roadmap Phase 4

**Implementasi nanti:**
- Partnership dengan insurance protocols (Nexus Mutual equivalent di Solana)
- Risk scoring berdasarkan Killswitch monitoring data
- Automated claim filing saat incident terjadi

---

## 📅 Timeline Post-Hackathon

Dari CONCEPT.md:

| Phase | Timeline | Focus |
|---|---|---|
| **Phase 2: Beta** | May — July 2026 | Partner 3-5 protocols di devnet. Tambah invariant types. Improve dashboard. |
| **Phase 3: Mainnet** | July — September 2026 | Production deployment. First paying customers. SOC2 compliance. |
| **Phase 4: Scale** | September — December 2026 | ML anomaly detection. Decentralized sentinel. Cross-program correlation. Insurance. |

---

## 💰 Revenue Model (Post-Hackathon)

Dari CONCEPT.md:

| Tier | Price | Features |
|---|---|---|
| **Open Source** | Free | Guardian program + basic invariants + manual pause |
| **Pro** | $500/month | Sentinel monitoring + auto-pause + alerts + dashboard |
| **Enterprise** | Custom | Custom invariants + SLA + dedicated support + incident response |

Target: 100 protocols × $500/month = **$600K ARR** within 12 months.

Long-term vision: menjadi "Cloudflare of Solana" — setiap protocol routes through Killswitch untuk proteksi.

---

## 🏆 Potential Customers

Dari RESEARCH.md — setiap DeFi protocol di Solana adalah potential customer post-Drift:

- Jupiter ($8B+ volume)
- Raydium
- Marinade
- Kamino
- Orca
- Drift Protocol (ironis tapi mereka butuh ini sekarang)
- Dan semua protocol DeFi lainnya di Solana

TAM = seluruh ekosistem Solana DeFi.
