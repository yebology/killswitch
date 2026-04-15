# Requirements Document — Killswitch Guardian Program (Anchor Smart Contract)

## Introduction

Dokumen ini mendefinisikan requirements untuk **Guardian Program**, yaitu komponen on-chain dari Killswitch — sistem deteksi eksploit real-time dan auto-pause untuk protokol DeFi di Solana. Guardian Program adalah smart contract yang dibangun menggunakan Anchor framework (Rust) dan di-deploy ke Solana blockchain.

Guardian Program bertanggung jawab untuk:

- Menyimpan konfigurasi protokol sebagai PDA (Program Derived Address) termasuk program address, guardian key, sentinel key, dan status
- Menyimpan invariant rules sebagai PDA (tipe, threshold, time window, action)
- Menyediakan fungsi circuit breaker on-chain (pause/resume protokol)
- Mengotorisasi sentinel service untuk memicu emergency pause
- Mengotorisasi guardian wallet untuk melakukan resume setelah review

Scope dokumen ini mencakup MVP untuk hackathon Solana Frontier, dengan fokus pada 6 instructions utama: `register_protocol`, `add_invariant`, `remove_invariant`, `update_config`, `trigger_pause`, dan `resume`.

## Glossary

- **Guardian_Program**: Smart contract Anchor di Solana yang menyimpan konfigurasi protokol, invariant rules, dan state circuit breaker sebagai PDA
- **ProtocolConfig**: PDA account yang menyimpan konfigurasi sebuah protokol yang dilindungi, termasuk program_address, guardian_key, sentinel_key, status, created_at, dan invariant_count
- **InvariantRule**: PDA account yang menyimpan satu aturan keamanan (invariant) untuk sebuah protokol, termasuk invariant_type, threshold, time_window, action, enabled, dan index
- **Guardian_Key**: Pubkey wallet yang memiliki otoritas penuh atas konfigurasi protokol (register, add/remove invariant, update config, resume)
- **Sentinel_Key**: Pubkey service off-chain (Sentinel Service) yang diotorisasi untuk memicu emergency pause saat threshold dilanggar
- **PDA**: Program Derived Address — akun deterministik yang diturunkan dari seeds tertentu dan dimiliki oleh program
- **CPI**: Cross-Program Invocation — mekanisme untuk memanggil instruksi program lain dari dalam Guardian_Program
- **Circuit_Breaker**: Mekanisme on-chain yang mengubah status protokol dari Active ke Paused, sehingga transaksi berikutnya ditolak
- **Protocol_Status**: Enum yang merepresentasikan status protokol: Active (beroperasi normal) atau Paused (dihentikan sementara karena anomali terdeteksi)
- **Invariant_Type**: Enum yang mendefinisikan jenis aturan keamanan: WithdrawalRate, TvlDrop, AdminKeyChange, SingleTxSize, ParameterChange
- **Invariant_Action**: Enum yang mendefinisikan aksi saat invariant dilanggar: Pause (auto-pause on-chain) atau Alert (notifikasi saja)
- **Seeds**: Byte strings deterministik yang digunakan untuk menurunkan alamat PDA — memastikan setiap PDA unik dan dapat ditemukan kembali
- **Anchor_Framework**: Framework Rust untuk pengembangan smart contract di Solana yang menyediakan macro, serialization, dan account validation
- **Signer**: Akun yang menandatangani transaksi, digunakan untuk verifikasi otorisasi

## Requirements

### Requirement 1: Definisi State ProtocolConfig

**User Story:** Sebagai developer, saya ingin state ProtocolConfig tersimpan sebagai PDA on-chain dengan field yang lengkap, sehingga konfigurasi setiap protokol yang dilindungi dapat diakses dan diverifikasi secara transparan di blockchain.

#### Acceptance Criteria

1. THE Guardian_Program SHALL define a ProtocolConfig account struct containing the following fields: program_address (Pubkey), guardian_key (Pubkey), sentinel_key (Pubkey), status (Protocol_Status enum), created_at (i64 Unix timestamp), and invariant_count (u8)
2. THE Guardian_Program SHALL derive the ProtocolConfig PDA address using seeds ["protocol_config", protocol_program_address] where protocol_program_address is the Pubkey bytes of the protected protocol
3. THE Guardian_Program SHALL define the Protocol_Status enum with exactly two variants: Active and Paused
4. THE Guardian_Program SHALL initialize the invariant_count field to 0 when a new ProtocolConfig is created

### Requirement 2: Definisi State InvariantRule

**User Story:** Sebagai developer, saya ingin state InvariantRule tersimpan sebagai PDA on-chain dengan field yang lengkap, sehingga setiap aturan keamanan dapat diakses dan diverifikasi secara transparan di blockchain.

#### Acceptance Criteria

1. THE Guardian_Program SHALL define an InvariantRule account struct containing the following fields: protocol_config (Pubkey reference to parent ProtocolConfig), invariant_type (Invariant_Type enum), threshold (u64), time_window (u32 in seconds), action (Invariant_Action enum), enabled (bool), and index (u8)
2. THE Guardian_Program SHALL derive the InvariantRule PDA address using seeds ["invariant_rule", protocol_config_pubkey, index] where protocol_config_pubkey is the Pubkey bytes of the parent ProtocolConfig and index is a single byte
3. THE Guardian_Program SHALL define the Invariant_Type enum with exactly five variants: WithdrawalRate, TvlDrop, AdminKeyChange, SingleTxSize, and ParameterChange
4. THE Guardian_Program SHALL define the Invariant_Action enum with exactly two variants: Pause and Alert
5. THE Guardian_Program SHALL initialize the enabled field to true when a new InvariantRule is created

### Requirement 3: Definisi Error Codes

**User Story:** Sebagai developer, saya ingin error codes yang deskriptif dan spesifik untuk setiap kondisi error, sehingga debugging dan penanganan error menjadi jelas.

#### Acceptance Criteria

1. THE Guardian_Program SHALL define the following custom error codes: Unauthorized (caller is not authorized for this action), AlreadyPaused (protocol is already paused), AlreadyActive (protocol is already active), InvalidInvariant (invalid invariant type or parameters), MaxInvariantsReached (protocol has reached maximum invariant count), InvalidThreshold (threshold must be positive), and InvalidTimeWindow (time window must be positive)
2. WHEN an unauthorized caller attempts any protected instruction, THE Guardian_Program SHALL return the Unauthorized error code
3. WHEN a validation check fails, THE Guardian_Program SHALL return the specific error code corresponding to the validation failure

### Requirement 4: Definisi Constants

**User Story:** Sebagai developer, saya ingin constants yang terdefinisi dengan jelas untuk seeds dan limits, sehingga nilai-nilai kritis konsisten di seluruh program.

#### Acceptance Criteria

1. THE Guardian_Program SHALL define the constant MAX_INVARIANTS_PER_PROTOCOL with a value of 10
2. THE Guardian_Program SHALL define the constant PROTOCOL_CONFIG_SEED with a value of "protocol_config"
3. THE Guardian_Program SHALL define the constant INVARIANT_RULE_SEED with a value of "invariant_rule"
4. THE Guardian_Program SHALL use these constants consistently across all instructions for PDA derivation and validation

### Requirement 5: Instruksi register_protocol

**User Story:** Sebagai pemilik protokol, saya ingin mendaftarkan program Solana saya di Guardian Program, sehingga program saya dapat dilindungi oleh sistem circuit breaker Killswitch.

#### Acceptance Criteria

1. WHEN the register_protocol instruction is invoked with a program_address and sentinel_key, THE Guardian_Program SHALL create a new ProtocolConfig PDA with the provided program_address, the transaction signer as guardian_key, the provided sentinel_key, status set to Active, created_at set to the current Solana clock timestamp, and invariant_count set to 0
2. THE Guardian_Program SHALL derive the ProtocolConfig PDA using seeds [PROTOCOL_CONFIG_SEED, program_address] and the program ID as the PDA owner
3. THE Guardian_Program SHALL accept any signer as the payer and guardian for the register_protocol instruction
4. IF a ProtocolConfig PDA with the same program_address already exists, THEN THE Guardian_Program SHALL reject the transaction with an Anchor account constraint error (PDA already initialized)
5. WHEN the ProtocolConfig PDA is created, THE Guardian_Program SHALL allocate sufficient space for all ProtocolConfig fields plus the 8-byte Anchor discriminator

### Requirement 6: Instruksi add_invariant

**User Story:** Sebagai guardian protokol, saya ingin menambahkan invariant rule ke protokol saya, sehingga Sentinel Service dapat mengevaluasi transaksi berdasarkan aturan keamanan yang saya tentukan.

#### Acceptance Criteria

1. WHEN the add_invariant instruction is invoked with invariant_type, threshold, time_window, and action, THE Guardian_Program SHALL create a new InvariantRule PDA associated with the specified ProtocolConfig
2. THE Guardian_Program SHALL derive the InvariantRule PDA using seeds [INVARIANT_RULE_SEED, protocol_config_pubkey, invariant_count] where invariant_count is the current count from the ProtocolConfig before incrementing
3. WHEN the InvariantRule PDA is created, THE Guardian_Program SHALL increment the invariant_count field on the parent ProtocolConfig by 1
4. THE Guardian_Program SHALL set the index field of the new InvariantRule to the value of invariant_count before incrementing
5. IF the signer is not the guardian_key of the specified ProtocolConfig, THEN THE Guardian_Program SHALL return the Unauthorized error
6. IF the invariant_count of the ProtocolConfig is equal to MAX_INVARIANTS_PER_PROTOCOL, THEN THE Guardian_Program SHALL return the MaxInvariantsReached error
7. IF the threshold value is 0, THEN THE Guardian_Program SHALL return the InvalidThreshold error
8. IF the time_window value is 0, THEN THE Guardian_Program SHALL return the InvalidTimeWindow error

### Requirement 7: Instruksi remove_invariant

**User Story:** Sebagai guardian protokol, saya ingin menghapus invariant rule yang tidak lagi diperlukan, sehingga aturan keamanan tetap relevan dan tidak membebani evaluasi.

#### Acceptance Criteria

1. WHEN the remove_invariant instruction is invoked for a specific InvariantRule PDA, THE Guardian_Program SHALL close the InvariantRule account and return the rent lamports to the guardian wallet
2. WHEN the InvariantRule account is closed, THE Guardian_Program SHALL decrement the invariant_count field on the parent ProtocolConfig by 1
3. IF the signer is not the guardian_key of the parent ProtocolConfig, THEN THE Guardian_Program SHALL return the Unauthorized error
4. IF the specified InvariantRule PDA does not exist, THEN THE Guardian_Program SHALL reject the transaction with an Anchor account constraint error

### Requirement 8: Instruksi update_config

**User Story:** Sebagai guardian protokol, saya ingin memperbarui konfigurasi protokol (guardian key atau sentinel key), sehingga saya dapat merotasi key atau mengganti sentinel service tanpa harus mendaftar ulang.

#### Acceptance Criteria

1. WHEN the update_config instruction is invoked with a new_guardian_key parameter, THE Guardian_Program SHALL update the guardian_key field on the specified ProtocolConfig PDA to the new value
2. WHEN the update_config instruction is invoked with a new_sentinel_key parameter, THE Guardian_Program SHALL update the sentinel_key field on the specified ProtocolConfig PDA to the new value
3. THE Guardian_Program SHALL allow updating guardian_key and sentinel_key independently or together in a single instruction call
4. IF the signer is not the current guardian_key of the specified ProtocolConfig, THEN THE Guardian_Program SHALL return the Unauthorized error

### Requirement 9: Instruksi trigger_pause

**User Story:** Sebagai Sentinel Service, saya ingin memicu emergency pause pada protokol yang dilindungi saat threshold dilanggar, sehingga dana terlindungi sebelum kerusakan lebih lanjut terjadi.

#### Acceptance Criteria

1. WHEN the trigger_pause instruction is invoked, THE Guardian_Program SHALL set the status field of the specified ProtocolConfig PDA to Paused
2. IF the signer is not the sentinel_key of the specified ProtocolConfig, THEN THE Guardian_Program SHALL return the Unauthorized error
3. IF the status of the specified ProtocolConfig is already Paused, THEN THE Guardian_Program SHALL return the AlreadyPaused error
4. WHEN the trigger_pause instruction succeeds, THE Guardian_Program SHALL emit a log message containing the protocol program_address and the new status

### Requirement 10: Instruksi resume

**User Story:** Sebagai guardian protokol, saya ingin melakukan resume pada protokol yang di-pause setelah review, sehingga protokol dapat kembali beroperasi normal setelah insiden ditangani.

#### Acceptance Criteria

1. WHEN the resume instruction is invoked, THE Guardian_Program SHALL set the status field of the specified ProtocolConfig PDA to Active
2. IF the signer is not the guardian_key of the specified ProtocolConfig, THEN THE Guardian_Program SHALL return the Unauthorized error
3. IF the status of the specified ProtocolConfig is already Active, THEN THE Guardian_Program SHALL return the AlreadyActive error
4. WHEN the resume instruction succeeds, THE Guardian_Program SHALL emit a log message containing the protocol program_address and the new status

### Requirement 11: Organisasi Kode Program

**User Story:** Sebagai developer, saya ingin kode program terorganisir mengikuti best practices Anchor, sehingga kode mudah di-maintain, di-review, dan di-extend.

#### Acceptance Criteria

1. THE Guardian_Program SHALL organize source code into the following module structure: lib.rs (program entry point with declare_id! and instruction handlers), instructions/ (module per instruction: register_protocol.rs, add_invariant.rs, remove_invariant.rs, update_config.rs, trigger_pause.rs, resume.rs), state/ (module per account type: protocol_config.rs, invariant_rule.rs), error.rs (custom error codes), and constants.rs (seeds and limits)
2. THE Guardian_Program SHALL define each instruction's account validation struct (Accounts context) in its respective instruction module file
3. THE Guardian_Program SHALL re-export all instruction modules and state modules via mod.rs files

### Requirement 12: Serialisasi dan Deserialisasi State

**User Story:** Sebagai developer, saya ingin state on-chain dapat di-serialize dan di-deserialize secara konsisten, sehingga data dapat dibaca oleh client (backend, frontend, tests) dengan benar.

#### Acceptance Criteria

1. THE Guardian_Program SHALL derive AnchorSerialize and AnchorDeserialize traits on all account structs (ProtocolConfig, InvariantRule) and all enum types (Protocol_Status, Invariant_Type, Invariant_Action)
2. THE Guardian_Program SHALL use the #[account] attribute macro on ProtocolConfig and InvariantRule structs for automatic Anchor discriminator and space calculation
3. FOR ALL valid ProtocolConfig states, serializing the account data then deserializing it back SHALL produce an equivalent ProtocolConfig object (round-trip property)
4. FOR ALL valid InvariantRule states, serializing the account data then deserializing it back SHALL produce an equivalent InvariantRule object (round-trip property)

### Requirement 13: Test Suite

**User Story:** Sebagai developer, saya ingin test suite yang komprehensif untuk semua instruksi, sehingga kebenaran program dapat diverifikasi sebelum deployment.

#### Acceptance Criteria

1. WHEN the register_protocol instruction is tested, THE test suite SHALL verify that the ProtocolConfig PDA is created with the correct program_address, guardian_key matching the signer, sentinel_key matching the provided key, status set to Active, and invariant_count set to 0
2. WHEN the add_invariant instruction is tested, THE test suite SHALL verify that the InvariantRule PDA is created with the correct invariant_type, threshold, time_window, action, enabled set to true, and index matching the previous invariant_count, and that the ProtocolConfig invariant_count is incremented by 1
3. WHEN the remove_invariant instruction is tested, THE test suite SHALL verify that the InvariantRule account is closed, the rent lamports are returned to the guardian, and the ProtocolConfig invariant_count is decremented by 1
4. WHEN the trigger_pause instruction is tested with the correct sentinel_key, THE test suite SHALL verify that the ProtocolConfig status changes from Active to Paused
5. WHEN the resume instruction is tested with the correct guardian_key, THE test suite SHALL verify that the ProtocolConfig status changes from Paused to Active
6. WHEN any protected instruction is tested with an unauthorized signer, THE test suite SHALL verify that the transaction is rejected with the Unauthorized error
7. WHEN the trigger_pause instruction is tested on an already-paused protocol, THE test suite SHALL verify that the transaction is rejected with the AlreadyPaused error
8. WHEN the resume instruction is tested on an already-active protocol, THE test suite SHALL verify that the transaction is rejected with the AlreadyActive error
9. WHEN the add_invariant instruction is tested with invariant_count equal to MAX_INVARIANTS_PER_PROTOCOL, THE test suite SHALL verify that the transaction is rejected with the MaxInvariantsReached error
10. WHEN the add_invariant instruction is tested with threshold equal to 0, THE test suite SHALL verify that the transaction is rejected with the InvalidThreshold error
11. WHEN the add_invariant instruction is tested with time_window equal to 0, THE test suite SHALL verify that the transaction is rejected with the InvalidTimeWindow error

### Requirement 14: Deployment ke Devnet

**User Story:** Sebagai developer, saya ingin Guardian Program di-deploy ke Solana devnet, sehingga backend Sentinel Service dan frontend dashboard dapat berinteraksi dengan program secara end-to-end.

#### Acceptance Criteria

1. THE Guardian_Program SHALL be deployable to Solana devnet using Anchor CLI command `anchor deploy --provider.cluster devnet`
2. WHEN the Guardian_Program is deployed, THE deployment process SHALL output the Program ID yang dapat disimpan di backend .env sebagai GUARDIAN_PROGRAM_ID
3. THE Guardian_Program SHALL include an Anchor.toml configuration file with devnet cluster settings and the program keypair path
4. THE Guardian_Program SHALL include a Cargo.toml with all required Anchor and Solana dependencies