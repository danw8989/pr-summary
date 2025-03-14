import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export class GitHelper {
  /**
   * Get the current branch name
   */
  static async getCurrentBranchName(): Promise<string> {
    try {
      const { stdout } = await execPromise("git rev-parse --abbrev-ref HEAD");
      return stdout.trim();
    } catch (error) {
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
      const { stdout } = await execPromise(gitLogCommand.join(" "));
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to get commit messages: ${error}`);
    }
  }
}
