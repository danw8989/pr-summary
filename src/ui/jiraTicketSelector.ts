import * as vscode from "vscode";
import { JiraHelper, JiraTicket } from "../utils/jiraHelper";
import { PrSummaryPanel } from "./prSummaryPanel";

export class JiraTicketSelector {
  public static currentPanel: JiraTicketSelector | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._update();

    // Set up message handling
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "loadTickets":
            await this._loadTickets(
              message.jiraUrl,
              message.jiraEmail,
              message.jiraApiToken,
              message.project
            );
            return;
          case "selectTicket":
            this._selectTicket(message.ticket);
            return;
        }
      },
      null,
      this._disposables
    );

    // Handle panel being closed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  /**
   * Create or show the JIRA ticket selector panel
   */
  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (JiraTicketSelector.currentPanel) {
      JiraTicketSelector.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      "jiraTicketSelector",
      "Select JIRA Ticket",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    JiraTicketSelector.currentPanel = new JiraTicketSelector(
      panel,
      extensionUri
    );
  }

  /**
   * Close the panel
   */
  public dispose() {
    JiraTicketSelector.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Update the panel content
   */
  private _update() {
    const config = vscode.workspace.getConfiguration("prSummary");
    const jiraUrl = config.get<string>("jiraUrl", "");
    const jiraEmail = config.get<string>("jiraEmail", "");
    const jiraApiToken = config.get<string>("jiraApiToken", "");

    this._panel.webview.html = this._getHtmlForWebview(
      jiraUrl,
      jiraEmail,
      jiraApiToken
    );
  }

  /**
   * Generate the webview HTML
   */
  private _getHtmlForWebview(
    jiraUrl: string,
    jiraEmail: string,
    jiraApiToken: string
  ): string {
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Select JIRA Ticket</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 20px;
                    color: var(--vscode-foreground);
                    display: flex;
                    flex-direction: column;
                    height: 90vh;
                }
                .form-group {
                    margin-bottom: 15px;
                }
                label {
                    display: block;
                    margin-bottom: 5px;
                }
                input[type="text"] {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid var(--vscode-input-border);
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border-radius: 2px;
                }
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 12px;
                    border-radius: 2px;
                    cursor: pointer;
                    margin-right: 10px;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .main-container {
                    display: flex;
                    flex-grow: 1;
                    margin-top: 20px;
                }
                .tickets-list {
                    width: 40%;
                    border: 1px solid var(--vscode-panel-border);
                    overflow-y: auto;
                    margin-right: 20px;
                }
                .ticket-details {
                    width: 60%;
                    border: 1px solid var(--vscode-panel-border);
                    padding: 10px;
                    overflow-y: auto;
                }
                .ticket-item {
                    padding: 8px;
                    cursor: pointer;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                .ticket-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .ticket-item.selected {
                    background-color: var(--vscode-list-activeSelectionBackground);
                    color: var(--vscode-list-activeSelectionForeground);
                }
                .ticket-details pre {
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
                #status {
                    margin-top: 10px;
                    font-style: italic;
                }
            </style>
        </head>
        <body>
            <h2>Select JIRA Ticket</h2>
            
            <div class="filter-container">
                <div class="form-group">
                    <label for="projectKey">Project Key (optional):</label>
                    <input type="text" id="projectKey" placeholder="Enter project key (e.g. PROJ)" />
                </div>
                <button id="loadTicketsButton">Load Tickets</button>
                <div id="status"></div>
            </div>
            
            <div class="main-container">
                <div class="tickets-list" id="ticketsList">
                    <div style="padding: 10px;">No tickets loaded yet. Click "Load Tickets" to fetch JIRA tickets.</div>
                </div>
                
                <div class="ticket-details" id="ticketDetails">
                    <div style="padding: 10px;">Select a ticket to view details.</div>
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <button id="selectButton" disabled>Select Ticket</button>
            </div>
            
            <script>
                (function() {
                    // Elements
                    const projectKeyInput = document.getElementById('projectKey');
                    const loadTicketsButton = document.getElementById('loadTicketsButton');
                    const ticketsList = document.getElementById('ticketsList');
                    const ticketDetails = document.getElementById('ticketDetails');
                    const selectButton = document.getElementById('selectButton');
                    const statusDiv = document.getElementById('status');
                    
                    // State
                    let tickets = [];
                    let selectedTicket = null;
                    
                    // Event listeners
                    loadTicketsButton.addEventListener('click', loadTickets);
                    selectButton.addEventListener('click', selectTicket);
                    
                    // Function to load tickets
                    function loadTickets() {
                        statusDiv.textContent = 'Loading tickets...';
                        
                        const vscode = acquireVsCodeApi();
                        vscode.postMessage({
                            command: 'loadTickets',
                            jiraUrl: '${jiraUrl}',
                            jiraEmail: '${jiraEmail}',
                            jiraApiToken: '${jiraApiToken}',
                            project: projectKeyInput.value.trim()
                        });
                    }
                    
                    // Function to select a ticket item
                    function selectTicketItem(ticket, index) {
                        // Clear previous selection
                        const previousSelected = document.querySelector('.ticket-item.selected');
                        if (previousSelected) {
                            previousSelected.classList.remove('selected');
                        }
                        
                        // Set new selection
                        document.getElementById('ticket-' + index).classList.add('selected');
                        selectedTicket = ticket;
                        
                        // Update details panel
                        const details = document.createElement('div');
                        details.innerHTML = \`
                            <h3>\${ticket.key}: \${ticket.fields.summary}</h3>
                            <p><strong>Status:</strong> \${ticket.fields.status ? ticket.fields.status.name : 'Unknown'}</p>
                            <h4>Description:</h4>
                            <pre>\${ticket.fields.description || 'No description available.'}</pre>
                        \`;
                        ticketDetails.innerHTML = '';
                        ticketDetails.appendChild(details);
                        
                        // Enable select button
                        selectButton.disabled = false;
                    }
                    
                    // Function to select the ticket
                    function selectTicket() {
                        if (!selectedTicket) return;
                        
                        const vscode = acquireVsCodeApi();
                        vscode.postMessage({
                            command: 'selectTicket',
                            ticket: \`\${selectedTicket.key}: \${selectedTicket.fields.summary}\`
                        });
                    }
                    
                    // Handle messages from extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        
                        switch (message.type) {
                            case 'ticketsLoaded':
                                statusDiv.textContent = \`\${message.tickets.length} tickets loaded.\`;
                                tickets = message.tickets;
                                
                                // Clear tickets list
                                ticketsList.innerHTML = '';
                                
                                // Add ticket items
                                tickets.forEach((ticket, index) => {
                                    const item = document.createElement('div');
                                    item.id = 'ticket-' + index;
                                    item.className = 'ticket-item';
                                    item.textContent = \`\${ticket.key}: \${ticket.fields.summary}\`;
                                    item.addEventListener('click', () => selectTicketItem(ticket, index));
                                    ticketsList.appendChild(item);
                                });
                                
                                // Reset selection
                                selectedTicket = null;
                                ticketDetails.innerHTML = '<div style="padding: 10px;">Select a ticket to view details.</div>';
                                selectButton.disabled = true;
                                break;
                                
                            case 'error':
                                statusDiv.textContent = 'Error: ' + message.message;
                                break;
                                
                            case 'ticketSelected':
                                // Close the panel
                                // This will happen automatically when the command is executed
                                break;
                        }
                    });
                })();
            </script>
        </body>
        </html>`;
  }

  /**
   * Load JIRA tickets
   */
  private async _loadTickets(
    jiraUrl: string,
    jiraEmail: string,
    jiraApiToken: string,
    project?: string
  ) {
    try {
      const tickets = await JiraHelper.getJiraTickets(
        jiraUrl,
        jiraEmail,
        jiraApiToken,
        project
      );

      this._panel.webview.postMessage({
        type: "ticketsLoaded",
        tickets: tickets,
      });
    } catch (error) {
      this._panel.webview.postMessage({
        type: "error",
        message: `${error}`,
      });
    }
  }

  /**
   * Select a JIRA ticket
   */
  private _selectTicket(ticket: string) {
    // Pass the selected ticket to the PR Summary panel
    if (PrSummaryPanel.currentPanel) {
      PrSummaryPanel.currentPanel.setJiraTicket(ticket);
    }

    // Close the panel
    this.dispose();
  }
}
