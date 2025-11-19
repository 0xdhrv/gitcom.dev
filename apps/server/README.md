# github-comment-parsing

A web server that fetches and parses GitHub Pull Request comments, returning them as formatted markdown with line numbers and token counts.

## Installation

To install dependencies:

```bash
bun install
```

## Configuration

Set your GitHub token as an environment variable:

```bash
export GITHUB_TOKEN="your_github_token_here"
```

Alternatively, you can pass the token as a query parameter (not recommended for production).

## Usage

Start the server:

```bash
bun start
# or with auto-reload on file changes
bun dev
```

The server will start on port 3000 (or the port specified in the `PORT` environment variable).

### Available Scripts

- `bun start` - Start the server
- `bun dev` - Start the server with auto-reload on file changes
- `bun type-check` - Check TypeScript types without emitting files
- `bun lint` - Run TypeScript linter

### API Endpoints

#### Get All Comments

**GET** `/:repoOwner/:repoName/pull/:id`

Returns all comments for a pull request with token counts.

#### Get Single Comment

**GET** `/:repoOwner/:repoName/pull/:id/:commentNumber`

Returns a specific comment by its number (1, 2, 3...) with token count.

#### Query Parameters

- `token` (optional): GitHub token (if not set via environment variable)

#### Example Requests

Get all comments:
```bash
curl "http://localhost:3000/octocat/Hello-World/pull/142"
```

Get a specific comment by number (e.g., the 5th comment):
```bash
curl "http://localhost:3000/octocat/Hello-World/pull/142/5"
```

With a token parameter (if not using environment variable):
```bash
curl "http://localhost:3000/octocat/Hello-World/pull/142?token=your_github_token"
```

#### Example Response

The API returns a markdown-formatted response with token counts:

```markdown
# Pull Request #142 Comments

**Repository:** octocat/Hello-World
**Total Comments:** 2
**Total Tokens:** 145

---

## Comment 1

**Author:** @octocat
**Created:** 4/14/2011, 4:00:49 PM
**File:** `config/database.yaml`
**Line:** 5 (RIGHT side)
**[View on GitHub](https://github.com/octocat/Hello-World/pull/1#discussion-diff-1)**

### Comment

We should probably include a check for null values here.

---

## Comment 2

...
```

The token counts use GPT-4 tokenization to help you understand the size of each comment.

### Health Check

```bash
curl http://localhost:3000/health
```

## Project Info

This project was created using `bun init` in bun v1.3.0. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
