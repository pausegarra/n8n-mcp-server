import { AppError, mapHttpError } from "../errors.js";

type ClientConfig = {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
};

export class N8nApiClient {
  constructor(private readonly config: ClientConfig) {}

  async listWorkflows(query: Record<string, unknown>) {
    return this.request("GET", "/api/v1/workflows", undefined, query);
  }

  async getWorkflow(workflowId: string, query?: Record<string, unknown>) {
    return this.request("GET", `/api/v1/workflows/${encodeURIComponent(workflowId)}`, undefined, query);
  }

  async createWorkflow(payload: Record<string, unknown>) {
    return this.request("POST", "/api/v1/workflows", payload);
  }

  async updateWorkflow(workflowId: string, workflow: Record<string, unknown>) {
    return this.request("PUT", `/api/v1/workflows/${encodeURIComponent(workflowId)}`, workflow);
  }

  async activateWorkflow(workflowId: string, body?: Record<string, unknown>) {
    return this.request("POST", `/api/v1/workflows/${encodeURIComponent(workflowId)}/activate`, body);
  }

  async deactivateWorkflow(workflowId: string) {
    return this.request("POST", `/api/v1/workflows/${encodeURIComponent(workflowId)}/deactivate`);
  }

  async deleteWorkflow(workflowId: string) {
    return this.request("DELETE", `/api/v1/workflows/${encodeURIComponent(workflowId)}`);
  }

  async listExecutions(query: Record<string, unknown>) {
    return this.request("GET", "/api/v1/executions", undefined, query);
  }

  async getExecution(executionId: number, includeData: boolean) {
    return this.request(
      "GET",
      `/api/v1/executions/${encodeURIComponent(executionId)}`,
      undefined,
      includeData ? { includeData: "true" } : undefined,
    );
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    query?: Record<string, unknown>,
  ): Promise<unknown> {
    const url = new URL(path, this.config.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === "") {
          continue;
        }
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item === undefined || item === null || item === "") {
              continue;
            }
            url.searchParams.append(key, String(item));
          }
          continue;
        }
        url.searchParams.set(key, String(value));
      }
    }

    const maxRetries = 2;
    let attempt = 0;

    while (true) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            "X-N8N-API-KEY": this.config.apiKey,
            "User-Agent": "mcp-n8n/0.1.0",
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        const text = await response.text();
        const parsed = text.length ? tryJson(text) : null;

        if (!response.ok) {
          const error = mapHttpError(response.status, parsed ?? text);
          if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
            attempt += 1;
            await sleep(200 * 2 ** attempt);
            continue;
          }
          throw error;
        }

        return parsed;
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        if (attempt < maxRetries) {
          attempt += 1;
          await sleep(200 * 2 ** attempt);
          continue;
        }
        throw new AppError("UPSTREAM_ERROR", "n8n request failed", { cause: String(error) });
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }
}

function tryJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
