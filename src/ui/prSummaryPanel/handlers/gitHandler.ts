import * as vscode from "vscode";
import { GitHelper } from "../../../utils/gitHelper";

/**
 * Handles Git-related operations requested by the webview.
 */
export class GitHandler {
  constructor(private readonly webview: vscode.Webview) {}

  /**
   * Get all available git branches and send them to the webview
   */
  public async handleGetBranches(): Promise<void> {
    try {
      const branches = await GitHelper.getAllBranches();
      const currentBranch = await GitHelper.getCurrentBranchName();

      // Debug logging
      console.log(`Current branch detected: "${currentBranch}"`);
      console.log(`Available branches: ${JSON.stringify(branches)}`);

      // Create a new array with current branch first (for UI selection)
      let sortedBranches = [...branches];

      // Remove current branch from its current position if it exists
      const currentBranchIndex = sortedBranches.findIndex(
        (b) => b === currentBranch
      );
      if (currentBranchIndex !== -1) {
        sortedBranches.splice(currentBranchIndex, 1);
      }

      // Add current branch at the beginning
      sortedBranches.unshift(currentBranch);

      console.log(
        `Sorted branches with current branch first: ${JSON.stringify(
          sortedBranches
        )}`
      );

      // Send branches to webview
      this.webview.postMessage({
        type: "branchesLoaded",
        branches: sortedBranches,
        currentBranch: currentBranch,
      });
    } catch (error) {
      console.error(`Error loading branches: ${error}`);
      this.webview.postMessage({
        type: "error",
        message: `Failed to load branches: ${error}`,
      });
    }
  }
}
