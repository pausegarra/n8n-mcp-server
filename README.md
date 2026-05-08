# mcp-n8n

Agent-agnostic MCP server for n8n.

## Tools

- `list_workflows`
- `get_workflow`
- `create_workflow`
- `update_workflow`
- `activate_workflow`
- `deactivate_workflow`
- `delete_workflow`
- `list_executions`
- `get_execution`

## Installation

Download and extract the latest release:

```bash
curl -L -o n8n-mcp-server.zip https://github.com/pausegarra/n8n-mcp-server/releases/latest/download/n8n-mcp-server.zip
unzip n8n-mcp-server.zip -d n8n-mcp-server
```

## Configuration

The server does not read `.env` files. Environment variables must be passed by the MCP client.

### Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `N8N_BASE_URL` | Yes | n8n instance URL (e.g. `https://your-n8n.example.com`) |
| `N8N_API_KEY` | Yes | n8n API key |
| `N8N_TIMEOUT_MS` | No | Request timeout in ms (default: `10000`) |

### Example (opencode)

```json
"mcp": {
  "n8n": {
    "type": "local",
    "enabled": true,
    "command": ["node", "/path/to/n8n-mcp-server/dist/server.js"],
    "environment": {
      "N8N_BASE_URL": "https://your-n8n.example.com",
      "N8N_API_KEY": "your_api_key"
    }
  }
}
```

## Development

Install dependencies:

```bash
npm install
```

Run dev:

```bash
npm run dev
```

Build:

```bash
npm run build
```

## Response format

All tools return JSON string with stable shape:

```json
{
  "ok": true,
  "data": {},
  "error": null,
  "meta": {
    "requestId": "uuid",
    "pagination": {
      "nextCursor": null
    }
  }
}
```

## Notes

- No agent-specific prompt coupling.
- Input validated via Zod.
- JSON Schema exported with `z.toJSONSchema`.
- Retries only for transient upstream errors (`429` and `5xx`).
