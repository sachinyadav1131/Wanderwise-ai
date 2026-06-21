import asyncio
from ai_service.config.settings import settings
from ai_service.services.providers.mock_provider import MockProvider
from ai_service.services.providers.gemini_provider import GeminiProvider
from ai_service.services.providers.openai_provider import OpenAIProvider
import logging

logger = logging.getLogger("LLMService")

class LLMService:
    def __init__(self):
        self.providers = {
            "mock": MockProvider(),
            "gemini": GeminiProvider(),
            "openai": OpenAIProvider()
        }

    def _get_provider(self, name: str):
        provider_name = name.lower()
        if provider_name not in self.providers:
            logger.warning(f"Unknown provider '{name}'. Defaulting to 'mock'.")
            return self.providers["mock"]
        return self.providers[provider_name]

    async def generate_response(
        self, 
        prompt: str, 
        system_instruction: str | None = None, 
        retries: int = 3, 
        timeout: float = 10.0, 
        structured_json: bool = False,
        **kwargs
    ) -> str:
        provider_name = settings.llm_provider
        provider = self._get_provider(provider_name)
        
        # Try selected provider with retries
        for attempt in range(retries):
            try:
                # Support Timeout limits using asyncio
                response = await asyncio.wait_for(
                    provider.generate(prompt, system_instruction, **kwargs),
                    timeout=timeout
                )
                
                # Check response validation
                if provider.validate_response(response):
                    return response
                else:
                    raise ValueError("Provider output failed validation checks.")
                    
            except Exception as e:
                logger.warning(
                    f"LLM call failed using '{provider_name}' (Attempt {attempt + 1}/{retries}) - "
                    f"Error: {str(e)}"
                )
                if attempt == retries - 1:
                    # On final retry failure, fallback to MockProvider
                    if provider_name != "mock":
                        logger.error(f"Selected provider '{provider_name}' failed all retries. Falling back to 'mock'.")
                        try:
                            return await self.providers["mock"].generate(prompt, system_instruction, **kwargs)
                        except Exception as mock_err:
                            logger.critical(f"Fallback provider 'mock' failed: {str(mock_err)}")
                            raise mock_err
                    raise e
                # Wait with exponential backoff before retrying
                await asyncio.sleep(2 ** attempt)

llm_service = LLMService()
