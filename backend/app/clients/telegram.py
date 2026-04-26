"""Telegram Bot API client — async message dispatch via httpx."""

import logging

import httpx

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org"


class TelegramClient:
    """Async Telegram Bot API client for sending alert messages."""

    def __init__(self, bot_token: str):
        self.bot_token = bot_token
        self._base_url = f"{TELEGRAM_API_BASE}/bot{bot_token}"
        logger.info("TelegramClient initialized")

    async def send_message(
        self, chat_id: str, message: str, parse_mode: str = "HTML"
    ) -> None:
        """Send a text message to a Telegram chat.

        Logs errors but does not raise — alert failures should not
        crash the monitoring pipeline.
        """
        url = f"{self._base_url}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": parse_mode,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    logger.info("Telegram message sent to chat %s", chat_id)
                else:
                    logger.error(
                        "Telegram API error %d: %s",
                        resp.status_code,
                        resp.text,
                    )
        except httpx.HTTPError:
            logger.exception("Failed to send Telegram message to chat %s", chat_id)
