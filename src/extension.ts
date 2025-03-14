// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { PrSummaryPanel } from "./ui/prSummaryPanel";
import { JiraTicketSelector } from "./ui/jiraTicketSelector";
import { HistoryPanel } from "./ui/historyPanel";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log("PR Summary extension is now active!");

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
}

// This method is called when your extension is deactivated
export function deactivate() {}
