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

function registerProviders(
  context: vscode.ExtensionContext
): PRSummaryHistoryProvider {
  const actionsProvider = new PRSummaryActionsProvider();
  const historyProvider = new PRSummaryHistoryProvider(context);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      "pr-summary-actions",
      actionsProvider
    ),
    vscode.window.registerTreeDataProvider(
      "pr-summary-history",
      historyProvider
    )
  );

  return historyProvider;
}

function registerCommands(
  context: vscode.ExtensionContext,
  historyProvider: PRSummaryHistoryProvider,
  jiraTicketSelector: JiraTicketSelector // Add instance parameter
) {
  const generatePrSummaryCommand = vscode.commands.registerCommand(
    "pr-summary.generatePrSummary",
    () => {
      PrSummaryPanel.createOrShow(context.extensionUri, context);
    }
  );

  const viewHistoryCommand = vscode.commands.registerCommand(
    "pr-summary.viewHistory",
    () => {
      historyProvider.refresh();
    }
  );

  const selectJiraTicketCommand = vscode.commands.registerCommand(
    "pr-summary.selectJiraTicket",
    () => {
      jiraTicketSelector.show(); // Call show() on the instance
    }
  );

  const viewHistoryItemCommand = vscode.commands.registerCommand(
    "pr-summary.viewHistoryItem",
    (historyEntry) => {
      historyProvider.viewHistoryItem(historyEntry);
    }
  );

  context.subscriptions.push(
    generatePrSummaryCommand,
    viewHistoryCommand,
    selectJiraTicketCommand,
    viewHistoryItemCommand
  );
}

function registerStatusBarItem(context: vscode.ExtensionContext) {
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

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Create instances of components that need context
  const jiraTicketSelector = new JiraTicketSelector(context);

  // Register UI Components
  const historyProvider = registerProviders(context);
  registerCommands(context, historyProvider, jiraTicketSelector); // Pass instance
  registerStatusBarItem(context);

  // Optional: Log activation
  console.log('Congratulations, your extension "pr-summary" is now active!');
}

// This method is called when your extension is deactivated
export function deactivate() {}
