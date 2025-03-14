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
    command: string
  ): Promise<{ stdout: string; stderr: string }> {
    const workspaceRoot = this.getWorkspaceRootPath();
    console.log(`Executing command in workspace root: ${workspaceRoot}`);
    console.log(`Command: ${command}`);

    return execPromise(command, { cwd: workspaceRoot });
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
      return stdout.trim();
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
    includeDiffs: boolean = false
  ): Promise<string> {
    const gitLogCommand = ["git", "log", "--pretty=format:%s%n%n%b"];

    if (includeDiffs) {
      gitLogCommand.push("-p");
    }

    // Check if main exists, otherwise try master
    try {
      const { stdout: branchList } = await this.executeInWorkspaceRoot(
        "git branch -a"
      );

      // If targetBranch is still default and main doesn't exist but master does
      if (
        targetBranch === "main" &&
        !branchList.includes("main") &&
        !branchList.includes("remotes/origin/main") &&
        (branchList.includes("master") ||
          branchList.includes("remotes/origin/master"))
      ) {
        targetBranch = "master";
      }
    } catch (error) {
      console.warn(
        "Failed to check branch list, using provided target branch",
        error
      );
    }

    // Format for local branches: targetBranch..sourceBranch
    // Format for remote branches: remotes/origin/targetBranch..sourceBranch
    let compareSpec = `${targetBranch}..${sourceBranch}`;

    // If target branch doesn't have a slash, check if remote version exists
    if (!targetBranch.includes("/")) {
      try {
        const { stdout: remoteExists } = await this.executeInWorkspaceRoot(
          `git rev-parse --verify --quiet remotes/origin/${targetBranch}`
        );

        if (remoteExists) {
          compareSpec = `remotes/origin/${targetBranch}..${sourceBranch}`;
        }
      } catch (error) {
        // Remote branch doesn't exist, use local
        console.log(
          `Remote branch origin/${targetBranch} not found, using local branch`
        );
      }
    }

    gitLogCommand.push(compareSpec, "--", ".");

    try {
      // Execute git command in workspace root
      const { stdout } = await this.executeInWorkspaceRoot(
        gitLogCommand.join(" ")
      );
      return stdout.trim();
    } catch (error) {
      // Log more detailed error information
      console.error(`Git error details: ${error}`);

      throw new Error(`Failed to get commit messages: ${error}`);
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
}
