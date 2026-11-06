import type { z } from 'zod';

export type ToolDefinition<Shape extends z.ZodRawShape = z.ZodRawShape> = {
  name: string;
  description: string;
  inputSchema: Shape;
  /** Returns JSON-serialisable data for the model. */
  run: (input: z.infer<z.ZodObject<Shape>>) => Promise<unknown>;
};

export const defineTool = <Shape extends z.ZodRawShape>(tool: ToolDefinition<Shape>) => tool;
