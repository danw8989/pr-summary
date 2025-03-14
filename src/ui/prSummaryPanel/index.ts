import * as vscode from "vscode";
import { MessageHandler } from "./messageHandler";
import { getPrSummaryPanelHtml } from "./template";

/**
 * Manages the PR Summary Panel webview
 */
export class PrSummaryPanel {
  public static currentPanel: PrSummaryPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _context: vscode.ExtensionContext;
  private _disposables: vscode.Disposable[] = [];
  private _messageHandler: MessageHandler;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._context = context;
    this._messageHandler = new MessageHandler(
      this._panel.webview,
      this._context,
      undefined
    );

    this._update();

    // Set up message handling
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        await this._messageHandler.handleMessage(message);
      },
      null,
      this._disposables
    );

    // Handle panel being closed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  /**
   * Create or show the PR Summary panel
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (PrSummaryPanel.currentPanel) {
      PrSummaryPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      "prSummaryGenerator",
      "PR Summary Generator",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
      }
    );

    PrSummaryPanel.currentPanel = new PrSummaryPanel(
      panel,
      extensionUri,
      context
    );
  }

  /**
   * Close the panel
   */
  public dispose() {
    PrSummaryPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Update the panel content
   */
  private _update() {
    const config = vscode.workspace.getConfiguration("prSummary");

    // Try to get values from environment variables first, then fall back to VS Code settings
    const openaiApiKey =
      process.env.OPENAI_API_KEY || config.get<string>("openaiApiKey", "");
    const jiraUrl = process.env.JIRA_URL || config.get<string>("jiraUrl", "");
    const jiraEmail =
      process.env.JIRA_EMAIL || config.get<string>("jiraEmail", "");
    const jiraApiToken =
      process.env.JIRA_API_TOKEN || config.get<string>("jiraApiToken", "");
    const defaultModel =
      process.env.DEFAULT_MODEL ||
      config.get<string>("defaultModel", "o3-mini");
    const defaultTemplate =
      process.env.DEFAULT_TEMPLATE ||
      config.get<string>("defaultTemplate", "Medium");

    const jiraTicketDisplay = this._messageHandler.getJiraTicket() || "";

    this._panel.webview.html = getPrSummaryPanelHtml(
      openaiApiKey,
      jiraUrl,
      jiraEmail,
      jiraApiToken,
      defaultModel,
      defaultTemplate,
      jiraTicketDisplay
    );
  }

  /**
   * Set selected JIRA ticket
   */
  public setJiraTicket(ticket: string) {
    this._messageHandler.setJiraTicket(ticket);
  }
}
