from ai_service.services.providers.base_provider import BaseProvider

class MockProvider(BaseProvider):
    async def generate(self, prompt: str, system_instruction: str | None = None, **kwargs) -> str:
        # Fully functional mock provider implementation
        return "Mock Provider Response Text"

    def validate_response(self, response: str) -> bool:
        return len(response) > 0

    def estimate_tokens(self, text: str) -> int:
        # Simple estimation rule: 1 token ~= 4 characters
        return len(text) // 4
