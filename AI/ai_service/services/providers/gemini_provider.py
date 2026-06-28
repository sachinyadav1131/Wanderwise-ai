"""
LLM Provider: GeminiProvider
Implements the BaseProvider interface using the official Google GenAI SDK
(google-genai >= 1.x). Reads the API key and model name from application
settings / environment variables so no secrets are hard-coded.
"""

import logging
from google import genai
from google.genai import types as genai_types

from ai_service.services.providers.base_provider import BaseProvider
from ai_service.config.settings import settings

logger = logging.getLogger("providers.gemini")

# ---------------------------------------------------------------------------
# Model selection — override via GEMINI_MODEL env-var if needed.
# Default: gemini-2.0-flash (fast, cost-effective, long context).
# ---------------------------------------------------------------------------
_DEFAULT_MODEL = "gemini-2.0-flash"

# Minimum acceptable response length (characters) to pass validation.
_MIN_RESPONSE_CHARS = 5

# Approximate characters-per-token ratio for Gemini tokeniser.
_CHARS_PER_TOKEN = 4


class GeminiProvider(BaseProvider):
    """
    Production LLM provider backed by Google Gemini via the `google-genai` SDK.

    The client is constructed lazily on the first call so that import-time
    failures (missing key, network issues) do not prevent the rest of the
    application from starting up.
    """

    def __init__(self) -> None:
        self._client: genai.Client | None = None
        self._model: str = getattr(settings, "gemini_model", _DEFAULT_MODEL)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_client(self) -> genai.Client:
        """Return (or lazily create) the authenticated GenAI client."""
        if self._client is None:
            api_key: str = getattr(settings, "gemini_api_key", "")
            if not api_key:
                raise EnvironmentError(
                    "GEMINI_API_KEY is not set. "
                    "Add it to your .env file and restart the server."
                )
            self._client = genai.Client(api_key=api_key)
            logger.info(
                f"[GeminiProvider] Authenticated GenAI client initialised "
                f"(model={self._model})."
            )
        return self._client

    # ------------------------------------------------------------------
    # BaseProvider interface
    # ------------------------------------------------------------------

    async def generate(
        self,
        prompt: str,
        system_instruction: str | None = None,
        **kwargs,
    ) -> str:
        """
        Send *prompt* to Gemini and return the generated text.

        Args:
            prompt:             The user / task prompt.
            system_instruction: Optional system-level instruction injected
                                into the request config (not as a chat turn).
            **kwargs:           Extra generation parameters forwarded to the
                                SDK (e.g. temperature, max_output_tokens).

        Returns:
            Generated text string from the model.

        Raises:
            EnvironmentError: If GEMINI_API_KEY is missing.
            RuntimeError:     If the model returns an empty / blocked response.
            Exception:        Propagated SDK errors (network, quota, etc.).
        """
        client = self._get_client()

        # Build optional GenerateContentConfig
        gen_config_kwargs: dict = {}

        if system_instruction:
            gen_config_kwargs["system_instruction"] = system_instruction

        # Forward caller-supplied generation params (temperature, top_p, …)
        allowed_passthrough = {
            "temperature",
            "top_p",
            "top_k",
            "max_output_tokens",
            "stop_sequences",
            "candidate_count",
        }
        for key in allowed_passthrough:
            if key in kwargs:
                gen_config_kwargs[key] = kwargs[key]

        config = genai_types.GenerateContentConfig(**gen_config_kwargs) if gen_config_kwargs else None

        logger.debug(
            f"[GeminiProvider] Sending request — model={self._model} "
            f"prompt_chars={len(prompt)} "
            f"system_chars={len(system_instruction or '')}"
        )

        try:
            # `generate_content` is the stable sync/async unified method in
            # google-genai >= 1.x.  Use the async variant for non-blocking I/O.
            response = await client.aio.models.generate_content(
                model=self._model,
                contents=prompt,
                config=config,
            )
        except Exception as exc:
            logger.error(f"[GeminiProvider] API call failed: {exc}", exc_info=True)
            raise

        # Extract text safely from the response envelope
        text: str = ""
        try:
            text = response.text or ""
        except Exception:
            # Fallback: walk candidates manually
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    text += getattr(part, "text", "")

        if not text.strip():
            finish_reason = None
            try:
                finish_reason = response.candidates[0].finish_reason if response.candidates else None
            except Exception:
                pass
            raise RuntimeError(
                f"[GeminiProvider] Model returned an empty response. "
                f"finish_reason={finish_reason}"
            )

        logger.debug(
            f"[GeminiProvider] Response received — "
            f"chars={len(text)} "
            f"est_tokens={self.estimate_tokens(text)}"
        )
        return text

    # ------------------------------------------------------------------

    def validate_response(self, response: str) -> bool:
        """
        Validate that the response is non-empty, non-trivial, and not a
        known error/refusal marker.

        Returns:
            True if the response passes basic quality checks, False otherwise.
        """
        if not response or not isinstance(response, str):
            return False

        stripped = response.strip()

        # Must have enough content to be useful
        if len(stripped) < _MIN_RESPONSE_CHARS:
            logger.warning(
                f"[GeminiProvider] Response too short "
                f"({len(stripped)} chars) — failing validation."
            )
            return False

        # Detect common Gemini safety/refusal prefixes
        refusal_markers = (
            "i'm not able to",
            "i cannot provide",
            "i'm unable to",
            "as an ai,",
            "i don't have the ability",
        )
        lower = stripped.lower()
        for marker in refusal_markers:
            if lower.startswith(marker):
                logger.warning(
                    f"[GeminiProvider] Refusal detected in response: '{stripped[:80]}...'"
                )
                return False

        return True

    # ------------------------------------------------------------------

    def estimate_tokens(self, text: str) -> int:
        """
        Lightweight token estimation based on the empirical rule that one
        Gemini token maps to approximately 4 Latin characters (or ~3 for
        CJK-heavy text).  This avoids an extra API round-trip for simple
        budget checks.

        Returns:
            Estimated integer token count (always >= 0).
        """
        if not text:
            return 0

        # Weight CJK / non-ASCII characters more heavily (they tend to be
        # shorter tokens in Gemini's SentencePiece vocab).
        ascii_chars = sum(1 for c in text if ord(c) < 128)
        non_ascii_chars = len(text) - ascii_chars

        estimated = (ascii_chars // _CHARS_PER_TOKEN) + (non_ascii_chars // 2)
        return max(1, estimated)
