import * as vscode from "vscode";
import { JiraHelper, JiraTicket } from "../utils/jiraHelper";
import { PrSummaryPanel } from "./prSummaryPanel";

export class JiraTicketSelector {
  // Store the selected ticket for use in other parts of the extension
  private static selectedTicket: string | undefined;
  private static extensionContext: vscode.ExtensionContext | undefined;

  /**
   * Set the extension context
   */
  public static setContext(context: vscode.ExtensionContext) {
    this.extensionContext = context;
  }

  /**
   * Show the JIRA ticket selector using VS Code Quick Pick
   */
  public static async show() {
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
            this.selectedTicket = formattedTicket;

            // Ask if user wants to open PR Summary panel
            const openPRSummary = "Open PR Summary";
            const response = await vscode.window.showInformationMessage(
              `Selected JIRA ticket: ${formattedTicket}`,
              openPRSummary
            );

            if (response === openPRSummary) {
              // Open PR Summary with selected ticket
              if (this.extensionContext) {
                PrSummaryPanel.createOrShow(
                  this.extensionContext.extensionUri,
                  this.extensionContext,
                  formattedTicket
                );
              } else {
                vscode.window.showErrorMessage(
                  "Extension context not available"
                );
              }
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
   * Get the currently selected JIRA ticket
   */
  public static getSelectedTicket(): string | undefined {
    return this.selectedTicket;
  }
}
