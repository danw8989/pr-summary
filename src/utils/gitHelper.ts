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
   * Get commit messages with optional diffs from origin/dev to current branch
   */
  static async getCommitMessagesWithDiff(
    branch: string,
    includeDiffs: boolean = false
  ): Promise<string> {
    const gitLogCommand = ["git", "log", "--pretty=format:%s%n%n%b"];

    if (includeDiffs) {
      gitLogCommand.push("-p");
    }

    gitLogCommand.push(`origin/dev..${branch}`, "--", ".");

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
}
