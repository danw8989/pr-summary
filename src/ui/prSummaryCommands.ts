import * as vscode from "vscode";
import { GitHelper } from "../utils/gitHelper";
import { JiraHelper } from "../utils/jiraHelper";
import { OpenAIHelper } from "../utils/openAiHelper";
import { TemplateManager } from "../utils/templateManager";
import { HistoryManager } from "../utils/historyManager";
import { PrSummaryTreeProvider } from "./prSummaryTreeProvider";
import { PrSummaryResultProvider } from "./prSummaryResultsView";

export class PrSummaryCommands {
  private _context: vscode.ExtensionContext;
  private _treeProvider: PrSummaryTreeProvider;
  private _jiraHelper: JiraHelper;
  private _templateManager: TemplateManager;
  private _historyManager: HistoryManager;

  private _selectedBranch?: string;
  private _selectedTargetBranch?: string;
  private _selectedJiraTicket?: string;
  private _selectedTemplate?: string;

  constructor(
    context: vscode.ExtensionContext,
    treeProvider: PrSummaryTreeProvider
  ) {
    this._context = context;
    this._treeProvider = treeProvider;

    // Initialize JiraHelper with empty values - will get from config when needed
    const config = vscode.workspace.getConfiguration("prSummary");
    const jiraUrl = config.get<string>("jiraUrl") || process.env.JIRA_URL || "";
    const jiraEmail =
      config.get<string>("jiraEmail") || process.env.JIRA_EMAIL || "";
    const jiraApiToken =
      config.get<string>("jiraApiToken") || process.env.JIRA_API_TOKEN || "";

    this._jiraHelper = new JiraHelper(jiraUrl, jiraEmail, jiraApiToken);
    this._templateManager = new TemplateManager();
    this._historyManager = new HistoryManager(context);

    // Set intelligent default target branch
    this.setDefaultTargetBranch();

    // Initialize history display safely
    this.initializeHistory();
  }

  private async initializeHistory(): Promise<void> {
    try {
      const recentHistory = await this._historyManager.getHistory();
      const validHistory = recentHistory.filter(
        (entry) =>
          entry &&
          typeof entry.created === "number" &&
          !isNaN(entry.created) &&
          entry.branchName &&
          entry.summary
      );

      // If we found invalid data, clean it up
      if (validHistory.length !== recentHistory.length) {
        console.log("Cleaning up invalid history entries");
        await this._historyManager.clearHistory();
        // Re-save only valid entries
        for (const entry of validHistory) {
          await this._historyManager.saveSummary(
            entry.branchName,
            entry.jiraTicket,
            entry.summary,
            entry.model,
            entry.template
          );
        }
      }

      this.updateHistoryDisplay(validHistory);
    } catch (error) {
      console.error("Error initializing history:", error);
      // Clear history if there's a serious problem
      await this._historyManager.clearHistory();
    }
  }

  private updateHistoryDisplay(history: any[]): void {
    const formattedHistory = history.map((entry) => {
      let timestamp: string;
      try {
        if (typeof entry.created === "number") {
          timestamp =
            new Date(entry.created).toLocaleDateString() +
            " " +
            new Date(entry.created).toLocaleTimeString();
        } else {
          timestamp =
            new Date().toLocaleDateString() +
            " " +
            new Date().toLocaleTimeString();
        }
      } catch (error) {
        timestamp =
          new Date().toLocaleDateString() +
          " " +
          new Date().toLocaleTimeString();
      }

      return {
        summary: entry.summary,
        branch: entry.branchName,
        jiraTicket: entry.jiraTicket,
        template: entry.template,
        timestamp: timestamp,
      };
    });

    this._treeProvider.updateHistory(formattedHistory);
  }

  private async setDefaultTargetBranch(): Promise<void> {
    try {
      const branches = await GitHelper.getAllBranches();
      const commonTargetBranches = ["main", "master", "develop", "dev"];

      // Find the first common branch that exists
      const defaultBranch =
        commonTargetBranches.find((branch) =>
          branches.some(
            (repoBranch) =>
              repoBranch === branch ||
              repoBranch === `origin/${branch}` ||
              repoBranch === `remotes/origin/${branch}`
          )
        ) || "main"; // fallback to "main"

      this._selectedTargetBranch = defaultBranch;
      this._treeProvider.updateSelection(
        "targetBranch",
        `${defaultBranch} (default)`
      );
    } catch (error) {
      // Fallback to "main" if we can't detect branches
      this._selectedTargetBranch = "main";
      this._treeProvider.updateSelection("targetBranch", "main (default)");
    }
  }

  async configureApiKey(): Promise<void> {
    const apiKey = await vscode.window.showInputBox({
      prompt: "Enter your OpenAI API Key",
      password: true,
      placeHolder: "sk-...",
      ignoreFocusOut: true,
    });

    if (apiKey) {
      const config = vscode.workspace.getConfiguration("prSummary");
      await config.update(
        "openaiApiKey",
        apiKey,
        vscode.ConfigurationTarget.Global
      );
      vscode.window.showInformationMessage("OpenAI API Key saved successfully");
      this._treeProvider.refresh();
    }
  }

  async configureJira(): Promise<void> {
    const jiraUrl = await vscode.window.showInputBox({
      prompt: "Enter your JIRA URL",
      placeHolder: "https://your-domain.atlassian.net",
      ignoreFocusOut: true,
    });

    if (!jiraUrl) return;

    const jiraEmail = await vscode.window.showInputBox({
      prompt: "Enter your JIRA Email",
      placeHolder: "user@company.com",
      ignoreFocusOut: true,
    });

    if (!jiraEmail) return;

    const jiraApiToken = await vscode.window.showInputBox({
      prompt: "Enter your JIRA API Token",
      password: true,
      placeHolder: "Your JIRA API token",
      ignoreFocusOut: true,
    });

    if (!jiraApiToken) return;

    const config = vscode.workspace.getConfiguration("prSummary");
    await Promise.all([
      config.update("jiraUrl", jiraUrl, vscode.ConfigurationTarget.Global),
      config.update("jiraEmail", jiraEmail, vscode.ConfigurationTarget.Global),
      config.update(
        "jiraApiToken",
        jiraApiToken,
        vscode.ConfigurationTarget.Global
      ),
    ]);

    vscode.window.showInformationMessage(
      "JIRA configuration saved successfully"
    );
    this._treeProvider.refresh();
  }

  async openSettings(): Promise<void> {
    await vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "@ext:InZarys.pr-summary"
    );
  }

  async toggleDiffs(): Promise<void> {
    const config = vscode.workspace.getConfiguration("prSummary");
    const currentValue = config.get<boolean>("includeDiffs", true);

    await config.update(
      "includeDiffs",
      !currentValue,
      vscode.ConfigurationTarget.Global
    );

    vscode.window.showInformationMessage(
      `Code diffs ${!currentValue ? "enabled" : "disabled"} for PR summaries`
    );

    this._treeProvider.refresh();
  }

  async setAdditionalPrompt(): Promise<void> {
    const config = vscode.workspace.getConfiguration("prSummary");
    const currentPrompt = config.get<string>("additionalPrompt", "");

    const newPrompt = await vscode.window.showInputBox({
      prompt: "Enter additional instructions for PR summary generation",
      placeHolder:
        "e.g., Focus on UI changes, Include performance implications",
      value: currentPrompt,
      ignoreFocusOut: true,
    });

    if (newPrompt !== undefined) {
      // Allow empty string to clear
      await config.update(
        "additionalPrompt",
        newPrompt,
        vscode.ConfigurationTarget.Global
      );

      vscode.window.showInformationMessage(
        newPrompt
          ? "Additional prompt instructions saved"
          : "Additional prompt instructions cleared"
      );

      this._treeProvider.refresh();
    }
  }

  async selectBranch(): Promise<void> {
    try {
      const branches = await GitHelper.getAllBranches();

      if (branches.length === 0) {
        vscode.window.showWarningMessage(
          "No Git branches found in the current workspace"
        );
        return;
      }

      const quickPick = vscode.window.createQuickPick();
      quickPick.title = "Select Source Branch for PR Summary";
      quickPick.placeholder =
        "Choose the branch to compare against main/master";
      quickPick.items = branches.map((branch: string) => {
        const isCurrentBranch = this.isCurrentBranch(branch);
        return {
          label: branch,
          detail: isCurrentBranch ? "Current branch" : undefined,
        };
      });

      quickPick.onDidChangeSelection((selection) => {
        if (selection[0]) {
          this._selectedBranch = selection[0].label;
          this._treeProvider.updateSelection("branch", this._selectedBranch);
          quickPick.hide();
        }
      });

      quickPick.onDidHide(() => quickPick.dispose());
      quickPick.show();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load branches: ${error}`);
    }
  }

  private isCurrentBranch(branch: string): boolean {
    // Remove async to fix the boolean condition issue
    // We'll handle current branch detection differently if needed
    return false; // Simplified for now
  }

  async selectJiraTicket(): Promise<void> {
    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: "Loading JIRA tickets...",
          cancellable: false,
        },
        async () => {
          const tickets = await this._jiraHelper.getRecentTickets();

          if (tickets.length === 0) {
            vscode.window.showWarningMessage("No JIRA tickets found");
            return;
          }

          const quickPick = vscode.window.createQuickPick();
          quickPick.title = "Select JIRA Ticket (Optional)";
          quickPick.placeholder =
            "Choose a ticket to associate with the PR summary";
          quickPick.items = [
            {
              label: "$(clear-all) No ticket",
              detail: "Generate summary without JIRA ticket",
            },
            ...tickets.map((ticket: any) => ({
              label: `$(link) ${ticket.key}`,
              detail: ticket.summary,
              description: ticket.status,
            })),
          ];

          quickPick.onDidChangeSelection((selection) => {
            if (selection[0]) {
              if (selection[0].label.includes("No ticket")) {
                this._selectedJiraTicket = undefined;
                this._treeProvider.updateSelection("jira", "None selected");
              } else {
                this._selectedJiraTicket = selection[0].label.replace(
                  "$(link) ",
                  ""
                );
                this._treeProvider.updateSelection(
                  "jira",
                  this._selectedJiraTicket
                );
              }
              quickPick.hide();
            }
          });

          quickPick.onDidHide(() => quickPick.dispose());
          quickPick.show();
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load JIRA tickets: ${error}`);
    }
  }

  async selectTemplate(): Promise<void> {
    try {
      const templates = await TemplateManager.getAllTemplateOptions(
        this._context
      );

      const quickPick = vscode.window.createQuickPick();
      quickPick.title = "Select PR Summary Template";
      quickPick.placeholder = "Choose a template for generating the summary";
      quickPick.items = templates.map((template: string) => ({
        label: `$(file-text) ${template}`,
        detail: this.getTemplateDescription(template),
      }));

      quickPick.onDidChangeSelection((selection) => {
        if (selection[0]) {
          this._selectedTemplate = selection[0].label.replace(
            "$(file-text) ",
            ""
          );
          this._treeProvider.updateSelection(
            "template",
            this._selectedTemplate
          );
          quickPick.hide();
        }
      });

      quickPick.onDidHide(() => quickPick.dispose());
      quickPick.show();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load templates: ${error}`);
    }
  }

  async generateSummary(): Promise<void> {
    if (!this._selectedBranch) {
      const result = await vscode.window.showWarningMessage(
        "No branch selected. Would you like to select one now?",
        "Select Branch",
        "Cancel"
      );
      if (result === "Select Branch") {
        await this.selectBranch();
        if (!this._selectedBranch) return;
      } else {
        return;
      }
    }

    if (!this._selectedTemplate) {
      const config = vscode.workspace.getConfiguration("prSummary");
      this._selectedTemplate = config.get<string>("defaultTemplate", "Medium");
    }

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Generating PR Summary...",
          cancellable: true,
        },
        async (progress, token) => {
          progress.report({
            increment: 10,
            message: "Getting commit history...",
          });

          const config = vscode.workspace.getConfiguration("prSummary");
          const includeDiffs = config.get<boolean>("includeDiffs", true);

          const commitMessagesWithDiff =
            await GitHelper.getCommitMessagesWithDiff(
              this._selectedBranch!,
              this._selectedTargetBranch || "main",
              includeDiffs
            );

          if (token.isCancellationRequested) return;

          progress.report({
            increment: 50,
            message: "Generating AI summary...",
          });

          const apiKey =
            config.get<string>("openaiApiKey") || process.env.OPENAI_API_KEY;
          const model = config.get<string>("defaultModel", "gpt-4");

          if (!apiKey) {
            throw new Error("OpenAI API Key not configured");
          }

          const templatePrompts = await TemplateManager.getAllTemplatePrompts(
            this._context
          );
          const templatePrompt = templatePrompts[this._selectedTemplate!] || "";
          const customPrompt = config.get<string>("additionalPrompt", "");
          const additionalPrompt = [templatePrompt, customPrompt]
            .filter(Boolean)
            .join(" ");

          const result = await OpenAIHelper.generatePrSummary(
            apiKey,
            additionalPrompt,
            true,
            this._selectedJiraTicket,
            model,
            this._selectedBranch!
          );

          if (token.isCancellationRequested) return;

          progress.report({ increment: 90, message: "Saving summary..." });

          const summaryData = {
            summary: `${result.title}\n\n${result.description}`,
            branch: this._selectedBranch!,
            jiraTicket: this._selectedJiraTicket,
            template: this._selectedTemplate!,
            timestamp: new Date().toISOString(),
          };

          await this._historyManager.saveSummary(
            this._selectedBranch!,
            this._selectedJiraTicket,
            summaryData.summary,
            model,
            this._selectedTemplate!
          );

          const recentHistory = await this._historyManager.getHistory();
          this.updateHistoryDisplay(recentHistory);

          progress.report({ increment: 100, message: "Complete!" });

          this.showSummaryResult(summaryData.summary);
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to generate summary: ${error}`);
    }
  }

  async viewHistory(summary: any): Promise<void> {
    this.showSummaryResult(summary.summary, summary);
  }

  private showSummaryResult(summary: string, metadata?: any): void {
    PrSummaryResultProvider.showSummary(summary, metadata);
  }

  private getTemplateDescription(template: string): string {
    const descriptions: { [key: string]: string } = {
      Short: "Brief summary with key changes",
      Medium: "Balanced summary with details",
      Long: "Comprehensive summary with full context",
      "Bullet Points": "Summary in bullet point format",
      Technical: "Technical-focused summary for developers",
    };
    return descriptions[template] || "Custom template";
  }

  async selectTargetBranch(): Promise<void> {
    try {
      const branches = await GitHelper.getAllBranches();

      if (branches.length === 0) {
        vscode.window.showWarningMessage(
          "No Git branches found in the current workspace"
        );
        return;
      }

      // Define common target branch names in order of preference
      const commonTargetBranches = ["main", "master", "develop", "dev"];

      // Find which common branches exist in the repo
      const availableTargetBranches = commonTargetBranches.filter((branch) =>
        branches.some(
          (repoBranch) =>
            repoBranch === branch ||
            repoBranch === `origin/${branch}` ||
            repoBranch === `remotes/origin/${branch}`
        )
      );

      const quickPick = vscode.window.createQuickPick();
      quickPick.title = "Select Target Branch for PR Summary";
      quickPick.placeholder = "Choose the branch to compare changes against";

      // Create items with common branches first, then all others
      const commonItems = availableTargetBranches.map((branch) => ({
        label: branch,
        detail: `Recommended target branch`,
        description:
          branch === this._selectedTargetBranch
            ? "Currently selected"
            : undefined,
      }));

      const otherBranches = branches.filter(
        (branch) =>
          !availableTargetBranches.some(
            (common) =>
              branch === common ||
              branch === `origin/${common}` ||
              branch === `remotes/origin/${common}`
          )
      );

      const otherItems = otherBranches.map((branch: string) => ({
        label: branch,
        detail: undefined,
        description:
          branch === this._selectedTargetBranch
            ? "Currently selected"
            : undefined,
      }));

      // Add separator if we have both common and other branches
      const items = [
        ...commonItems,
        ...(commonItems.length > 0 && otherItems.length > 0
          ? [
              {
                label: "$(dash) Other Branches",
                detail: "",
                kind: vscode.QuickPickItemKind.Separator,
              },
            ]
          : []),
        ...otherItems,
      ];

      quickPick.items = items;

      quickPick.onDidChangeSelection((selection) => {
        if (
          selection[0] &&
          selection[0].kind !== vscode.QuickPickItemKind.Separator
        ) {
          this._selectedTargetBranch = selection[0].label;
          this._treeProvider.updateSelection(
            "targetBranch",
            this._selectedTargetBranch
          );
          quickPick.hide();
        }
      });

      quickPick.onDidHide(() => quickPick.dispose());
      quickPick.show();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load branches: ${error}`);
    }
  }
}
