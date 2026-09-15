from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str
    redis_url: str
    s3_endpoint: str
    s3_access_key: str
    s3_secret_key: str
    s3_bucket: str = "jocky-evidence"
    jwt_secret: str
    jocky_public_url: str = "http://127.0.0.1:3100"
    admin_email: str = "admin@jocky.local"
    admin_password: str
    ai_provider: str = "disabled"
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen3:8b"
    openai_base_url: str = "https://api.openai.com/v1"
    openai_api_key: str = ""
    openai_model: str = ""
    jocky_cli: str = "target/debug/jocky"


settings = Settings()
if len(settings.jwt_secret) < 32 or settings.jwt_secret.startswith("CHANGE_ME"):
    raise RuntimeError("Configure a random JWT_SECRET of at least 32 characters")
