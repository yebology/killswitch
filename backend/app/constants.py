"""Invariant types, error messages, and success messages."""

# ---------------------------------------------------------------------------
# Invariant types supported by the Evaluator
# ---------------------------------------------------------------------------
INVARIANT_TYPES: set[str] = {
    "WITHDRAWAL_RATE",
    "TVL_DROP",
    "ADMIN_KEY_CHANGE",
    "SINGLE_TX_SIZE",
    "PARAMETER_CHANGE",
}

# ---------------------------------------------------------------------------
# Invariant action types
# ---------------------------------------------------------------------------
INVARIANT_ACTIONS: set[str] = {"pause", "alert"}

# ---------------------------------------------------------------------------
# Protocol statuses
# ---------------------------------------------------------------------------
PROTOCOL_STATUS_ACTIVE = "active"
PROTOCOL_STATUS_PAUSED = "paused"

# ---------------------------------------------------------------------------
# Threat levels (severity escalation)
# ---------------------------------------------------------------------------
THREAT_LEVEL_LOW = "LOW"
THREAT_LEVEL_ELEVATED = "ELEVATED"
THREAT_LEVEL_HIGH = "HIGH"
THREAT_LEVEL_CRITICAL = "CRITICAL"

# ---------------------------------------------------------------------------
# Error messages
# ---------------------------------------------------------------------------
ERR_PROTOCOL_NOT_FOUND = "Protocol not found"
ERR_PROTOCOL_ALREADY_EXISTS = "Protocol already registered"
ERR_INVARIANT_NOT_FOUND = "Invariant not found"
ERR_INVALID_INVARIANT_TYPE = "Invalid invariant type"
ERR_THRESHOLD_POSITIVE = "Threshold must be a positive number"
ERR_UNAUTHORIZED = "Unauthorized"
ERR_INVALID_WALLET_SIGNATURE = "Invalid wallet signature"
ERR_WALLET_NOT_GUARDIAN = "Wallet is not a registered guardian"
ERR_INTERNAL = "Internal server error"

# ---------------------------------------------------------------------------
# Success messages
# ---------------------------------------------------------------------------
MSG_PROTOCOL_REGISTERED = "Protocol registered successfully"
MSG_PROTOCOL_RESUMED = "Protocol resumed successfully"
MSG_INVARIANT_CREATED = "Invariant created successfully"
MSG_PROTOCOLS_LISTED = "Protocols retrieved successfully"
MSG_PROTOCOL_DETAIL = "Protocol retrieved successfully"
MSG_INVARIANTS_LISTED = "Invariants retrieved successfully"
MSG_SIMULATION_COMPLETE = "Simulation completed successfully"
MSG_HEALTH_OK = "Service is healthy"
MSG_AUTH_SUCCESS = "Wallet verified successfully"
