import * as vscode from "vscode";
import { SummaryHandler } from "./handlers/summaryHandler";
import { TemplateHandler } from "./handlers/templateHandler";
import { JiraHandler } from "./handlers/jiraHandler";
import { GitHandler } from "./handlers/gitHandler";
import { OpenAIHelper } from "../../utils/openAiHelper";

/**
 * Class handling messages from the PR Summary Panel webview.
 * Delegates tasks to specialized handlers.
 */
export class MessageHandler {
  private readonly summaryHandler: SummaryHandler;
  private readonly templateHandler: TemplateHandler;
  private readonly jiraHandler: JiraHandler;
  private readonly gitHandler: GitHandler;

  constructor(
    private readonly webview: vscode.Webview,
    private readonly context: vscode.ExtensionContext
  ) {
    // Initialize handlers
    this.jiraHandler = new JiraHandler(this.webview, this.context);
    this.summaryHandler = new SummaryHandler(
      this.webview,
      this.context,
      this.jiraHandler.getJiraTicket.bind(this.jiraHandler) // Pass getter function
    );
    this.templateHandler = new TemplateHandler(this.webview, this.context);
    this.gitHandler = new GitHandler(this.webview);
  }

  /**
   * Handle a message from the webview by delegating to the appropriate handler.
   */
  public async handleMessage(message: any): Promise<void> {
    switch (message.command) {
      case "generateSummary":
        await this.summaryHandler.handleGenerateSummary(
          message.openaiApiKey,
          message.additionalPrompt,
          message.includeDiffs,
          message.model,
          message.template,
          message.sourceBranch,
          message.targetBranch
        );
        break;
      case "selectJiraTicket":
        // Note: This message from the webview triggers saving config and opening the selector
        this.jiraHandler.handleSelectJiraTicket(
          message.jiraUrl,
          message.jiraEmail,
          message.jiraApiToken
        );
        break;
      case "copyToClipboard":
        // Simple enough to keep here
        await vscode.env.clipboard.writeText(message.text);
        vscode.window.showInformationMessage("Copied to clipboard");
        break;
      case "saveCustomTemplate":
        await this.templateHandler.handleSaveCustomTemplate(
          message.templateName,
          message.templatePrompt
        );
        break;
      case "deleteCustomTemplate":
        await this.templateHandler.handleDeleteCustomTemplate(
          message.templateName
        );
        break;
      case "getCustomTemplates":
        await this.templateHandler.handleGetCustomTemplates();
        break;
      case "getBranches":
        await this.gitHandler.handleGetBranches();
        break;
      case "getOpenAIModels":
        try {
          const models = await OpenAIHelper.fetchChatModels(
            message.openaiApiKey
          );
          this.webview.postMessage({
            type: "openaiModelsLoaded",
            models: models,
          });
        } catch (error) {
          console.error("Error fetching OpenAI models for webview:", error);
          // Send fallback models (or an empty list and let webview handle it)
          // For now, relying on fetchChatModels' internal fallback
          const fallbackModels = await OpenAIHelper.fetchChatModels(""); // Trigger fallback
          this.webview.postMessage({
            type: "openaiModelsLoaded",
            models: fallbackModels, // Send fallback models
            error: `Failed to fetch models: ${error}`,
          });
        }
        break;
      case "openSettings": // Added case
        // Open VS Code settings, focused on this extension's settings
        vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "prSummary"
        );
        break;
      default:
        console.warn("Received unknown message command:", message.command);
        // Optionally send an error back to the webview
        this.webview.postMessage({
          type: "error",
          message: `Unknown command received: ${message.command}`,
        });
    }
  }

  /**
   * Set the JIRA ticket (called externally after selection).
   * Delegates to the JiraHandler.
   */
  public setJiraTicket(ticket: string): void {
    this.jiraHandler.setJiraTicket(ticket);
  }

  // Note: getJiraTicket is now handled internally by JiraHandler and passed to SummaryHandler
}
