import * as vscode from "vscode";
import { OpenAIHelper, PrSummary } from "../../utils/openAiHelper";
import { HistoryManager } from "../../utils/historyManager";
import { TEMPLATE_PROMPTS } from "../../constants";
import { TemplateManager } from "../../utils/templateManager";
import { GitHelper } from "../../utils/gitHelper";

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
          message.template,
          message.sourceBranch,
          message.targetBranch
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
      case "saveCustomTemplate":
        await this.handleSaveCustomTemplate(
          message.templateName,
          message.templatePrompt
        );
        break;
      case "deleteCustomTemplate":
        await this.handleDeleteCustomTemplate(message.templateName);
        break;
      case "getCustomTemplates":
        await this.handleGetCustomTemplates();
        break;
      case "getBranches":
        await this.handleGetBranches();
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
    template: string,
    sourceBranch?: string,
    targetBranch?: string
  ): Promise<void> {
    try {
      // Get all templates including custom ones
      const allTemplates = await TemplateManager.getAllTemplatePrompts(
        this.context
      );

      // Get template prompt
      const templatePrompt = allTemplates[template];
      const fullPrompt = `${templatePrompt} ${additionalPrompt}`.trim();

      // Generate summary
      const summary = await OpenAIHelper.generatePrSummary(
        openaiApiKey,
        fullPrompt,
        includeDiffs,
        this._jiraTicket,
        model,
        sourceBranch,
        targetBranch
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
   * Handle saving a custom template
   */
  private async handleSaveCustomTemplate(
    templateName: string,
    templatePrompt: string
  ): Promise<void> {
    try {
      await TemplateManager.saveCustomTemplate(
        this.context,
        templateName,
        templatePrompt
      );

      // Refresh template list
      await this.handleGetCustomTemplates();

      // Send success message
      this.webview.postMessage({
        type: "templateSaved",
        name: templateName,
      });
    } catch (error) {
      this.webview.postMessage({
        type: "error",
        message: `Failed to save template: ${error}`,
      });
    }
  }

  /**
   * Handle deleting a custom template
   */
  private async handleDeleteCustomTemplate(
    templateName: string
  ): Promise<void> {
    try {
      await TemplateManager.deleteCustomTemplate(this.context, templateName);

      // Refresh template list
      await this.handleGetCustomTemplates();

      // Send success message
      this.webview.postMessage({
        type: "templateDeleted",
        name: templateName,
      });
    } catch (error) {
      this.webview.postMessage({
        type: "error",
        message: `Failed to delete template: ${error}`,
      });
    }
  }

  /**
   * Handle getting all custom templates
   */
  private async handleGetCustomTemplates(): Promise<void> {
    try {
      const customTemplates = await TemplateManager.getCustomTemplates(
        this.context
      );
      const allOptions = await TemplateManager.getAllTemplateOptions(
        this.context
      );

      // Send templates to webview
      this.webview.postMessage({
        type: "templatesLoaded",
        templates: customTemplates,
        allOptions: allOptions,
      });
    } catch (error) {
      this.webview.postMessage({
        type: "error",
        message: `Failed to load templates: ${error}`,
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

  /**
   * Get all available git branches and send them to the webview
   */
  private async handleGetBranches(): Promise<void> {
    try {
      const branches = await GitHelper.getAllBranches();
      const currentBranch = await GitHelper.getCurrentBranchName();

      // Send branches to webview
      this.webview.postMessage({
        type: "branchesLoaded",
        branches: branches,
        currentBranch: currentBranch,
      });
    } catch (error) {
      this.webview.postMessage({
        type: "error",
        message: `Failed to load branches: ${error}`,
      });
    }
  }
}
