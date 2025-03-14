import * as vscode from "vscode";
import { HistoryManager, PrSummaryHistoryEntry } from "../utils/historyManager";
import { PrSummaryPanel } from "./prSummaryPanel";

/**
 * Provider for the PR Summary Actions view
 */
export class PRSummaryActionsProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  constructor() {}

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<vscode.TreeItem[]> {
    return Promise.resolve([]);
  }
}

/**
 * Tree item for a history entry
 */
export class HistoryTreeItem extends vscode.TreeItem {
  constructor(
    public readonly entry: PrSummaryHistoryEntry,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    // Title is the created date and branch name
    const createdDate = new Date(entry.created).toLocaleString();
    const title = `${createdDate} - ${entry.branchName}`;

    super(title, collapsibleState);

    this.tooltip = `${entry.branchName} - ${entry.jiraTicket || ""}`;
    this.description = entry.jiraTicket || "";
    this.iconPath = new vscode.ThemeIcon("git-pull-request");

    // Context value is used for command enablement in package.json
    this.contextValue = "historySummary";

    // Add command to view the summary when clicked
    this.command = {
      command: "pr-summary.viewHistoryItem",
      title: "View PR Summary",
      arguments: [entry],
    };
  }
}

/**
 * Provider for the PR Summary History view
 */
export class PRSummaryHistoryProvider
  implements vscode.TreeDataProvider<HistoryTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    HistoryTreeItem | undefined | null | void
  > = new vscode.EventEmitter<HistoryTreeItem | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<
    HistoryTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  constructor(private context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: HistoryTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: HistoryTreeItem): Promise<HistoryTreeItem[]> {
    if (element) {
      // No children for history items
      return [];
    }

    // Get history items
    const historyManager = new HistoryManager(this.context);
    const historyEntries = await historyManager.getHistory();

    if (historyEntries.length === 0) {
      // No history items
      const noHistoryItem = new vscode.TreeItem(
        "No history items found. Generate a PR summary first.",
        vscode.TreeItemCollapsibleState.None
      );
      return [noHistoryItem as any];
    }

    // Sort by date descending (newest first)
    historyEntries.sort((a, b) => b.created - a.created);

    // Create tree items
    return historyEntries.map(
      (entry) =>
        new HistoryTreeItem(entry, vscode.TreeItemCollapsibleState.None)
    );
  }

  /**
   * View a history item in a WebView panel
   */
  public async viewHistoryItem(entry: PrSummaryHistoryEntry) {
    // Create quick pick items
    const actionItems = [
      {
        label: "$(preview) View Summary",
        description: "View the PR summary",
        action: "view",
      },
      {
        label: "$(clippy) Copy to Clipboard",
        description: "Copy the PR summary to clipboard",
        action: "copy",
      },
    ];

    // Show quick pick
    const selection = await vscode.window.showQuickPick(actionItems, {
      placeHolder: `Select action for: ${entry.branchName}`,
    });

    if (!selection) {
      return;
    }

    switch (selection.action) {
      case "view":
        // Show the summary in an editor or dialog
        const doc = await vscode.workspace.openTextDocument({
          content: entry.summary,
          language: "markdown",
        });
        await vscode.window.showTextDocument(doc);
        break;

      case "copy":
        // Copy to clipboard
        vscode.env.clipboard.writeText(entry.summary);
        vscode.window.showInformationMessage("PR Summary copied to clipboard");
        break;
    }
  }
}
