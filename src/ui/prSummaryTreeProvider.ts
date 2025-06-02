import * as vscode from "vscode";
import { HistoryManager } from "../utils/historyManager";
import { TemplateManager } from "../utils/templateManager";
import { getMaskedConfigurationStatus } from "../utils/securityHelper";

export interface PrSummaryTreeItem {
  id: string;
  label: string;
  description?: string;
  contextValue?: string;
  iconPath?: vscode.ThemeIcon;
  command?: vscode.Command;
  children?: PrSummaryTreeItem[];
}

export class PrSummaryTreeProvider
  implements vscode.TreeDataProvider<PrSummaryTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    PrSummaryTreeItem | undefined | null | void
  > = new vscode.EventEmitter<PrSummaryTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    PrSummaryTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private _context: vscode.ExtensionContext;
  private _data: PrSummaryTreeItem[] = [];

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this.initializeTree();
    this.loadCustomTemplates();
    this.initializeDefaultBranches();
  }

  refresh(): void {
    this.initializeTree();
    this.loadCustomTemplates();
    this._onDidChangeTreeData.fire();
  }

  get data(): PrSummaryTreeItem[] {
    return this._data;
  }

  getTreeItem(element: PrSummaryTreeItem): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(
      element.label,
      element.children
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None
    );

    treeItem.description = element.description;
    treeItem.contextValue = element.contextValue;
    treeItem.iconPath = element.iconPath;
    treeItem.command = element.command;
    treeItem.id = element.id;

    return treeItem;
  }

  getChildren(element?: PrSummaryTreeItem): Thenable<PrSummaryTreeItem[]> {
    if (!element) {
      return Promise.resolve(this._data);
    }
    return Promise.resolve(element.children || []);
  }

  private initializeTree(): void {
    const config = vscode.workspace.getConfiguration("prSummary");
    const openaiApiKey =
      config.get<string>("openaiApiKey") || process.env.OPENAI_API_KEY;
    const hasApiKey = !!openaiApiKey;

    const jiraUrl = config.get<string>("jiraUrl") || process.env.JIRA_URL;
    const jiraEmail = config.get<string>("jiraEmail") || process.env.JIRA_EMAIL;
    const jiraApiToken =
      config.get<string>("jiraApiToken") || process.env.JIRA_API_TOKEN;
    const hasJiraConfig = !!(jiraUrl && jiraEmail && jiraApiToken);

    const includeDiffs = config.get<boolean>("includeDiffs", true);
    const additionalPrompt = config.get<string>("additionalPrompt", "");
    const currentModel = config.get<string>("defaultModel", "gpt-4o-mini");

    const autoPostEnabled = config.get<boolean>("autoPost.enabled", false);
    const autoPostState = config.get<string>("autoPost.defaultState", "ready");
    const githubToken = config.get<string>("github.token", "");
    const gitlabToken = config.get<string>("gitlab.token", "");

    // Map state values to display names
    const stateDisplayNames = {
      ready: "Ready for Review",
      draft: "Draft",
      auto: "Auto-detect",
    };

    // Check if we're ready to generate
    const canGenerate = hasApiKey;
    const hasBasicSetup = hasApiKey; // Can expand this logic later

    this._data = [
      // Main Action Section - Most prominent
      {
        id: "quickActions",
        label: "🚀 Quick Actions",
        iconPath: new vscode.ThemeIcon("rocket"),
        contextValue: "quickActionsSection",
        children: [
          {
            id: "generateSummary",
            label: canGenerate
              ? "✨ Generate PR Summary"
              : "⚠️ Configure API Key First",
            description: canGenerate ? "Ready to generate" : "Setup required",
            iconPath: new vscode.ThemeIcon(
              canGenerate ? "play-circle" : "warning"
            ),
            contextValue: "generateSummary",
            command: canGenerate
              ? {
                  command: "pr-summary.generatePrSummary",
                  title: "Generate Summary",
                }
              : {
                  command: "prSummary.configureApiKey",
                  title: "Configure API Key",
                },
          },
          {
            id: "openSettings",
            label: "⚙️ Extension Settings",
            description: "Quick access to all settings",
            iconPath: new vscode.ThemeIcon("settings-gear"),
            contextValue: "openSettings",
            command: {
              command: "prSummary.openSettings",
              title: "Open Settings",
            },
          },
        ],
      },

      // Setup Section - Clear status indicators
      {
        id: "setup",
        label: "📋 Setup & Configuration",
        iconPath: new vscode.ThemeIcon("checklist"),
        contextValue: "setupSection",
        children: [
          {
            id: "selectBranch",
            label: "📂 Source Branch",
            description: "Select your changes branch",
            iconPath: new vscode.ThemeIcon("git-branch"),
            contextValue: "selectBranch",
            command: {
              command: "prSummary.selectBranch",
              title: "Select Source Branch",
            },
          },
          {
            id: "selectTargetBranch",
            label: "🎯 Target Branch",
            description: "Select base/main branch",
            iconPath: new vscode.ThemeIcon("git-merge"),
            contextValue: "selectTargetBranch",
            command: {
              command: "prSummary.selectTargetBranch",
              title: "Select Target Branch",
            },
          },
          {
            id: "selectTemplate",
            label: "📝 Template",
            description: "Choose summary template",
            iconPath: new vscode.ThemeIcon("file-text"),
            contextValue: "selectTemplate",
            command: {
              command: "prSummary.selectTemplate",
              title: "Select Template",
            },
          },
          {
            id: "selectJira",
            label: "🔗 JIRA Ticket (Optional)",
            description: hasJiraConfig
              ? "Link to ticket"
              : "Configure JIRA first",
            iconPath: new vscode.ThemeIcon(
              hasJiraConfig ? "link" : "link-external"
            ),
            contextValue: "selectJira",
            command: hasJiraConfig
              ? {
                  command: "pr-summary.selectJiraTicket",
                  title: "Select JIRA Ticket",
                }
              : {
                  command: "prSummary.configureJira",
                  title: "Configure JIRA",
                },
          },
          {
            id: "refreshModels",
            label: "🔄 Refresh Available Models",
            description: hasApiKey
              ? "Update OpenAI models list"
              : "API key required",
            iconPath: new vscode.ThemeIcon("sync"),
            contextValue: "refreshModels",
            command: hasApiKey
              ? {
                  command: "prSummary.refreshAvailableModels",
                  title: "Refresh Available Models",
                }
              : {
                  command: "prSummary.configureApiKey",
                  title: "Configure API Key",
                },
          },
          {
            id: "selectModel",
            label: "🤖 Select OpenAI Model",
            description: hasApiKey
              ? "Choose from available models"
              : "API key required",
            iconPath: new vscode.ThemeIcon("list-selection"),
            contextValue: "selectModel",
            command: hasApiKey
              ? {
                  command: "prSummary.selectModel",
                  title: "Select Model",
                }
              : {
                  command: "prSummary.configureApiKey",
                  title: "Configure API Key",
                },
          },
        ],
      },

      // API Configuration
      {
        id: "apiConfig",
        label: "🔑 API Configuration",
        iconPath: new vscode.ThemeIcon("key"),
        contextValue: "apiConfigSection",
        children: [
          {
            id: "apiKeyStatus",
            label: "OpenAI API Key",
            description: hasApiKey ? "✅ Configured" : "❌ Not configured",
            iconPath: new vscode.ThemeIcon(hasApiKey ? "check-all" : "x"),
            contextValue: "apiKey",
            command: {
              command: "prSummary.configureApiKey",
              title: hasApiKey ? "Update API Key" : "Configure API Key",
            },
          },
          {
            id: "jiraStatus",
            label: "JIRA Integration",
            description: hasJiraConfig
              ? "✅ Configured"
              : "❌ Optional - Not configured",
            iconPath: new vscode.ThemeIcon(
              hasJiraConfig ? "check-all" : "circle"
            ),
            contextValue: "jiraConfig",
            command: {
              command: "prSummary.configureJira",
              title: hasJiraConfig ? "Update JIRA Config" : "Configure JIRA",
            },
          },
          {
            id: "currentModel",
            label: "Current Model",
            description: hasApiKey ? `🤖 ${currentModel}` : "❌ No API key",
            iconPath: new vscode.ThemeIcon(hasApiKey ? "list-selection" : "x"),
            contextValue: "currentModel",
            command: hasApiKey
              ? {
                  command: "prSummary.selectModel",
                  title: "Select Model",
                }
              : {
                  command: "prSummary.configureApiKey",
                  title: "Configure API Key",
                },
          },
        ],
      },

      // Generation Options
      {
        id: "options",
        label: "⚡ Generation Options",
        iconPath: new vscode.ThemeIcon("settings"),
        contextValue: "optionsSection",
        children: [
          {
            id: "toggleDiffs",
            label: "Include Code Diffs",
            description: includeDiffs ? "✅ Enabled" : "❌ Disabled",
            iconPath: new vscode.ThemeIcon(
              includeDiffs ? "diff" : "diff-ignored"
            ),
            contextValue: "toggleDiffs",
            command: {
              command: "prSummary.toggleDiffs",
              title: "Toggle Include Diffs",
            },
          },
          {
            id: "setAdditionalPrompt",
            label: "Custom Instructions",
            description: additionalPrompt
              ? "✏️ Custom prompt set"
              : "📄 Use default",
            iconPath: new vscode.ThemeIcon("edit"),
            contextValue: "setAdditionalPrompt",
            command: {
              command: "prSummary.setAdditionalPrompt",
              title: "Set Custom Instructions",
            },
          },
        ],
      },

      // Auto-Post Settings
      {
        id: "autoPost",
        label: "☁️ Auto-Post to GitHub/GitLab",
        iconPath: new vscode.ThemeIcon("cloud-upload"),
        contextValue: "autoPostSection",
        children: [
          {
            id: "autoPostEnabled",
            label: "Auto-Post Feature",
            description: autoPostEnabled ? "✅ Enabled" : "❌ Disabled",
            iconPath: new vscode.ThemeIcon(
              autoPostEnabled ? "check-all" : "circle"
            ),
            contextValue: "autoPostEnabled",
            command: {
              command: "prSummary.toggleAutoPost",
              title: "Toggle Auto-Post",
            },
          },
          {
            id: "configureGitHub",
            label: "GitHub Token",
            description: githubToken ? "✅ Configured" : "❌ Not configured",
            iconPath: new vscode.ThemeIcon("mark-github"),
            contextValue: "configureGitHub",
            command: {
              command: "prSummary.configureGitHub",
              title: "Configure GitHub",
            },
          },
          {
            id: "configureGitLab",
            label: "GitLab Token",
            description: gitlabToken ? "✅ Configured" : "❌ Not configured",
            iconPath: new vscode.ThemeIcon("gitlab"),
            contextValue: "configureGitLab",
            command: {
              command: "prSummary.configureGitLab",
              title: "Configure GitLab",
            },
          },
          {
            id: "autoPostState",
            label: "Default PR State",
            description:
              stateDisplayNames[
                autoPostState as keyof typeof stateDisplayNames
              ] || "Ready for Review",
            iconPath: new vscode.ThemeIcon("eye"),
            contextValue: "autoPostState",
            command: {
              command: "prSummary.selectAutoPostState",
              title: "Select Default State",
            },
          },
          {
            id: "testConnection",
            label: "Test Connection",
            description: "Verify GitHub/GitLab setup",
            iconPath: new vscode.ThemeIcon("debug-start"),
            contextValue: "testConnection",
            command: {
              command: "prSummary.testConnection",
              title: "Test Connection",
            },
          },
        ],
      },

      // Commit Preview
      {
        id: "commitPreview",
        label: "📊 Commit Preview",
        iconPath: new vscode.ThemeIcon("git-commit"),
        contextValue: "commitPreviewSection",
        children: [
          {
            id: "commitPreviewPlaceholder",
            label: "Select branches to preview commits",
            description: "Shows what will be included in PR",
            iconPath: new vscode.ThemeIcon("info"),
            contextValue: "commitPreviewPlaceholder",
          },
          {
            id: "refreshCommitPreview",
            label: "🔄 Refresh Preview",
            description: "Update commit list",
            iconPath: new vscode.ThemeIcon("refresh"),
            contextValue: "refreshCommitPreview",
            command: {
              command: "prSummary.refreshCommitPreview",
              title: "Refresh Commit Preview",
            },
          },
        ],
      },

      // Templates
      {
        id: "customTemplates",
        label: "📄 Custom Templates",
        iconPath: new vscode.ThemeIcon("file-text"),
        contextValue: "customTemplatesSection",
        children: [
          {
            id: "createCustomTemplate",
            label: "➕ Create New Template",
            description: "Add custom PR template",
            iconPath: new vscode.ThemeIcon("add"),
            contextValue: "createCustomTemplate",
            command: {
              command: "prSummary.createCustomTemplate",
              title: "Create Custom Template",
            },
          },
          {
            id: "templateInfo",
            label: "📋 Template Storage Info",
            description: "Manage template files",
            iconPath: new vscode.ThemeIcon("info"),
            contextValue: "templateInfo",
            command: {
              command: "prSummary.showTemplateInfo",
              title: "Show Template Info",
            },
          },
        ],
      },

      // History
      {
        id: "history",
        label: "📚 Recent Summaries",
        iconPath: new vscode.ThemeIcon("history"),
        contextValue: "historySection",
        children: [],
      },
    ];
  }

  updateHistory(summaries: any[]): void {
    const historySection = this._data.find((item) => item.id === "history");
    if (historySection) {
      historySection.children = summaries
        .slice(0, 10)
        .map((summary, index) => ({
          id: `history-${index}`,
          label: `${summary.timestamp} - ${summary.branch || "Unknown branch"}`,
          description: summary.jiraTicket || undefined,
          iconPath: new vscode.ThemeIcon("file"),
          contextValue: "historyItem",
          command: {
            command: "pr-summary.viewHistory",
            title: "View Summary",
            arguments: [summary],
          },
        }));
    }
    this._onDidChangeTreeData.fire();
  }

  updateSelection(
    type: "branch" | "targetBranch" | "jira" | "template",
    value: string
  ): void {
    const section = this._data.find((item) => item.id === "setup");
    if (!section?.children) return;

    let targetId: string;
    if (type === "branch") {
      targetId = "selectBranch";
    } else if (type === "targetBranch") {
      targetId = "selectTargetBranch";
    } else if (type === "jira") {
      targetId = "selectJira";
    } else if (type === "template") {
      targetId = "selectTemplate";
    } else {
      return;
    }

    const item = section.children.find((child) => child.id === targetId);

    if (item) {
      if (type === "branch") {
        item.description = `📂 ${value}`;
      } else if (type === "targetBranch") {
        item.description = `🎯 ${value}`;
      } else if (type === "jira") {
        item.description = `🔗 ${value}`;
      } else if (type === "template") {
        item.description = `📝 ${value}`;
      }
      this._onDidChangeTreeData.fire();
    }
  }

  private async loadCustomTemplates(): Promise<void> {
    const customTemplates = await TemplateManager.getCustomTemplates(
      this._context
    );
    this.updateCustomTemplates(customTemplates);
  }

  updateCustomTemplates(templates: any[]): void {
    const customTemplatesSection = this._data.find(
      (item) => item.id === "customTemplates"
    );
    if (customTemplatesSection) {
      customTemplatesSection.children = [
        {
          id: "createCustomTemplate",
          label: "Create New Template",
          iconPath: new vscode.ThemeIcon("add"),
          contextValue: "createCustomTemplate",
          command: {
            command: "prSummary.createCustomTemplate",
            title: "Create Custom Template",
          },
        },
        {
          id: "templateInfo",
          label: "Template Storage Info",
          iconPath: new vscode.ThemeIcon("info"),
          contextValue: "templateInfo",
          command: {
            command: "prSummary.showTemplateInfo",
            title: "Show Template Info",
          },
        },
        ...templates.map((template, index) => ({
          id: `customTemplate-${index}`,
          label: template.name,
          description: "Custom",
          iconPath: new vscode.ThemeIcon("file-text"),
          contextValue: "customTemplate",
          command: {
            command: "prSummary.editCustomTemplate",
            title: "Edit Custom Template",
            arguments: [template],
          },
        })),
      ];
    }
    this._onDidChangeTreeData.fire();
  }

  /**
   * Initialize default branch selections
   */
  private async initializeDefaultBranches(): Promise<void> {
    try {
      // This will be called by the commands handler when needed
      // to avoid circular dependencies
    } catch (error) {
      console.log("Could not initialize default branches:", error);
    }
  }

  /**
   * Update branch selections with defaults
   */
  async updateDefaultBranches(
    currentBranch?: string,
    defaultTarget?: string
  ): Promise<void> {
    const section = this._data.find((item) => item.id === "setup");
    if (!section?.children) return;

    // Update source branch if provided
    if (currentBranch) {
      const sourceBranchItem = section.children.find(
        (child) => child.id === "selectBranch"
      );
      if (
        sourceBranchItem &&
        sourceBranchItem.description === "Select your changes branch"
      ) {
        sourceBranchItem.description = `📂 ${currentBranch} (auto-detected)`;
      }
    }

    // Update target branch if provided
    if (defaultTarget) {
      const targetBranchItem = section.children.find(
        (child) => child.id === "selectTargetBranch"
      );
      if (
        targetBranchItem &&
        targetBranchItem.description === "Select base/main branch"
      ) {
        targetBranchItem.description = `🎯 ${defaultTarget} (auto-detected)`;
      }
    }

    this._onDidChangeTreeData.fire();
  }

  /**
   * Update commit preview when branches are selected
   */
  async updateCommitPreview(
    sourceBranch?: string,
    targetBranch?: string
  ): Promise<void> {
    const commitPreviewSection = this._data.find(
      (item) => item.id === "commitPreview"
    );
    if (!commitPreviewSection) return;

    // Always include refresh button
    const refreshButton = {
      id: "refreshCommitPreview",
      label: "🔄 Refresh Preview",
      description: "Update commit list",
      iconPath: new vscode.ThemeIcon("refresh"),
      contextValue: "refreshCommitPreview",
      command: {
        command: "prSummary.refreshCommitPreview",
        title: "Refresh Commit Preview",
      },
    };

    const viewDetailsButton = {
      id: "viewCommitDetails",
      label: "👁️ View Full Details",
      description: "Open detailed commit view",
      iconPath: new vscode.ThemeIcon("eye"),
      contextValue: "viewCommitDetails",
      command: {
        command: "prSummary.showCommitDetails",
        title: "Show Commit Details",
      },
    };

    if (!sourceBranch || !targetBranch) {
      // Reset to placeholder
      commitPreviewSection.children = [
        {
          id: "commitPreviewPlaceholder",
          label: "Select branches to preview commits",
          description: "Shows what will be included in PR",
          iconPath: new vscode.ThemeIcon("info"),
          contextValue: "commitPreviewPlaceholder",
        },
        refreshButton,
      ];
    } else {
      // Show loading state
      commitPreviewSection.children = [
        {
          id: "commitPreviewLoading",
          label: "🔄 Loading commit preview...",
          description: `Checking ${sourceBranch} → ${targetBranch}`,
          iconPath: new vscode.ThemeIcon("loading~spin"),
          contextValue: "commitPreviewLoading",
        },
        refreshButton,
      ];

      this._onDidChangeTreeData.fire();

      // Trigger the command to fetch commits (which will call updateCommitData)
      vscode.commands.executeCommand(
        "prSummary.fetchCommitPreview",
        sourceBranch,
        targetBranch
      );
    }

    this._onDidChangeTreeData.fire();
  }

  /**
   * Update the commit preview with actual commit data
   */
  updateCommitData(
    commitMessages: string,
    sourceBranch: string,
    targetBranch: string
  ): void {
    const commitPreviewSection = this._data.find(
      (item) => item.id === "commitPreview"
    );
    if (!commitPreviewSection) return;

    const refreshButton = {
      id: "refreshCommitPreview",
      label: "🔄 Refresh Preview",
      description: "Update commit list",
      iconPath: new vscode.ThemeIcon("refresh"),
      contextValue: "refreshCommitPreview",
      command: {
        command: "prSummary.refreshCommitPreview",
        title: "Refresh Commit Preview",
      },
    };

    const viewDetailsButton = {
      id: "viewCommitDetails",
      label: "👁️ View Full Details",
      description: "Open detailed commit view",
      iconPath: new vscode.ThemeIcon("eye"),
      contextValue: "viewCommitDetails",
      command: {
        command: "prSummary.showCommitDetails",
        title: "Show Commit Details",
      },
    };

    if (commitMessages && commitMessages.trim()) {
      const commits = commitMessages
        .trim()
        .split("\n\n")
        .filter((c: string) => c.trim());

      if (commits.length > 0) {
        commitPreviewSection.children = [
          {
            id: "commitPreviewInfo",
            label: `📊 ${commits.length} commit${
              commits.length === 1 ? "" : "s"
            } found`,
            description: `${sourceBranch} → ${targetBranch}`,
            iconPath: new vscode.ThemeIcon("git-commit"),
            contextValue: "commitPreviewInfo",
          },
          refreshButton,
          viewDetailsButton,
          ...commits.slice(0, 8).map((commit: string, index: number) => {
            // Take first line as commit title, truncate if too long
            const title = commit.split("\n")[0].substring(0, 80);
            return {
              id: `commitPreview-${index}`,
              label: title + (commit.length > 80 ? "..." : ""),
              iconPath: new vscode.ThemeIcon("git-commit"),
              contextValue: "commitPreviewItem",
              description: index === 0 ? "🆕 Latest" : `#${index + 1}`,
            };
          }),
          ...(commits.length > 8
            ? [
                {
                  id: "commitPreviewMore",
                  label: `📋 ... and ${commits.length - 8} more commits`,
                  description: "Click 'View Full Details' to see all",
                  iconPath: new vscode.ThemeIcon("ellipsis"),
                  contextValue: "commitPreviewMore",
                },
              ]
            : []),
        ];
      } else {
        commitPreviewSection.children = [
          {
            id: "commitPreviewEmpty",
            label: "❌ No commits found",
            description: "Branches are identical or invalid",
            iconPath: new vscode.ThemeIcon("warning"),
            contextValue: "commitPreviewEmpty",
          },
          refreshButton,
          viewDetailsButton,
        ];
      }
    } else {
      commitPreviewSection.children = [
        {
          id: "commitPreviewEmpty",
          label: "❌ No commits found",
          description: "Branches are identical or invalid",
          iconPath: new vscode.ThemeIcon("warning"),
          contextValue: "commitPreviewEmpty",
        },
        refreshButton,
        viewDetailsButton,
      ];
    }

    this._onDidChangeTreeData.fire();
  }

  /**
   * Show error in commit preview
   */
  showCommitPreviewError(error: string): void {
    const commitPreviewSection = this._data.find(
      (item) => item.id === "commitPreview"
    );
    if (!commitPreviewSection) return;

    const refreshButton = {
      id: "refreshCommitPreview",
      label: "🔄 Refresh Preview",
      description: "Update commit list",
      iconPath: new vscode.ThemeIcon("refresh"),
      contextValue: "refreshCommitPreview",
      command: {
        command: "prSummary.refreshCommitPreview",
        title: "Refresh Commit Preview",
      },
    };

    const viewDetailsButton = {
      id: "viewCommitDetails",
      label: "👁️ View Full Details",
      description: "Open detailed commit view",
      iconPath: new vscode.ThemeIcon("eye"),
      contextValue: "viewCommitDetails",
      command: {
        command: "prSummary.showCommitDetails",
        title: "Show Commit Details",
      },
    };

    commitPreviewSection.children = [
      {
        id: "commitPreviewError",
        label: `❌ Error: ${error}`,
        description: "Check branch names and try again",
        iconPath: new vscode.ThemeIcon("error"),
        contextValue: "commitPreviewError",
      },
      refreshButton,
      viewDetailsButton,
    ];

    this._onDidChangeTreeData.fire();
  }
}
