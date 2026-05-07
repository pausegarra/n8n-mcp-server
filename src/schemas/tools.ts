import { z } from "zod";

export const listWorkflowsInputSchema = z.object({
  limit: z.number().int().positive().max(250).default(250).describe("Use 250 unless the user asks for fewer."),
  cursor: z.string().optional(),
  active: z
    .boolean()
    .optional()
    .describe("Omit to list both active and inactive workflows. Set false only when requesting inactive workflows."),
  tags: z.string().optional().describe("Comma-separated tag names, for example: test,production."),
  name: z.string().optional(),
  projectId: z.string().optional(),
  excludePinnedData: z.boolean().optional(),
});

export const getWorkflowInputSchema = z.object({
  workflowId: z.string().min(1),
  excludePinnedData: z.boolean().optional(),
});

export const createWorkflowInputSchema = z.object({
  name: z.string().min(1),
  nodes: z.array(z.record(z.string(), z.unknown())),
  connections: z.record(z.string(), z.unknown()),
  settings: z.record(z.string(), z.unknown()),
  staticData: z.union([z.string(), z.record(z.string(), z.unknown()), z.null()]).optional(),
  shared: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const updateWorkflowInputSchema = z.object({
  workflowId: z.string().min(1),
  workflow: createWorkflowInputSchema,
});

export const activateWorkflowInputSchema = z.object({
  workflowId: z.string().min(1),
  versionId: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
});

export const deactivateWorkflowInputSchema = z.object({
  workflowId: z.string().min(1),
});

export const deleteWorkflowInputSchema = z.object({
  workflowId: z.string().min(1),
});

export const listExecutionsInputSchema = z.object({
  workflowId: z.string().optional(),
  status: z.enum(["canceled", "crashed", "error", "new", "running", "success", "unknown", "waiting"]).optional(),
  includeData: z.boolean().optional(),
  projectId: z.string().optional(),
  limit: z.number().int().positive().max(250).default(250).describe("Use 250 unless the user asks for fewer."),
  cursor: z.string().optional(),
});

export const getExecutionInputSchema = z.object({
  executionId: z.number().int().positive(),
  includeData: z.boolean().default(false),
});

export type ToolResult<T = unknown> = {
  ok: boolean;
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
  meta: { requestId: string; pagination?: { nextCursor: string | null } };
};
