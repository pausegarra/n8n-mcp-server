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
        return ok(summarizeWorkflowList(data), requestId, extractCursor(data));
      }
      case "get_workflow": {
        const input = getWorkflowInputSchema.parse(args ?? {});
        const data = await client.getWorkflow(input.workflowId, { excludePinnedData: input.excludePinnedData });
        return ok(data, requestId);
      }
      case "create_workflow": {
        const input = createWorkflowInputSchema.parse(args ?? {});
        const data = await client.createWorkflow(input as unknown as Record<string, unknown>);
        return ok(data, requestId);
      }
      case "update_workflow": {
        const input = updateWorkflowInputSchema.parse(args ?? {});
        const data = await client.updateWorkflow(input.workflowId, input.workflow as unknown as Record<string, unknown>);
        return ok(data, requestId);
      }
      case "activate_workflow": {
        const input = activateWorkflowInputSchema.parse(args ?? {});
        const { workflowId, ...body } = input;
        const data = await client.activateWorkflow(workflowId, Object.keys(body).length ? body : undefined);
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
        return ok(summarizeExecutionList(data), requestId, extractCursor(data));
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

function summarizeWorkflowList(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }

  const record = data as Record<string, unknown>;
  const rawItems = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.data)
      ? record.data
      : record.items;
  const items = Array.isArray(rawItems) ? rawItems.map((item) => summarizeWorkflowItem(item)) : rawItems;

  return {
    items,
    nextCursor: typeof record.nextCursor === "string" ? record.nextCursor : null,
    total: typeof record.total === "number" ? record.total : undefined,
  };
}

function summarizeWorkflowItem(item: unknown): unknown {
  if (!item || typeof item !== "object") {
    return item;
  }

  const workflow = item as Record<string, unknown>;
  return {
    id: asString(workflow.id),
    name: asString(workflow.name),
    active: asBoolean(workflow.active),
    isArchived: asBoolean(workflow.isArchived),
    createdAt: asString(workflow.createdAt),
    updatedAt: asString(workflow.updatedAt),
    tags: summarizeTags(workflow.tags),
    versionId: asString(workflow.versionId),
  };
}

function summarizeTags(tags: unknown): string[] | null {
  if (!Array.isArray(tags)) {
    return null;
  }

  return tags
    .map((tag) => {
      if (!tag || typeof tag !== "object") {
        return null;
      }
      const name = (tag as Record<string, unknown>).name;
      return typeof name === "string" ? name : null;
    })
    .filter((name): name is string => Boolean(name));
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function summarizeExecutionList(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }

  const record = data as Record<string, unknown>;
  const rawItems = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.data)
      ? record.data
      : record.items;
  const items = Array.isArray(rawItems) ? rawItems.map((item) => summarizeExecutionItem(item)) : rawItems;

  return {
    items,
    nextCursor: typeof record.nextCursor === "string" ? record.nextCursor : null,
    total: typeof record.total === "number" ? record.total : undefined,
  };
}

function summarizeExecutionItem(item: unknown): unknown {
  if (!item || typeof item !== "object") {
    return item;
  }

  const execution = item as Record<string, unknown>;
  return {
    id: asString(execution.id),
    workflowId: asString(execution.workflowId),
    status: asString(execution.status),
    mode: asString(execution.mode),
    startedAt: asString(execution.startedAt),
    stoppedAt: asString(execution.stoppedAt),
    finished: asBoolean(execution.finished),
    retryOf: asString(execution.retryOf),
    retrySuccessId: asString(execution.retrySuccessId),
    waitTill: asString(execution.waitTill),
    createdAt: asString(execution.createdAt),
    updatedAt: asString(execution.updatedAt),
    deletedAt: asString(execution.deletedAt),
    workflowName: asString(execution.workflowName),
    projectId: asString(execution.projectId),
    runDataCount: summarizeRunDataCount(execution.data),
    lastNodeExecuted: summarizeLastNodeExecuted(execution.data),
  };
}

function summarizeRunDataCount(data: unknown): number | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const resultData = (data as Record<string, unknown>).resultData;
  if (!resultData || typeof resultData !== "object") {
    return null;
  }
  const runData = (resultData as Record<string, unknown>).runData;
  if (!runData || typeof runData !== "object") {
    return null;
  }
  return Object.keys(runData as Record<string, unknown>).length;
}

function summarizeLastNodeExecuted(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const resultData = (data as Record<string, unknown>).resultData;
  if (!resultData || typeof resultData !== "object") {
    return null;
  }
  const lastNodeExecuted = (resultData as Record<string, unknown>).lastNodeExecuted;
  return asString(lastNodeExecuted);
}
