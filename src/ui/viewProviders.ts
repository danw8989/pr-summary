import * as vscode from "vscode";

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
 * Provider for the PR Summary History view
 */
export class PRSummaryHistoryProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  constructor(private context: vscode.ExtensionContext) {}

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<vscode.TreeItem[]> {
    return Promise.resolve([]);
  }
}
