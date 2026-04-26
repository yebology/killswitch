"""Solana RPC client — stubs for Guardian Program interaction.

Real Solana interaction will be added when the Guardian Program is deployed.
For now, these stubs log the action and return a dummy TX hash.
"""

import logging
import uuid

logger = logging.getLogger(__name__)


class SolanaClient:
    """Async Solana RPC client for interacting with the Guardian Program."""

    def __init__(self, rpc_url: str, guardian_program_id: str, keypair_json: str):
        self.rpc_url = rpc_url
        self.guardian_program_id = guardian_program_id
        self._keypair_json = keypair_json
        logger.info(
            "SolanaClient initialized (stub mode) — RPC: %s, Program: %s",
            rpc_url,
            guardian_program_id,
        )

    async def trigger_pause(self, protocol_pda: str) -> str:
        """Construct and send a trigger_pause TX to the Guardian Program.

        Returns a dummy TX hash. Real implementation will use solders
        to build and sign the transaction.
        """
        tx_hash = f"stub_pause_{uuid.uuid4().hex[:16]}"
        logger.info(
            "STUB trigger_pause — protocol_pda=%s, tx_hash=%s",
            protocol_pda,
            tx_hash,
        )
        return tx_hash

    async def resume(self, protocol_pda: str, guardian_signature: bytes | None = None) -> str:
        """Construct and send a resume TX to the Guardian Program.

        Returns a dummy TX hash. Real implementation will verify the
        guardian signature and submit the resume instruction.
        """
        tx_hash = f"stub_resume_{uuid.uuid4().hex[:16]}"
        logger.info(
            "STUB resume — protocol_pda=%s, tx_hash=%s",
            protocol_pda,
            tx_hash,
        )
        return tx_hash

    async def get_account_info(self, address: str) -> bytes:
        """Read account data from Solana. Stub returns empty bytes."""
        logger.debug("STUB get_account_info — address=%s", address)
        return b""
