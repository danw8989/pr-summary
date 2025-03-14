import * as vscode from "vscode";
import { OpenAIHelper, PrSummary } from "../../utils/openAiHelper";
import { HistoryManager } from "../../utils/historyManager";
import { TEMPLATE_PROMPTS } from "../../constants";

/**
 * Class handling messages from the PR Summary Panel webview
 */
export class MessageHandler {
  constructor(
    private readonly webview: vscode.Webview,
    private readonly context: vscode.ExtensionContext,
    private _jiraTicket: string | undefined
  ) {}

  /**
   * Handle a message from the webview
   */
  public async handleMessage(message: any): Promise<void> {
    switch (message.command) {
      case "generateSummary":
        await this.handleGenerateSummary(
          message.openaiApiKey,
          message.additionalPrompt,
          message.includeDiffs,
          message.model,
          message.template
        );
        break;
      case "selectJiraTicket":
        this.handleSelectJiraTicket(
          message.jiraUrl,
          message.jiraEmail,
          message.jiraApiToken
        );
        break;
      case "copyToClipboard":
        await vscode.env.clipboard.writeText(message.text);
        vscode.window.showInformationMessage("Copied to clipboard");
        break;
    }
  }

  /**
   * Handle the generate summary command
   */
  private async handleGenerateSummary(
    openaiApiKey: string,
    additionalPrompt: string,
    includeDiffs: boolean,
    model: string,
    template: string
  ): Promise<void> {
    try {
      // Get template prompt
      const templatePrompt = TEMPLATE_PROMPTS[template];
      const fullPrompt = `${templatePrompt} ${additionalPrompt}`.trim();

      // Generate summary
      const summary = await OpenAIHelper.generatePrSummary(
        openaiApiKey,
        fullPrompt,
        includeDiffs,
        this._jiraTicket,
        model
      );

      // Save to history
      await HistoryManager.savePrSummary(
        this.context,
        summary.title,
        summary.description,
        template
      );

      // Send results back to webview
      this.webview.postMessage({
        type: "summaryGenerated",
        title: summary.title,
        description: summary.description,
      });

      // Save configuration
      const config = vscode.workspace.getConfiguration("prSummary");
      await config.update("openaiApiKey", openaiApiKey, true);
      await config.update("defaultModel", model, true);
      await config.update("defaultTemplate", template, true);
    } catch (error) {
      // Send error message back to webview
      this.webview.postMessage({
        type: "error",
        message: `${error}`,
      });
    }
  }

  /**
   * Handle the select JIRA ticket command
   */
  private handleSelectJiraTicket(
    jiraUrl: string,
    jiraEmail: string,
    jiraApiToken: string
  ): void {
    // Save JIRA configuration
    const config = vscode.workspace.getConfiguration("prSummary");
    config.update("jiraUrl", jiraUrl, true);
    config.update("jiraEmail", jiraEmail, true);
    config.update("jiraApiToken", jiraApiToken, true);

    // Open ticket selector using command
    vscode.commands.executeCommand("pr-summary.selectJiraTicket");
  }

  /**
   * Set the JIRA ticket
   */
  public setJiraTicket(ticket: string): void {
    this._jiraTicket = ticket;

    // Send to webview
    this.webview.postMessage({
      type: "jiraTicketSelected",
      ticket: ticket,
    });
  }

  /**
   * Get the current JIRA ticket
   */
  public getJiraTicket(): string | undefined {
    return this._jiraTicket;
  }
}
