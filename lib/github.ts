/**
 * GitHub API client for Pull Request comments
 */

// Type definitions based on GitHub API schema

export type AuthorAssociation =
  | "COLLABORATOR"
  | "CONTRIBUTOR"
  | "FIRST_TIMER"
  | "FIRST_TIME_CONTRIBUTOR"
  | "MANNEQUIN"
  | "MEMBER"
  | "NONE"
  | "OWNER";

export type Side = "LEFT" | "RIGHT";

export type SubjectType = "line" | "file";

export interface SimpleUser {
  name?: string | null;
  email?: string | null;
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string | null;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  starred_at?: string;
  user_view_type?: string;
}

export interface ReactionRollup {
  url: string;
  total_count: number;
  "+1": number;
  "-1": number;
  laugh: number;
  confused: number;
  heart: number;
  hooray: number;
  eyes: number;
  rocket: number;
}

export interface PullRequestReviewCommentLinks {
  self: {
    href: string;
  };
  html: {
    href: string;
  };
  pull_request: {
    href: string;
  };
}

export interface PullRequestReviewComment {
  url: string;
  pull_request_review_id: number | null;
  id: number;
  node_id: string;
  diff_hunk: string;
  path: string;
  position?: number;
  original_position?: number;
  commit_id: string;
  original_commit_id: string;
  in_reply_to_id?: number;
  user: SimpleUser;
  body: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  pull_request_url: string;
  author_association: AuthorAssociation;
  _links: PullRequestReviewCommentLinks;
  start_line?: number | null;
  original_start_line?: number | null;
  start_side?: Side | null;
  line?: number;
  original_line?: number;
  side?: Side;
  subject_type?: SubjectType;
  reactions?: ReactionRollup;
  body_html?: string;
  body_text?: string;
}

export interface GitHubPRCommentsOptions {
  owner: string;
  repo: string;
  pullRequestId: number;
  token: string;
}

/**
 * Fetches all comments for a specific Pull Request
 * 
 * @param options - Configuration options for the API request
 * @returns Array of Pull Request Review Comments
 * @throws Error if the API request fails
 */
export async function fetchPullRequestComments(
  options: GitHubPRCommentsOptions
): Promise<PullRequestReviewComment[]> {
  const { owner, repo, pullRequestId, token } = options;

  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullRequestId}/comments`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GitHub API request failed: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  const data = await response.json();
  return data as PullRequestReviewComment[];
}

/**
 * GitHub API client class for Pull Request operations
 */
export class GitHubClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  /**
   * Fetches all comments for a specific Pull Request
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param pullRequestId - Pull Request ID
   * @returns Array of Pull Request Review Comments
   */
  async getPullRequestComments(
    owner: string,
    repo: string,
    pullRequestId: number
  ): Promise<PullRequestReviewComment[]> {
    return fetchPullRequestComments({
      owner,
      repo,
      pullRequestId,
      token: this.token,
    });
  }
}

