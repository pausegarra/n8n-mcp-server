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

## Setup

```bash
npm install
```

Create `.env` from example:

```bash
cp .env.example .env
```

Or export env vars manually:

```bash
export N8N_BASE_URL="https://your-n8n.example.com"
export N8N_API_KEY="your_api_key"
export N8N_TIMEOUT_MS="10000"
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
- JSON Schema exported with `zod-to-json-schema`.
- Retries only for transient upstream errors (`429` and `5xx`).
