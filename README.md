# GitHub Comment Parsing

Transform any GitHub Pull Request into LLM-ready markdown. Simply replace `github.com` with `gitcom.dev` in any PR URL to get all comments formatted with line numbers and token counts.

## Usage

Simply replace `github.com` with `gitcom.dev` in any pull request URL to get LLM-ready markdown of all comments.

**Example:**
```
Original: https://github.com/inboundemail/inbound/pull/142
GitCom:   https://gitcom.dev/inboundemail/inbound/pull/142
```

Want just the 5th comment? Add the comment number:
```
https://gitcom.dev/inboundemail/inbound/pull/142/5
```

## Features

- 📝 Fetch all comments from a GitHub Pull Request
- 🔢 Get specific comments by number (1, 2, 3...)
- 🔍 Include parent review comments (APPROVE, REQUEST_CHANGES, etc.)
- 🧵 Show threaded comment replies
- 🎯 Token counting using tokenization
- 📊 Clean markdown-formatted output
- ⚡ Built with Bun for performance

## Quick Start (Self-Hosting)

1. **Install dependencies:**
```bash
bun install
```

2. **Set your GitHub token:**
```bash
export GITHUB_TOKEN="your_github_token_here"
```

3. **Start the server:**
```bash
bun server
# or with auto-reload for development
bun server:dev
```

The server will start at `http://localhost:3000`

## API Reference

### Get All Comments

Fetch all comments from a pull request:

```bash
curl https://gitcom.dev/inboundemail/inbound/pull/142
```

### Get Specific Comment

Fetch only the 5th comment:

```bash
curl https://gitcom.dev/inboundemail/inbound/pull/142/5
```

### Endpoint Format

```
GET /:repoOwner/:repoName/pull/:pullRequestNumber[/:commentNumber]
```

**Path Parameters:**
- `repoOwner` - GitHub repository owner (username or organization)
- `repoName` - Repository name
- `pullRequestNumber` - Pull request number
- `commentNumber` (optional) - Specific comment number to retrieve

**Query Parameters:**
- `include_reviews=true` - Include parent review comments (shows APPROVE, REQUEST_CHANGES, COMMENT review bodies)
- `show_threading=true` - Display comment replies in a threaded structure
- `resolved=true/false` - Filter by resolved status *(Note: Limited GitHub API support)*

**Advanced Examples:**
```bash
# Get all comments with parent reviews
curl https://gitcom.dev/inboundemail/inbound/pull/142?include_reviews=true

# Show threaded comment structure
curl https://gitcom.dev/inboundemail/inbound/pull/142?show_threading=true

# Get reviews with threaded comments
curl https://gitcom.dev/inboundemail/inbound/pull/142?include_reviews=true&show_threading=true
```

### Response Format

The API returns markdown with:
- Pull request metadata (repo, review count, comment count)
- Total token count (GPT-4 tokenization)
- For each review (if `include_reviews=true`):
  - Review state (APPROVED, CHANGES_REQUESTED, COMMENTED, etc.)
  - Author and timestamp
  - Review body (parent comment)
  - Associated code comments
- For each comment:
  - Author and timestamp
  - File path and line numbers
  - Comment text
  - Threaded replies (if `show_threading=true`)
  - Link to view on GitHub

**For detailed feature documentation, see [apps/server/FEATURES.md](apps/server/FEATURES.md)**

**Example:**
```markdown
# Pull Request #142 Comments

**Repository:** inboundemail/inbound
**Total Comments:** 21
**Total Tokens:** 1,234

---

## Comment 1

**Author:** @ryanvogel
**Created:** 4/14/2011, 4:00:49 PM
**File:** `src/main.ts`
**Line:** 42 (RIGHT side)
**[View on GitHub](https://github.com/...)**

### Comment

This looks good, but we should add error handling here.

---
...
```

## Scripts

```bash
bun server       # Start server
bun server:dev   # Start server with auto-reload (watch mode)
```

## Environment Variables

Create a `.env` file or export these variables:

```bash
# Required: GitHub Personal Access Token
GITHUB_TOKEN=your_github_token_here

# Optional: Server port (defaults to 3000)
PORT=3000
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Client (curl, browser, LLM, etc.)                          │
│  https://gitcom.dev/owner/repo/pull/123                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTPS Request
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  gitcom.dev (REST API Server)                               │
│  └─ GET /:owner/:repo/pull/:id[/:commentNum]               │
│     - Fetches from GitHub API                               │
│     - Formats as markdown                                   │
│     - Counts tokens                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ GitHub API
                         ▼
                   GitHub.com
```

## Development

The server code is located in `apps/server/`. See [apps/server/README.md](apps/server/README.md) for more details.

