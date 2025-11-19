# GitHub Comment Parsing

A monorepo for GitHub Pull Request comment parsing tools.

## Structure

```
github-comment-parsing/
├── apps/
│   ├── mcp/             # MCP (Model Context Protocol) server
│   └── server/          # REST API server for fetching and formatting PR comments
└── README.md            # This file
```

## Apps

### Server (`apps/server`)

A web server that fetches and parses GitHub Pull Request comments, returning them as formatted markdown with line numbers and token counts.

**Features:**
- REST API endpoints for PR comments
- Token counting using GPT-4 tokenization
- Markdown formatted output
- Filter by comment number

See [apps/server/README.md](apps/server/README.md) for more details.

### MCP (`apps/mcp`)

Model Context Protocol server for LLM integration. Provides tools that wrap the REST API server, allowing AI agents to fetch and analyze GitHub PR comments.

**Features:**
- `get-pr-comments` tool for fetching PR comments
- Supports filtering by comment number
- Returns markdown with token counts
- Wraps the REST API server via HTTP

**Note:** The REST API server (`apps/server`) must be running for the MCP server to function.

See [apps/mcp/README.md](apps/mcp/README.md) for more details.

## Getting Started

### Quick Start (Both Servers)

1. **Start the REST API server** (required for both REST and MCP):
```bash
# From root
bun server:dev

# Or from apps/server
cd apps/server
bun install
bun dev
```

2. **Start the MCP server** (optional, for LLM integration):
```bash
# Create .env in apps/mcp with BASE_URL=http://localhost:3000

# From root
bun mcp:dev

# Or from apps/mcp
cd apps/mcp
npm install
npm run dev
```

### Root-Level Scripts

```bash
# REST API Server
bun server       # Start server
bun server:dev   # Start server with auto-reload

# MCP Server
bun mcp          # Start MCP server
bun mcp:dev      # Start MCP server with auto-reload
bun mcp:build    # Build MCP server for production
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  AI Agent (Claude, etc.) via MCP Client                    │
│                                                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ MCP Protocol
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  MCP Server (apps/mcp)                                      │
│  └─ Tool: get-pr-comments                                   │
│     - Wraps REST API calls                                  │
│     - Uses BASE_URL env var                                 │
│                                                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP Request
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  REST API Server (apps/server)                              │
│  └─ GET /:owner/:repo/pull/:id[/:commentNum]               │
│     - Fetches from GitHub API                               │
│     - Formats as markdown                                   │
│     - Counts tokens (GPT-4)                                 │
│                                                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ GitHub API
                         │
                         ▼
                   GitHub.com
```

## Development

Each app has its own dependencies and can be developed independently.

**Environment Variables:**
- `apps/server`: Requires `GITHUB_TOKEN` for GitHub API access
- `apps/mcp`: Requires `BASE_URL` pointing to the REST API server

