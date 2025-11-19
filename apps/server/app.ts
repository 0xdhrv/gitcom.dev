import express, { type Request, type Response } from "express";
import { GitHubClient, type PullRequestReviewComment } from "./lib/github.js";
import { encoding_for_model } from "tiktoken";

const app = express();

function countTokens(text: string): number {
  try {
    const encoder = encoding_for_model("gpt-4");
    const tokens = encoder.encode(text);
    const count = tokens.length;
    encoder.free();
    return count;
  } catch (error) {
    console.error("Error counting tokens:", error);
    return 0;
  }
}

function formatCommentsAsMarkdown(
  owner: string,
  repo: string,
  pullRequestId: number,
  comments: PullRequestReviewComment[]
): string {
  // Calculate total tokens from all comment bodies
  const totalTokens = comments.reduce((sum, comment) => {
    return sum + countTokens(comment.body);
  }, 0);

  let markdown = `# Pull Request #${pullRequestId} Comments\n\n`;
  markdown += `**Repository:** ${owner}/${repo}\n`;
  markdown += `**Total Comments:** ${comments.length}\n`;
  markdown += `**Total Tokens:** ${totalTokens.toLocaleString()}\n\n`;
  markdown += `---\n\n`;

  if (comments.length === 0) {
    markdown += `*No comments found for this pull request.*\n`;
    return markdown;
  }

  comments.forEach((comment, index) => {
    markdown += `## Comment ${index + 1}\n\n`;
    markdown += `**Author:** @${comment.user.login}\n`;
    markdown += `**Created:** ${new Date(comment.created_at).toLocaleString()}\n`;
    markdown += `**File:** \`${comment.path}\`\n`;

    // Line numbers
    if (comment.start_line && comment.line) {
      markdown += `**Lines:** ${comment.start_line}-${comment.line} (${comment.side || "RIGHT"} side)\n`;
    } else if (comment.line) {
      markdown += `**Line:** ${comment.line} (${comment.side || "RIGHT"} side)\n`;
    }

    markdown += `**[View on GitHub](${comment.html_url})**\n\n`;

    // Comment body
    markdown += `### Comment\n\n`;
    markdown += `${comment.body}\n\n`;

    if (index < comments.length - 1) {
      markdown += `---\n\n`;
    }
  });

  return markdown;
}

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).send("OK");
});

// Root endpoint - Usage guide
app.get("/", (req: Request, res: Response) => {
  const usageGuide = `# GitHub PR Comment Parser

Transform any GitHub Pull Request into LLM-ready markdown.

## Usage

Simply replace \`github.com\` with \`gitcom.dev\` in any pull request URL:

\`\`\`
Original: https://github.com/owner/repo/pull/123
GitCom:   https://gitcom.dev/owner/repo/pull/123
\`\`\`

## API Endpoints

### Get All Comments

\`\`\`
GET /:owner/:repo/pull/:pullRequestId
\`\`\`

**Example:**
\`\`\`
https://gitcom.dev/inboundemail/inbound/pull/142
\`\`\`

### Get Specific Comment

\`\`\`
GET /:owner/:repo/pull/:pullRequestId/:commentNumber
\`\`\`

**Example:**
\`\`\`
https://gitcom.dev/inboundemail/inbound/pull/142/5
\`\`\`

## Response Format

Returns markdown with:
- Pull request metadata
- Total comment count
- Total token count (GPT-4 tokenization)
- For each comment:
  - Author and timestamp
  - File path and line numbers
  - Comment text
  - Link to GitHub

## Features

- 📝 All PR comments in one request
- 🔢 Filter by comment number
- 🎯 Token counting for LLM context planning
- 📊 Clean markdown formatting
- ⚡ Fast and reliable

---

*Powered by [GitCom](https://gitcom.dev)*
`;

  res.status(200)
    .set("Content-Type", "text/markdown; charset=utf-8")
    .send(usageGuide);
});

// Handler function for PR comments
async function handlePRComments(
  owner: string,
  repo: string,
  pullRequestId: string,
  commentNumber: string | undefined,
  token: string,
  res: Response
) {
  // Validate required parameters
  if (!owner || !repo || !pullRequestId) {
    const errorMarkdown = `# Error 400\n\nMissing required parameters.\n\nExpected: /:owner/:repo/pull/:pullRequestId`;
    return res.status(400)
      .set("Content-Type", "text/markdown; charset=utf-8")
      .send(errorMarkdown);
  }
  
  // Validate pullRequestId is a number
  const prId = parseInt(pullRequestId, 10);
  if (isNaN(prId)) {
    const errorMarkdown = `# Error 400\n\nInvalid pull request ID.\n\n**Received:** ${pullRequestId}\n\nPull request ID must be a number.`;
    return res.status(400)
      .set("Content-Type", "text/markdown; charset=utf-8")
      .send(errorMarkdown);
  }

  // Validate commentNumber if provided
  let commentNum: number | null = null;
  if (commentNumber) {
    commentNum = parseInt(commentNumber, 10);
    if (isNaN(commentNum)) {
      const errorMarkdown = `# Error 400\n\nInvalid comment number.\n\n**Received:** ${commentNumber}\n\nComment number must be a number.`;
      return res.status(400)
        .set("Content-Type", "text/markdown; charset=utf-8")
        .send(errorMarkdown);
    }
  }

  if (!token) {
    const errorMarkdown = `# Error 401\n\nMissing GitHub token.\n\n**Options:**\n- Set \`GITHUB_TOKEN\` environment variable\n- Pass token as query parameter: \`?token=your_token\``;
    return res.status(401)
      .set("Content-Type", "text/markdown; charset=utf-8")
      .send(errorMarkdown);
  }

  try {
    const client = new GitHubClient(token);
    let comments = await client.getPullRequestComments(owner, repo, prId);

    // Filter by comment number if provided
    if (commentNum !== null) {
      if (commentNum < 1 || commentNum > comments.length) {
        const errorMarkdown = `# Error 404\n\nComment not found.\n\n**Comment Number:** ${commentNum}\n**Pull Request:** #${prId}\n**Total Comments:** ${comments.length}\n\nComment number must be between 1 and ${comments.length}.`;
        return res.status(404)
          .set("Content-Type", "text/markdown; charset=utf-8")
          .send(errorMarkdown);
      }
      // Get the specific comment by index (commentNum - 1 since arrays are 0-indexed)
      comments = [comments[commentNum - 1]!];
    }

    const markdown = formatCommentsAsMarkdown(owner, repo, prId, comments);

    return res.status(200)
      .set("Content-Type", "text/markdown; charset=utf-8")
      .send(markdown);
  } catch (error) {
    console.error("Error fetching PR comments:", error);
    
    const errorMarkdown = `# Error\n\nFailed to fetch pull request comments.\n\n**Details:** ${error instanceof Error ? error.message : String(error)}`;
    
    return res.status(500)
      .set("Content-Type", "text/markdown; charset=utf-8")
      .send(errorMarkdown);
  }
}

// Route: Get specific comment by number
app.get("/:owner/:repo/pull/:pullRequestId/:commentNumber", async (req: Request, res: Response) => {
  const { owner, repo, pullRequestId, commentNumber } = req.params;
  
  if (!owner || !repo || !pullRequestId || !commentNumber) {
    const errorMarkdown = `# Error 400\n\nMissing required parameters.`;
    return res.status(400)
      .set("Content-Type", "text/markdown; charset=utf-8")
      .send(errorMarkdown);
  }
  
  const token = (req.query.token as string) || process.env.GITHUB_TOKEN || "";
  
  return handlePRComments(owner, repo, pullRequestId, commentNumber, token, res);
});

// Route: Get all comments
app.get("/:owner/:repo/pull/:pullRequestId", async (req: Request, res: Response) => {
  const { owner, repo, pullRequestId } = req.params;
  
  if (!owner || !repo || !pullRequestId) {
    const errorMarkdown = `# Error 400\n\nMissing required parameters.`;
    return res.status(400)
      .set("Content-Type", "text/markdown; charset=utf-8")
      .send(errorMarkdown);
  }
  
  const token = (req.query.token as string) || process.env.GITHUB_TOKEN || "";
  
  return handlePRComments(owner, repo, pullRequestId, undefined, token, res);
});

// 404 handler for all other routes
app.use((req: Request, res: Response) => {
  const errorMarkdown = `# Error 404\n\nRoute not found.\n\n**Expected formats:**\n- \`/:repoOwner/:repoName/pull/:id\` - Get all comments\n- \`/:repoOwner/:repoName/pull/:id/:commentNumber\` - Get specific comment by number (1, 2, 3...)\n\n**Examples:**\n- \`/inboundemail/inbound/pull/142\` - Get all comments\n- \`/inboundemail/inbound/pull/142/5\` - Get the 5th comment`;
  
  res.status(404)
    .set("Content-Type", "text/markdown; charset=utf-8")
    .send(errorMarkdown);
});

// Only start server if not in Vercel environment
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`\nExamples:`);
    console.log(`  All comments: http://localhost:${PORT}/inboundemail/inbound/pull/142`);
    console.log(`  Single comment: http://localhost:${PORT}/inboundemail/inbound/pull/142/5`);
  });
}

// Export for Vercel
export default app;

