import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AppError } from "../errors.js";
import type { N8nApiClient } from "../n8n/client.js";
import {
  activateWorkflowInputSchema,
  createWorkflowInputSchema,
  deactivateWorkflowInputSchema,
  getExecutionInputSchema,
  getWorkflowInputSchema,
  listExecutionsInputSchema,
  listWorkflowsInputSchema,
  type ToolResult,
  updateWorkflowInputSchema,
} from "../schemas/tools.js";

export const TOOL_NAMES = [
  "list_workflows",
  "get_workflow",
  "create_workflow",
  "update_workflow",
  "activate_workflow",
  "deactivate_workflow",
  "list_executions",
  "get_execution",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export async function callTool(
  client: N8nApiClient,
  name: ToolName,
  args: Record<string, unknown> | undefined,
): Promise<ToolResult> {
  const requestId = randomUUID();
  try {
    switch (name) {
      case "list_workflows": {
        const input = listWorkflowsInputSchema.parse(args ?? {});
        const data = await client.listWorkflows(input);
        return ok(data, requestId, extractCursor(data));
      }
      case "get_workflow": {
        const input = getWorkflowInputSchema.parse(args ?? {});
        const data = await client.getWorkflow(input.workflowId);
        return ok(data, requestId);
      }
      case "create_workflow": {
        const input = createWorkflowInputSchema.parse(args ?? {});
        const data = await client.createWorkflow(input as unknown as Record<string, unknown>);
        return ok(data, requestId);
      }
      case "update_workflow": {
        const input = updateWorkflowInputSchema.parse(args ?? {});
        const data = await client.updateWorkflow(input.workflowId, {
          ...input.patch,
          ...(input.version ? { version: input.version } : {}),
        });
        return ok(data, requestId);
      }
      case "activate_workflow": {
        const input = activateWorkflowInputSchema.parse(args ?? {});
        const data = await client.activateWorkflow(input.workflowId);
        return ok(data, requestId);
      }
      case "deactivate_workflow": {
        const input = deactivateWorkflowInputSchema.parse(args ?? {});
        const data = await client.deactivateWorkflow(input.workflowId);
        return ok(data, requestId);
      }
      case "list_executions": {
        const input = listExecutionsInputSchema.parse(args ?? {});
        const data = await client.listExecutions(input);
        return ok(data, requestId, extractCursor(data));
      }
      case "get_execution": {
        const input = getExecutionInputSchema.parse(args ?? {});
        const data = await client.getExecution(input.executionId, input.includeData);
        return ok(data, requestId);
      }
      default:
        return err(new AppError("VALIDATION_ERROR", `Unknown tool: ${name}`), requestId);
    }
  } catch (error) {
    if (error instanceof AppError) {
      return err(error, requestId);
    }
    if (error instanceof z.ZodError) {
      return err(new AppError("VALIDATION_ERROR", "Invalid input", error.flatten()), requestId);
    }
    return err(new AppError("INTERNAL_ERROR", "Unhandled internal error", { cause: String(error) }), requestId);
  }
}

function ok(data: unknown, requestId: string, nextCursor?: string | null): ToolResult {
  return {
    ok: true,
    data,
    error: null,
    meta: {
      requestId,
      ...(nextCursor !== undefined ? { pagination: { nextCursor } } : {}),
    },
  };
}

function err(error: AppError, requestId: string): ToolResult {
  return {
    ok: false,
    data: null,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
    meta: {
      requestId,
    },
  };
}

function extractCursor(data: unknown): string | null {
  if (data && typeof data === "object" && "nextCursor" in data) {
    const value = (data as { nextCursor?: unknown }).nextCursor;
    return typeof value === "string" ? value : null;
  }
  return null;
}
