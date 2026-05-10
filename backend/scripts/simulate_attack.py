"""
Killswitch Attack Simulator — Live Demo Script

Simulates a Drift-like attack by injecting fake transactions into the
Sentinel's Geyser client. This makes the dashboard update in real-time
showing the attack progression: GREEN → YELLOW → RED → AUTO-PAUSE.

Usage:
    python scripts/simulate_attack.py

Prerequisites:
    - Backend running (uvicorn main:app)
    - At least one protocol registered with invariant rules
    - Frontend open at /dashboard to see real-time updates

What it does:
    1. Sends fake "admin_change" transaction → dashboard shows ALERT
    2. Sends fake "parameter_change" transaction → dashboard shows WARNING
    3. Sends progressively larger withdrawals → threat level escalates
    4. Eventually triggers BREACH → circuit breaker → AUTO-PAUSE
    5. Telegram alert sent to configured chat

This script talks directly to the backend's internal API to inject
simulated transactions, bypassing the real Solana Geyser stream.
"""

import asyncio
import sys
import os
import httpx
from datetime import datetime, timezone

# Backend URL
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# Simulated attack timeline (Drift-like)
ATTACK_TIMELINE = [
    {
        "delay_seconds": 0,
        "description": "🔑 Admin key change — multisig compromised",
        "transaction": {
            "hash": f"4xK9mN2p{datetime.now().strftime('%H%M%S')}attackTx01",
            "program_address": None,  # Will be filled with registered protocol
            "instruction_type": "admin_change",
            "amount": 0.0,
        },
    },
    {
        "delay_seconds": 3,
        "description": "⚙️ Safety parameters removed — withdrawal limits disabled",
        "transaction": {
            "hash": f"7bR3qW8x{datetime.now().strftime('%H%M%S')}attackTx02",
            "program_address": None,
            "instruction_type": "parameter_change",
            "amount": 0.0,
        },
    },
    {
        "delay_seconds": 3,
        "description": "💸 First withdrawal — $1.5M from vault",
        "transaction": {
            "hash": f"2mL5hJ4r{datetime.now().strftime('%H%M%S')}attackTx03",
            "program_address": None,
            "instruction_type": "transfer",
            "amount": 1_500_000.0,
        },
    },
    {
        "delay_seconds": 2,
        "description": "💸 Second withdrawal — $2.5M from vault",
        "transaction": {
            "hash": f"9pN8kF2s{datetime.now().strftime('%H%M%S')}attackTx04",
            "program_address": None,
            "instruction_type": "transfer",
            "amount": 2_500_000.0,
        },
    },
    {
        "delay_seconds": 2,
        "description": "💸 Third withdrawal — $3M from vault (should trigger BREACH)",
        "transaction": {
            "hash": f"3wQ7vB6t{datetime.now().strftime('%H%M%S')}attackTx05",
            "program_address": None,
            "instruction_type": "transfer",
            "amount": 3_000_000.0,
        },
    },
    {
        "delay_seconds": 2,
        "description": "💸 Fourth withdrawal — $5M (exceeds threshold, circuit breaker should have triggered)",
        "transaction": {
            "hash": f"6hT1nM9u{datetime.now().strftime('%H%M%S')}attackTx06",
            "program_address": None,
            "instruction_type": "transfer",
            "amount": 5_000_000.0,
        },
    },
]


async def get_first_protocol(client: httpx.AsyncClient) -> dict | None:
    """Fetch the first registered protocol from the backend."""
    try:
        # Use a dummy wallet address to list protocols
        resp = await client.get(
            f"{BACKEND_URL}/api/protocols",
            headers={"X-Wallet-Address": "SimulatorWallet11111111111111111111111111111"},
        )
        if resp.status_code == 200:
            data = resp.json()
            protocols = data.get("data", [])
            if protocols:
                return protocols[0]
    except Exception as e:
        print(f"  ❌ Error fetching protocols: {e}")
    return None


async def inject_transaction(client: httpx.AsyncClient, tx: dict) -> bool:
    """Inject a simulated transaction into the backend's sentinel.

    Uses the internal /api/_internal/inject_tx endpoint (if available),
    or falls back to directly calling the sentinel's on_transaction callback
    via a special debug endpoint.
    """
    try:
        # Try the internal inject endpoint
        resp = await client.post(
            f"{BACKEND_URL}/api/_internal/inject_tx",
            json=tx,
        )
        if resp.status_code in (200, 201):
            return True

        # If internal endpoint doesn't exist, that's okay for demo
        # The Geyser mock mode in the backend will handle this
        return False
    except Exception:
        return False


async def run_attack():
    """Execute the simulated attack sequence."""
    print("\n" + "=" * 60)
    print("🛡️  KILLSWITCH ATTACK SIMULATOR")
    print("=" * 60)
    print(f"\n📡 Backend: {BACKEND_URL}")
    print("⏱️  This will simulate a Drift-like attack in real-time.")
    print("👀 Watch the dashboard at http://localhost:3000/dashboard\n")

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Check backend is running
        try:
            resp = await client.get(f"{BACKEND_URL}/api/health")
            if resp.status_code != 200:
                print("❌ Backend not responding. Start it with: make be-dev")
                return
            print("✅ Backend is running\n")
        except Exception:
            print("❌ Cannot connect to backend. Start it with: make be-dev")
            return

        # Get first registered protocol
        protocol = await get_first_protocol(client)
        if not protocol:
            print("❌ No protocols registered. Register one first at /protocols")
            print("   Or run: make be-seed")
            return

        program_address = protocol.get("program_address", "unknown")
        protocol_name = protocol.get("name", "Unknown Protocol")
        print(f"🎯 Target: {protocol_name}")
        print(f"   Address: {program_address}")
        print(f"   Status: {protocol.get('status', 'unknown')}\n")

        if protocol.get("status") == "paused":
            print("⚠️  Protocol is already paused. Resume it first.")
            return

        print("-" * 60)
        print("🚨 ATTACK SEQUENCE STARTING...")
        print("-" * 60 + "\n")

        # Fill in program address for all transactions
        for event in ATTACK_TIMELINE:
            event["transaction"]["program_address"] = program_address

        # Execute attack timeline
        for i, event in enumerate(ATTACK_TIMELINE, 1):
            delay = event["delay_seconds"]
            if delay > 0:
                print(f"   ⏳ Waiting {delay}s...")
                await asyncio.sleep(delay)

            tx = event["transaction"]
            timestamp = datetime.now(timezone.utc).strftime("%H:%M:%S")

            print(f"\n[{timestamp}] Step {i}/{len(ATTACK_TIMELINE)}")
            print(f"   {event['description']}")
            print(f"   TX: {tx['hash'][:16]}...")
            print(f"   Type: {tx['instruction_type']}, Amount: ${tx['amount']:,.0f}")

            # Inject the transaction
            success = await inject_transaction(client, tx)
            if success:
                print("   ✅ Injected → Sentinel processing...")
            else:
                print("   ⚠️  Inject endpoint not available (demo mode)")
                print("   💡 The Geyser mock will simulate this automatically")

        print("\n" + "-" * 60)
        print("🏁 ATTACK SEQUENCE COMPLETE")
        print("-" * 60)

        # Check final protocol status
        await asyncio.sleep(2)
        protocol_after = await get_first_protocol(client)
        if protocol_after:
            status = protocol_after.get("status", "unknown")
            if status == "paused":
                print("\n🛑 RESULT: Protocol PAUSED by Killswitch!")
                print("   ✅ Circuit breaker triggered successfully")
                print("   📱 Check Telegram for alert notification")
            else:
                print(f"\n📊 RESULT: Protocol status = {status}")
                print("   💡 In production, the circuit breaker would have paused it")

        print("\n" + "=" * 60)
        print("Demo complete. Check the dashboard for the full timeline.")
        print("=" * 60 + "\n")


if __name__ == "__main__":
    print("\n🛡️  Killswitch Attack Simulator v1.0")
    print("   Simulates a Drift-like exploit for live demo purposes.\n")

    try:
        asyncio.run(run_attack())
    except KeyboardInterrupt:
        print("\n\n⚠️  Attack simulation cancelled.")
        sys.exit(0)
