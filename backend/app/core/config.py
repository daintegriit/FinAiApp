from pydantic import BaseModel
import os

class Settings(BaseModel):
    APP_NAME: str = "Fin Global Core"
    ENV: str = os.getenv("ENV", "dev")
    DEFAULT_ANNUAL_RETURN: float = float(os.getenv("DEFAULT_ANNUAL_RETURN", "0.07"))
    DEFAULT_ANNUAL_INFLATION: float = float(os.getenv("DEFAULT_ANNUAL_INFLATION", "0.02"))

settings = Settings()
