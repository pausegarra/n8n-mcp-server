import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { getConfig } from "./config.js";
import { N8nApiClient } from "./n8n/client.js";
import {
  activateWorkflowInputSchema,
  createWorkflowInputSchema,
  deactivateWorkflowInputSchema,
  getExecutionInputSchema,
  getWorkflowInputSchema,
  listExecutionsInputSchema,
  listWorkflowsInputSchema,
  updateWorkflowInputSchema,
} from "./schemas/tools.js";
import { callTool, TOOL_NAMES, type ToolName } from "./tools/handlers.js";

const config = getConfig();
const client = new N8nApiClient({
  baseUrl: config.N8N_BASE_URL,
  apiKey: config.N8N_API_KEY,
  timeoutMs: config.N8N_TIMEOUT_MS,
});

const server = new Server(
  {
    name: "mcp-n8n",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_workflows",
        description: "List n8n workflows with optional filters and pagination (LLM-friendly summarized output)",
        inputSchema: schemaToJson(listWorkflowsInputSchema),
      },
      {
        name: "get_workflow",
        description: "Get workflow details by workflow ID",
        inputSchema: schemaToJson(getWorkflowInputSchema),
      },
      {
        name: "create_workflow",
        description: "Create new n8n workflow",
        inputSchema: schemaToJson(createWorkflowInputSchema),
      },
      {
        name: "update_workflow",
        description: "Update existing n8n workflow fields",
        inputSchema: schemaToJson(updateWorkflowInputSchema),
      },
      {
        name: "activate_workflow",
        description: "Activate workflow by workflow ID",
        inputSchema: schemaToJson(activateWorkflowInputSchema),
      },
      {
        name: "deactivate_workflow",
        description: "Deactivate workflow by workflow ID",
        inputSchema: schemaToJson(deactivateWorkflowInputSchema),
      },
      {
        name: "list_executions",
        description: "List executions with optional filters and pagination (LLM-friendly summarized output)",
        inputSchema: schemaToJson(listExecutionsInputSchema),
      },
      {
        name: "get_execution",
        description: "Get execution details by execution ID",
        inputSchema: schemaToJson(getExecutionInputSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name as ToolName;
  if (!TOOL_NAMES.includes(name)) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ok: false,
              data: null,
              error: { code: "VALIDATION_ERROR", message: `Unknown tool: ${request.params.name}` },
              meta: { requestId: "unknown" },
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }

  const result = await callTool(client, name, request.params.arguments as Record<string, unknown> | undefined);

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    isError: !result.ok,
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

void main();

function schemaToJson(schema: z.ZodType): unknown {
  return z.toJSONSchema(schema);
}
