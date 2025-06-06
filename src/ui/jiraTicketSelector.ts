import * as vscode from "vscode";
import { JiraHelper, JiraTicket } from "../utils/jiraHelper";

export class JiraTicketSelector {
  // Store the selected ticket for this instance
  private _selectedTicket: string | undefined;
  private readonly _context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
  }

  /**
   * Show the JIRA ticket selector using VS Code Quick Pick
   */
  public async show() {
    // Get configuration
    const config = vscode.workspace.getConfiguration("prSummary");
    const jiraUrl = config.get<string>("jiraUrl") || "";
    const jiraEmail = config.get<string>("jiraEmail") || "";
    const jiraApiToken = config.get<string>("jiraApiToken") || "";

    // Check if JIRA is configured
    if (!jiraUrl || !jiraEmail || !jiraApiToken) {
      const configureNow = "Configure Now";
      const response = await vscode.window.showErrorMessage(
        "JIRA is not configured. Please configure it in settings.",
        configureNow
      );

      if (response === configureNow) {
        vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "prSummary"
        );
      }
      return;
    }

    // Get project input
    const project = await vscode.window.showInputBox({
      prompt: "Enter JIRA project key (optional)",
      placeHolder: "Example: PROJ",
    });

    // Show progress indicator
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Loading JIRA tickets...",
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0 });

        try {
          // Create JIRA helper
          const jiraHelper = new JiraHelper(jiraUrl, jiraEmail, jiraApiToken);

          // Get tickets
          const tickets = await jiraHelper.getRecentTickets(project);

          if (tickets.length === 0) {
            vscode.window.showInformationMessage(
              `No JIRA tickets found${project ? ` for project ${project}` : ""}`
            );
            return;
          }

          progress.report({ increment: 100 });

          // Create QuickPick items
          const ticketItems = tickets.map((ticket) => ({
            label: ticket.key,
            description: ticket.summary,
            detail: `Status: ${ticket.status} | Type: ${
              ticket.type || "Unknown"
            } | Priority: ${ticket.priority || "Unknown"}`,
            ticket: ticket,
          }));

          // Show QuickPick
          const selection = await vscode.window.showQuickPick(ticketItems, {
            placeHolder: "Select a JIRA ticket",
            matchOnDescription: true,
            matchOnDetail: true,
          });

          if (selection) {
            const formattedTicket = `${selection.label}: ${selection.description}`;
            this._selectedTicket = formattedTicket; // Store on instance

            // Ask if user wants to open PR Summary panel
            const openPRSummary = "Open PR Summary";
            const response = await vscode.window.showInformationMessage(
              `Selected JIRA ticket: ${formattedTicket}`,
              openPRSummary
            );

            if (response === openPRSummary) {
              // Store the selected ticket in global state for use in PR summary generation
              await this._context.globalState.update(
                "selectedJiraTicket",
                formattedTicket
              );

              // Execute the PR summary command which now uses native UI
              await vscode.commands.executeCommand("pr-summary.generate");
            }
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            `Error loading JIRA tickets: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    );
  }

  /**
   * Get the currently selected JIRA ticket for this instance
   */
  public getSelectedTicket(): string | undefined {
    return this._selectedTicket;
  }
}
