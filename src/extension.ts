// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { PrSummaryTreeProvider } from "./ui/prSummaryTreeProvider";
import { PrSummaryCommands } from "./ui/prSummaryCommands";
import { JiraTicketSelector } from "./ui/jiraTicketSelector";
import { PRSummaryHistoryProvider } from "./ui/viewProviders";

function registerTreeView(
  context: vscode.ExtensionContext
): PrSummaryTreeProvider {
  const treeProvider = new PrSummaryTreeProvider(context);

  const treeView = vscode.window.createTreeView("prSummaryTree", {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
    canSelectMany: false,
  });

  context.subscriptions.push(treeView);
  return treeProvider;
}

function registerCommands(
  context: vscode.ExtensionContext,
  treeProvider: PrSummaryTreeProvider,
  jiraTicketSelector: JiraTicketSelector
) {
  const commandsHandler = new PrSummaryCommands(context, treeProvider);

  // Register all the new native UI commands
  const commands = [
    vscode.commands.registerCommand("prSummary.configureApiKey", () =>
      commandsHandler.configureApiKey()
    ),
    vscode.commands.registerCommand("prSummary.configureJira", () =>
      commandsHandler.configureJira()
    ),
    vscode.commands.registerCommand("prSummary.openSettings", () =>
      commandsHandler.openSettings()
    ),
    vscode.commands.registerCommand("prSummary.selectBranch", () =>
      commandsHandler.selectBranch()
    ),
    vscode.commands.registerCommand("prSummary.selectTargetBranch", () =>
      commandsHandler.selectTargetBranch()
    ),
    vscode.commands.registerCommand("prSummary.toggleDiffs", () =>
      commandsHandler.toggleDiffs()
    ),
    vscode.commands.registerCommand("prSummary.setAdditionalPrompt", () =>
      commandsHandler.setAdditionalPrompt()
    ),
    vscode.commands.registerCommand("prSummary.setMaxCommits", () =>
      commandsHandler.setMaxCommits()
    ),
    vscode.commands.registerCommand("prSummary.createCustomTemplate", () =>
      commandsHandler.createCustomTemplate()
    ),
    vscode.commands.registerCommand(
      "prSummary.editCustomTemplate",
      (template) => commandsHandler.editCustomTemplate(template)
    ),
    vscode.commands.registerCommand("prSummary.showTemplateInfo", () =>
      commandsHandler.showTemplateInfo()
    ),
    vscode.commands.registerCommand("prSummary.selectTemplate", () =>
      commandsHandler.selectTemplate()
    ),
    vscode.commands.registerCommand("pr-summary.selectJiraTicket", () =>
      commandsHandler.selectJiraTicket()
    ),
    vscode.commands.registerCommand("pr-summary.generatePrSummary", () =>
      commandsHandler.generateSummary()
    ),
    vscode.commands.registerCommand("pr-summary.viewHistory", (summary) =>
      commandsHandler.viewHistory(summary)
    ),
    vscode.commands.registerCommand("prSummary.refresh", () =>
      treeProvider.refresh()
    ),
    vscode.commands.registerCommand("prSummary.toggleAutoPost", () =>
      commandsHandler.toggleAutoPost()
    ),
    vscode.commands.registerCommand("prSummary.configureGitHub", () =>
      commandsHandler.configureGitHub()
    ),
    vscode.commands.registerCommand("prSummary.configureGitLab", () =>
      commandsHandler.configureGitLab()
    ),
    vscode.commands.registerCommand("prSummary.testConnection", () =>
      commandsHandler.testConnection()
    ),
    vscode.commands.registerCommand("prSummary.selectAutoPostState", () =>
      commandsHandler.selectAutoPostState()
    ),
    vscode.commands.registerCommand("prSummary.manualPostPR", () =>
      commandsHandler.manualPostPR()
    ),
    vscode.commands.registerCommand("prSummary.refreshCommitPreview", () =>
      commandsHandler.refreshCommitPreview()
    ),
    vscode.commands.registerCommand(
      "prSummary.fetchCommitPreview",
      (sourceBranch, targetBranch) =>
        commandsHandler.fetchCommitPreview(sourceBranch, targetBranch)
    ),
    vscode.commands.registerCommand("prSummary.showCommitDetails", () =>
      commandsHandler.showCommitDetails()
    ),
  ];

  context.subscriptions.push(...commands);
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
  // Create instances of components
  const jiraTicketSelector = new JiraTicketSelector(context);

  // Register the new tree view
  const treeProvider = registerTreeView(context);

  // Register commands that work with the tree view
  registerCommands(context, treeProvider, jiraTicketSelector);

  // Keep the status bar item for quick access
  registerStatusBarItem(context);

  console.log("PR Summary extension activated with native tree view!");
}

// This method is called when your extension is deactivated
export function deactivate() {}
