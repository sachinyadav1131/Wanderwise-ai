import logging
import httpx
from ai_service.services.providers.base_provider import BaseProvider
from ai_service.config.settings import settings

logger = logging.getLogger("providers.groq")

class GroqProvider(BaseProvider):
    def __init__(self) -> None:
        self.model = getattr(settings, "groq_model", "llama-3.3-70b-versatile")

    async def generate(
        self,
        prompt: str,
        system_instruction: str | None = None,
        **kwargs,
    ) -> str:
        api_key = getattr(settings, "groq_api_key", "")
        if not api_key:
            raise EnvironmentError("GROQ_API_KEY is not configured.")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.2),
        }
        
        # Enforce json mode if structured_json is True
        if kwargs.get("structured_json", False) or "json" in prompt.lower():
            payload["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload
            )
            
            if response.status_code != 200:
                raise RuntimeError(f"Groq API returned HTTP {response.status_code}: {response.text}")
                
            res_json = response.json()
            return res_json["choices"][0]["message"]["content"]

    def validate_response(self, response: str) -> bool:
        return len(response.strip()) > 5

    def estimate_tokens(self, text: str) -> int:
        return len(text) // 4
