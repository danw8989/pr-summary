// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { PrSummaryPanel } from "./ui/prSummaryPanel";
import { JiraTicketSelector } from "./ui/jiraTicketSelector";
import { HistoryPanel } from "./ui/historyPanel";
import {
  PRSummaryActionsProvider,
  PRSummaryHistoryProvider,
} from "./ui/viewProviders";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Check if running in Cursor
  const isCursor = vscode.env.appName.includes("Cursor");
  console.log(
    `PR Summary extension activating in ${vscode.env.appName} (Cursor: ${isCursor})`
  );

  // Write to filesystem for debugging
  const fs = require("fs");
  const path = require("path");
  try {
    const logPath = path.join(context.extensionPath, "activation.log");
    fs.writeFileSync(
      logPath,
      `Extension activated at ${new Date().toISOString()} in ${
        vscode.env.appName
      }\n`,
      { flag: "a" }
    );
  } catch (error) {
    console.error("Failed to write debug log:", error);
  }

  // Force activate extension in Cursor by explicitly running a command at startup
  if (isCursor) {
    // Delay execution slightly to ensure UI is ready
    setTimeout(() => {
      console.log("Explicitly activating PR Summary extension in Cursor");
      vscode.commands.executeCommand("pr-summary.test");
    }, 3000);
  }

  // Show a notification when the extension activates

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
      // Open History Panel
      HistoryPanel.createOrShow(context.extensionUri, context);
    }
  );

  const selectJiraTicketCommand = vscode.commands.registerCommand(
    "pr-summary.selectJiraTicket",
    () => {
      // Open JIRA Ticket Selector
      JiraTicketSelector.createOrShow(context.extensionUri);
    }
  );

  // Add commands to context
  context.subscriptions.push(
    generatePrSummaryCommand,
    viewHistoryCommand,
    selectJiraTicketCommand
  );

  // Add a test command that's more visible
  const testCommand = vscode.commands.registerCommand("pr-summary.test", () => {
    vscode.window.showInformationMessage("PR Summary Test Command Works!");

    // Create a status bar item
    const statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    statusBarItem.text = "$(megaphone) PR Summary";
    statusBarItem.tooltip = "Click to open PR Summary panel";
    statusBarItem.command = "pr-summary.generatePrSummary";
    statusBarItem.show();

    context.subscriptions.push(statusBarItem);
  });

  context.subscriptions.push(testCommand);

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
