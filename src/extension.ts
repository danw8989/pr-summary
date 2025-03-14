// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { PrSummaryPanel } from "./ui/prSummaryPanel";
import { JiraTicketSelector } from "./ui/jiraTicketSelector";
import {
  PRSummaryActionsProvider,
  PRSummaryHistoryProvider,
} from "./ui/viewProviders";
import { GitHelper } from "./utils/gitHelper";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Show a notification when the extension activates

  // Set context in JiraTicketSelector
  JiraTicketSelector.setContext(context);

  // Register Tree Data Providers for views
  const actionsProvider = new PRSummaryActionsProvider();
  const historyProvider = new PRSummaryHistoryProvider(context);

  vscode.window.registerTreeDataProvider("pr-summary-actions", actionsProvider);
  vscode.window.registerTreeDataProvider("pr-summary-history", historyProvider);

  // Register commands
  const generatePrSummaryCommand = vscode.commands.registerCommand(
    "pr-summary.generatePrSummary",
    () => {
      // Open PR Summary Panel
      PrSummaryPanel.createOrShow(context.extensionUri, context);
    }
  );

  const viewHistoryCommand = vscode.commands.registerCommand(
    "pr-summary.viewHistory",
    () => {
      // Refresh the history view
      historyProvider.refresh();
    }
  );

  const selectJiraTicketCommand = vscode.commands.registerCommand(
    "pr-summary.selectJiraTicket",
    () => {
      // Open JIRA Ticket Selector (using new native UI)
      JiraTicketSelector.show();
    }
  );

  // Command to view a specific history item
  const viewHistoryItemCommand = vscode.commands.registerCommand(
    "pr-summary.viewHistoryItem",
    (historyEntry) => {
      historyProvider.viewHistoryItem(historyEntry);
    }
  );

  // Add commands to context
  context.subscriptions.push(
    generatePrSummaryCommand,
    viewHistoryCommand,
    selectJiraTicketCommand,
    viewHistoryItemCommand
  );

  // Create a visible status bar item on activation
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = "$(git-pull-request) PR Summary";
  statusBarItem.tooltip = "Click to open PR Summary panel";
  statusBarItem.command = "pr-summary.generatePrSummary";
  statusBarItem.show();

  context.subscriptions.push(statusBarItem);
}

// This method is called when your extension is deactivated
export function deactivate() {}
