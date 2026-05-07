import { describe, expect, it } from "vitest";
import { callTool } from "../src/tools/handlers.js";

const mockClient = {
  listWorkflows: async () => ({ items: [], nextCursor: null }),
  getWorkflow: async (id: string) => ({ id }),
  createWorkflow: async (payload: unknown) => payload,
  updateWorkflow: async (id: string, patch: unknown) => ({ id, patch }),
  activateWorkflow: async (id: string) => ({ id, active: true }),
  deactivateWorkflow: async (id: string) => ({ id, active: false }),
  listExecutions: async () => ({ items: [], nextCursor: null }),
  getExecution: async (id: string) => ({ id }),
};

describe("tool handlers", () => {
  it("returns validation error on invalid input", async () => {
    const result = await callTool(mockClient as never, "get_workflow", {});
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("VALIDATION_ERROR");
  });

  it("returns successful list response", async () => {
    const result = await callTool(mockClient as never, "list_workflows", { limit: 10 });
    expect(result.ok).toBe(true);
    expect(result.error).toBeNull();
    expect(result.meta.pagination?.nextCursor).toBeNull();
  });
});
