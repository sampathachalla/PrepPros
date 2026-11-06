import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ToolError } from './apiClient.ts';
import { warmUp } from './needle.ts';
import { tools } from './tools/index.ts';

/**
 * PrepPros MCP server. Hermes Agent starts it over stdio (see api/agent/hermes/config.yaml) and
 * it is the only toolset the Hermes API server exposes to app users. stdout carries the MCP
 * protocol, so all logging goes to stderr.
 */
const server = new McpServer({ name: 'preppros', version: '2.0.0' });

for (const tool of tools) {
  server.registerTool(
    tool.name,
    { description: tool.description, inputSchema: tool.inputSchema },
    async (input: never) => {
      try {
        const result = await tool.run(input);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (error) {
        if (!(error instanceof ToolError)) console.error(`${tool.name} failed:`, error);
        const message = error instanceof ToolError ? error.message : 'The PrepPros service is unavailable right now.';
        return { isError: true, content: [{ type: 'text' as const, text: message }] };
      }
    },
  );
}

await server.connect(new StdioServerTransport());
warmUp();
