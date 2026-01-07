import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";

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
   * When includeDiffs is true, this now returns commit messages + a single consolidated branch diff
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

    try {
      let result = "";
      
      // Get commit messages (without individual diffs)
      const commitMessages = await this.getCommitMessagesOnly(
        sourceBranch,
        targetBranch,
        maxCommits
      );
      
      result = commitMessages;
      
      // If diffs are requested, get a single consolidated branch diff
      if (includeDiffs && commitMessages.trim() !== "No commits found between branches.") {
        result += "\n\n=== CONSOLIDATED BRANCH DIFF ===\n\n";
        
        try {
          const branchDiff = await this.getBranchDiff(sourceBranch, targetBranch);
          result += branchDiff;
        } catch (diffError) {
          console.error("Failed to get branch diff:", diffError);
          result += "Failed to generate branch diff. The changes may be too large.";
        }
      }
      
      return result;
    } catch (error) {
      // If we hit any errors, try minimal fallback
      console.warn("Error getting commit messages, using minimal fallback:", error);
      return await this.getMinimalCommitMessages(sourceBranch, targetBranch, 10);
    }
  }
  
  /**
   * Get only commit messages (without diffs) between branches
   */
  private static async getCommitMessagesOnly(
    sourceBranch: string,
    targetBranch: string,
    maxCommits: number
  ): Promise<string> {
    const resolvedTargetBranch = await this.resolveTargetBranch(targetBranch);
    
    const gitLogCommand = [
      "git",
      "log",
      `--max-count=${maxCommits}`,
      "--pretty=format:%s%n%n%b",
      `${resolvedTargetBranch}..${sourceBranch}`,
      "--",
      "."
    ].join(" ");
    
    console.log(`Getting commit messages: ${gitLogCommand}`);
    
    try {
      const { stdout } = await this.executeInWorkspaceRoot(gitLogCommand, {
        maxBuffer: 5 * 1024 * 1024, // 5MB for commit messages
      });
      
      return stdout.trim() || "No commits found between branches.";
    } catch (error) {
      // If buffer overflow, try with fewer commits
      if (maxCommits > 10) {
        console.warn("Reducing commit count due to buffer limit");
        return await this.getCommitMessagesOnly(
          sourceBranch,
          targetBranch,
          Math.floor(maxCommits / 2)
        );
      }
      
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
   * Get minimal commit messages (just subjects) for fallback when buffer limits hit
   */
  private static async getMinimalCommitMessages(
    sourceBranch: string,
    targetBranch: string,
    maxCommits: number = 10
  ): Promise<string> {
    const resolvedTargetBranch = await this.resolveTargetBranch(targetBranch);

    const command = `git log ${resolvedTargetBranch}..${sourceBranch} --pretty=format:"%s" -n ${maxCommits}`;

    const { stdout } = await this.executeInWorkspaceRoot(command, {
      maxBuffer: 1024 * 1024, // 1MB should be enough for just commit subjects
    });

    if (!stdout.trim()) {
      return "No commits found between branches.";
    }

    const lines = stdout
      .trim()
      .split("\n")
      .map((line, index) => `${index + 1}. ${line}`)
      .join("\n");

    return `Commits from ${sourceBranch} (not in ${resolvedTargetBranch}):\n${lines}`;
  }

  /**
   * Get the latest commit message from a specific branch
   */
  static async getLatestCommitMessage(
    branchName: string
  ): Promise<string | null> {
    try {
      // Clean branch name (remove origin/ prefix if present)
      const cleanBranchName = branchName.replace(
        /^(origin\/|remotes\/origin\/)/,
        ""
      );

      const command = `git log ${cleanBranchName} --pretty=format:"%s%n%n%b" -n 1`;

      const { stdout } = await this.executeInWorkspaceRoot(command, {
        maxBuffer: 1024 * 1024, // 1MB should be enough for one commit message
      });

      return stdout.trim() || null;
    } catch (error) {
      console.warn(
        `Failed to get latest commit message for ${branchName}:`,
        error
      );
      return null;
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
   * Get a consolidated diff between two branches (HEAD comparison)
   * This shows the total changes between the branches, not individual commit diffs
   */
  static async getBranchDiff(
    sourceBranch: string,
    targetBranch: string,
    options: { maxSize?: number } = {}
  ): Promise<string> {
    try {
      // Resolve the target branch to handle remote/local variations
      const resolvedTargetBranch = await this.resolveTargetBranch(targetBranch);
      
      console.log(`Getting branch diff: ${resolvedTargetBranch}...${sourceBranch}`);
      
      // Use three-dot notation to get diff from merge-base to source branch
      // This shows what would be merged, excluding changes already in target
      const diffCommand = [
        "git",
        "diff",
        `${resolvedTargetBranch}...${sourceBranch}`,
        "--unified=3", // Limit context lines
        "--stat", // Include file statistics at the end
      ].join(" ");
      
      // Use larger buffer for diff operations
      const maxBuffer = options.maxSize || 50 * 1024 * 1024; // 50MB default
      
      const { stdout } = await this.executeInWorkspaceRoot(diffCommand, {
        maxBuffer,
        timeout: 60000, // 60 seconds for large diffs
      });
      
      // If diff is too large, get just the stats
      if (stdout.length > maxBuffer * 0.9) {
        console.warn("Diff too large, falling back to stats only");
        return await this.getBranchDiffStats(sourceBranch, resolvedTargetBranch);
      }
      
      return stdout.trim() || "No changes detected between branches.";
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // If buffer overflow, try to get just stats
      if (errorMessage.includes("maxBuffer") || errorMessage.includes("MAXBUFFER")) {
        console.warn("Diff exceeded buffer limit, getting stats only");
        try {
          return await this.getBranchDiffStats(sourceBranch, targetBranch);
        } catch (statsError) {
          console.error("Failed to get even stats:", statsError);
          return "Diff too large to display. Please check the changes manually.";
        }
      }
      
      console.error(`Failed to get branch diff: ${error}`);
      throw new Error(`Failed to get branch diff: ${errorMessage}`);
    }
  }

  /**
   * Get just the statistics of changes between branches (for large diffs)
   */
  private static async getBranchDiffStats(
    sourceBranch: string, 
    targetBranch: string
  ): Promise<string> {
    const resolvedTargetBranch = await this.resolveTargetBranch(targetBranch);
    
    const statsCommand = `git diff ${resolvedTargetBranch}...${sourceBranch} --stat`;
    
    const { stdout } = await this.executeInWorkspaceRoot(statsCommand, {
      maxBuffer: 5 * 1024 * 1024, // 5MB should be enough for stats
    });
    
    const header = `Branch comparison: ${sourceBranch} <- ${resolvedTargetBranch}\n`;
    const note = "\n\n[Note: Full diff was too large. Showing file statistics only.]\n\n";
    
    return header + note + stdout.trim();
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
      const { stderr } = await this.executeInWorkspaceRoot(
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
