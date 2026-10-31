import json
from contextlib import asynccontextmanager
from uuid import UUID

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://preppros:preppros_dev_password@db:5432/preppros"
    agent_url: str = "http://hermes-agent:8001"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
engine: AsyncEngine = create_async_engine(settings.database_url, pool_pre_ping=True)


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    yield
    await engine.dispose()


app = FastAPI(title="PrepPros API", version="1.0.0", lifespan=lifespan)


class ResearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=10_000)
    user_id: UUID | None = None


@app.get("/health")
async def health() -> dict[str, str]:
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    return {"status": "healthy"}


@app.post("/research", status_code=201)
async def create_research(request: ResearchRequest) -> dict:
    async with engine.begin() as connection:
        session_id = await connection.scalar(
            text("INSERT INTO research_sessions (user_id, query, status) VALUES (:user_id, :query, 'running') RETURNING id"),
            {"user_id": request.user_id, "query": request.query},
        )

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(f"{settings.agent_url}/research", json={"query": request.query})
            response.raise_for_status()
            result = response.json()
    except httpx.HTTPError as exc:
        async with engine.begin() as connection:
            await connection.execute(
                text("UPDATE research_sessions SET status='failed', updated_at=NOW() WHERE id=:id"),
                {"id": session_id},
            )
        raise HTTPException(status_code=502, detail="Hermes agent is unavailable") from exc

    async with engine.begin() as connection:
        await connection.execute(
            text("UPDATE research_sessions SET status='completed', result=CAST(:result AS JSONB), updated_at=NOW() WHERE id=:id"),
            {"id": session_id, "result": json.dumps(result)},
        )
    return {"id": session_id, "status": "completed", "result": result}
