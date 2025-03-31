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

      // Send branches to webview
      this.webview.postMessage({
        type: "branchesLoaded",
        branches: branches,
        currentBranch: currentBranch,
      });
    } catch (error) {
      this.webview.postMessage({
        type: "error",
        message: `Failed to load branches: ${error}`,
      });
    }
  }
}
