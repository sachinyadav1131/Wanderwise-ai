class LLMService:
    async def generate_response(self, prompt: str, system_instruction: str | None = None) -> str:
        # Placeholder for future LLM integrations (Phase 6+)
        return "Mock LLM Response"

llm_service = LLMService()
