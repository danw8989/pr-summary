import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";

const execPromise = promisify(exec);

export class GitHelper {
  /**
   * Get the workspace root path
   */
  static getWorkspaceRootPath(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error("No workspace folder is open");
    }
    return workspaceFolders[0].uri.fsPath;
  }

  /**
   * Execute a command in the workspace root directory
   */
  static async executeInWorkspaceRoot(
    command: string,
    options: { maxBuffer?: number; timeout?: number } = {}
  ): Promise<{ stdout: string; stderr: string }> {
    const workspaceRoot = this.getWorkspaceRootPath();
    console.log(`Executing command in workspace root: ${workspaceRoot}`);
    console.log(`Command: ${command}`);

    const execOptions = {
      cwd: workspaceRoot,
      maxBuffer: options.maxBuffer || 10 * 1024 * 1024, // 10MB default (increased from 1MB)
      timeout: options.timeout || 30000, // 30 seconds timeout
    };

    return execPromise(command, execOptions);
  }

  /**
   * Get the current branch name
   */
  static async getCurrentBranchName(): Promise<string> {
    try {
      // Log current working directory for debugging
      console.log(`Current working directory: ${process.cwd()}`);

      // Execute git command in workspace root
      const { stdout } = await this.executeInWorkspaceRoot(
        "git rev-parse --abbrev-ref HEAD"
      );

      const currentBranch = stdout.trim();
      console.log(`Git current branch detection: "${currentBranch}"`);

      // Double-check by using status command as backup
      try {
        const { stdout: statusOutput } = await this.executeInWorkspaceRoot(
          "git status -b --porcelain=v2 | grep 'branch.head'"
        );

        if (statusOutput) {
          const match = statusOutput.match(/branch\.head\s+(.+)/);
          if (match && match[1]) {
            const statusBranch = match[1].trim();
            console.log(`Git status branch detection: "${statusBranch}"`);

            // If different from rev-parse, use this one
            if (statusBranch !== currentBranch) {
              console.log(
                `Branch mismatch detected. Using status branch: "${statusBranch}"`
              );
              return statusBranch;
            }
          }
        }
      } catch (statusError) {
        console.log(`Failed to get branch from status: ${statusError}`);
        // Continue with the rev-parse result
      }

      return currentBranch;
    } catch (error) {
      // Log more detailed error information
      console.error(`Git error details: ${error}`);

      // Try to get available workspace folders
      try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        console.error(
          `Available workspace folders: ${JSON.stringify(workspaceFolders)}`
        );
      } catch (e) {
        console.error(`Error getting workspace folders: ${e}`);
      }

      throw new Error(`Failed to get current branch name: ${error}`);
    }
  }

  /**
   * Get commit messages with optional diffs between source and target branches
   */
  static async getCommitMessagesWithDiff(
    sourceBranch: string,
    targetBranch: string = "main",
    includeDiffs: boolean = false,
    maxCommits: number = 50
  ): Promise<string> {
    // Validate branches before proceeding
    const validation = await this.validateBranches(sourceBranch, targetBranch);
    if (!validation.isValid) {
      console.error(`Branch validation failed: ${validation.error}`);
      throw new Error(validation.error);
    }

    // First try with limited commits and appropriate buffer size
    try {
      return await this.getCommitMessagesWithDiffInternal(
        sourceBranch,
        targetBranch,
        includeDiffs,
        maxCommits
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // If we hit buffer limits, try fallback strategies
      if (
        errorMessage.includes("maxBuffer") ||
        errorMessage.includes("MAXBUFFER")
      ) {
        console.warn("Hit buffer limit, trying fallback strategies...");

        // Strategy 1: Reduce commits if we haven't already
        if (maxCommits > 10) {
          console.log(
            `Retrying with fewer commits: ${Math.max(10, maxCommits / 2)}`
          );
          try {
            return await this.getCommitMessagesWithDiffInternal(
              sourceBranch,
              targetBranch,
              includeDiffs,
              Math.max(10, Math.floor(maxCommits / 2))
            );
          } catch (retryError) {
            console.warn(
              "Still hitting buffer limits, trying without diffs..."
            );
          }
        }

        // Strategy 2: Remove diffs if included
        if (includeDiffs) {
          console.log("Retrying without diffs...");
          try {
            return await this.getCommitMessagesWithDiffInternal(
              sourceBranch,
              targetBranch,
              false,
              Math.min(maxCommits, 20)
            );
          } catch (retryError) {
            console.warn(
              "Still hitting buffer limits, trying minimal output..."
            );
          }
        }

        // Strategy 3: Get just commit titles (minimal output)
        console.log("Using minimal commit output as final fallback...");
        return await this.getMinimalCommitMessages(
          sourceBranch,
          targetBranch,
          10
        );
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Validate that source and target branches exist and are different
   */
  private static async validateBranches(
    sourceBranch: string,
    targetBranch: string
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Check if source branch exists
      try {
        await this.executeInWorkspaceRoot(
          `git rev-parse --verify --quiet ${sourceBranch}`
        );
      } catch (error) {
        return {
          isValid: false,
          error: `Source branch "${sourceBranch}" does not exist. Please ensure you've selected the correct branch.`,
        };
      }

      // Resolve target branch to see what will actually be used
      const resolvedTargetBranch = await this.resolveTargetBranch(targetBranch);

      // Check if resolved target branch exists
      try {
        await this.executeInWorkspaceRoot(
          `git rev-parse --verify --quiet ${resolvedTargetBranch}`
        );
      } catch (error) {
        return {
          isValid: false,
          error: `Target branch "${targetBranch}" (resolved to "${resolvedTargetBranch}") does not exist.`,
        };
      }

      // Check if branches are different
      try {
        const { stdout: sourceCommit } = await this.executeInWorkspaceRoot(
          `git rev-parse ${sourceBranch}`
        );
        const { stdout: targetCommit } = await this.executeInWorkspaceRoot(
          `git rev-parse ${resolvedTargetBranch}`
        );

        if (sourceCommit.trim() === targetCommit.trim()) {
          return {
            isValid: false,
            error: `Source branch "${sourceBranch}" and target branch "${targetBranch}" point to the same commit. No changes to compare.`,
          };
        }
      } catch (error) {
        console.warn(
          "Could not compare branch commits, proceeding anyway:",
          error
        );
      }

      console.log(
        `Branch validation passed: ${sourceBranch} -> ${resolvedTargetBranch}`
      );
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Failed to validate branches: ${error}`,
      };
    }
  }

  /**
   * Internal method to get commit messages with diffs
   */
  private static async getCommitMessagesWithDiffInternal(
    sourceBranch: string,
    targetBranch: string,
    includeDiffs: boolean,
    maxCommits: number
  ): Promise<string> {
    const gitLogCommand = [
      "git",
      "log",
      `--max-count=${maxCommits}`,
      "--pretty=format:%s%n%n%b",
    ];

    if (includeDiffs) {
      gitLogCommand.push("-p");
      // Limit diff context for large changes
      gitLogCommand.push("--unified=3");
    }

    // Improve target branch detection
    const resolvedTargetBranch = await this.resolveTargetBranch(targetBranch);
    console.log(`Resolved target branch: ${resolvedTargetBranch}`);
    console.log(`Source branch: ${sourceBranch}`);

    // Format for git log: targetBranch..sourceBranch (shows commits in source but not in target)
    const compareSpec = `${resolvedTargetBranch}..${sourceBranch}`;
    gitLogCommand.push(compareSpec, "--", ".");

    console.log(`Git command: ${gitLogCommand.join(" ")}`);

    // Use larger buffer for diff operations, smaller for commit messages only
    const bufferSize = includeDiffs ? 20 * 1024 * 1024 : 5 * 1024 * 1024; // 20MB for diffs, 5MB for messages

    try {
      // Execute git command in workspace root
      const { stdout } = await this.executeInWorkspaceRoot(
        gitLogCommand.join(" "),
        { maxBuffer: bufferSize }
      );
      return stdout.trim();
    } catch (error) {
      // Log more detailed error information
      console.error(`Git error details: ${error}`);
      throw new Error(`Failed to get commit messages: ${error}`);
    }
  }

  /**
   * Resolve the target branch to use for comparison
   * Handles local vs remote branch detection and main vs master fallback
   */
  private static async resolveTargetBranch(
    targetBranch: string
  ): Promise<string> {
    try {
      // First, check if the exact target branch exists locally
      try {
        await this.executeInWorkspaceRoot(
          `git rev-parse --verify --quiet ${targetBranch}`
        );
        console.log(`Using local branch: ${targetBranch}`);
        return targetBranch;
      } catch (error) {
        console.log(
          `Local branch ${targetBranch} not found, checking remote...`
        );
      }

      // Check if remote version exists
      try {
        await this.executeInWorkspaceRoot(
          `git rev-parse --verify --quiet remotes/origin/${targetBranch}`
        );
        console.log(`Using remote branch: remotes/origin/${targetBranch}`);
        return `remotes/origin/${targetBranch}`;
      } catch (error) {
        console.log(`Remote branch origin/${targetBranch} not found`);
      }

      // If targetBranch was "main", try "master" as fallback
      if (targetBranch === "main") {
        console.log("Trying master as fallback for main...");

        // Try local master
        try {
          await this.executeInWorkspaceRoot(
            `git rev-parse --verify --quiet master`
          );
          console.log("Using local master branch as fallback");
          return "master";
        } catch (error) {
          console.log("Local master not found, checking remote...");
        }

        // Try remote master
        try {
          await this.executeInWorkspaceRoot(
            `git rev-parse --verify --quiet remotes/origin/master`
          );
          console.log("Using remote master branch as fallback");
          return "remotes/origin/master";
        } catch (error) {
          console.log("Remote master not found");
        }
      }

      // If targetBranch was "master", try "main" as fallback
      if (targetBranch === "master") {
        console.log("Trying main as fallback for master...");

        // Try local main
        try {
          await this.executeInWorkspaceRoot(
            `git rev-parse --verify --quiet main`
          );
          console.log("Using local main branch as fallback");
          return "main";
        } catch (error) {
          console.log("Local main not found, checking remote...");
        }

        // Try remote main
        try {
          await this.executeInWorkspaceRoot(
            `git rev-parse --verify --quiet remotes/origin/main`
          );
          console.log("Using remote main branch as fallback");
          return "remotes/origin/main";
        } catch (error) {
          console.log("Remote main not found");
        }
      }

      // If all else fails, return the original target branch and let git handle the error
      console.warn(
        `Could not resolve target branch ${targetBranch}, using as-is`
      );
      return targetBranch;
    } catch (error) {
      console.error(`Error resolving target branch: ${error}`);
      return targetBranch;
    }
  }

  /**
   * Fallback method to get minimal commit messages when hitting buffer limits
   */
  private static async getMinimalCommitMessages(
    sourceBranch: string,
    targetBranch: string,
    maxCommits: number = 10
  ): Promise<string> {
    console.log("Getting minimal commit messages as fallback...");

    const resolvedTargetBranch = await this.resolveTargetBranch(targetBranch);
    const compareSpec = `${resolvedTargetBranch}..${sourceBranch}`;

    const command = `git log --max-count=${maxCommits} --pretty=format:"%s" ${compareSpec}`;

    try {
      const { stdout } = await this.executeInWorkspaceRoot(command, {
        maxBuffer: 1024 * 1024,
      }); // 1MB should be enough for commit titles

      if (!stdout.trim()) {
        return "No commits found between branches.";
      }

      const commits = stdout.trim().split("\n");
      return `Recent commits (${commits.length}):\n\n${commits
        .map((commit) => `• ${commit}`)
        .join(
          "\n"
        )}\n\nNote: Detailed diffs were too large to display. This summary shows commit titles only.`;
    } catch (error) {
      console.error(`Even minimal commit fetch failed: ${error}`);
      return `Unable to fetch commit details due to repository size. Please ensure branches ${sourceBranch} and ${targetBranch} exist and have different commit histories.`;
    }
  }

  /**
   * Get all available branches (both local and remote)
   */
  static async getAllBranches(): Promise<string[]> {
    try {
      // Get all branches including remotes
      const { stdout } = await this.executeInWorkspaceRoot("git branch -a");

      // Parse branch names from the output
      // Example output:
      // * feat/custom-templates
      //   main
      //   remotes/origin/HEAD -> origin/main
      //   remotes/origin/dev
      //   remotes/origin/main
      const branches: string[] = [];
      const lines = stdout.split("\n");

      // Process each line to extract branch names
      lines.forEach((line) => {
        line = line.trim();

        // Skip empty lines
        if (!line) {
          return;
        }

        // Remove the asterisk from current branch
        if (line.startsWith("*")) {
          line = line.substring(1).trim();
        }

        // Handle remote branch pointer (e.g., remotes/origin/HEAD -> origin/main)
        if (line.includes(" -> ")) {
          return; // Skip pointer lines
        }

        // For remote branches, extract the branch name (e.g., remotes/origin/main -> origin/main)
        if (line.startsWith("remotes/")) {
          line = line.substring("remotes/".length);
        }

        branches.push(line);
      });

      // Remove duplicates (e.g., main and origin/main)
      const uniqueBranches = [...new Set(branches)];

      // Sort branches with local branches first, then remote
      uniqueBranches.sort((a, b) => {
        const aIsRemote = a.includes("/");
        const bIsRemote = b.includes("/");

        if (aIsRemote && !bIsRemote) {
          return 1;
        }
        if (!aIsRemote && bIsRemote) {
          return -1;
        }
        return a.localeCompare(b);
      });

      return uniqueBranches;
    } catch (error) {
      console.error(`Failed to get branches: ${error}`);
      return [];
    }
  }

  /**
   * Get the remote URL for the repository
   */
  static async getRemoteUrl(): Promise<string | null> {
    try {
      // Try to get origin remote URL first
      const { stdout } = await this.executeInWorkspaceRoot(
        "git remote get-url origin"
      );
      return stdout.trim();
    } catch (error) {
      // If origin doesn't exist, try to get the first available remote
      try {
        const { stdout: remotes } = await this.executeInWorkspaceRoot(
          "git remote"
        );
        const remoteList = remotes
          .trim()
          .split("\n")
          .filter((r) => r.trim());

        if (remoteList.length > 0) {
          const { stdout: remoteUrl } = await this.executeInWorkspaceRoot(
            `git remote get-url ${remoteList[0]}`
          );
          return remoteUrl.trim();
        }
      } catch (remoteError) {
        console.error(`Failed to get remote URL: ${remoteError}`);
      }

      return null;
    }
  }

  /**
   * Push a branch to the remote repository
   */
  static async pushBranch(
    branchName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First, check if we're on the correct branch
      const currentBranch = await this.getCurrentBranchName();

      if (currentBranch !== branchName) {
        return {
          success: false,
          error: `Cannot push branch "${branchName}". Currently on branch "${currentBranch}". Please switch to the branch first.`,
        };
      }

      // Check if there are any commits to push
      try {
        const { stdout: status } = await this.executeInWorkspaceRoot(
          "git status -b --porcelain=v2"
        );

        // Look for ahead/behind information
        const aheadMatch = status.match(/branch\.ab \+(\d+) -\d+/);
        const aheadCount = aheadMatch ? parseInt(aheadMatch[1]) : 0;

        if (aheadCount === 0) {
          return {
            success: false,
            error: `Branch "${branchName}" is up to date with remote. No commits to push.`,
          };
        }
      } catch (statusError) {
        // If we can't determine status, continue with push attempt
        console.log(
          "Could not determine branch status, proceeding with push:",
          statusError
        );
      }

      // Attempt to push the branch
      // Use --set-upstream in case this is the first push
      const { stdout, stderr } = await this.executeInWorkspaceRoot(
        `git push --set-upstream origin ${branchName}`
      );

      // Check if push was successful
      if (stderr && stderr.includes("error:")) {
        return {
          success: false,
          error: `Git push failed: ${stderr}`,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      // Handle specific Git errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("permission denied") ||
        errorMessage.includes("authentication failed")
      ) {
        return {
          success: false,
          error:
            "Push failed: Authentication error. Please check your Git credentials.",
        };
      }

      if (errorMessage.includes("rejected")) {
        return {
          success: false,
          error:
            "Push rejected: The remote branch has changes. Try pulling first.",
        };
      }

      return {
        success: false,
        error: `Failed to push branch "${branchName}": ${errorMessage}`,
      };
    }
  }
}
