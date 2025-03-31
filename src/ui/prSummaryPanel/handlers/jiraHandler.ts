import * as vscode from "vscode";

/**
 * Handles Jira ticket selection and state management.
 */
export class JiraHandler {
  private _jiraTicket: string | undefined;

  constructor(
    private readonly webview: vscode.Webview,
    private readonly context: vscode.ExtensionContext // Keep context if needed for config or other APIs
  ) {}

  /**
   * Handle the select JIRA ticket command from the webview.
   * Saves configuration and triggers the native VS Code command for selection.
   */
  public handleSelectJiraTicket(
    jiraUrl: string,
    jiraEmail: string,
    jiraApiToken: string
  ): void {
    // Save JIRA configuration (Consider moving config updates to a dedicated ConfigHandler)
    const config = vscode.workspace.getConfiguration("prSummary");
    config.update("jiraUrl", jiraUrl, true);
    config.update("jiraEmail", jiraEmail, true);
    config.update("jiraApiToken", jiraApiToken, true);

    // Open ticket selector using the registered VS Code command
    vscode.commands.executeCommand("pr-summary.selectJiraTicket");
  }

  /**
   * Set the selected JIRA ticket (called externally, e.g., by PrSummaryPanel after selection)
   */
  public setJiraTicket(ticket: string): void {
    this._jiraTicket = ticket;

    // Send the updated ticket to the webview
    this.webview.postMessage({
      type: "jiraTicketSelected",
      ticket: ticket,
    });
  }

  /**
   * Get the currently selected JIRA ticket.
   */
  public getJiraTicket(): string | undefined {
    return this._jiraTicket;
  }
}
