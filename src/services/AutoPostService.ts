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
   * Generate a sensible title from commit messages or branch name
   */
  private async generateTitle(sourceBranch: string): Promise<string> {
    try {
      // Try to get the latest commit message from the source branch
      const latestCommit = await GitHelper.getLatestCommitMessage(sourceBranch);

      if (latestCommit) {
        // Clean up the commit message to make it PR-title friendly
        const cleanTitle = this.cleanCommitMessageForTitle(latestCommit);
        if (cleanTitle && cleanTitle.length > 10) {
          return cleanTitle;
        }
      }

      // Fallback to branch name
      return this.generateTitleFromBranch(sourceBranch);
    } catch {
      // Final fallback to branch name
      return this.generateTitleFromBranch(sourceBranch);
    }
  }

  /**
   * Clean commit message to make it suitable as a PR title
   */
  private cleanCommitMessageForTitle(commitMessage: string): string {
    // Take only the first line (subject) of the commit message
    const firstLine = commitMessage.split("\n")[0].trim();

    // Remove common prefixes that aren't suitable for PR titles
    const prefixesToRemove = [
      /^(fix|feat|chore|docs|style|refactor|test|perf|ci|build):\s*/i,
      /^(wip|temp|tmp):\s*/i,
      /^merge\s+/i,
      /^revert\s+/i,
    ];

    let cleaned = firstLine;
    for (const prefix of prefixesToRemove) {
      cleaned = cleaned.replace(prefix, "");
    }

    // Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

    // Remove trailing periods
    cleaned = cleaned.replace(/\.$/, "");

    return cleaned.trim();
  }

  /**
   * Generate title from branch name
   */
  private generateTitleFromBranch(branchName: string): string {
    // Remove common prefixes
    let title = branchName.replace(
      /^(feature|bugfix|hotfix|fix|feat|chore)\//,
      ""
    );

    // Remove origin/ prefix if present
    title = title.replace(/^(origin\/|remotes\/origin\/)/, "");

    // Replace dashes and underscores with spaces
    title = title.replace(/[-_]/g, " ");

    // Remove issue numbers in common formats
    title = title.replace(/^\d+[-_]/, ""); // Remove leading "123-" or "123_"
    title = title.replace(/[-_]\d+$/, ""); // Remove trailing "-123" or "_123"

    // Capitalize each word
    title = title.replace(/\b\w/g, (l) => l.toUpperCase());

    // Clean up extra spaces
    title = title.replace(/\s+/g, " ").trim();

    return title || "Update from " + branchName;
  }

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
      // Generate a sensible title if none provided or if it's generic
      let finalTitle = title;
      if (
        !title ||
        title.trim() === "" ||
        title.toLowerCase().includes("pr summary") ||
        title.toLowerCase().includes("pull request")
      ) {
        finalTitle = await this.generateTitle(sourceBranch);
      }

      // Detect platform from remote URL
      const platform = await this.detectPlatform();

      if (platform === "github") {
        return await this.postToGitHub(
          finalTitle,
          summary,
          sourceBranch,
          targetBranch,
          state
        );
      } else if (platform === "gitlab") {
        return await this.postToGitLab(
          finalTitle,
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

      // Validate branches exist before creating PR
      const branchValidation = await this.validateGitHubBranches(
        token,
        repoInfo,
        sourceBranch,
        targetBranch
      );

      if (!branchValidation.valid) {
        return {
          success: false,
          error: branchValidation.error,
          platform: "github",
        };
      }

      const isDraft = this.shouldCreateDraft(state, title, sourceBranch);

      // Clean up branch names (remove origin/ prefix if present)
      const cleanSourceBranch = sourceBranch.replace(
        /^(origin\/|remotes\/origin\/)/,
        ""
      );
      const cleanTargetBranch = targetBranch.replace(
        /^(origin\/|remotes\/origin\/)/,
        ""
      );

      const prData: PRCreateRequest = {
        title,
        body: summary,
        head: cleanSourceBranch,
        base: cleanTargetBranch,
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
        let errorMessage = `GitHub API error (${response.status}): ${response.statusText}`;

        try {
          const errorData = (await response.json()) as any;

          if (errorData.message) {
            errorMessage = `GitHub API error: ${errorData.message}`;
          }

          // Provide specific error messages for common validation failures
          if (errorData.errors && Array.isArray(errorData.errors)) {
            const errorDetails = errorData.errors
              .map((err: any) => {
                if (err.field === "head" && err.code === "invalid") {
                  return `Source branch "${cleanSourceBranch}" does not exist or is not accessible`;
                }
                if (err.field === "base" && err.code === "invalid") {
                  return `Target branch "${cleanTargetBranch}" does not exist`;
                }
                if (err.message && err.message.includes("already exists")) {
                  return `A pull request already exists for ${cleanSourceBranch} → ${cleanTargetBranch}`;
                }
                return err.message || `${err.field}: ${err.code}`;
              })
              .join("; ");

            errorMessage += `. Details: ${errorDetails}`;
          }

          // Check for specific validation scenarios
          if (response.status === 422) {
            if (errorData.message?.includes("already exists")) {
              errorMessage = `A pull request from "${cleanSourceBranch}" to "${cleanTargetBranch}" already exists`;
            } else if (errorData.message?.includes("head sha")) {
              errorMessage = `Source branch "${cleanSourceBranch}" is up to date with target branch "${cleanTargetBranch}" - no changes to merge`;
            }
          }
        } catch (parseError) {
          // If we can't parse the error response, use the original message
          console.log("Could not parse GitHub error response:", parseError);
        }

        return {
          success: false,
          error: errorMessage,
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
   * Validate that branches exist on GitHub before creating PR
   */
  private async validateGitHubBranches(
    token: string,
    repoInfo: { owner: string; repo: string },
    sourceBranch: string,
    targetBranch: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Clean branch names
      const cleanSourceBranch = sourceBranch.replace(
        /^(origin\/|remotes\/origin\/)/,
        ""
      );
      const cleanTargetBranch = targetBranch.replace(
        /^(origin\/|remotes\/origin\/)/,
        ""
      );

      // Check if source branch exists
      const sourceResponse = await fetch(
        `${GITHUB_API.BASE_URL}${GITHUB_API.ENDPOINTS.REPOS}/${repoInfo.owner}/${repoInfo.repo}/branches/${cleanSourceBranch}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
        }
      );

      if (!sourceResponse.ok) {
        if (sourceResponse.status === 404) {
          // Check if the branch exists locally
          const localBranchExists = await this.checkLocalBranchExists(
            cleanSourceBranch
          );

          if (localBranchExists) {
            // Offer to push the branch
            const shouldPush = await vscode.window.showWarningMessage(
              `Branch "${cleanSourceBranch}" exists locally but not on GitHub. Would you like to push it first?`,
              "Push Branch",
              "Cancel"
            );

            if (shouldPush === "Push Branch") {
              const pushResult = await this.pushBranch(cleanSourceBranch);
              if (pushResult.success) {
                vscode.window.showInformationMessage(
                  `✅ Branch "${cleanSourceBranch}" pushed successfully!`
                );
                return { valid: true }; // Branch is now available remotely
              } else {
                return {
                  valid: false,
                  error: `Failed to push branch "${cleanSourceBranch}": ${pushResult.error}`,
                };
              }
            } else {
              return {
                valid: false,
                error: `Branch "${cleanSourceBranch}" needs to be pushed to GitHub first.`,
              };
            }
          } else {
            return {
              valid: false,
              error: `Source branch "${cleanSourceBranch}" does not exist locally or on GitHub.`,
            };
          }
        }
        return {
          valid: false,
          error: `Could not verify source branch "${cleanSourceBranch}" (HTTP ${sourceResponse.status})`,
        };
      }

      // Check if target branch exists
      const targetResponse = await fetch(
        `${GITHUB_API.BASE_URL}${GITHUB_API.ENDPOINTS.REPOS}/${repoInfo.owner}/${repoInfo.repo}/branches/${cleanTargetBranch}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
        }
      );

      if (!targetResponse.ok) {
        if (targetResponse.status === 404) {
          return {
            valid: false,
            error: `Target branch "${cleanTargetBranch}" does not exist on GitHub`,
          };
        }
        return {
          valid: false,
          error: `Could not verify target branch "${cleanTargetBranch}" (HTTP ${targetResponse.status})`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Branch validation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Check if a branch exists locally
   */
  private async checkLocalBranchExists(branchName: string): Promise<boolean> {
    try {
      const branches = await GitHelper.getAllBranches();
      return branches.some(
        (branch) =>
          branch === branchName ||
          branch === `origin/${branchName}` ||
          branch === `remotes/origin/${branchName}`
      );
    } catch {
      return false;
    }
  }

  /**
   * Push a branch to remote
   */
  private async pushBranch(
    branchName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Pushing branch "${branchName}"...`,
          cancellable: false,
        },
        async () => {
          return await GitHelper.pushBranch(branchName);
        }
      );

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
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

      const apiBaseUrl = await this.getGitLabApiBaseUrl();
      const isDraft = this.shouldCreateDraft(state, title, sourceBranch);

      const mrData: MRCreateRequest = {
        title,
        description: summary,
        source_branch: sourceBranch,
        target_branch: targetBranch,
        draft: isDraft,
      };

      const response = await fetch(
        `${apiBaseUrl}${GITLAB_API.ENDPOINTS.PROJECTS}/${projectId}${GITLAB_API.ENDPOINTS.MERGE_REQUESTS}`,
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
        remoteUrl.includes("gitlab.") ||
        this.isGitLabInstance(remoteUrl)
      ) {
        return "gitlab";
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if URL appears to be a GitLab instance
   */
  private isGitLabInstance(remoteUrl: string): boolean {
    // Common patterns for GitLab instances
    const gitlabPatterns = [
      /gitlab\./i,
      /git\..*\..*\/.*\/.*$/i, // git.company.com/group/project pattern
      /-git\./i,
      /\/gitlab\//i,
    ];

    return gitlabPatterns.some((pattern) => pattern.test(remoteUrl));
  }

  /**
   * Get GitLab API base URL for the current repository
   */
  private async getGitLabApiBaseUrl(): Promise<string> {
    try {
      const remoteUrl = await GitHelper.getRemoteUrl();
      if (!remoteUrl) return GITLAB_API.BASE_URL;

      // If it's gitlab.com, use the default
      if (remoteUrl.includes("gitlab.com")) {
        return GITLAB_API.BASE_URL;
      }

      // For custom GitLab instances, extract the domain
      const patterns = [/https?:\/\/([^\/]+)/, /git@([^:]+):/];

      for (const pattern of patterns) {
        const match = remoteUrl.match(pattern);
        if (match) {
          const domain = match[1];
          return `https://${domain}/api/v4`;
        }
      }

      // Fallback to default
      return GITLAB_API.BASE_URL;
    } catch {
      return GITLAB_API.BASE_URL;
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

    // Try workspace-specific token first
    let token = config.get<string>("github.token");

    if (!token) {
      // Try global token as fallback
      const globalConfig = vscode.workspace.getConfiguration("prSummary");
      token = globalConfig.inspect<string>("github.token")?.globalValue;
    }

    if (!token) {
      // Prompt user for token with option to save per-project or globally
      const tokenInput = await vscode.window.showInputBox({
        prompt: "Enter your GitHub Personal Access Token",
        password: true,
        placeHolder: "ghp_...",
        ignoreFocusOut: true,
      });

      if (tokenInput) {
        const scope = await vscode.window.showQuickPick(
          [
            {
              label: "This Project Only",
              detail: "Save token for this workspace only",
              value: "workspace",
            },
            {
              label: "All Projects (Global)",
              detail: "Use this token for all GitHub projects",
              value: "global",
            },
          ],
          {
            placeHolder: "Where should this token be saved?",
            ignoreFocusOut: true,
          }
        );

        if (scope?.value === "workspace") {
          await config.update(
            "github.token",
            tokenInput,
            vscode.ConfigurationTarget.Workspace
          );
        } else {
          await config.update(
            "github.token",
            tokenInput,
            vscode.ConfigurationTarget.Global
          );
        }

        token = tokenInput;
      }
    }

    return token || null;
  }

  /**
   * Get GitLab token from VS Code settings or secrets
   */
  private async getGitLabToken(): Promise<string | null> {
    const config = vscode.workspace.getConfiguration("prSummary");

    // Try workspace-specific token first
    let token = config.get<string>("gitlab.token");

    if (!token) {
      // Try global token as fallback
      const globalConfig = vscode.workspace.getConfiguration("prSummary");
      token = globalConfig.inspect<string>("gitlab.token")?.globalValue;
    }

    if (!token) {
      // Prompt user for token with option to save per-project or globally
      const tokenInput = await vscode.window.showInputBox({
        prompt: "Enter your GitLab Personal Access Token",
        password: true,
        placeHolder: "glpat-...",
        ignoreFocusOut: true,
      });

      if (tokenInput) {
        const scope = await vscode.window.showQuickPick(
          [
            {
              label: "This Project Only",
              detail: "Save token for this workspace only",
              value: "workspace",
            },
            {
              label: "All Projects (Global)",
              detail: "Use this token for all GitLab projects",
              value: "global",
            },
          ],
          {
            placeHolder: "Where should this token be saved?",
            ignoreFocusOut: true,
          }
        );

        if (scope?.value === "workspace") {
          await config.update(
            "gitlab.token",
            tokenInput,
            vscode.ConfigurationTarget.Workspace
          );
        } else {
          await config.update(
            "gitlab.token",
            tokenInput,
            vscode.ConfigurationTarget.Global
          );
        }

        token = tokenInput;
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

        const apiBaseUrl = await this.getGitLabApiBaseUrl();

        const response = await fetch(
          `${apiBaseUrl}${GITLAB_API.ENDPOINTS.USER}`,
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

  /**
   * Manual PR/MR posting - can be used independently of auto-post
   */
  async manualPost(
    title: string,
    summary: string,
    sourceBranch: string,
    targetBranch: string
  ): Promise<AutoPostResult> {
    try {
      // Generate a sensible title if none provided or if it's generic
      let finalTitle = title;
      if (
        !title ||
        title.trim() === "" ||
        title.toLowerCase().includes("pr summary") ||
        title.toLowerCase().includes("pull request")
      ) {
        finalTitle = await this.generateTitle(sourceBranch);
      }

      // Let user choose platform if multiple are available
      const platform = await this.selectPlatform();

      if (!platform) {
        return {
          success: false,
          error: "No platform selected",
          platform: "github",
        };
      }

      // Let user choose draft state
      const state = await this.selectPRState();

      if (platform === "github") {
        return await this.postToGitHub(
          finalTitle,
          summary,
          sourceBranch,
          targetBranch,
          state
        );
      } else if (platform === "gitlab") {
        return await this.postToGitLab(
          finalTitle,
          summary,
          sourceBranch,
          targetBranch,
          state
        );
      } else {
        return {
          success: false,
          error: "Invalid platform selected",
          platform: "github",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Manual post failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        platform: "github",
      };
    }
  }

  /**
   * Let user select platform for manual posting
   */
  private async selectPlatform(): Promise<AutoPostPlatform | null> {
    // First try to auto-detect
    const detectedPlatform = await this.detectPlatform();

    if (detectedPlatform) {
      // If we can detect the platform, ask for confirmation
      const confirm = await vscode.window.showQuickPick(
        [
          {
            label: `✅ ${
              detectedPlatform.charAt(0).toUpperCase() +
              detectedPlatform.slice(1)
            }`,
            detail: `Detected from Git remote URL`,
            value: detectedPlatform,
          },
          {
            label: "Choose Different Platform",
            detail: "Select a different platform manually",
            value: "choose",
          },
        ],
        {
          placeHolder: "Select platform for PR/MR",
          ignoreFocusOut: true,
        }
      );

      if (!confirm) return null;

      if (confirm.value !== "choose") {
        return confirm.value as AutoPostPlatform;
      }
    }

    // Manual selection
    const platformChoice = await vscode.window.showQuickPick(
      [
        {
          label: "GitHub",
          detail: "Create Pull Request on GitHub",
          value: "github" as AutoPostPlatform,
        },
        {
          label: "GitLab",
          detail: "Create Merge Request on GitLab",
          value: "gitlab" as AutoPostPlatform,
        },
      ],
      {
        placeHolder: "Select platform for PR/MR",
        ignoreFocusOut: true,
      }
    );

    return platformChoice?.value || null;
  }

  /**
   * Let user select PR/MR state
   */
  private async selectPRState(): Promise<AutoPostState> {
    const stateChoice = await vscode.window.showQuickPick(
      [
        {
          label: "Ready for Review",
          detail: "Create PR/MR ready for review",
          value: "ready" as AutoPostState,
        },
        {
          label: "Draft",
          detail: "Create as draft PR/MR",
          value: "draft" as AutoPostState,
        },
        {
          label: "Auto-detect",
          detail: "Detect from branch name or title keywords",
          value: "auto" as AutoPostState,
        },
      ],
      {
        placeHolder: "Select PR/MR state",
        ignoreFocusOut: true,
      }
    );

    return stateChoice?.value || "ready";
  }

  /**
   * Configure tokens for the current workspace
   */
  async configureTokens(): Promise<void> {
    const platform = await vscode.window.showQuickPick(
      [
        {
          label: "GitHub",
          detail: "Configure GitHub Personal Access Token",
          value: "github",
        },
        {
          label: "GitLab",
          detail: "Configure GitLab Personal Access Token",
          value: "gitlab",
        },
      ],
      {
        placeHolder: "Select platform to configure",
        ignoreFocusOut: true,
      }
    );

    if (!platform) return;

    const token = await vscode.window.showInputBox({
      prompt: `Enter your ${platform.label} Personal Access Token`,
      password: true,
      placeHolder: platform.value === "github" ? "ghp_..." : "glpat-...",
      ignoreFocusOut: true,
    });

    if (!token) return;

    const scope = await vscode.window.showQuickPick(
      [
        {
          label: "This Project Only",
          detail: "Save token for this workspace only",
          value: "workspace",
        },
        {
          label: "All Projects (Global)",
          detail: `Use this token for all ${platform.label} projects`,
          value: "global",
        },
      ],
      {
        placeHolder: "Where should this token be saved?",
        ignoreFocusOut: true,
      }
    );

    if (!scope) return;

    const config = vscode.workspace.getConfiguration("prSummary");
    const configTarget =
      scope.value === "workspace"
        ? vscode.ConfigurationTarget.Workspace
        : vscode.ConfigurationTarget.Global;

    await config.update(`${platform.value}.token`, token, configTarget);

    const scopeText =
      scope.value === "workspace" ? "this workspace" : "globally";
    vscode.window.showInformationMessage(
      `✅ ${platform.label} token configured for ${scopeText}`
    );
  }
}
