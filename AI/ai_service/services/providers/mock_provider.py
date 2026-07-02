from ai_service.services.providers.base_provider import BaseProvider

class MockProvider(BaseProvider):
    async def generate(self, prompt: str, system_instruction: str | None = None, **kwargs) -> str:
        # Check if structured JSON was requested
        if kwargs.get("structured_json", True) or "json" in prompt.lower():
            prompt_lower = prompt.lower()
            if "places" in prompt_lower:
                category = "attraction"
                if "cafe" in prompt_lower:
                    category = "cafe"
                elif "market" in prompt_lower:
                    category = "market"
                elif "indoor" in prompt_lower:
                    category = "indoor"
                return f'{{"places": [{{"name": "Famous Local Spot", "category": "{category}", "location": "Local Downtown", "entry_fee": 0.0, "avg_duration_minutes": 90, "tags": ["famous", "sight"], "is_indoor": false}}]}}'
        return "Mock Provider Response Text"

    def validate_response(self, response: str) -> bool:
        return len(response) > 0

    def estimate_tokens(self, text: str) -> int:
        # Simple estimation rule: 1 token ~= 4 characters
        return len(text) // 4
