# Implementation Plan: Killswitch Guardian Program (Anchor Smart Contract)

## Overview

Implementasi Guardian Program sebagai Anchor smart contract di Solana. Program ini menyimpan konfigurasi protokol dan invariant rules sebagai PDA, serta menyediakan mekanisme circuit breaker on-chain (pause/resume). Implementasi mengikuti struktur `contracts/guardian/` sesuai STRUCTURE.md, dengan Rust untuk smart contract dan TypeScript (Mocha + Chai + fast-check) untuk testing.

## Tasks

- [x] 1. Scaffold Anchor project dan setup dependencies
  - [x] 1.1 Initialize Anchor project di `contracts/guardian/` dengan `Cargo.toml`, `Anchor.toml`, dan `package.json`
    - Buat `Cargo.toml` dengan dependency `anchor-lang = "0.30.1"`, edition 2021, crate-type `["cdylib", "lib"]`
    - Buat `Anchor.toml` dengan devnet cluster settings, program keypair path, dan test script `npx ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts`
    - Buat `package.json` dengan dependencies: `@coral-xyz/anchor`, `@solana/web3.js`, `chai`, `mocha`, `ts-mocha`, `typescript`, `fast-check`
    - Buat `tsconfig.json` untuk TypeScript test compilation
    - _Requirements: 14.3, 14.4_

  - [x] 1.2 Create module structure dengan placeholder files
    - Buat directory structure: `programs/guardian/src/`, `programs/guardian/src/instructions/`, `programs/guardian/src/state/`, `tests/`, `migrations/`
    - Buat placeholder `lib.rs` dengan `declare_id!` macro dan empty program module
    - Buat `instructions/mod.rs`, `state/mod.rs` sebagai re-export modules
    - Buat `error.rs` dan `constants.rs` sebagai empty modules
    - _Requirements: 11.1, 11.3_

- [x] 2. Implement constants dan error codes
  - [x] 2.1 Implement `constants.rs` dengan seeds dan limits
    - Define `MAX_INVARIANTS_PER_PROTOCOL: u8 = 10`
    - Define `PROTOCOL_CONFIG_SEED: &[u8] = b"protocol_config"`
    - Define `INVARIANT_RULE_SEED: &[u8] = b"invariant_rule"`
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 2.2 Implement `error.rs` dengan custom error codes
    - Define `GuardianError` enum dengan `#[error_code]` attribute
    - Implement 7 error variants: `Unauthorized`, `AlreadyPaused`, `AlreadyActive`, `InvalidInvariant`, `MaxInvariantsReached`, `InvalidThreshold`, `InvalidTimeWindow`
    - Setiap variant harus memiliki `#[msg("...")]` deskriptif
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Implement state accounts (PDA structs)
  - [x] 3.1 Implement `state/protocol_config.rs` — ProtocolConfig account dan ProtocolStatus enum
    - Define `ProtocolStatus` enum dengan variants `Active` dan `Paused`, derive `AnchorSerialize`, `AnchorDeserialize`, `Clone`, `PartialEq`, `Eq`, `Debug`
    - Define `ProtocolConfig` struct dengan `#[account]` attribute: `program_address` (Pubkey), `guardian_key` (Pubkey), `sentinel_key` (Pubkey), `status` (ProtocolStatus), `created_at` (i64), `invariant_count` (u8)
    - Implement `ProtocolConfig::LEN` constant: `8 + 32 + 32 + 32 + 1 + 8 + 1 = 114`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 12.1, 12.2_

  - [x] 3.2 Implement `state/invariant_rule.rs` — InvariantRule account, InvariantType enum, InvariantAction enum
    - Define `InvariantType` enum dengan 5 variants: `WithdrawalRate`, `TvlDrop`, `AdminKeyChange`, `SingleTxSize`, `ParameterChange`
    - Define `InvariantAction` enum dengan 2 variants: `Pause`, `Alert`
    - Define `InvariantRule` struct dengan `#[account]` attribute: `protocol_config` (Pubkey), `invariant_type` (InvariantType), `threshold` (u64), `time_window` (u32), `action` (InvariantAction), `enabled` (bool), `index` (u8)
    - Implement `InvariantRule::LEN` constant: `8 + 32 + 1 + 8 + 4 + 1 + 1 + 1 = 56`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 12.1, 12.2_

  - [x] 3.3 Update `state/mod.rs` to re-export `protocol_config` dan `invariant_rule` modules
    - _Requirements: 11.3_

- [x] 4. Checkpoint — Verify state compiles
  - Ensure `anchor build` compiles tanpa error. Ask the user if questions arise.

- [x] 5. Implement register_protocol instruction
  - [x] 5.1 Implement `instructions/register_protocol.rs`
    - Define `RegisterProtocol` accounts context struct dengan `#[derive(Accounts)]` dan `#[instruction(program_address: Pubkey)]`
    - `protocol_config`: `init`, `payer = guardian`, `space = ProtocolConfig::LEN`, `seeds = [PROTOCOL_CONFIG_SEED, program_address.as_ref()]`, `bump`
    - `guardian`: `Signer<'info>`, `#[account(mut)]`
    - `system_program`: `Program<'info, System>`
    - Implement `handler` function: set `program_address`, `guardian_key = signer`, `sentinel_key`, `status = Active`, `created_at = Clock::get()?.unix_timestamp`, `invariant_count = 0`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 5.2 Write unit tests for register_protocol in `tests/guardian.ts`
    - Test successful registration: verify PDA created with correct `program_address`, `guardian_key`, `sentinel_key`, `status = Active`, `invariant_count = 0`
    - Test duplicate registration fails with Anchor constraint error
    - _Requirements: 13.1, 5.1, 5.4_

  - [ ]* 5.3 Write property test for register_protocol in `tests/guardian.property.ts`
    - **Property 3: Register Protocol Field Correctness**
    - Generate random `program_address` and `sentinel_key` Pubkeys, verify all fields match after registration
    - Minimum 100 iterations, tag: `Feature: killswitch-guardian, Property 3: Register Protocol Field Correctness`
    - **Validates: Requirements 5.1, 1.4**

- [x] 6. Implement add_invariant instruction
  - [x] 6.1 Implement `instructions/add_invariant.rs`
    - Define `AddInvariant` accounts context struct
    - `protocol_config`: `mut`, seeds constraint, `constraint = guardian_key == guardian.key() @ GuardianError::Unauthorized`, `constraint = invariant_count < MAX_INVARIANTS_PER_PROTOCOL @ GuardianError::MaxInvariantsReached`
    - `invariant_rule`: `init`, `payer = guardian`, `space = InvariantRule::LEN`, `seeds = [INVARIANT_RULE_SEED, protocol_config.key().as_ref(), &[protocol_config.invariant_count]]`, `bump`
    - Implement `handler`: validate `threshold > 0` (InvalidThreshold), `time_window > 0` (InvalidTimeWindow), set all InvariantRule fields, set `enabled = true`, set `index = invariant_count`, increment `invariant_count`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 6.2 Write unit tests for add_invariant
    - Test successful add with all InvariantType variants
    - Test invariant_count increments correctly
    - Test Unauthorized error for non-guardian signer
    - Test MaxInvariantsReached when count == 10
    - Test InvalidThreshold when threshold == 0
    - Test InvalidTimeWindow when time_window == 0
    - _Requirements: 13.2, 13.6, 13.9, 13.10, 13.11_

  - [ ]* 6.3 Write property test for add_invariant
    - **Property 4: Add Invariant Correctness and Count Tracking**
    - Generate random N (1..10), random InvariantType, threshold (1..u64_max), time_window (1..u32_max), InvariantAction; verify invariant_count == N and each rule has correct fields with sequential index
    - Minimum 100 iterations, tag: `Feature: killswitch-guardian, Property 4: Add Invariant Correctness and Count Tracking`
    - **Validates: Requirements 6.1, 6.3, 6.4, 2.5**

- [x] 7. Implement remove_invariant instruction
  - [x] 7.1 Implement `instructions/remove_invariant.rs`
    - Define `RemoveInvariant` accounts context struct
    - `protocol_config`: `mut`, seeds constraint, `constraint = guardian_key == guardian.key() @ GuardianError::Unauthorized`
    - `invariant_rule`: `mut`, `close = guardian`, seeds with `&[invariant_rule.index]`, `constraint = invariant_rule.protocol_config == protocol_config.key()`
    - Implement `handler`: decrement `invariant_count` by 1
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 7.2 Write unit tests for remove_invariant
    - Test successful remove: account closed, rent returned to guardian, invariant_count decremented
    - Test Unauthorized error for non-guardian signer
    - _Requirements: 13.3, 13.6_

  - [ ]* 7.3 Write property test for remove_invariant
    - **Property 5: Remove Invariant Closes Account and Decrements Count**
    - Create N invariants (random 1..10), remove one, verify account closed and invariant_count == N-1
    - Minimum 100 iterations, tag: `Feature: killswitch-guardian, Property 5: Remove Invariant Closes Account and Decrements Count`
    - **Validates: Requirements 7.1, 7.2**

- [x] 8. Implement update_config instruction
  - [x] 8.1 Implement `instructions/update_config.rs`
    - Define `UpdateConfig` accounts context struct
    - `protocol_config`: `mut`, seeds constraint, `constraint = guardian_key == guardian.key() @ GuardianError::Unauthorized`
    - `guardian`: `Signer<'info>`
    - Implement `handler` with `new_guardian_key: Option<Pubkey>` dan `new_sentinel_key: Option<Pubkey>`: update fields only when `Some`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 8.2 Write unit tests for update_config
    - Test update guardian_key only
    - Test update sentinel_key only
    - Test update both keys simultaneously
    - Test Unauthorized error for non-guardian signer
    - _Requirements: 13.6, 8.1, 8.2, 8.3, 8.4_

  - [ ]* 8.3 Write property test for update_config
    - **Property 7: Update Config Key Correctness**
    - Generate random `Option<Pubkey>` combinations, verify updated fields match and unchanged fields remain
    - Minimum 100 iterations, tag: `Feature: killswitch-guardian, Property 7: Update Config Key Correctness`
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [x] 9. Checkpoint — Verify management instructions compile and pass tests
  - Ensure `anchor build` compiles and all tests pass. Ask the user if questions arise.

- [x] 10. Implement trigger_pause instruction
  - [x] 10.1 Implement `instructions/trigger_pause.rs`
    - Define `TriggerPause` accounts context struct
    - `protocol_config`: `mut`, seeds constraint, `constraint = sentinel_key == sentinel.key() @ GuardianError::Unauthorized`
    - `sentinel`: `Signer<'info>`
    - Implement `handler`: require `status != Paused` (AlreadyPaused), set `status = Paused`, emit `msg!` log with `program_address` dan status
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 10.2 Write unit tests for trigger_pause
    - Test successful pause: status changes from Active to Paused
    - Test Unauthorized error for non-sentinel signer
    - Test AlreadyPaused error when protocol already paused
    - Test log message contains program_address and status
    - _Requirements: 13.4, 13.6, 13.7_

- [x] 11. Implement resume instruction
  - [x] 11.1 Implement `instructions/resume.rs`
    - Define `Resume` accounts context struct
    - `protocol_config`: `mut`, seeds constraint, `constraint = guardian_key == guardian.key() @ GuardianError::Unauthorized`
    - `guardian`: `Signer<'info>`
    - Implement `handler`: require `status != Active` (AlreadyActive), set `status = Active`, emit `msg!` log with `program_address` dan status
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 11.2 Write unit tests for resume
    - Test successful resume: status changes from Paused to Active
    - Test Unauthorized error for non-guardian signer
    - Test AlreadyActive error when protocol already active
    - Test log message contains program_address and status
    - _Requirements: 13.5, 13.6, 13.8_

  - [ ]* 11.3 Write property test for pause/resume round-trip
    - **Property 6: Pause/Resume Round-Trip**
    - Register random protocol, trigger_pause then resume, verify status restored to Active; reverse order for Paused protocol
    - Minimum 100 iterations, tag: `Feature: killswitch-guardian, Property 6: Pause/Resume Round-Trip`
    - **Validates: Requirements 9.1, 10.1**

- [x] 12. Wire all instructions into lib.rs entry point
  - [x] 12.1 Update `instructions/mod.rs` to re-export all 6 instruction modules
    - Re-export: `register_protocol`, `add_invariant`, `remove_invariant`, `update_config`, `trigger_pause`, `resume`
    - _Requirements: 11.1, 11.3_

  - [x] 12.2 Update `lib.rs` with complete program module
    - Import all modules: `constants`, `error`, `instructions`, `state`
    - Import instruction context types and enum types (`InvariantType`, `InvariantAction`)
    - Define all 6 instruction handler functions in `#[program]` module, each delegating to its respective `handler` function
    - _Requirements: 11.1, 11.2_

- [x] 13. Checkpoint — Full build and test suite
  - Ensure `anchor build` compiles successfully and all unit + property tests pass. Ask the user if questions arise.

- [x] 14. Write property tests for serialization and authorization
  - [ ]* 14.1 Write property test for serialization round-trip
    - **Property 1: Serialization Round-Trip**
    - Generate random ProtocolConfig states (random Pubkeys, random ProtocolStatus, random i64, random u8) and InvariantRule states (random Pubkey, random InvariantType, random u64, random u32, random InvariantAction, random bool, random u8); serialize with Borsh then deserialize, verify equivalence
    - Minimum 100 iterations, tag: `Feature: killswitch-guardian, Property 1: Serialization Round-Trip`
    - **Validates: Requirements 12.3, 12.4**

  - [ ]* 14.2 Write property test for unauthorized signer rejection
    - **Property 2: Unauthorized Signer Rejection**
    - Generate random unauthorized keypairs, attempt all protected instructions (add_invariant, remove_invariant, update_config, trigger_pause, resume), verify all fail with Unauthorized error
    - Minimum 100 iterations, tag: `Feature: killswitch-guardian, Property 2: Unauthorized Signer Rejection`
    - **Validates: Requirements 3.2, 6.5, 7.3, 8.4, 9.2, 10.2**

- [x] 15. Setup deployment configuration
  - [x] 15.1 Create `migrations/deploy.ts` deployment script
    - Standard Anchor migration script
    - _Requirements: 14.1_

  - [x] 15.2 Verify `Anchor.toml` and `Cargo.toml` are correct for devnet deployment
    - Ensure `Anchor.toml` has `[programs.devnet]` section with program name
    - Ensure `Cargo.toml` has all required dependencies
    - Ensure `declare_id!` in `lib.rs` is ready to be updated with actual Program ID after first deploy
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 16. Final checkpoint — Full build, tests, and deployment readiness
  - Ensure `anchor build` compiles, all tests pass, and project is ready for `anchor deploy --provider.cluster devnet`. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each major phase
- Property tests validate universal correctness properties from the design document (7 properties total)
- Unit tests validate specific examples and edge cases
- All code follows the module structure defined in STRUCTURE.md: `contracts/guardian/programs/guardian/src/`
- Tests live in `contracts/guardian/tests/` — `guardian.ts` for unit tests, `guardian.property.ts` for property-based tests
