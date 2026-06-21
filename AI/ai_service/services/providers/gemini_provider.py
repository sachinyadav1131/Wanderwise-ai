from ai_service.services.providers.base_provider import BaseProvider

class GeminiProvider(BaseProvider):
    async def generate(self, prompt: str, system_instruction: str | None = None, **kwargs) -> str:
        # Placeholder for future Google GenAI SDK integration
        raise NotImplementedError("GeminiProvider is not implemented yet.")

    def validate_response(self, response: str) -> bool:
        return False

    def estimate_tokens(self, text: str) -> int:
        return 0
