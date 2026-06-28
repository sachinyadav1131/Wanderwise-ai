from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = Field("development", validation_alias="ENV")
    api_key: str = Field("WW_SECRET_TOKEN_2026", validation_alias="API_KEY")
    port: int = Field(8000, validation_alias="PORT")
    host: str = Field("0.0.0.0", validation_alias="HOST")
    llm_provider: str = Field("mock", validation_alias="LLM_PROVIDER")
    mcp_enabled: bool = Field(True, validation_alias="MCP_ENABLED")

    # -----------------------------------------------------------------------
    # LLM — Google Gemini
    # -----------------------------------------------------------------------
    gemini_api_key: str = Field("", validation_alias="GEMINI_API_KEY")
    gemini_model: str = Field("gemini-2.0-flash", validation_alias="GEMINI_MODEL")

    # -----------------------------------------------------------------------
    # MCP Tool — Weather (OpenWeatherMap free tier)
    # Set OPENWEATHERMAP_API_KEY in .env to enable live weather lookups.
    # Leave blank to fall back to deterministic estimates.
    # -----------------------------------------------------------------------
    openweathermap_api_key: str = Field("", validation_alias="OPENWEATHERMAP_API_KEY")

settings = Settings()
