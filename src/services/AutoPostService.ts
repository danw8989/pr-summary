import * as vscode from "vscode";
import { GitHelper } from "../utils/gitHelper";
import {
  GITHUB_API,
  GITLAB_API,
  AUTO_POST_PLATFORMS,
  type AutoPostPlatform,
  type AutoPostState,
} from "../constants";

interface PRCreateRequest {
  title: string;
  body: string;
  head: string;
  base: string;
  draft?: boolean;
}

interface MRCreateRequest {
  title: string;
  description: string;
  source_branch: string;
  target_branch: string;
  draft?: boolean;
}

interface AutoPostResult {
  success: boolean;
  url?: string;
  error?: string;
  platform: AutoPostPlatform;
}

interface GitHubUser {
  login: string;
}

interface GitLabUser {
  username: string;
}

interface GitHubPRResponse {
  html_url: string;
}

interface GitLabMRResponse {
  web_url: string;
}

interface ErrorResponse {
  message?: string;
}

export class AutoPostService {
  /**
   * Auto-post PR summary to the detected platform
   */
  async autoPost(
    title: string,
    summary: string,
    sourceBranch: string,
    targetBranch: string,
    state: AutoPostState = "ready"
  ): Promise<AutoPostResult> {
    try {
      // Detect platform from remote URL
      const platform = await this.detectPlatform();

      if (platform === "github") {
        return await this.postToGitHub(
          title,
          summary,
          sourceBranch,
          targetBranch,
          state
        );
      } else if (platform === "gitlab") {
        return await this.postToGitLab(
          title,
          summary,
          sourceBranch,
          targetBranch,
          state
        );
      } else {
        return {
          success: false,
          error: "Could not detect GitHub or GitLab repository",
          platform: "github", // default
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Auto-post failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        platform: "github", // default
      };
    }
  }

  /**
   * Post to GitHub
   */
  async postToGitHub(
    title: string,
    summary: string,
    sourceBranch: string,
    targetBranch: string,
    state: AutoPostState
  ): Promise<AutoPostResult> {
    try {
      const token = await this.getGitHubToken();
      if (!token) {
        return {
          success: false,
          error:
            "GitHub token not configured. Please set it in VS Code settings.",
          platform: "github",
        };
      }

      const repoInfo = await this.getGitHubRepoInfo();
      if (!repoInfo) {
        return {
          success: false,
          error: "Could not determine GitHub repository information",
          platform: "github",
        };
      }

      const isDraft = this.shouldCreateDraft(state, title, sourceBranch);

      const prData: PRCreateRequest = {
        title,
        body: summary,
        head: sourceBranch,
        base: targetBranch,
        draft: isDraft,
      };

      const response = await fetch(
        `${GITHUB_API.BASE_URL}${GITHUB_API.ENDPOINTS.REPOS}/${repoInfo.owner}/${repoInfo.repo}${GITHUB_API.ENDPOINTS.PULLS}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify(prData),
        }
      );

      if (!response.ok) {
        const errorData = (await response.json()) as ErrorResponse;
        return {
          success: false,
          error: `GitHub API error: ${
            errorData.message || response.statusText
          }`,
          platform: "github",
        };
      }

      const prResult = (await response.json()) as GitHubPRResponse;
      return {
        success: true,
        url: prResult.html_url,
        platform: "github",
      };
    } catch (error) {
      return {
        success: false,
        error: `GitHub post failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        platform: "github",
      };
    }
  }

  /**
   * Post to GitLab
   */
  async postToGitLab(
    title: string,
    summary: string,
    sourceBranch: string,
    targetBranch: string,
    state: AutoPostState
  ): Promise<AutoPostResult> {
    try {
      const token = await this.getGitLabToken();
      if (!token) {
        return {
          success: false,
          error:
            "GitLab token not configured. Please set it in VS Code settings.",
          platform: "gitlab",
        };
      }

      const projectId = await this.getGitLabProjectId();
      if (!projectId) {
        return {
          success: false,
          error: "Could not determine GitLab project ID",
          platform: "gitlab",
        };
      }

      const isDraft = this.shouldCreateDraft(state, title, sourceBranch);

      const mrData: MRCreateRequest = {
        title,
        description: summary,
        source_branch: sourceBranch,
        target_branch: targetBranch,
        draft: isDraft,
      };

      const response = await fetch(
        `${GITLAB_API.BASE_URL}${GITLAB_API.ENDPOINTS.PROJECTS}/${projectId}${GITLAB_API.ENDPOINTS.MERGE_REQUESTS}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mrData),
        }
      );

      if (!response.ok) {
        const errorData = (await response.json()) as ErrorResponse;
        return {
          success: false,
          error: `GitLab API error: ${
            errorData.message || response.statusText
          }`,
          platform: "gitlab",
        };
      }

      const mrResult = (await response.json()) as GitLabMRResponse;
      return {
        success: true,
        url: mrResult.web_url,
        platform: "gitlab",
      };
    } catch (error) {
      return {
        success: false,
        error: `GitLab post failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        platform: "gitlab",
      };
    }
  }

  /**
   * Detect platform from Git remote URL
   */
  private async detectPlatform(): Promise<AutoPostPlatform | null> {
    try {
      const remoteUrl = await GitHelper.getRemoteUrl();
      if (!remoteUrl) return null;

      if (remoteUrl.includes("github.com")) {
        return "github";
      } else if (
        remoteUrl.includes("gitlab.com") ||
        remoteUrl.includes("gitlab.")
      ) {
        return "gitlab";
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get GitHub repository info from remote URL
   */
  private async getGitHubRepoInfo(): Promise<{
    owner: string;
    repo: string;
  } | null> {
    try {
      const remoteUrl = await GitHelper.getRemoteUrl();
      if (!remoteUrl) return null;

      // Parse GitHub URL patterns
      const patterns = [
        /github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/,
        /github\.com\/([^/]+)\/([^/]+)/,
      ];

      for (const pattern of patterns) {
        const match = remoteUrl.match(pattern);
        if (match) {
          return { owner: match[1], repo: match[2] };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get GitLab project ID from remote URL
   */
  private async getGitLabProjectId(): Promise<string | null> {
    try {
      const remoteUrl = await GitHelper.getRemoteUrl();
      if (!remoteUrl) return null;

      // Extract project path from GitLab URL
      const patterns = [
        /gitlab\.com[:/]([^/]+\/[^/.]+)(?:\.git)?$/,
        /gitlab\.com\/([^/]+\/[^/]+)/,
      ];

      for (const pattern of patterns) {
        const match = remoteUrl.match(pattern);
        if (match) {
          // URL encode the project path
          return encodeURIComponent(match[1]);
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Determine if PR/MR should be created as draft
   */
  private shouldCreateDraft(
    state: AutoPostState,
    title: string,
    branch: string
  ): boolean {
    if (state === "draft") return true;
    if (state === "ready") return false;

    // Auto-detect draft based on patterns
    const draftKeywords = ["wip", "draft", "poc", "experiment", "test"];
    const titleLower = title.toLowerCase();
    const branchLower = branch.toLowerCase();

    return draftKeywords.some(
      (keyword) => titleLower.includes(keyword) || branchLower.includes(keyword)
    );
  }

  /**
   * Get GitHub token from VS Code settings or secrets
   */
  private async getGitHubToken(): Promise<string | null> {
    const config = vscode.workspace.getConfiguration("prSummary");
    let token = config.get<string>("github.token");

    if (!token) {
      // Try to get from VS Code secrets API
      try {
        token = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Retrieving GitHub token...",
          },
          async () => {
            return await vscode.workspace
              .getConfiguration()
              .get<string>("prSummary.github.token");
          }
        );
      } catch {
        // Fallback to asking user to input token
        token = await vscode.window.showInputBox({
          prompt: "Enter your GitHub Personal Access Token",
          password: true,
          placeHolder: "ghp_...",
          ignoreFocusOut: true,
        });

        if (token) {
          // Save token to settings
          await config.update(
            "github.token",
            token,
            vscode.ConfigurationTarget.Global
          );
        }
      }
    }

    return token || null;
  }

  /**
   * Get GitLab token from VS Code settings or secrets
   */
  private async getGitLabToken(): Promise<string | null> {
    const config = vscode.workspace.getConfiguration("prSummary");
    let token = config.get<string>("gitlab.token");

    if (!token) {
      // Try to get from VS Code secrets API
      try {
        token = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Retrieving GitLab token...",
          },
          async () => {
            return await vscode.workspace
              .getConfiguration()
              .get<string>("prSummary.gitlab.token");
          }
        );
      } catch {
        // Fallback to asking user to input token
        token = await vscode.window.showInputBox({
          prompt: "Enter your GitLab Personal Access Token",
          password: true,
          placeHolder: "glpat-...",
          ignoreFocusOut: true,
        });

        if (token) {
          // Save token to settings
          await config.update(
            "gitlab.token",
            token,
            vscode.ConfigurationTarget.Global
          );
        }
      }
    }

    return token || null;
  }

  /**
   * Test platform connectivity
   */
  async testConnection(
    platform: AutoPostPlatform
  ): Promise<{ success: boolean; error?: string; username?: string }> {
    try {
      if (platform === "github") {
        const token = await this.getGitHubToken();
        if (!token) {
          return { success: false, error: "No GitHub token configured" };
        }

        const response = await fetch(
          `${GITHUB_API.BASE_URL}${GITHUB_API.ENDPOINTS.USER}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github+json",
            },
          }
        );

        if (!response.ok) {
          return {
            success: false,
            error: `GitHub API error: ${response.statusText}`,
          };
        }

        const user = (await response.json()) as GitHubUser;
        return { success: true, username: user.login };
      } else if (platform === "gitlab") {
        const token = await this.getGitLabToken();
        if (!token) {
          return { success: false, error: "No GitLab token configured" };
        }

        const response = await fetch(
          `${GITLAB_API.BASE_URL}${GITLAB_API.ENDPOINTS.USER}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          return {
            success: false,
            error: `GitLab API error: ${response.statusText}`,
          };
        }

        const user = (await response.json()) as GitLabUser;
        return { success: true, username: user.username };
      }

      return { success: false, error: "Unknown platform" };
    } catch (error) {
      return {
        success: false,
        error: `Connection test failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
}
