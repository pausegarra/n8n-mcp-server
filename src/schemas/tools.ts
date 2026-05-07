import { z } from "zod";

export const listWorkflowsInputSchema = z.object({
  limit: z.number().int().positive().max(250).optional(),
  cursor: z.string().optional(),
  active: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  nameContains: z.string().optional(),
});

export const getWorkflowInputSchema = z.object({
  workflowId: z.string().min(1),
});

export const createWorkflowInputSchema = z.object({
  name: z.string().min(1),
  nodes: z.array(z.record(z.string(), z.unknown())),
  connections: z.record(z.string(), z.unknown()),
  settings: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateWorkflowInputSchema = z.object({
  workflowId: z.string().min(1),
  patch: z.record(z.string(), z.unknown()),
  version: z.string().optional(),
});

export const activateWorkflowInputSchema = z.object({
  workflowId: z.string().min(1),
});

export const deactivateWorkflowInputSchema = z.object({
  workflowId: z.string().min(1),
});

export const listExecutionsInputSchema = z.object({
  workflowId: z.string().optional(),
  status: z.enum(["error", "success", "waiting", "running", "canceled"]).optional(),
  startedAfter: z.string().datetime().optional(),
  startedBefore: z.string().datetime().optional(),
  limit: z.number().int().positive().max(250).optional(),
  cursor: z.string().optional(),
});

export const getExecutionInputSchema = z.object({
  executionId: z.string().min(1),
  includeData: z.boolean().default(false),
});

export type ToolResult<T = unknown> = {
  ok: boolean;
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
  meta: { requestId: string; pagination?: { nextCursor: string | null } };
};
