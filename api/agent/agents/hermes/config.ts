/** Settings for the PrepPros MCP server; Hermes passes these in through `mcp_servers.preppros.env`. */
export const config = {
  /** The PrepPros API, reached from inside the Hermes container. */
  apiUrl: (process.env.PREPPROS_API_URL || 'http://api:8000').replace(/\/+$/, ''),
  /** Shared secret proving tool calls come from the Hermes container. */
  toolsKey: process.env.AGENT_TOOLS_KEY || '',
  /** Needle 3 weights, downloaded when the image is built. */
  needleModelPath: process.env.NEEDLE_MODEL_PATH || '/opt/preppros/models/needle3.cact',
  requestTimeoutMs: 15_000,
};
