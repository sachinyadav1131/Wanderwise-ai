from abc import ABC, abstractmethod

class BaseProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, system_instruction: str | None = None, **kwargs) -> str:
        """Generates text from the provider model API."""
        pass

    @abstractmethod
    def validate_response(self, response: str) -> bool:
        """Validates that the response matches basic formats or safety constraints."""
        pass

    @abstractmethod
    def estimate_tokens(self, text: str) -> int:
        """Estimates the token count for input/output text lengths."""
        pass
