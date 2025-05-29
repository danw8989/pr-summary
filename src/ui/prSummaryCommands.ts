import * as vscode from "vscode";
import { GitHelper } from "../utils/gitHelper";
import { JiraHelper } from "../utils/jiraHelper";
import { OpenAIHelper } from "../utils/openAiHelper";
import { TemplateManager, CustomTemplate } from "../utils/templateManager";
import { HistoryManager } from "../utils/historyManager";
import { PrSummaryTreeProvider } from "./prSummaryTreeProvider";
import { PrSummaryResultProvider } from "./prSummaryResultsView";
import { AutoPostService } from "../services/AutoPostService";
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

          // Auto-post integration
          const title = `${this._selectedBranch} → ${this._selectedTargetBranch}`;
          await this.autoPostAfterGeneration(title, summaryData.summary);
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
      placeHolder: "ghp_...",
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value) return "Token is required";
        if (!value.startsWith("ghp_") && !value.startsWith("github_pat_")) {
          return "Invalid GitHub token format";
        }
        return null;
      },
    });

    if (token) {
      const config = vscode.workspace.getConfiguration("prSummary");
      await config.update(
        "github.token",
        token,
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
      vscode.window.showErrorMessage("No target branch selected");
      return;
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
}
