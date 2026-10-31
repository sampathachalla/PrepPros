import express from "express";
import OpenAI from "openai";

const port = Number(process.env.PORT || 8001);
const model = process.env.MODEL_NAME || "nous-hermes2-mixtral";
const client = new OpenAI({
  baseURL:
    process.env.MODEL_BASE_URL || "http://host.docker.internal:11434/v1",
  apiKey: process.env.MODEL_API_KEY || "ollama",
});

const app = express();
app.use(express.json({ limit: "1mb" }));

const systemPrompt = `You are a Nous Hermes research agent for PrepPros.
Analyze the user's question, distinguish facts from assumptions, and return a concise,
well-structured research response. Never invent citations or claim that you browsed
sources you did not access.`;

app.get("/health", (_request, response) => {
  response.json({ status: "healthy", model });
});

app.post("/research", async (request, response) => {
  const { query } = request.body;
  if (typeof query !== "string" || query.trim().length < 3) {
    return response.status(400).json({
      detail: "query must contain at least 3 characters",
    });
  }

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query.trim() },
      ],
      temperature: 0.2,
    });
    return response.json({
      model,
      answer: completion.choices[0]?.message?.content || "",
    });
  } catch (error) {
    console.error(error);
    return response.status(502).json({
      detail: "The configured Nous Hermes endpoint is unavailable",
    });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Nous Hermes research agent listening on port ${port}`);
});
