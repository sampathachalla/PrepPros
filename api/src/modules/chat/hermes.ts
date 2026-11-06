import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

const AGENT_TIMEOUT_MS = 120_000;

/** Tool names the PrepPros MCP server registers in the Hermes container (api/agent/agents/hermes/tools). */
export const AGENT_TOOL_NAMES = ['search_recipes', 'get_recipe', 'bookmark_recipe', 'list_bookmarks'] as const;
export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];

type ResponseItem = {
  type?: string;
  name?: string;
  content?: { type?: string; text?: string }[];
};

type HermesResponse = { status?: string; output?: ResponseItem[] };

export type AgentReply = { text: string; toolsUsed: AgentToolName[] };

/** Hermes may prefix MCP tool names with the server's name, e.g. `mcp_preppros_search_recipes`. */
const toAgentToolName = (name: string) => AGENT_TOOL_NAMES.find((tool) => name === tool || name.endsWith(`_${tool}`));

export function parseAgentReply(body: HermesResponse): AgentReply {
  if (body.status && body.status !== 'completed') {
    throw new Error(`Hermes response status: ${body.status}`);
  }
  const output = body.output ?? [];

  const text = output
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === 'output_text' && part.text)
    .map((part) => part.text)
    .join('')
    .trim();
  if (!text) throw new Error('Hermes returned no reply text');

  const toolsUsed = new Set<AgentToolName>();
  for (const item of output) {
    const tool = item.type === 'function_call' && item.name ? toAgentToolName(item.name) : undefined;
    if (tool) toolsUsed.add(tool);
  }
  return { text, toolsUsed: [...toolsUsed] };
}

type AskOptions = {
  input: string;
  instructions?: string;
  /** Server-side conversation Hermes chains this turn onto; omit for a one-off question. */
  conversation?: string;
};

/** Runs one agent turn through Hermes Agent's `/v1/responses` endpoint. */
export async function askAgent({ input, instructions, conversation }: AskOptions): Promise<AgentReply> {
  if (!env.HERMES_API_KEY) {
    throw new AppError(503, 'Chat is not configured on this server');
  }

  let response: Response;
  try {
    response = await fetch(`${env.AGENT_URL}/v1/responses`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.HERMES_API_KEY}` },
      body: JSON.stringify({ input, instructions, conversation, store: conversation !== undefined }),
      signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
    });
  } catch (error) {
    console.error('Hermes agent request failed:', error);
    throw new AppError(502, 'The assistant is unavailable right now');
  }

  if (response.status === 429) {
    throw new AppError(503, 'The assistant is busy, please try again in a moment');
  }
  if (!response.ok) {
    console.error(`Hermes agent returned HTTP ${response.status}:`, await response.text().catch(() => ''));
    throw new AppError(502, 'The assistant is unavailable right now');
  }

  try {
    return parseAgentReply((await response.json()) as HermesResponse);
  } catch (error) {
    console.error('Unusable Hermes agent response:', error);
    throw new AppError(502, 'The assistant could not answer that, please try again');
  }
}
