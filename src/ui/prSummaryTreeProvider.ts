import * as vscode from "vscode";
import { TemplateManager } from "../utils/templateManager";

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
    const hasApiKey =
      config.get<string>("openaiApiKey") || process.env.OPENAI_API_KEY;
    const hasJiraConfig =
      (config.get<string>("jiraUrl") || process.env.JIRA_URL) &&
      (config.get<string>("jiraEmail") || process.env.JIRA_EMAIL) &&
      (config.get<string>("jiraApiToken") || process.env.JIRA_API_TOKEN);

    const includeDiffs = config.get<boolean>("includeDiffs", true);
    const additionalPrompt = config.get<string>("additionalPrompt", "");

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

    this._data = [
      {
        id: "configuration",
        label: "Configuration",
        iconPath: new vscode.ThemeIcon("gear"),
        contextValue: "configSection",
        children: [
          {
            id: "apiKeyStatus",
            label: hasApiKey
              ? "OpenAI API Key: Configured"
              : "OpenAI API Key: Not Set",
            iconPath: new vscode.ThemeIcon(hasApiKey ? "check" : "warning"),
            contextValue: "apiKey",
            command: !hasApiKey
              ? {
                  command: "prSummary.configureApiKey",
                  title: "Configure API Key",
                }
              : undefined,
          },
          {
            id: "jiraStatus",
            label: hasJiraConfig ? "JIRA: Configured" : "JIRA: Not Configured",
            iconPath: new vscode.ThemeIcon(hasJiraConfig ? "check" : "info"),
            contextValue: "jiraConfig",
            command: !hasJiraConfig
              ? {
                  command: "prSummary.configureJira",
                  title: "Configure JIRA",
                }
              : undefined,
          },
          {
            id: "openSettings",
            label: "Open Extension Settings",
            iconPath: new vscode.ThemeIcon("settings"),
            contextValue: "openSettings",
            command: {
              command: "prSummary.openSettings",
              title: "Open Settings",
            },
          },
        ],
      },
      {
        id: "generation",
        label: "PR Summary Generation",
        iconPath: new vscode.ThemeIcon("git-pull-request"),
        contextValue: "generationSection",
        children: [
          {
            id: "selectBranch",
            label: "Select Source Branch",
            iconPath: new vscode.ThemeIcon("git-branch"),
            contextValue: "selectBranch",
            command: {
              command: "prSummary.selectBranch",
              title: "Select Branch",
            },
          },
          {
            id: "selectTargetBranch",
            label: "Select Target Branch",
            iconPath: new vscode.ThemeIcon("git-merge"),
            contextValue: "selectTargetBranch",
            command: {
              command: "prSummary.selectTargetBranch",
              title: "Select Target Branch",
            },
          },
          {
            id: "selectJira",
            label: "Select JIRA Ticket (Optional)",
            iconPath: new vscode.ThemeIcon("link"),
            contextValue: "selectJira",
            command: hasJiraConfig
              ? {
                  command: "pr-summary.selectJiraTicket",
                  title: "Select JIRA Ticket",
                }
              : undefined,
          },
          {
            id: "selectTemplate",
            label: "Select Template",
            iconPath: new vscode.ThemeIcon("file-text"),
            contextValue: "selectTemplate",
            command: {
              command: "prSummary.selectTemplate",
              title: "Select Template",
            },
          },
          {
            id: "generateSummary",
            label: "Generate PR Summary",
            iconPath: new vscode.ThemeIcon("play"),
            contextValue: "generateSummary",
            command: hasApiKey
              ? {
                  command: "pr-summary.generatePrSummary",
                  title: "Generate Summary",
                }
              : undefined,
          },
        ],
      },
      {
        id: "options",
        label: "Generation Options",
        iconPath: new vscode.ThemeIcon("settings-gear"),
        contextValue: "optionsSection",
        children: [
          {
            id: "toggleDiffs",
            label: "Include Code Diffs",
            description: includeDiffs ? "Enabled" : "Disabled",
            iconPath: new vscode.ThemeIcon(
              includeDiffs ? "check" : "circle-slash"
            ),
            contextValue: "toggleDiffs",
            command: {
              command: "prSummary.toggleDiffs",
              title: "Toggle Include Diffs",
            },
          },
          {
            id: "setAdditionalPrompt",
            label: "Custom Prompt Instructions",
            description: additionalPrompt ? "Set" : "None",
            iconPath: new vscode.ThemeIcon("edit"),
            contextValue: "setAdditionalPrompt",
            command: {
              command: "prSummary.setAdditionalPrompt",
              title: "Set Additional Prompt",
            },
          },
        ],
      },
      {
        id: "autoPost",
        label: "Auto-Post Settings",
        iconPath: new vscode.ThemeIcon("cloud-upload"),
        contextValue: "autoPostSection",
        children: [
          {
            id: "autoPostEnabled",
            label: "Auto-Post to GitHub/GitLab",
            description: autoPostEnabled ? "Enabled" : "Disabled",
            iconPath: new vscode.ThemeIcon(
              autoPostEnabled ? "check" : "circle-slash"
            ),
            contextValue: "autoPostEnabled",
            command: {
              command: "prSummary.toggleAutoPost",
              title: "Toggle Auto-Post",
            },
          },
          {
            id: "configureGitHub",
            label: "Configure GitHub Token",
            description: githubToken ? "Configured" : "Not configured",
            iconPath: new vscode.ThemeIcon("mark-github"),
            contextValue: "configureGitHub",
            command: {
              command: "prSummary.configureGitHub",
              title: "Configure GitHub",
            },
          },
          {
            id: "configureGitLab",
            label: "Configure GitLab Token",
            description: gitlabToken ? "Configured" : "Not configured",
            iconPath: new vscode.ThemeIcon("gitlab"),
            contextValue: "configureGitLab",
            command: {
              command: "prSummary.configureGitLab",
              title: "Configure GitLab",
            },
          },
          {
            id: "testConnection",
            label: "Test Connection",
            iconPath: new vscode.ThemeIcon("debug-start"),
            contextValue: "testConnection",
            command: {
              command: "prSummary.testConnection",
              title: "Test Connection",
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
        ],
      },
      {
        id: "customTemplates",
        label: "Custom Templates",
        iconPath: new vscode.ThemeIcon("file-text"),
        contextValue: "customTemplatesSection",
        children: [
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
        ],
      },
      {
        id: "history",
        label: "Recent Summaries",
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
    const section = this._data.find((item) => item.id === "generation");
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
      item.description = value;
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
}
