import express from "express";
import pg from "pg";

const { Pool } = pg;
const port = Number(process.env.PORT || 8000);
const agentUrl = process.env.AGENT_URL || "http://hermes-agent:8001";
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://preppros:preppros_dev_password@db:5432/preppros",
});

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_request, response, next) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "healthy" });
  } catch (error) {
    next(error);
  }
});

app.post("/research", async (request, response, next) => {
  const { query, user_id: userId = null } = request.body;
  if (typeof query !== "string" || query.trim().length < 3) {
    return response.status(400).json({
      detail: "query must contain at least 3 characters",
    });
  }

  let sessionId;
  try {
    const inserted = await pool.query(
      `INSERT INTO research_sessions (user_id, query, status)
       VALUES ($1, $2, 'running') RETURNING id`,
      [userId, query.trim()],
    );
    sessionId = inserted.rows[0].id;

    const agentResponse = await fetch(`${agentUrl}/research`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: query.trim() }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!agentResponse.ok) {
      throw new Error(`Hermes agent returned HTTP ${agentResponse.status}`);
    }
    const result = await agentResponse.json();

    await pool.query(
      `UPDATE research_sessions
       SET status = 'completed', result = $1::jsonb, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(result), sessionId],
    );
    return response.status(201).json({
      id: sessionId,
      status: "completed",
      result,
    });
  } catch (error) {
    if (sessionId) {
      await pool.query(
        "UPDATE research_sessions SET status = 'failed', updated_at = NOW() WHERE id = $1",
        [sessionId],
      ).catch(() => undefined);
    }
    return next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(502).json({
    detail: "The requested backend service is unavailable",
  });
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`PrepPros API listening on port ${port}`);
});

async function shutdown() {
  server.close();
  await pool.end();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
