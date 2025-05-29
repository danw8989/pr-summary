import * as vscode from "vscode";

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
  }

  refresh(): void {
    this.initializeTree();
    this._onDidChangeTreeData.fire();
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
}
