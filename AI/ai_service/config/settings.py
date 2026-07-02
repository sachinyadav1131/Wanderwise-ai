import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

# Helper to automatically load config keys from Node.js backend environment if local .env is missing/incomplete
def load_backend_env():
    backend_env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../Backend/config/config.env"))
    if os.path.exists(backend_env_path):
        with open(backend_env_path, "r") as f:
            for line in f:
                if "=" in line:
                    key, val = line.strip().split("=", 1)
                    k = key.strip()
                    v = val.strip()
                    # Do not overwrite already set system env vars
                    target_keys = [
                        "GROQ_API_KEY", "HUGGINGFACEHUB_API_TOKEN", "HF_API_KEY", "HUGGINGFACE_API_KEY",
                        "CLOUDINARY_CLIENT_NAME", "CLOUDINARY_CLIENT_API", "CLOUDINARY_CLIENT_SECRET"
                    ]
                    if k in target_keys and not os.environ.get(k):
                        os.environ[k] = v

load_backend_env()

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = Field("development", validation_alias="ENV")
    api_key: str = Field("WW_SECRET_TOKEN_2026", validation_alias="API_KEY")
    port: int = Field(8000, validation_alias="PORT")
    host: str = Field("0.0.0.0", validation_alias="HOST")
    llm_provider: str = Field("groq", validation_alias="LLM_PROVIDER")
    mcp_enabled: bool = Field(True, validation_alias="MCP_ENABLED")

    # -----------------------------------------------------------------------
    # Cloudinary & Hugging Face (AI Cover Image)
    # -----------------------------------------------------------------------
    cloudinary_client_name: str = Field("", validation_alias="CLOUDINARY_CLIENT_NAME")
    cloudinary_client_api: str = Field("", validation_alias="CLOUDINARY_CLIENT_API")
    cloudinary_client_secret: str = Field("", validation_alias="CLOUDINARY_CLIENT_SECRET")
    hf_api_key: str = Field("", validation_alias="HF_API_KEY")

    # -----------------------------------------------------------------------
    # LLM — Groq
    # -----------------------------------------------------------------------
    groq_api_key: str = Field("", validation_alias="GROQ_API_KEY")
    groq_model: str = Field("llama-3.3-70b-versatile", validation_alias="GROQ_MODEL")

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
