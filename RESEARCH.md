# Killswitch — Research & Credentials

Dokumen ini berisi semua hasil riset yang mendasari konsep Killswitch, sumber data, dan credentials yang dipakai selama riset.

---

## 1. Credentials & Tools yang Dipakai

### Colosseum Copilot API
- **Base URL**: `https://copilot.colosseum.com/api/v1`
- **PAT (Personal Access Token)**: ``
- **Expires**: July 12, 2026
- **Scope**: `colosseum_copilot:read`
- **Docs**: https://docs.colosseum.com/copilot/introduction

### Endpoints yang Dipakai
```bash
# Verify token
GET /status

# Search hackathon projects (5,400+ submissions)
POST /search/projects

# Search archive documents (84,000+ docs from 65+ sources)
POST /search/archives

# Get project details by slug
GET /projects/by-slug/:slug

# Analyze cohort distributions
POST /analyze

# Get available filters
GET /filters
```

### Web Sources
- Colosseum blog posts (blog.colosseum.com)
- Colosseum Arena — Hall of Fame (arena.colosseum.org/hackathon/hall-of-fame) — **login required, accessed via browser**
- Colosseum Arena — Dashboard (arena.colosseum.org/hackathon) — **login required, accessed via browser**
- Colosseum Arena — Explore Projects (arena.colosseum.org/projects/explore)
- Colosseum Frontier website (colosseum.com/frontier) — **scanned judges list via browser**
- Base Batches Student Track (base-batches-student-track-3.devfolio.co)
- Base blog (blog.base.org)
- Base 2026 Mission, Vision, Strategy (blog.base.org/2026-mission-vision-and-strategy)
- Solana official docs (solana.com/docs)
- Solana ecosystem report (solana.com/news)
- Various crypto news: CoinDesk, CoinTelegraph, Forbes, Binance, KuCoin, Bitget, BSC News, 4pillars, Helius, Chainstack, QuillAudits, CredShields, LevEx, BlockEden, Delphi Digital, Galaxy Research, Messari

### Browser Sessions (Playwright)
Halaman yang dibuka dan di-scan via browser (login oleh user):
1. `colosseum.com/frontier` — Scan judges list, prize structure, sponsors, workshop schedule
2. `arena.colosseum.org/hackathon` — Dashboard, sidebar navigation, project creation flow
3. `arena.colosseum.org/hackathon/hall-of-fame` — **Full scan semua pemenang Cypherpunk hackathon** (Grand Prize, Consumer, DeFi, Infrastructure, RWAs, Stablecoins, Undefined, Awards)

---

## 2. Riset Step-by-Step (Kronologis)

### Step 1: Baca Kriteria Hackathon
- Baca halaman Colosseum Frontier (colosseum.com/frontier)
- Baca blog "How to Win a Colosseum Hackathon" (blog.colosseum.org)
- Baca blog "Perfecting Your Hackathon Submission" (workshop insights)
- Baca blog "Announcing the Solana Frontier Hackathon"
- **Temuan**: Frontier tidak punya tracks/bounties. Satu pool. Grand Champion $30k. 20 teams $10k. Juri cari startup potential, working demo, business model.

### Step 2: Riset Pemenang Hackathon Sebelumnya
- Baca blog "Announcing the Winners of the Solana Breakout Hackathon"
- Baca blog "Announcing the Winners of the Solana Cypherpunk Hackathon"
- Baca blog "Introducing Colosseum Accelerator Cohort 3"
- Baca blog "Announcing Colosseum's Accelerator Cohort 4"
- Buka Hall of Fame di Arena (login required) — scan semua pemenang Cypherpunk
- **Temuan**: Pola pemenang = solve specific problem + novel primitive + Solana-native + clear business model + working demo

### Step 3: Riset Ekosistem Solana 2026
- Search tren: AI agents, confidential transfers, Firedancer/Alpenglow, stablecoins ($18B+ USDC), Seeker phone, x402, prediction markets
- Search Drift Protocol hack details ($285M, April 1, 2026)
- **Temuan**: AI agent economy = narrative #1. Security = biggest gap post-Drift. Stablecoins track consistently produces accelerator companies.

### Step 4: Copilot API — Competitive Validation
Queries yang dijalankan:

**Query 1: Security monitoring**
```json
{
  "query": "real-time security monitoring smart contract exploit detection auto-pause",
  "limit": 10
}
```
**Hasil**: 6+ projects (Audit.ai, Real-Time Monitoring Tool, B1OCK3, Tossbounty, RugGuard, Bulwark, SIFU). **NONE won any prize.**

**Query 2: AI agent treasury**
```json
{
  "query": "AI agent treasury vault non-custodial spending rules autonomous wallet management",
  "limit": 10
}
```
**Hasil**: AgentVault (Cypherpunk, no prize), Mercantill (4th Stablecoins), Agent-Cred (no prize). **Space already has winners — crowded.**

**Query 3: Private payments**
```json
{
  "query": "confidential transfer private stablecoin payments consumer app privacy",
  "limit": 10
}
```
**Hasil**: Privment, Stealf, Light 2.0, Rupiah Digital. **None won in consumer track. Partial gap.**

**Query 4: Yield aggregator**
```json
{
  "query": "yield aggregator auto-compound DeFi strategy optimizer vault",
  "limit": 10
}
```
**Hasil**: 10+ projects (Glaize, Stratos, ABS Finance, Lince, Convexity, etc.). Cluster crowdedness: 257. **Very crowded — dropped this idea.**

**Query 5: Circuit breaker / exploit prevention**
```json
{
  "query": "protocol circuit breaker exploit prevention anomaly detection guardian emergency pause DeFi protection",
  "limit": 12
}
```
**Hasil**: Tossbounty (Renaissance, no prize), SIFU (Radar, no prize), IRIS Protocol (Cypherpunk, no prize), Bulwark (Cypherpunk, no prize). **13 total found, 0 winners. Biggest untapped category.**

**Query 6: Recurring payments**
```json
{
  "query": "recurring payments subscription billing auto-debit stablecoin scheduled transfers",
  "limit": 12
}
```
**Hasil**: LinkWave (Breakout, no prize), Debyth (Breakout, no prize), MISK.FI (Cypherpunk, no prize). **3 teams tried, 0 won.**

### Step 5: Copilot Archives — Academic Validation
```json
{
  "query": "DeFi exploit prevention circuit breaker real-time monitoring protocol security",
  "limit": 5
}
```
**Hasil**:
- **a16z_crypto**: "Runtime enforcement: A new line of defense against subtle numerical exploits" (similarity: 0.658) — **validates runtime defense approach**
- **arxiv_crypto**: "Maximal Extractable Value in Decentralized Finance" (similarity: 0.441)
- **arxiv_crypto**: "Leveraging Machine Learning for Multichain DeFi Fraud Detection" (similarity: 0.384)
- **arxiv_crypto**: "BLOCKEYE: Hunting For DeFi Attacks on Blockchain" (similarity: 0.369)

### Step 6: Hall of Fame Analysis (Browser)
- Login ke Arena → Hall of Fame → scan semua pemenang Cypherpunk (hackathon terbaru)
- Mapped semua winners per track:
  - Grand Prize: Unruggable (hardware wallet)
  - Consumer: Capitola, Superfan, Fora, toaster.trade, Nomu
  - DeFi: Yumi Finance, Kormos, Rekt, Archer, Hobba
  - Infrastructure: Seer, CORBITS.DEV, Ionic, Pine Analytics, Hyperstack
  - RWAs: Autonom, BORE.FI, Legasi, Pencil Finance, Watchtower
  - Stablecoins: MCPay, Credible, Cloak, Mercantill, SP3ND
  - Undefined: attn.markets, Echo, PlaiPin, Solana ATM, Humanship ID
  - Awards: Samui Wallet (Public Goods), Pythia (University)

### Step 7: Judge Analysis (Browser)
- Scan judges dari colosseum.com/frontier:
  - **w.sol** — DevRel, Drift (tim yang baru kena hack $285M)
  - **Anatoly Yakovenko** — Cofounder, Solana
  - **Jed** — CSO, Anza (build Solana validator)
  - **Arihant Bansal** — Engineer, Arcium (security/privacy)
  - **milian** — Privacy GCR, Arcium
  - **Ray Zhang** — Engineer, Ellipsis Labs (DeFi infra)
  - **Infra** — Raydium (major DEX)
  - **Jacob** — Cofounder, Reflect
  - **Billy** — Founder, attn.markets (Cypherpunk winner)
  - + 20 more judges

### Step 8: Drift Hack Deep Dive
- Search multiple sources tentang Drift Protocol hack:
  - QuillAudits: detailed exploit analysis
  - Forbes: "$285M Hack Proved DeFi's Decentralisation Promise Is Still A Fiction"
  - 4pillars: "Reflections on the Drift Protocol Exploit"
  - CoinDesk, Binance, BSC News, etc.
- **Key facts**:
  - Date: April 1, 2026
  - Amount: $285M drained in 12 minutes
  - Attacker: UNC4736 (North Korean group)
  - Method: Social engineering → compromised 2/5 multisig signers → pre-signed malicious TX → hijacked admin → drained 3 vaults
  - Impact: $3B drop in Solana TVL, SOL below $80
  - Root cause: No runtime defense, no timelock on admin actions, no anomaly detection

### Step 9: Competitor Check
- Search "guardrail.ai" — found existing company doing "Real-Time DeFi Security" but **EVM-focused, not Solana**
- Search various name candidates for branding
- **Conclusion**: No direct Solana-native competitor for runtime security + auto-pause

---

## 3. Key Findings Summary

### Gap Analysis

| Category | Projects in Copilot | Winners | Gap Status |
|---|---|---|---|
| **Security / Circuit Breaker** | 13+ | **0** | 🔴 Full gap — biggest untapped category |
| Recurring Payments | 3+ | 0 | 🟠 Partial gap — concept tried, none won |
| AI Agent Treasury | 5+ | 1 (Mercantill 4th) | 🟡 Partial — adjacent winners exist |
| Yield Aggregator | 10+ | 0 (Carrot HM) | ❌ Crowded — 257 cluster size |
| Private Payments | 5+ | 1 (Cloak 3rd) | 🟡 Partial — infra won, consumer didn't |

### Why Security is the #1 Opportunity

1. **0 winners across 4 hackathons** — biggest untapped category in Colosseum history
2. **Drift $285M hack** — April 1, 2026 (12 days before Frontier started)
3. **Judge w.sol from Drift** — personal connection to the problem
4. **a16z research validates approach** — "Runtime enforcement" paper
5. **guardrail.ai exists for EVM** — market validated, but no Solana equivalent
6. **Every DeFi protocol is a customer** — universal need post-Drift

### Pola Pemenang Colosseum

Dari analisis semua pemenang:
- **Solve very specific problem** — bukan platform generik
- **Novel primitive/mechanism** — Yumi (BNPL), Kormos (fractional reserves), Archer (batch auctions)
- **Solana-native** — leverage speed, low cost, atau fitur unik Solana
- **Clear business model** — bukan research project
- **Working demo** — bukan mockup
- **Founder intent** — serius mau build full-time

---

## 4. Ide yang Dipertimbangkan & Alasan Dipilih/Ditolak

| # | Ide | Score | Alasan |
|---|---|---|---|
| 1 | **Killswitch (Security)** | ✅ Dipilih | 0 winners, Drift timing, judge alignment, full gap |
| 2 | PayStream (Recurring Payments) | Runner-up | 3 tried 0 won, stablecoins track strong, but less wow |
| 3 | AgentOS (Agent Coordination) | Ditolak | Crowded cluster (325), chicken-and-egg risk |
| 4 | SolScope (AI Forensics) | Ditolak | Data/analytics space getting crowded (257 cluster) |
| 5 | SolShop (E-commerce SDK) | Ditolak | SP3ND/Decal already in space, less novel |
| — | AgentVault (Agent Treasury) | Ditolak | Literally already exists as project name in Cypherpunk |
| — | Yieldoor (Yield Aggregator) | Ditolak | 10+ projects, 257 cluster size, very crowded |
| — | Whisper (Private Payments) | Ditolak | Cloak won 3rd, Stealf/Privment/Light 2.0 exist |

---

## 5. Cara Reproduce Riset Ini

### Verify Copilot Token
```bash
curl "https://copilot.colosseum.com/api/v1/status" \
  -H "Authorization: Bearer <PAT>"
```

### Search Projects
```bash
curl -X POST "https://copilot.colosseum.com/api/v1/search/projects" \
  -H "Authorization: Bearer <PAT>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "<your query>",
    "limit": 10,
    "filters": { "winnersOnly": false }
  }'
```

### Search Archives
```bash
curl -X POST "https://copilot.colosseum.com/api/v1/search/archives" \
  -H "Authorization: Bearer <PAT>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "<your query>",
    "limit": 5,
    "maxChunksPerDoc": 2
  }'
```

### Hall of Fame
Login ke https://arena.colosseum.org → Hackathon → Hall of Fame → pilih hackathon (Renaissance/Radar/Breakout/Cypherpunk)

---

## 6. External References

### Drift Hack
- [QuillAudits: Drift Protocol Multisig Exploit](https://www.quillaudits.com/blog/hack-analysis/drift-protocol-multisig-exploit)
- [Forbes: $285M Hack Proved DeFi's Decentralisation Promise Is Still A Fiction](https://www.forbes.com/sites/jemmagreen/2026/04/11/285m-hack-proved-defis-decentralisation-promise-is-still-a-fiction/)
- [4pillars: Reflections on the Drift Protocol Exploit](https://4pillars.io/en/issues/reflections-on-the-drift-protocol-exploit)
- [CredShields: Drift Protocol Incident Post-Mortem](https://discover.credshields.com/drift-protocol-incident-post-mortem/)
- [LevEx: How $500 Drained $285 Million From Drift](https://levex.com/en/blog/drift-protocol-hack-explained)

### Security Research
- [a16z: Runtime enforcement — A new line of defense](https://a16zcrypto.com/posts/article/runtime-enforcement/) (from Copilot archives, similarity: 0.658)
- [Helius: A Hitchhiker's Guide to Solana Program Security](https://www.helius.dev/blog/a-hitchhikers-guide-to-solana-program-security)
- [Cantina: Solana Upgrade Patterns Security Guide 2026](https://cantina.xyz/blog/solana-upgrade-patterns-security-guide-for-2026)
- [BlockEden: How AI-Assisted Formal Verification and Runtime Guardrails Are Reshaping DeFi Security](https://blockeden.xyz/blog/2026/03/13/a16z-rules-as-law-ai-formal-verification-defi-security/)

### Existing Competitors (EVM, not Solana)
- [Guardrail.ai](https://www.guardrail.ai/) — Real-time DeFi security for EVM protocols
- OpenZeppelin Defender — Admin automation + monitoring (EVM)
- Forta Network — Real-time monitoring (EVM)

### Colosseum Resources
- [How to Win a Colosseum Hackathon](https://blog.colosseum.org/how-to-win-a-colosseum-hackathon/)
- [Perfecting Your Hackathon Submission](https://blog.colosseum.org/perfecting-your-hackathon-submission/)
- [Announcing the Solana Frontier Hackathon](https://blog.colosseum.com/announcing-the-solana-frontier-hackathon/)
- [Frontier Hackathon, Copilot, Constellation MCP](https://blog.colosseum.com/frontier-hackathon-colosseum-copilot-constellation-mcp/)
- [Announcing the Winners of the Solana Breakout Hackathon](https://blog.colosseum.com/announcing-the-winners-of-the-solana-breakout-hackathon/)
- [Announcing the Winners of the Solana Cypherpunk Hackathon](https://blog.colosseum.com/announcing-the-winners-of-the-solana-cypherpunk-hackathon/)
- [Introducing Colosseum Accelerator Cohort 3](https://blog.colosseum.com/introducing-colosseum-accelerator-cohort-3/)
- [Announcing Colosseum's Accelerator Cohort 4](https://blog.colosseum.com/announcing-colosseums-accelerator-cohort-4/)
- [Cypherpunk Hackathon, Project RFPs, Prediction Markets](https://blog.colosseum.com/cypherpunk-hackathon-project-rfps-prediction-markets/)
- [Breakout Winners, Confidential SPL Token, Solana Ecosystem Report](https://blog.colosseum.com/breakout-winners-confidential-spl-token-solana-ecosystem-report/)
- [Agent Hackathon Winners, P-Token, Mobile Builder Grants](https://blog.colosseum.com/agent-hackathoin-ptoken-seeker-grants/)
- [2026 Hackathons, Updraft Solana Course, Offline Signer CLI](https://blog.colosseum.com/2026-hackathons-updraft-course-offline-signer-cli/)
- [Announcing Colosseum Eternal and Solana's 2025 Hackathon Schedule](https://blog.colosseum.org/announcing-colosseum-eternal-and-solanas-2025-hackathon-schedule/)
- [Colosseum Copilot Docs — Introduction](https://docs.colosseum.com/copilot/introduction)
- [Colosseum Copilot Docs — Getting Started](https://docs.colosseum.com/copilot/getting-started)
- [Colosseum Copilot Docs — API Reference](https://docs.colosseum.com/copilot/api-reference)
- [Colosseum Frontier Website](https://colosseum.com/frontier) — judges, prizes, sponsors, workshops
- [Colosseum Arena — Hall of Fame](https://arena.colosseum.org/hackathon/hall-of-fame) — all Cypherpunk winners (browser login)
- [Colosseum Arena — Dashboard](https://arena.colosseum.org/hackathon) — project creation flow (browser login)

### Base Ecosystem (untuk perbandingan Miora vs Killswitch)
- [Base Batches Student Track — Devfolio](https://base-batches-student-track-3.devfolio.co/)
- [Introducing Base Batches 003](https://blog.base.org/introducing-base-batches-003-2)
- [Base 2026 Mission, Vision, and Strategy](https://blog.base.org/2026-mission-vision-and-strategy)
- [Coinbase AgentKit Docs](https://docs.cdp.coinbase.com/agentkit/docs/add-agent-capabilities)
- [Coinbase Agentic Wallets](https://docs.cdp.coinbase.com/agentic-wallet/welcome)
- [EAS — Ethereum Attestation Service](https://attest.org/)
- [x402 Protocol](https://www.kucoin.com/blog/en-what-is-x402-why-this-protocol-is-the-disruptive-backbone-for-ai-agents)

### Solana Ecosystem 2026
- [Solana DeFi: The Complete Ecosystem Guide 2026](https://hittincorners.com/guides/solana-defi)
- [A 2026 Guide to SOL and Its Ecosystem](https://www.kerberus.com/learn/solana-101-guide-ecosystem-security-narratives-trends/)
- [Delphi Digital: 2026 is the Year of Solana](https://www.htx.com/news/delphi-digital-solana-to-usher-in-the-most-radical-technical-o4B3ulOW/)
- [CoinDesk: Solana Bets on AI Agents](https://www.coindesk.com/business/2026/03/25/solana-bets-on-ai-agents-foundation-says-network-is-becoming-core-infrastructure-for-agentic-internet)
- [Solana Ecosystem Report: February 2026](https://solana.com/news/state-of-solana-february-2026)
- [Solana Confidential Transfers Guide](https://chainstack.com/solana-confidential-transfers/)
- [Helius: Confidential Balances](https://www.helius.dev/blog/confidential-balances)
- [Solana Mobile Seeker — SKR Token](https://solanacompass.com/learn/breakpoint-25/update-from-solana-mobile-the-seeker-economy)
- [Solana's Bold Scalability Leap — Alpenglow & Firedancer](https://ethers.news/articles/alpenglow-and-firedancer-solanas-2026-scalability-leap)
- [Anza 2026 Roadmap](https://www.anza.xyz/blog/anza26)
- [RockawaX: Technical Assessment of Solana Protocol Opportunities](https://www.rockawayx.com/insights/a-technical-assessment-of-solana-protocol-opportunities-and-current-progress)
- [Solana Trading Infrastructure — Full Guide 2026](https://rpcfast.com/blog/solana-trading-infrastructure)

### AI Agent Economy
- [MEXC: Solana and the Agent Economy](https://blog.mexc.com/news/solana-and-the-agent-economy-will-the-future-internet-be-driven-by-ai-transactions/)
- [Tapbit: The Rise of the Agent Economy](https://www.tapbit.com/en/learn/article/ai-agents-solana-pay-per-use-internet-20260331)
- [Coinbase Launches Agentic Wallets](https://cointelegraph.com/news/coinbase-launches-crypto-wallets-built-ai-agents)
- [MEXC: How AI Agents Execute On-Chain Trades 2026](https://blog.mexc.com/autonomous-wealth-in-crypto-how-ai-agents-execute-on-chain-trades-optimize-defi-yields-and-outperform-human-traders-in-2026/)
- [DuelDuck: AI Agents in Prediction Markets](https://duelduck.com/blog/ai-agents-in-prediction-markets-autonomous-trading-duelduck)

### Wallet Reputation / Credit Score (untuk perbandingan)
- [Wallet Reputation Is the New Credit Score](https://rnwy.com/blog/wallet-reputation-credit-score)
- [Web3 Reputation Score Comparison 2026](https://chainaware.ai/blog/web3-reputation-score-comparison-2026/)
- [Cred Protocol — MCP Services for AI Agents](https://credprotocol.com/blog/mcp-services-ai-agents-reputation-intelligence)
- [Galaxy Research: The New Age of Onchain Credit](https://www.galaxy.com/insights/perspectives/the-new-age-in-onchain-credit-markets)

### BB003 Cohort Projects (untuk perbandingan)
- [Agently — Routing Layer for AI Agents](https://agently.to/)
- [OPAL — Privacy Perp DEX](https://opaldex.com/)
- [JPEG App — Opinion Markets on Photos](https://jpeg.fun)
- [Blockrun.ai — Infra for AI Agents](https://lobehub.com/skills/ngxtm-devkit-blockrun)
