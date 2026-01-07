import * as vscode from "vscode";
import { GitHelper } from "../utils/gitHelper";
import { JiraHelper } from "../utils/jiraHelper";
import { OpenAIHelper } from "../utils/openAiHelper";
import { TemplateManager, CustomTemplate } from "../utils/templateManager";
import { HistoryManager } from "../utils/historyManager";
import { PrSummaryTreeProvider } from "./prSummaryTreeProvider";
import { PrSummaryResultProvider } from "./prSummaryResultsView";
import { AutoPostService } from "../services/AutoPostService";
import { ModelService } from "../services/ModelService";
import {
  AUTO_POST_SETTINGS,
  type AutoPostState,
  type AutoPostPlatform,
} from "../constants";

export class PrSummaryCommands {
  private _context: vscode.ExtensionContext;
  private _treeProvider: PrSummaryTreeProvider;
  private _jiraHelper: JiraHelper;
  private _templateManager: TemplateManager;
  private _historyManager: HistoryManager;
  private _autoPostService: AutoPostService;

  private _selectedBranch?: string;
  private _selectedTargetBranch?: string;
  private _selectedJiraTicket?: string;
  private _selectedTemplate?: string;

  // Fetch version counter to handle race conditions in commit preview
  private _fetchVersion = 0;

  // Debounce timer for selection updates
  private _selectionDebounceTimer?: ReturnType<typeof setTimeout>;

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
    this._autoPostService = new AutoPostService();

    // Listen for configuration changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("prSummary")) {
          this._treeProvider.refresh();
        }
      })
    );

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

      // Try to get current branch for auto-selection and preview
      try {
        const currentBranch = await GitHelper.getCurrentBranchName();
        if (currentBranch && currentBranch !== defaultBranch) {
          this._selectedBranch = currentBranch;
          this._treeProvider.updateSelection(
            "branch",
            `${currentBranch} (auto-detected)`
          );

          // Update commit preview with both branches
          await this.fetchCommitPreview(currentBranch, defaultBranch);
        }
      } catch (error) {
        console.log("Could not auto-detect current branch:", error);
      }
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

      // Automatically refresh available models after configuring API key
      const shouldRefreshModels = await vscode.window.showInformationMessage(
        "Would you like to refresh the available OpenAI models now?",
        "Yes",
        "Later"
      );

      if (shouldRefreshModels === "Yes") {
        await this.refreshAvailableModels();
      }

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

  async setMaxCommits(): Promise<void> {
    const config = vscode.workspace.getConfiguration("prSummary");
    const currentMaxCommits = config.get<number>("maxCommits", 50);

    const newMaxCommits = await vscode.window.showInputBox({
      prompt: "Enter maximum number of commits to include (5-200)",
      placeHolder: "50",
      value: currentMaxCommits.toString(),
      ignoreFocusOut: true,
      validateInput: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 5 || num > 200) {
          return "Please enter a number between 5 and 200";
        }
        return null;
      },
    });

    if (newMaxCommits !== undefined) {
      const maxCommits = parseInt(newMaxCommits);
      await config.update(
        "maxCommits",
        maxCommits,
        vscode.ConfigurationTarget.Global
      );

      vscode.window.showInformationMessage(
        `Maximum commits set to ${maxCommits}. Lower values help avoid buffer limit errors with large repositories.`
      );

      this._treeProvider.refresh();
    }
  }

  async createCustomTemplate(): Promise<void> {
    // Step 1: Get template name
    const templateName = await vscode.window.showInputBox({
      prompt: "Enter a name for your custom template",
      placeHolder: "e.g., My Team Template, QA Process, etc.",
      validateInput: async (value) => {
        if (!value || value.trim().length === 0) {
          return "Template name cannot be empty";
        }

        // Check if template name already exists
        const existingTemplates = await TemplateManager.getAllTemplateOptions(
          this._context
        );
        if (existingTemplates.includes(value.trim())) {
          return "A template with this name already exists";
        }

        return null;
      },
      ignoreFocusOut: true,
    });

    if (!templateName) return;

    // Step 2: Get template instructions using a large input box
    const templateInstructions = await vscode.window.showInputBox({
      prompt:
        "Enter the AI instructions for your template (this tells the AI how to generate the PR summary)",
      placeHolder:
        "e.g., Generate a PR summary with focus on security changes. Include: risk assessment, mitigation steps, testing approach...",
      ignoreFocusOut: true,
      value: `Generate a PR summary for ${templateName} with the following structure:
- Brief description of changes
- Impact on [specify area: users, system, performance, etc.]
- Testing approach and validation
- Any special considerations or notes`,
    });

    if (!templateInstructions) return;

    try {
      // Save the template to VS Code's storage (not as a file)
      await TemplateManager.saveCustomTemplate(
        this._context,
        templateName,
        templateInstructions
      );

      vscode.window.showInformationMessage(
        `✅ Custom template "${templateName}" saved successfully! It will appear in your template selector.`
      );

      // Refresh the tree view to show the new template
      this._treeProvider.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save template: ${error}`);
    }
  }

  async editCustomTemplate(template: CustomTemplate): Promise<void> {
    const options = await vscode.window.showQuickPick(
      [
        {
          label: "$(edit) Edit Template",
          description: "Modify the template instructions",
          action: "edit",
        },
        {
          label: "$(trash) Delete Template",
          description: "Remove this custom template",
          action: "delete",
        },
      ],
      {
        placeHolder: `Choose action for template: ${template.name}`,
        ignoreFocusOut: true,
      }
    );

    if (!options) return;

    if (options.action === "delete") {
      const confirmation = await vscode.window.showWarningMessage(
        `Are you sure you want to delete the template "${template.name}"?`,
        "Delete",
        "Cancel"
      );

      if (confirmation === "Delete") {
        await TemplateManager.deleteCustomTemplate(
          this._context,
          template.name
        );
        vscode.window.showInformationMessage(
          `✅ Template "${template.name}" deleted successfully`
        );
        this._treeProvider.refresh();
      }
    } else if (options.action === "edit") {
      // Edit the template instructions directly
      const newInstructions = await vscode.window.showInputBox({
        prompt: `Edit instructions for template: ${template.name}`,
        placeHolder: "Enter the AI instructions for generating PR summaries...",
        value: template.prompt,
        ignoreFocusOut: true,
      });

      if (newInstructions !== undefined) {
        // Allow empty string
        try {
          await TemplateManager.saveCustomTemplate(
            this._context,
            template.name,
            newInstructions
          );
          vscode.window.showInformationMessage(
            `✅ Template "${template.name}" updated successfully!`
          );
          this._treeProvider.refresh();
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to update template: ${error}`);
        }
      }
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

      // Get current branch for auto-selection
      let currentBranch: string | null = null;
      try {
        currentBranch = await GitHelper.getCurrentBranchName();
      } catch (error) {
        console.log("Could not detect current branch:", error);
      }

      const quickPick = vscode.window.createQuickPick();
      quickPick.title = "Select Source Branch for PR Summary";
      quickPick.placeholder =
        "Choose the feature branch with your changes (usually current branch)";

      quickPick.items = branches.map((branch: string) => {
        const isCurrentBranch = branch === currentBranch;
        const isSelected = branch === this._selectedBranch;

        return {
          label: branch,
          detail: isCurrentBranch
            ? "✓ Current branch (recommended)"
            : isSelected
            ? "Currently selected"
            : undefined,
          description: isCurrentBranch ? "$(arrow-right)" : undefined,
        };
      });

      // Auto-select current branch if not already selected
      if (currentBranch && !this._selectedBranch) {
        this._selectedBranch = currentBranch;
        this._treeProvider.updateSelection("branch", this._selectedBranch);
      }

      quickPick.onDidChangeSelection((selection) => {
        if (selection[0]) {
          this._selectedBranch = selection[0].label;
          this._treeProvider.updateSelection("branch", this._selectedBranch);

          // Update commit preview with both branches
          if (this._selectedTargetBranch) {
            this.fetchCommitPreview(
              this._selectedBranch,
              this._selectedTargetBranch
            );
          }

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
    // This method is now replaced by the logic in selectBranch()
    // Keeping for backwards compatibility but will be removed
    return false;
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
          const maxCommits = config.get<number>("maxCommits", 50);

          // Ensure we have a target branch selected before proceeding
          if (!this._selectedTargetBranch) {
            const result = await vscode.window.showWarningMessage(
              "No target branch selected. Would you like to select one now?",
              "Select Target Branch",
              "Cancel"
            );
            if (result === "Select Target Branch") {
              await this.selectTargetBranch();
              if (!this._selectedTargetBranch) return;
            } else {
              return;
            }
          }

          const commitMessagesWithDiff =
            await GitHelper.getCommitMessagesWithDiff(
              this._selectedBranch!,
              this._selectedTargetBranch!,
              includeDiffs,
              maxCommits
            );

          if (token.isCancellationRequested) return;

          progress.report({
            increment: 50,
            message: "Generating AI summary...",
          });

          const apiKey =
            config.get<string>("openaiApiKey") || process.env.OPENAI_API_KEY;
          const model = await ModelService.getCurrentModel(apiKey);

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
            this._selectedBranch!,
            this._selectedTargetBranch!
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

          // Save to history and wait for completion
          await this._historyManager.saveSummary(
            this._selectedBranch!,
            this._selectedJiraTicket,
            summaryData.summary,
            model,
            this._selectedTemplate!
          );

          // Ensure history is updated in UI
          const recentHistory = await this._historyManager.getHistory();
          this.updateHistoryDisplay(recentHistory);

          progress.report({ increment: 100, message: "Complete!" });

          // Show the summary result first
          this.showSummaryResult(summaryData.summary);

          // Then handle auto-post with the fresh summary
          const title = `${this._selectedBranch} → ${this._selectedTargetBranch}`;
          await this.autoPostAfterGeneration(title, summaryData.summary);
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Handle buffer limit errors with helpful guidance
      if (
        errorMessage.includes("maxBuffer") ||
        errorMessage.includes("MAXBUFFER")
      ) {
        const action = await vscode.window.showErrorMessage(
          `Repository is too large: ${errorMessage}`,
          "Reduce Max Commits",
          "Disable Diffs",
          "Open Settings"
        );

        if (action === "Reduce Max Commits") {
          await this.setMaxCommits();
        } else if (action === "Disable Diffs") {
          const config = vscode.workspace.getConfiguration("prSummary");
          await config.update(
            "includeDiffs",
            false,
            vscode.ConfigurationTarget.Global
          );
          vscode.window.showInformationMessage(
            "Code diffs disabled. Try generating the summary again."
          );
          this._treeProvider.refresh();
        } else if (action === "Open Settings") {
          await this.openSettings();
        }
      } else {
        vscode.window.showErrorMessage(
          `Failed to generate summary: ${errorMessage}`
        );
      }
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
      Thorough: "Very detailed summary with impacts",
      "Bug Fix": "Structured summary for bug fixes",
      "Feature Request": "Feature-focused summary with benefits",
      Documentation: "Documentation-specific summary format",
      Refactoring: "Refactoring summary with benefits",
      "Security Fix": "Security-focused summary format",
      Performance: "Performance optimization summary",
      Dependencies: "Dependency update summary",
      Infrastructure: "Infrastructure/DevOps summary",
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

      // Auto-select default target branch if none selected
      if (!this._selectedTargetBranch && availableTargetBranches.length > 0) {
        this._selectedTargetBranch = availableTargetBranches[0];
        this._treeProvider.updateSelection(
          "targetBranch",
          this._selectedTargetBranch
        );
      }

      const quickPick = vscode.window.createQuickPick();
      quickPick.title = "Select Target Branch for PR Summary";
      quickPick.placeholder =
        "Choose the base branch to compare your changes against (e.g., main, master)";

      // Create items with common branches first, then all others
      const commonItems = availableTargetBranches.map((branch) => ({
        label: branch,
        detail: `✓ Recommended target branch`,
        description:
          branch === this._selectedTargetBranch
            ? "$(check) Currently selected"
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
            ? "$(check) Currently selected"
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

          // Update commit preview with both branches
          if (this._selectedBranch) {
            this.fetchCommitPreview(
              this._selectedBranch,
              this._selectedTargetBranch
            );
          }

          quickPick.hide();
        }
      });

      quickPick.onDidHide(() => quickPick.dispose());
      quickPick.show();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load branches: ${error}`);
    }
  }

  async showTemplateInfo(): Promise<void> {
    const customTemplates = await TemplateManager.getCustomTemplates(
      this._context
    );

    if (customTemplates.length === 0) {
      vscode.window.showInformationMessage(
        "You don't have any custom templates yet. Click 'Create New Template' to get started!"
      );
      return;
    }

    const templateList = customTemplates.map((t) => `• ${t.name}`).join("\n");

    const options = await vscode.window.showInformationMessage(
      `📝 You have ${customTemplates.length} custom template(s):\n\n${templateList}\n\n` +
        `Templates are stored securely in VS Code's settings (not as files). ` +
        `They will persist across VS Code sessions and sync with your settings if enabled.`,
      "Export Templates",
      "OK"
    );

    if (options === "Export Templates") {
      // Create a document with all templates for export/backup
      const exportContent = `# Custom PR Summary Templates Export
Generated: ${new Date().toLocaleString()}

${customTemplates
  .map(
    (template) => `
## ${template.name}

\`\`\`
${template.prompt}
\`\`\`
`
  )
  .join("\n")}

## Import Instructions
To import these templates:
1. Copy the template content (between backticks)
2. Use "Create New Template" in the extension
3. Paste the content as the template instructions
`;

      const document = await vscode.workspace.openTextDocument({
        content: exportContent,
        language: "markdown",
      });

      await vscode.window.showTextDocument(document, {
        viewColumn: vscode.ViewColumn.One,
        preview: false,
      });

      vscode.window.showInformationMessage(
        "💾 Templates exported! Save this file to backup your templates."
      );
    }
  }

  async toggleAutoPost(): Promise<void> {
    const config = vscode.workspace.getConfiguration("prSummary");
    const enabled = config.get<boolean>("autoPost.enabled", false);

    await config.update(
      "autoPost.enabled",
      !enabled,
      vscode.ConfigurationTarget.Global
    );

    // Update tree view
    const autoPostSection = this._treeProvider.data.find(
      (item) => item.id === "autoPost"
    );
    if (autoPostSection?.children) {
      const enabledItem = autoPostSection.children.find(
        (item) => item.id === "autoPostEnabled"
      );
      if (enabledItem) {
        enabledItem.description = !enabled ? "Enabled" : "Disabled";
        enabledItem.iconPath = new vscode.ThemeIcon(
          !enabled ? "check" : "circle-slash"
        );
      }
    }

    this._treeProvider.refresh();
    vscode.window.showInformationMessage(
      `Auto-post ${!enabled ? "enabled" : "disabled"}`
    );
  }

  async configureGitHub(): Promise<void> {
    const token = await vscode.window.showInputBox({
      prompt: "Enter your GitHub Personal Access Token",
      password: true,
      placeHolder: "ghp_... or github_pat_...",
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value) return "Token is required";

        // Trim whitespace and check format
        const trimmedValue = value.trim();
        const validFormats = ["ghp_", "github_pat_", "ghs_", "gho_", "ghu_"];
        const isValidFormat = validFormats.some((prefix) =>
          trimmedValue.startsWith(prefix)
        );

        if (!isValidFormat) {
          return `Invalid GitHub token format. Token should start with: ${validFormats.join(
            ", "
          )}`;
        }

        // Check minimum length
        if (trimmedValue.length < 10) {
          return "Token appears to be too short";
        }
        return null;
      },
    });

    if (token) {
      // Trim the token before saving
      const trimmedToken = token.trim();
      const config = vscode.workspace.getConfiguration("prSummary");
      await config.update(
        "github.token",
        trimmedToken,
        vscode.ConfigurationTarget.Global
      );

      // Test the token
      const testResult = await this._autoPostService.testConnection("github");
      if (testResult.success) {
        vscode.window.showInformationMessage(
          `GitHub token saved and verified! Authenticated as: ${testResult.username}`
        );
      } else {
        vscode.window.showWarningMessage(
          `GitHub token saved but verification failed: ${testResult.error}`
        );
      }
    }
  }

  async configureGitLab(): Promise<void> {
    const token = await vscode.window.showInputBox({
      prompt: "Enter your GitLab Personal Access Token",
      password: true,
      placeHolder: "glpat-...",
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value) return "Token is required";
        if (!value.startsWith("glpat-")) {
          return "Invalid GitLab token format (should start with glpat-)";
        }
        return null;
      },
    });

    if (token) {
      const config = vscode.workspace.getConfiguration("prSummary");
      await config.update(
        "gitlab.token",
        token,
        vscode.ConfigurationTarget.Global
      );

      // Test the token
      const testResult = await this._autoPostService.testConnection("gitlab");
      if (testResult.success) {
        vscode.window.showInformationMessage(
          `GitLab token saved and verified! Authenticated as: ${testResult.username}`
        );
      } else {
        vscode.window.showWarningMessage(
          `GitLab token saved but verification failed: ${testResult.error}`
        );
      }
    }
  }

  async testConnection(): Promise<void> {
    const platform = await vscode.window.showQuickPick(
      [
        { label: "GitHub", value: "github" as AutoPostPlatform },
        { label: "GitLab", value: "gitlab" as AutoPostPlatform },
      ],
      {
        placeHolder: "Select platform to test",
        ignoreFocusOut: true,
      }
    );

    if (!platform) return;

    const testResult = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Testing ${platform.label} connection...`,
        cancellable: false,
      },
      async () => {
        return await this._autoPostService.testConnection(platform.value);
      }
    );

    if (testResult.success) {
      vscode.window.showInformationMessage(
        `✅ ${platform.label} connection successful! Authenticated as: ${testResult.username}`
      );
    } else {
      vscode.window.showErrorMessage(
        `❌ ${platform.label} connection failed: ${testResult.error}`
      );
    }
  }

  async selectAutoPostState(): Promise<void> {
    const options = [
      {
        label: "Ready for Review",
        detail: "Create PR/MR ready for review",
        value: AUTO_POST_SETTINGS.READY,
      },
      {
        label: "Draft",
        detail: "Create as draft PR/MR",
        value: AUTO_POST_SETTINGS.DRAFT,
      },
      {
        label: "Auto-detect",
        detail: "Detect from branch name or title keywords",
        value: AUTO_POST_SETTINGS.AUTO,
      },
    ];

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: "Select default PR/MR state",
      ignoreFocusOut: true,
    });

    if (selected) {
      const config = vscode.workspace.getConfiguration("prSummary");
      await config.update(
        "autoPost.defaultState",
        selected.value,
        vscode.ConfigurationTarget.Global
      );

      // Update tree view
      const autoPostSection = this._treeProvider.data.find(
        (item) => item.id === "autoPost"
      );
      if (autoPostSection?.children) {
        const stateItem = autoPostSection.children.find(
          (item) => item.id === "autoPostState"
        );
        if (stateItem) {
          stateItem.description = selected.label;
        }
      }

      this._treeProvider.refresh();
      vscode.window.showInformationMessage(
        `Default PR/MR state set to: ${selected.label}`
      );
    }
  }

  async autoPostAfterGeneration(title: string, summary: string): Promise<void> {
    const config = vscode.workspace.getConfiguration("prSummary");
    const autoPostEnabled = config.get<boolean>("autoPost.enabled", false);

    if (!autoPostEnabled) return;

    // First check if source branch is pushed to remote
    if (this._selectedBranch) {
      const branchPushed = await this.checkBranchPushedToRemote(
        this._selectedBranch
      );

      if (!branchPushed) {
        const shouldPush = await vscode.window.showWarningMessage(
          `Branch "${this._selectedBranch}" is not pushed to remote. Push it before creating PR/MR?`,
          "Push & Continue",
          "Skip Auto-Post",
          "Cancel"
        );

        if (shouldPush === "Push & Continue") {
          const pushResult = await this.pushBranchToRemote(
            this._selectedBranch
          );
          if (!pushResult.success) {
            vscode.window.showErrorMessage(
              `Failed to push branch: ${pushResult.error}`
            );
            return;
          }
          vscode.window.showInformationMessage(
            `✅ Branch "${this._selectedBranch}" pushed successfully!`
          );
        } else if (shouldPush === "Skip Auto-Post") {
          return; // Skip auto-posting
        } else {
          return; // Cancel
        }
      }
    }

    const shouldPost = await vscode.window.showQuickPick(["Yes", "No"], {
      placeHolder: "Auto-post this PR/MR to GitHub/GitLab?",
      ignoreFocusOut: true,
    });

    if (shouldPost !== "Yes") return;

    if (!this._selectedBranch) {
      vscode.window.showErrorMessage("No source branch selected");
      return;
    }

    if (!this._selectedTargetBranch) {
      const result = await vscode.window.showWarningMessage(
        "No target branch selected. Would you like to select one now?",
        "Select Target Branch",
        "Cancel"
      );
      if (result === "Select Target Branch") {
        await this.selectTargetBranch();
        if (!this._selectedTargetBranch) return;
      } else {
        return;
      }
    }

    const defaultState = config.get<AutoPostState>(
      "autoPost.defaultState",
      "ready"
    );

    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Creating PR/MR...",
        cancellable: false,
      },
      async () => {
        return await this._autoPostService.autoPost(
          title,
          summary,
          this._selectedBranch!,
          this._selectedTargetBranch!,
          defaultState
        );
      }
    );

    if (result.success) {
      const openAction = await vscode.window.showInformationMessage(
        `✅ PR/MR created successfully on ${result.platform}!`,
        "Open in Browser"
      );

      if (openAction === "Open in Browser" && result.url) {
        vscode.env.openExternal(vscode.Uri.parse(result.url));
      }
    } else {
      vscode.window.showErrorMessage(
        `❌ Failed to create PR/MR: ${result.error}`
      );
    }
  }

  /**
   * Check if a branch is pushed to remote
   */
  private async checkBranchPushedToRemote(
    branchName: string
  ): Promise<boolean> {
    try {
      const { stdout } = await GitHelper.executeInWorkspaceRoot(
        `git ls-remote --heads origin ${branchName}`
      );
      return stdout.trim().length > 0;
    } catch (error) {
      console.log(`Could not check remote branch status: ${error}`);
      return false; // Assume not pushed if we can't check
    }
  }

  /**
   * Push branch to remote
   */
  private async pushBranchToRemote(
    branchName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Pushing branch "${branchName}"...`,
          cancellable: false,
        },
        async () => {
          return await GitHelper.pushBranch(branchName);
        }
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Manual PR/MR posting - allows users to manually create PR/MR with more control
   */
  async manualPostPR(): Promise<void> {
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

    if (!this._selectedTargetBranch) {
      const result = await vscode.window.showWarningMessage(
        "No target branch selected. Would you like to select one now?",
        "Select Target Branch",
        "Cancel"
      );
      if (result === "Select Target Branch") {
        await this.selectTargetBranch();
        if (!this._selectedTargetBranch) return;
      } else {
        return;
      }
    }

    // Get or generate title and summary
    let title: string;
    let summary: string;

    const useExistingSummary = await vscode.window.showQuickPick(
      [
        "Use Last Generated Summary",
        "Generate New Summary",
        "Enter Custom Title & Description",
      ],
      {
        placeHolder: "Choose PR/MR content source",
        ignoreFocusOut: true,
      }
    );

    if (!useExistingSummary) return;

    if (useExistingSummary === "Use Last Generated Summary") {
      // Refresh history to get the absolute latest
      await this.refreshHistoryFromStorage();
      const recentHistory = await this._historyManager.getHistory();

      if (recentHistory.length === 0) {
        vscode.window.showErrorMessage(
          "No previous summary found. Please generate a summary first."
        );
        return;
      }

      // Get the most recent summary (index 0 should be the newest)
      const lastSummary = recentHistory[0];
      title = `${this._selectedBranch!} → ${this._selectedTargetBranch!}`;
      summary = lastSummary.summary;

      // Show confirmation of what will be used
      const confirmSummary = await vscode.window.showQuickPick(
        ["Use This Summary", "Show Preview", "Cancel"],
        {
          placeHolder: `Using summary from ${
            lastSummary.branchName
          } (${new Date(lastSummary.created).toLocaleString()})`,
          ignoreFocusOut: true,
        }
      );

      if (confirmSummary === "Show Preview") {
        // Show preview in a new document
        const previewDoc = await vscode.workspace.openTextDocument({
          content: `# PR/MR Preview\n\n**Title:** ${title}\n\n**Summary:**\n${summary}`,
          language: "markdown",
        });
        await vscode.window.showTextDocument(previewDoc, { preview: true });

        const proceedWithPreview = await vscode.window.showQuickPick(
          ["Use This Summary", "Cancel"],
          {
            placeHolder: "Proceed with this summary?",
            ignoreFocusOut: true,
          }
        );

        if (proceedWithPreview !== "Use This Summary") {
          return;
        }
      } else if (confirmSummary !== "Use This Summary") {
        return;
      }
    } else if (useExistingSummary === "Generate New Summary") {
      // Generate a new summary first
      await this.generateSummary();

      // Wait a moment to ensure the summary is saved
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Refresh and get the newly generated summary
      await this.refreshHistoryFromStorage();
      const recentHistory = await this._historyManager.getHistory();

      if (recentHistory.length === 0) {
        vscode.window.showErrorMessage("Failed to generate summary.");
        return;
      }

      const newSummary = recentHistory[0];
      title = `${this._selectedBranch!} → ${this._selectedTargetBranch!}`;
      summary = newSummary.summary;
    } else {
      // Custom title and description
      const customTitle = await vscode.window.showInputBox({
        prompt: "Enter PR/MR title",
        placeHolder: `${this._selectedBranch} → ${this._selectedTargetBranch}`,
        value: `${this._selectedBranch} → ${this._selectedTargetBranch}`,
        ignoreFocusOut: true,
      });

      if (!customTitle) return;

      const customSummary = await vscode.window.showInputBox({
        prompt: "Enter PR/MR description",
        placeHolder: "Describe the changes in this PR/MR...",
        ignoreFocusOut: true,
      });

      if (!customSummary) return;

      title = customTitle;
      summary = customSummary;
    }

    // Create the PR/MR
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Creating PR/MR manually...",
        cancellable: false,
      },
      async () => {
        return await this._autoPostService.manualPost(
          title,
          summary,
          this._selectedBranch!,
          this._selectedTargetBranch!
        );
      }
    );

    if (result.success) {
      const openAction = await vscode.window.showInformationMessage(
        `✅ PR/MR created successfully on ${result.platform}!`,
        "Open in Browser"
      );

      if (openAction === "Open in Browser" && result.url) {
        vscode.env.openExternal(vscode.Uri.parse(result.url));
      }
    } else {
      // Provide helpful error message and potential solutions
      const errorMessage = `❌ Failed to create PR/MR: ${result.error}`;

      if (
        result.error?.includes("push") ||
        result.error?.includes("does not exist")
      ) {
        const retryWithPush = await vscode.window.showErrorMessage(
          errorMessage,
          "Try Again",
          "Check Branch Status"
        );

        if (retryWithPush === "Try Again") {
          // Retry the manual post
          await this.manualPostPR();
        } else if (retryWithPush === "Check Branch Status") {
          // Show some helpful commands
          const action = await vscode.window.showInformationMessage(
            "Common solutions:\n• Make sure your branch is pushed to remote\n• Check that branch names are correct\n• Verify your GitHub/GitLab token permissions",
            "Open Terminal",
            "Refresh Branches"
          );

          if (action === "Open Terminal") {
            vscode.commands.executeCommand("workbench.action.terminal.new");
          } else if (action === "Refresh Branches") {
            await this.selectBranch();
          }
        }
      } else {
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  }

  /**
   * Refresh history from storage to ensure we have the latest data
   */
  private async refreshHistoryFromStorage(): Promise<void> {
    try {
      // Force refresh the history from storage
      const recentHistory = await this._historyManager.getHistory();
      this.updateHistoryDisplay(recentHistory);
    } catch (error) {
      console.error("Error refreshing history:", error);
    }
  }

  /**
   * Refresh commit preview
   */
  async refreshCommitPreview(): Promise<void> {
    if (this._selectedBranch && this._selectedTargetBranch) {
      await this.fetchCommitPreview(
        this._selectedBranch,
        this._selectedTargetBranch
      );
    } else {
      vscode.window.showInformationMessage(
        "Please select both source and target branches to see commit preview"
      );
    }
  }

  /**
   * Fetch commit preview data (called internally by tree provider)
   * Uses version counter to prevent race conditions from rapid branch switching
   */
  async fetchCommitPreview(
    sourceBranch: string,
    targetBranch: string
  ): Promise<void> {
    // Increment version to invalidate any in-flight requests
    const currentVersion = ++this._fetchVersion;

    try {
      // Get commits without diffs for preview (faster and smaller)
      const commitMessages = await GitHelper.getCommitMessagesWithDiff(
        sourceBranch,
        targetBranch,
        false, // no diffs for preview
        10 // limit to 10 commits for preview
      );

      // Only update if this is still the latest request (prevents race condition)
      if (currentVersion === this._fetchVersion) {
        this._treeProvider.updateCommitData(
          commitMessages,
          sourceBranch,
          targetBranch
        );
      }
    } catch (error) {
      // Only show error if this is still the latest request
      if (currentVersion === this._fetchVersion) {
        console.error("Error fetching commit preview:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this._treeProvider.showCommitPreviewError(errorMessage);
      }
    }
  }

  /**
   * Show detailed view of commits between branches
   */
  async showCommitDetails(): Promise<void> {
    if (!this._selectedBranch || !this._selectedTargetBranch) {
      vscode.window.showInformationMessage(
        "Please select both source and target branches first"
      );
      return;
    }

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Loading detailed commit information...",
          cancellable: false,
        },
        async () => {
          const commitMessagesWithDiff =
            await GitHelper.getCommitMessagesWithDiff(
              this._selectedBranch!,
              this._selectedTargetBranch!,
              true, // include diffs
              20 // more commits for detailed view
            );

          const content = `# Commits: ${this._selectedBranch} → ${
            this._selectedTargetBranch
          }

${commitMessagesWithDiff || "No commits found between these branches"}

---
*This preview shows the commits and changes that will be included in your PR summary.*
`;

          const document = await vscode.workspace.openTextDocument({
            content: content,
            language: "markdown",
          });

          await vscode.window.showTextDocument(document, {
            viewColumn: vscode.ViewColumn.Beside,
            preview: false,
          });
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load commit details: ${error}`);
    }
  }

  async refreshAvailableModels(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration("prSummary");
      const apiKey =
        config.get<string>("openaiApiKey") || process.env.OPENAI_API_KEY;

      if (!apiKey) {
        const selection = await vscode.window.showWarningMessage(
          "OpenAI API Key not configured. Please configure it first.",
          "Configure API Key"
        );
        if (selection === "Configure API Key") {
          await this.configureApiKey();
        }
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Refreshing OpenAI Models",
          cancellable: false,
        },
        async (progress) => {
          progress.report({
            increment: 0,
            message: "Fetching available models from OpenAI...",
          });

          const result = await ModelService.refreshAndUpdateModels(apiKey);

          if (result.success && result.models) {
            progress.report({
              increment: 100,
              message: "Models updated successfully!",
            });
            this._treeProvider.refresh();
            const selection = await vscode.window.showInformationMessage(
              `✅ Found ${
                result.models.length
              } available models: ${result.models.slice(0, 3).join(", ")}${
                result.models.length > 3 ? "..." : ""
              }`,
              "View Settings"
            );
            if (selection === "View Settings") {
              await vscode.commands.executeCommand("prSummary.openSettings");
            }
          } else {
            throw new Error(result.error || "Failed to update models");
          }
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to refresh models: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async selectModel(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration("prSummary");
      const apiKey =
        config.get<string>("openaiApiKey") || process.env.OPENAI_API_KEY;

      if (!apiKey) {
        const selection = await vscode.window.showWarningMessage(
          "OpenAI API Key not configured. Please configure it first.",
          "Configure API Key"
        );
        if (selection === "Configure API Key") {
          await this.configureApiKey();
        }
        return;
      }

      const currentModel = config.get<string>("defaultModel", "gpt-4o-mini");

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Loading Available Models",
          cancellable: false,
        },
        async (progress) => {
          progress.report({
            increment: 0,
            message: "Fetching models from OpenAI...",
          });

          const availableModels = await ModelService.getAvailableModels(apiKey);

          progress.report({
            increment: 100,
            message: "Models loaded!",
          });

          if (availableModels.length === 0) {
            const selection = await vscode.window.showWarningMessage(
              "No models available. Try refreshing the models list first.",
              "Refresh Models"
            );
            if (selection === "Refresh Models") {
              await this.refreshAvailableModels();
            }
            return;
          }

          const quickPick = vscode.window.createQuickPick();
          quickPick.title = "Select OpenAI Model";
          quickPick.placeholder =
            "Choose the model for generating PR summaries";

          // Create items with current selection marked
          quickPick.items = availableModels.map((model) => ({
            label: model,
            detail:
              model === currentModel ? "✅ Currently selected" : undefined,
            description: this.getModelDescription(model),
          }));

          quickPick.onDidChangeSelection(async (selection) => {
            if (selection[0]) {
              const selectedModel = selection[0].label;
              quickPick.hide();

              await config.update(
                "defaultModel",
                selectedModel,
                vscode.ConfigurationTarget.Global
              );
              vscode.window.showInformationMessage(
                `✅ Default model set to: ${selectedModel}`
              );
              this._treeProvider.refresh();
            }
          });

          quickPick.onDidHide(() => quickPick.dispose());
          quickPick.show();
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to load models: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private getModelDescription(model: string): string {
    // Provide helpful descriptions for common models
    const descriptions: { [key: string]: string } = {
      "gpt-4o": "🚀 Most capable, higher cost",
      "gpt-4o-mini": "⚡ Fast & cost-effective",
      "gpt-4-turbo": "🎯 High performance",
      "gpt-4": "🔍 High quality, slower",
      "gpt-3.5-turbo": "💨 Fast & affordable",
      "o1-preview": "🧠 Advanced reasoning",
      "o1-mini": "🧠 Reasoning optimized",
    };

    // Check for partial matches for models with versions/dates
    for (const [key, desc] of Object.entries(descriptions)) {
      if (model.includes(key)) {
        return desc;
      }
    }

    // Default descriptions based on model patterns
    if (model.includes("gpt-4")) return "🔍 GPT-4 family";
    if (model.includes("gpt-3.5")) return "💨 GPT-3.5 family";
    if (model.includes("o1")) return "🧠 o1 reasoning family";
    if (model.includes("o3")) return "⚡ o3 family";

    return "🤖 OpenAI model";
  }
}
