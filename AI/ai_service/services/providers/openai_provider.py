from ai_service.services.providers.base_provider import BaseProvider

class OpenAIProvider(BaseProvider):
    async def generate(self, prompt: str, system_instruction: str | None = None, **kwargs) -> str:
        # Placeholder for future OpenAI SDK integration
        raise NotImplementedError("OpenAIProvider is not implemented yet.")

    def validate_response(self, response: str) -> bool:
        return False

    def estimate_tokens(self, text: str) -> int:
        return 0
