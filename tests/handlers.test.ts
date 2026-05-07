import { describe, expect, it, vi } from "vitest";
import { callTool } from "../src/tools/handlers.js";

const mockClient = {
  listWorkflows: async () => ({ items: [], nextCursor: null }),
  getWorkflow: async (id: string) => ({ id }),
  createWorkflow: async (payload: unknown) => payload,
  updateWorkflow: async (id: string, patch: unknown) => ({ id, patch }),
  activateWorkflow: async (id: string) => ({ id, active: true }),
  deactivateWorkflow: async (id: string) => ({ id, active: false }),
  deleteWorkflow: async (id: string) => ({ id, deleted: true }),
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

  it("returns summarized workflow list fields", async () => {
    const listWorkflows = vi.fn(async () => ({
      items: [
        {
          id: "wf-1",
          name: "Demo workflow",
          active: true,
          isArchived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
          versionId: "v1",
          tags: [{ id: "t1", name: "prod" }],
          nodes: [{ id: "n1" }],
          connections: { n1: {} },
          settings: { timezone: "UTC" },
        },
      ],
      nextCursor: "cursor-1",
      total: 1,
    }));

    const result = await callTool({ ...mockClient, listWorkflows } as never, "list_workflows", {});

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      items: [
        {
          id: "wf-1",
          name: "Demo workflow",
          active: true,
          isArchived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
          tags: ["prod"],
          versionId: "v1",
        },
      ],
      nextCursor: "cursor-1",
      total: 1,
    });
  });

  it("supports OpenAPI data field for workflow lists", async () => {
    const listWorkflows = vi.fn(async () => ({
      data: [
        {
          id: "wf-2",
          name: "Data response workflow",
          active: false,
          isArchived: false,
          createdAt: "2026-01-03T00:00:00.000Z",
          updatedAt: "2026-01-04T00:00:00.000Z",
          versionId: "v2",
          tags: [{ id: "t2", name: "test" }],
        },
      ],
      nextCursor: null,
      total: 1,
    }));

    const result = await callTool({ ...mockClient, listWorkflows } as never, "list_workflows", {});

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      items: [
        {
          id: "wf-2",
          name: "Data response workflow",
          active: false,
          isArchived: false,
          createdAt: "2026-01-03T00:00:00.000Z",
          updatedAt: "2026-01-04T00:00:00.000Z",
          tags: ["test"],
          versionId: "v2",
        },
      ],
      nextCursor: null,
      total: 1,
    });
  });

  it("defaults workflow lists to the largest OpenAPI page", async () => {
    const listWorkflows = vi.fn(async (query: unknown) => ({ query, nextCursor: null }));

    const result = await callTool({ ...mockClient, listWorkflows } as never, "list_workflows", {});

    expect(result.ok).toBe(true);
    expect(listWorkflows).toHaveBeenCalledWith({ limit: 250 });
  });

  it("updates workflows with a full PUT workflow payload", async () => {
    const updateWorkflow = vi.fn(async (id: string, workflow: unknown) => ({ id, workflow }));
    const workflow = { name: "My workflow", nodes: [], connections: {}, settings: {} };

    const result = await callTool(
      { ...mockClient, updateWorkflow } as never,
      "update_workflow",
      { workflowId: "wf-1", workflow },
    );

    expect(result.ok).toBe(true);
    expect(updateWorkflow).toHaveBeenCalledWith("wf-1", workflow);
  });

  it("deletes workflow by ID", async () => {
    const deleteWorkflow = vi.fn(async (id: string) => ({ id, deleted: true }));

    const result = await callTool(
      { ...mockClient, deleteWorkflow } as never,
      "delete_workflow",
      { workflowId: "wf-1" },
    );

    expect(result.ok).toBe(true);
    expect(deleteWorkflow).toHaveBeenCalledWith("wf-1");
  });

  it("accepts OpenAPI execution filters", async () => {
    const listExecutions = vi.fn(async (query: unknown) => ({ query, nextCursor: null }));

    const result = await callTool(
      { ...mockClient, listExecutions } as never,
      "list_executions",
      { status: "crashed", includeData: true, projectId: "project-1" },
    );

    expect(result.ok).toBe(true);
    expect(listExecutions).toHaveBeenCalledWith({
      status: "crashed",
      includeData: true,
      projectId: "project-1",
      limit: 250,
    });
  });

  it("returns summarized execution list fields", async () => {
    const listExecutions = vi.fn(async () => ({
      items: [
        {
          id: "1",
          workflowId: "wf-1",
          workflowName: "Demo workflow",
          projectId: "proj-1",
          status: "success",
          mode: "manual",
          startedAt: "2026-01-01T00:00:00.000Z",
          stoppedAt: "2026-01-01T00:00:05.000Z",
          finished: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:05.000Z",
          data: {
            resultData: {
              lastNodeExecuted: "HTTP Request",
              runData: {
                Start: [{}],
                "HTTP Request": [{}],
              },
            },
          },
          payload: { huge: true },
        },
      ],
      nextCursor: "cursor-2",
      total: 1,
    }));

    const result = await callTool({ ...mockClient, listExecutions } as never, "list_executions", {});

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      items: [
        {
          id: "1",
          workflowId: "wf-1",
          status: "success",
          mode: "manual",
          startedAt: "2026-01-01T00:00:00.000Z",
          stoppedAt: "2026-01-01T00:00:05.000Z",
          finished: true,
          retryOf: null,
          retrySuccessId: null,
          waitTill: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:05.000Z",
          deletedAt: null,
          workflowName: "Demo workflow",
          projectId: "proj-1",
          runDataCount: 2,
          lastNodeExecuted: "HTTP Request",
        },
      ],
      nextCursor: "cursor-2",
      total: 1,
    });
  });
});
