import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

// IDL type will be generated after anchor build
// For now we use any — the actual type comes from the generated IDL
type Guardian = any;

describe("guardian", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Guardian as Program<Guardian>;

  // Shared keypairs
  const guardian = provider.wallet;
  const sentinelKeypair = Keypair.generate();
  const programAddress = Keypair.generate().publicKey;

  // Helper: derive ProtocolConfig PDA
  function findProtocolConfigPDA(progAddr: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("protocol_config"), progAddr.toBuffer()],
      program.programId
    );
  }

  // Helper: derive InvariantRule PDA
  function findInvariantRulePDA(
    configKey: PublicKey,
    index: number
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("invariant_rule"),
        configKey.toBuffer(),
        Buffer.from([index]),
      ],
      program.programId
    );
  }

  // =========================================================================
  // register_protocol tests
  // =========================================================================
  describe("register_protocol", () => {
    it("should create ProtocolConfig PDA with correct fields", async () => {
      // Arrange
      const [configPDA] = findProtocolConfigPDA(programAddress);

      // Act
      await program.methods
        .registerProtocol(programAddress, sentinelKeypair.publicKey)
        .accounts({
          protocolConfig: configPDA,
          guardian: guardian.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Assert
      const config = await program.account.protocolConfig.fetch(configPDA);
      expect(config.programAddress.toBase58()).to.equal(
        programAddress.toBase58()
      );
      expect(config.guardianKey.toBase58()).to.equal(
        guardian.publicKey.toBase58()
      );
      expect(config.sentinelKey.toBase58()).to.equal(
        sentinelKeypair.publicKey.toBase58()
      );
      expect(config.status).to.deep.equal({ active: {} });
      expect(config.invariantCount).to.equal(0);
      expect(config.createdAt.toNumber()).to.be.greaterThan(0);
    });

    it("should reject duplicate registration for same program_address", async () => {
      // Arrange — already registered above
      const [configPDA] = findProtocolConfigPDA(programAddress);

      // Act & Assert
      try {
        await program.methods
          .registerProtocol(programAddress, sentinelKeypair.publicKey)
          .accounts({
            protocolConfig: configPDA,
            guardian: guardian.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (err: any) {
        // Anchor returns a constraint/already-in-use error for duplicate init
        expect(err).to.exist;
      }
    });
  });

  // =========================================================================
  // add_invariant tests
  // =========================================================================
  describe("add_invariant", () => {
    it("should create InvariantRule and increment count", async () => {
      // Arrange
      const [configPDA] = findProtocolConfigPDA(programAddress);
      const [rulePDA] = findInvariantRulePDA(configPDA, 0);

      // Act
      await program.methods
        .addInvariant(
          { withdrawalRate: {} },
          new anchor.BN(5_000_000),
          60,
          { pause: {} }
        )
        .accounts({
          protocolConfig: configPDA,
          invariantRule: rulePDA,
          guardian: guardian.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Assert
      const rule = await program.account.invariantRule.fetch(rulePDA);
      expect(rule.invariantType).to.deep.equal({ withdrawalRate: {} });
      expect(rule.threshold.toNumber()).to.equal(5_000_000);
      expect(rule.timeWindow).to.equal(60);
      expect(rule.action).to.deep.equal({ pause: {} });
      expect(rule.enabled).to.equal(true);
      expect(rule.index).to.equal(0);

      const config = await program.account.protocolConfig.fetch(configPDA);
      expect(config.invariantCount).to.equal(1);
    });

    it("should reject add_invariant with threshold = 0", async () => {
      // Arrange
      const [configPDA] = findProtocolConfigPDA(programAddress);
      const config = await program.account.protocolConfig.fetch(configPDA);
      const [rulePDA] = findInvariantRulePDA(configPDA, config.invariantCount);

      // Act & Assert
      try {
        await program.methods
          .addInvariant({ tvlDrop: {} }, new anchor.BN(0), 60, { alert: {} })
          .accounts({
            protocolConfig: configPDA,
            invariantRule: rulePDA,
            guardian: guardian.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have thrown InvalidThreshold");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.toString()).to.include(
          "InvalidThreshold"
        );
      }
    });

    it("should reject add_invariant with time_window = 0", async () => {
      // Arrange
      const [configPDA] = findProtocolConfigPDA(programAddress);
      const config = await program.account.protocolConfig.fetch(configPDA);
      const [rulePDA] = findInvariantRulePDA(configPDA, config.invariantCount);

      // Act & Assert
      try {
        await program.methods
          .addInvariant(
            { singleTxSize: {} },
            new anchor.BN(1000),
            0,
            { pause: {} }
          )
          .accounts({
            protocolConfig: configPDA,
            invariantRule: rulePDA,
            guardian: guardian.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have thrown InvalidTimeWindow");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.toString()).to.include(
          "InvalidTimeWindow"
        );
      }
    });

    it("should reject add_invariant from unauthorized signer", async () => {
      // Arrange
      const unauthorizedKeypair = Keypair.generate();
      const [configPDA] = findProtocolConfigPDA(programAddress);
      const config = await program.account.protocolConfig.fetch(configPDA);
      const [rulePDA] = findInvariantRulePDA(configPDA, config.invariantCount);

      // Airdrop SOL to unauthorized signer
      const sig = await provider.connection.requestAirdrop(
        unauthorizedKeypair.publicKey,
        1_000_000_000
      );
      await provider.connection.confirmTransaction(sig);

      // Act & Assert
      try {
        await program.methods
          .addInvariant(
            { withdrawalRate: {} },
            new anchor.BN(1000),
            60,
            { pause: {} }
          )
          .accounts({
            protocolConfig: configPDA,
            invariantRule: rulePDA,
            guardian: unauthorizedKeypair.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([unauthorizedKeypair])
          .rpc();
        expect.fail("Should have thrown Unauthorized");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.toString()).to.include(
          "Unauthorized"
        );
      }
    });

    it("should reject add_invariant when MaxInvariantsReached", async () => {
      // Arrange — add 9 more invariants (already have 1) to reach 10
      const [configPDA] = findProtocolConfigPDA(programAddress);

      for (let i = 1; i < 10; i++) {
        const [rulePDA] = findInvariantRulePDA(configPDA, i);
        await program.methods
          .addInvariant(
            { tvlDrop: {} },
            new anchor.BN(1000 + i),
            60 + i,
            { alert: {} }
          )
          .accounts({
            protocolConfig: configPDA,
            invariantRule: rulePDA,
            guardian: guardian.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      }

      // Verify count is 10
      const config = await program.account.protocolConfig.fetch(configPDA);
      expect(config.invariantCount).to.equal(10);

      // Act & Assert — try to add 11th
      const [rulePDA11] = findInvariantRulePDA(configPDA, 10);
      try {
        await program.methods
          .addInvariant(
            { parameterChange: {} },
            new anchor.BN(999),
            30,
            { pause: {} }
          )
          .accounts({
            protocolConfig: configPDA,
            invariantRule: rulePDA11,
            guardian: guardian.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have thrown MaxInvariantsReached");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.toString()).to.include(
          "MaxInvariantsReached"
        );
      }
    });
  });

  // =========================================================================
  // remove_invariant tests
  // =========================================================================
  describe("remove_invariant", () => {
    // Use a fresh protocol for remove tests
    const removeProgramAddr = Keypair.generate().publicKey;
    const removeSentinel = Keypair.generate();

    before(async () => {
      const [configPDA] = findProtocolConfigPDA(removeProgramAddr);
      await program.methods
        .registerProtocol(removeProgramAddr, removeSentinel.publicKey)
        .accounts({
          protocolConfig: configPDA,
          guardian: guardian.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Add one invariant
      const [rulePDA] = findInvariantRulePDA(configPDA, 0);
      await program.methods
        .addInvariant(
          { withdrawalRate: {} },
          new anchor.BN(1000),
          60,
          { pause: {} }
        )
        .accounts({
          protocolConfig: configPDA,
          invariantRule: rulePDA,
          guardian: guardian.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("should close InvariantRule account and decrement count", async () => {
      // Arrange
      const [configPDA] = findProtocolConfigPDA(removeProgramAddr);
      const [rulePDA] = findInvariantRulePDA(configPDA, 0);

      const configBefore = await program.account.protocolConfig.fetch(
        configPDA
      );
      expect(configBefore.invariantCount).to.equal(1);

      // Act
      await program.methods
        .removeInvariant()
        .accounts({
          protocolConfig: configPDA,
          invariantRule: rulePDA,
          guardian: guardian.publicKey,
        })
        .rpc();

      // Assert
      const configAfter = await program.account.protocolConfig.fetch(configPDA);
      expect(configAfter.invariantCount).to.equal(0);

      // Verify account is closed
      const ruleAccount = await provider.connection.getAccountInfo(rulePDA);
      expect(ruleAccount).to.be.null;
    });

    it("should reject remove_invariant from unauthorized signer", async () => {
      // Arrange — add a new invariant first
      const [configPDA] = findProtocolConfigPDA(removeProgramAddr);
      const [rulePDA] = findInvariantRulePDA(configPDA, 0);

      await program.methods
        .addInvariant(
          { tvlDrop: {} },
          new anchor.BN(500),
          30,
          { alert: {} }
        )
        .accounts({
          protocolConfig: configPDA,
          invariantRule: rulePDA,
          guardian: guardian.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const unauthorizedKeypair = Keypair.generate();
      const sig = await provider.connection.requestAirdrop(
        unauthorizedKeypair.publicKey,
        1_000_000_000
      );
      await provider.connection.confirmTransaction(sig);

      // Act & Assert
      try {
        await program.methods
          .removeInvariant()
          .accounts({
            protocolConfig: configPDA,
            invariantRule: rulePDA,
            guardian: unauthorizedKeypair.publicKey,
          })
          .signers([unauthorizedKeypair])
          .rpc();
        expect.fail("Should have thrown Unauthorized");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.toString()).to.include(
          "Unauthorized"
        );
      }
    });
  });

  // =========================================================================
  // update_config tests
  // =========================================================================
  describe("update_config", () => {
    const updateProgramAddr = Keypair.generate().publicKey;
    const updateSentinel = Keypair.generate();

    before(async () => {
      const [configPDA] = findProtocolConfigPDA(updateProgramAddr);
      await program.methods
        .registerProtocol(updateProgramAddr, updateSentinel.publicKey)
        .accounts({
          protocolConfig: configPDA,
          guardian: guardian.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("should update sentinel_key only", async () => {
      // Arrange
      const [configPDA] = findProtocolConfigPDA(updateProgramAddr);
      const newSentinel = Keypair.generate().publicKey;

      // Act
      await program.methods
        .updateConfig(null, newSentinel)
        .accounts({
          protocolConfig: configPDA,
          guardian: guardian.publicKey,
        })
        .rpc();

      // Assert
      const config = await program.account.protocolConfig.fetch(configPDA);
      expect(config.sentinelKey.toBase58()).to.equal(newSentinel.toBase58());
      expect(config.guardianKey.toBase58()).to.equal(
        guardian.publicKey.toBase58()
      );
    });

    it("should update guardian_key only", async () => {
      // Arrange
      const [configPDA] = findProtocolConfigPDA(updateProgramAddr);
      const newGuardian = Keypair.generate().publicKey;
      const configBefore = await program.account.protocolConfig.fetch(
        configPDA
      );
      const sentinelBefore = configBefore.sentinelKey;

      // Act
      await program.methods
        .updateConfig(newGuardian, null)
        .accounts({
          protocolConfig: configPDA,
          guardian: guardian.publicKey,
        })
        .rpc();

      // Assert
      const config = await program.account.protocolConfig.fetch(configPDA);
      expect(config.guardianKey.toBase58()).to.equal(newGuardian.toBase58());
      expect(config.sentinelKey.toBase58()).to.equal(
        sentinelBefore.toBase58()
      );
    });

    it("should reject update_config from unauthorized signer", async () => {
      // Arrange — guardian_key was changed above, so the original wallet is now unauthorized
      const [configPDA] = findProtocolConfigPDA(updateProgramAddr);

      // Act & Assert — original wallet is no longer guardian
      try {
        await program.methods
          .updateConfig(null, Keypair.generate().publicKey)
          .accounts({
            protocolConfig: configPDA,
            guardian: guardian.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown Unauthorized");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.toString()).to.include(
          "Unauthorized"
        );
      }
    });
  });

  // =========================================================================
  // trigger_pause tests
  // =========================================================================
  describe("trigger_pause", () => {
    const pauseProgramAddr = Keypair.generate().publicKey;
    const pauseSentinel = Keypair.generate();

    before(async () => {
      const [configPDA] = findProtocolConfigPDA(pauseProgramAddr);
      await program.methods
        .registerProtocol(pauseProgramAddr, pauseSentinel.publicKey)
        .accounts({
          protocolConfig: configPDA,
          guardian: guardian.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Airdrop to sentinel so it can sign
      const sig = await provider.connection.requestAirdrop(
        pauseSentinel.publicKey,
        1_000_000_000
      );
      await provider.connection.confirmTransaction(sig);
    });

    it("should change status from Active to Paused", async () => {
      // Arrange
      const [configPDA] = findProtocolConfigPDA(pauseProgramAddr);

      // Act
      await program.methods
        .triggerPause()
        .accounts({
          protocolConfig: configPDA,
          sentinel: pauseSentinel.publicKey,
        })
        .signers([pauseSentinel])
        .rpc();

      // Assert
      const config = await program.account.protocolConfig.fetch(configPDA);
      expect(config.status).to.deep.equal({ paused: {} });
    });

    it("should reject trigger_pause when already paused (AlreadyPaused)", async () => {
      // Arrange — already paused from previous test
      const [configPDA] = findProtocolConfigPDA(pauseProgramAddr);

      // Act & Assert
      try {
        await program.methods
          .triggerPause()
          .accounts({
            protocolConfig: configPDA,
            sentinel: pauseSentinel.publicKey,
          })
          .signers([pauseSentinel])
          .rpc();
        expect.fail("Should have thrown AlreadyPaused");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.toString()).to.include(
          "AlreadyPaused"
        );
      }
    });

    it("should reject trigger_pause from unauthorized signer (non-sentinel)", async () => {
      // Arrange — register a fresh protocol
      const freshProgAddr = Keypair.generate().publicKey;
      const freshSentinel = Keypair.generate();
      const [configPDA] = findProtocolConfigPDA(freshProgAddr);

      await program.methods
        .registerProtocol(freshProgAddr, freshSentinel.publicKey)
        .accounts({
          protocolConfig: configPDA,
          guardian: guardian.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Try to pause with guardian (not sentinel)
      try {
        await program.methods
          .triggerPause()
          .accounts({
            protocolConfig: configPDA,
            sentinel: guardian.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown Unauthorized");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.toString()).to.include(
          "Unauthorized"
        );
      }
    });
  });

  // =========================================================================
  // resume tests
  // =========================================================================
  describe("resume", () => {
    const resumeProgramAddr = Keypair.generate().publicKey;
    const resumeSentinel = Keypair.generate();

    before(async () => {
      const [configPDA] = findProtocolConfigPDA(resumeProgramAddr);
      await program.methods
        .registerProtocol(resumeProgramAddr, resumeSentinel.publicKey)
        .accounts({
          protocolConfig: configPDA,
          guardian: guardian.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Airdrop to sentinel
      const sig = await provider.connection.requestAirdrop(
        resumeSentinel.publicKey,
        1_000_000_000
      );
      await provider.connection.confirmTransaction(sig);

      // Pause the protocol first
      await program.methods
        .triggerPause()
        .accounts({
          protocolConfig: configPDA,
          sentinel: resumeSentinel.publicKey,
        })
        .signers([resumeSentinel])
        .rpc();
    });

    it("should change status from Paused to Active", async () => {
      // Arrange
      const [configPDA] = findProtocolConfigPDA(resumeProgramAddr);

      // Act
      await program.methods
        .resume()
        .accounts({
          protocolConfig: configPDA,
          guardian: guardian.publicKey,
        })
        .rpc();

      // Assert
      const config = await program.account.protocolConfig.fetch(configPDA);
      expect(config.status).to.deep.equal({ active: {} });
    });

    it("should reject resume when already active (AlreadyActive)", async () => {
      // Arrange — already active from previous test
      const [configPDA] = findProtocolConfigPDA(resumeProgramAddr);

      // Act & Assert
      try {
        await program.methods
          .resume()
          .accounts({
            protocolConfig: configPDA,
            guardian: guardian.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown AlreadyActive");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.toString()).to.include(
          "AlreadyActive"
        );
      }
    });

    it("should reject resume from unauthorized signer (non-guardian)", async () => {
      // Arrange — pause it again first
      const [configPDA] = findProtocolConfigPDA(resumeProgramAddr);
      await program.methods
        .triggerPause()
        .accounts({
          protocolConfig: configPDA,
          sentinel: resumeSentinel.publicKey,
        })
        .signers([resumeSentinel])
        .rpc();

      const unauthorizedKeypair = Keypair.generate();
      const sig = await provider.connection.requestAirdrop(
        unauthorizedKeypair.publicKey,
        1_000_000_000
      );
      await provider.connection.confirmTransaction(sig);

      // Act & Assert
      try {
        await program.methods
          .resume()
          .accounts({
            protocolConfig: configPDA,
            guardian: unauthorizedKeypair.publicKey,
          })
          .signers([unauthorizedKeypair])
          .rpc();
        expect.fail("Should have thrown Unauthorized");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.toString()).to.include(
          "Unauthorized"
        );
      }
    });
  });
});
