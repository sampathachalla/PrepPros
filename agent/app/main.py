from fastapi import FastAPI, HTTPException
from openai import APIConnectionError, APIStatusError, AsyncOpenAI
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_base_url: str = "http://host.docker.internal:11434/v1"
    model_name: str = "nous-hermes2-mixtral"
    model_api_key: str = "ollama"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
client = AsyncOpenAI(base_url=settings.model_base_url, api_key=settings.model_api_key)
app = FastAPI(title="Nous Hermes Research Agent", version="1.0.0")

SYSTEM_PROMPT = """You are a Nous Hermes research agent for PrepPros.
Analyze the user's question, distinguish facts from assumptions, and return a concise,
well-structured research response. Never invent citations or claim that you browsed
sources you did not access."""


class ResearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=10_000)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy", "model": settings.model_name}


@app.post("/research")
async def research(request: ResearchRequest) -> dict[str, str]:
    try:
        completion = await client.chat.completions.create(
            model=settings.model_name,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": request.query},
            ],
            temperature=0.2,
        )
    except (APIConnectionError, APIStatusError) as exc:
        raise HTTPException(status_code=502, detail="The configured Nous Hermes model endpoint is unavailable") from exc
    return {"model": settings.model_name, "answer": completion.choices[0].message.content or ""}
