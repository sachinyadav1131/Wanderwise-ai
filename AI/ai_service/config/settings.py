from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = Field("development", validation_alias="ENV")
    api_key: str = Field("WW_SECRET_TOKEN_2026", validation_alias="API_KEY")
    port: int = Field(8000, validation_alias="PORT")
    host: str = Field("0.0.0.0", validation_alias="HOST")
    llm_provider: str = Field("mock", validation_alias="LLM_PROVIDER")

settings = Settings()
