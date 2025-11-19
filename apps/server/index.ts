import { GitHubClient, type PullRequestReviewComment } from "./lib/github";
import { encoding_for_model } from "tiktoken";

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

const server = Bun.serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Health check endpoint
    if (path === "/health") {
      return new Response("OK", { status: 200 });
    }

    // Match route: /:repoOwner/:repoName/pull/:id or /:repoOwner/:repoName/pull/:id/:commentNumber
    const match = path.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/(\d+))?$/);
    
    if (!match) {
      const errorMarkdown = `# Error 404\n\nRoute not found.\n\n**Expected formats:**\n- \`/:repoOwner/:repoName/pull/:id\` - Get all comments\n- \`/:repoOwner/:repoName/pull/:id/:commentNumber\` - Get specific comment by number (1, 2, 3...)\n\n**Examples:**\n- \`/octocat/Hello-World/pull/142\` - Get all comments\n- \`/octocat/Hello-World/pull/142/5\` - Get the 5th comment`;
      return new Response(errorMarkdown, {
        status: 404,
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
      });
    }

    const owner = match[1]!;
    const repo = match[2]!;
    const pullRequestId = parseInt(match[3]!, 10);
    const commentNumber = match[4] ? parseInt(match[4], 10) : null;

    // Get GitHub token
    const token = url.searchParams.get("token") || process.env.GITHUB_TOKEN || "";

    if (!token) {
      const errorMarkdown = `# Error 401\n\nMissing GitHub token.\n\n**Options:**\n- Set \`GITHUB_TOKEN\` environment variable\n- Pass token as query parameter: \`?token=your_token\``;
      return new Response(errorMarkdown, {
        status: 401,
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
      });
    }

    try {
      const client = new GitHubClient(token);
      let comments = await client.getPullRequestComments(
        owner,
        repo,
        pullRequestId
      );

      // Filter by comment number if provided
      if (commentNumber !== null) {
        if (commentNumber < 1 || commentNumber > comments.length) {
          const errorMarkdown = `# Error 404\n\nComment not found.\n\n**Comment Number:** ${commentNumber}\n**Pull Request:** #${pullRequestId}\n**Total Comments:** ${comments.length}\n\nComment number must be between 1 and ${comments.length}.`;
          return new Response(errorMarkdown, {
            status: 404,
            headers: { "Content-Type": "text/markdown; charset=utf-8" },
          });
        }
        // Get the specific comment by index (commentNumber - 1 since arrays are 0-indexed)
        comments = [comments[commentNumber - 1]!];
      }

      const markdown = formatCommentsAsMarkdown(owner, repo, pullRequestId, comments);

      return new Response(markdown, {
        status: 200,
        headers: { 
          "Content-Type": "text/markdown; charset=utf-8",
        },
      });
    } catch (error) {
      console.error("Error fetching PR comments:", error);
      
      const errorMarkdown = `# Error\n\nFailed to fetch pull request comments.\n\n**Details:** ${error instanceof Error ? error.message : String(error)}`;
      
      return new Response(errorMarkdown, {
        status: 500,
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
      });
    }
  },
});

console.log(`🚀 Server running at http://localhost:${server.port}`);
console.log(`\nExamples:`);
console.log(`  All comments: http://localhost:${server.port}/octocat/Hello-World/pull/142`);
console.log(`  Single comment: http://localhost:${server.port}/octocat/Hello-World/pull/142/5`);

