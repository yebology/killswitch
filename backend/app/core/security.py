"""Ed25519 signature verification — simplified stub for hackathon.

Real ed25519 verification will be added when integrating with actual
wallet signing. For now, just checks that the wallet address is non-empty.
"""

import logging

logger = logging.getLogger(__name__)


def verify_signature(
    wallet_address: str, message: str, signature: str
) -> bool:
    """Verify an ed25519 wallet signature.

    STUB: Returns True if wallet_address is non-empty.
    Real implementation will use solders/nacl for ed25519 verification.
    """
    if not wallet_address or not wallet_address.strip():
        logger.warning("Signature verification failed: empty wallet address")
        return False

    # TODO: Real ed25519 verification with solders
    # from solders.pubkey import Pubkey
    # from solders.signature import Signature
    # pubkey = Pubkey.from_string(wallet_address)
    # sig = Signature.from_string(signature)
    # return sig.verify(pubkey, message.encode())

    logger.debug(
        "STUB signature verification passed for wallet: %s", wallet_address
    )
    return True
