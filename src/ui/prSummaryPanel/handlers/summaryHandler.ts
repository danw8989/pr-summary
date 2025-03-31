import * as vscode from "vscode";
import { OpenAIHelper } from "../../../utils/openAiHelper";
import { HistoryManager } from "../../../utils/historyManager";
import { TemplateManager } from "../../../utils/templateManager";
import { GitHelper } from "../../../utils/gitHelper";

/**
 * Handles the generation of PR summaries.
 */
export class SummaryHandler {
  constructor(
    private readonly webview: vscode.Webview,
    private readonly context: vscode.ExtensionContext,
    private readonly getJiraTicket: () => string | undefined // Function to get ticket from JiraHandler
  ) {}

  /**
   * Handle the generate summary command
   */
  public async handleGenerateSummary(
    openaiApiKey: string,
    additionalPrompt: string,
    includeDiffs: boolean,
    model: string,
    template: string,
    sourceBranch?: string,
    targetBranch?: string
  ): Promise<void> {
    try {
      const jiraTicket = this.getJiraTicket();

      // Get all templates including custom ones
      const allTemplates = await TemplateManager.getAllTemplatePrompts(
        this.context
      );

      // Get template prompt
      const templatePrompt = allTemplates[template];
      if (!templatePrompt) {
        throw new Error(`Template "${template}" not found.`);
      }
      const fullPrompt = `${templatePrompt} ${additionalPrompt}`.trim();

      // Generate summary
      const summary = await OpenAIHelper.generatePrSummary(
        openaiApiKey,
        fullPrompt,
        includeDiffs,
        jiraTicket,
        model,
        sourceBranch,
        targetBranch
      );

      // Save to history
      const historyManager = new HistoryManager(this.context);
      const currentBranch = await GitHelper.getCurrentBranchName(); // Consider passing GitHelper instance if needed elsewhere
      await historyManager.saveSummary(
        currentBranch,
        jiraTicket,
        summary.description,
        model,
        template
      );

      // Send results back to webview
      this.webview.postMessage({
        type: "summaryGenerated",
        title: summary.title,
        description: summary.description,
      });

      // Save configuration (Consider moving config updates to a dedicated ConfigHandler or similar)
      const config = vscode.workspace.getConfiguration("prSummary");
      await config.update("openaiApiKey", openaiApiKey, true);
      await config.update("defaultModel", model, true);
      await config.update("defaultTemplate", template, true);
    } catch (error) {
      // Send error message back to webview
      this.webview.postMessage({
        type: "error",
        message: `Failed to generate summary: ${error}`,
      });
    }
  }
}
