import * as vscode from "vscode";
import { HistoryManager, PrSummaryHistoryEntry } from "../utils/historyManager";

export class HistoryPanel {
  public static currentPanel: HistoryPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _context: vscode.ExtensionContext;
  private _disposables: vscode.Disposable[] = [];
  private _history: PrSummaryHistoryEntry[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._context = context;

    // Load history and update the panel
    this._loadHistoryAndUpdate();

    // Set up message handling
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "copyToClipboard":
            vscode.env.clipboard.writeText(message.text);
            vscode.window.showInformationMessage("Copied to clipboard");
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
   * Create or show the History panel
   */
  public static async createOrShow(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (HistoryPanel.currentPanel) {
      HistoryPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      "prSummaryHistory",
      "PR Summary History",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    HistoryPanel.currentPanel = new HistoryPanel(panel, extensionUri, context);
  }

  /**
   * Close the panel
   */
  public dispose() {
    HistoryPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Load history and update the panel
   */
  private async _loadHistoryAndUpdate() {
    this._history = await HistoryManager.getPrSummaryHistory(this._context);
    this._update();
  }

  /**
   * Update the panel content
   */
  private _update() {
    this._panel.webview.html = this._getHtmlForWebview();
  }

  /**
   * Generate the webview HTML
   */
  private _getHtmlForWebview(): string {
    // Create history items HTML
    const historyItemsHtml = this._history
      .map((entry, index) => {
        const date = new Date(entry.timestamp);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

        return `
            <div class="history-item" data-index="${index}">
                <div class="history-item-header">
                    <span class="history-item-date">${formattedDate}</span>
                    <span class="history-item-template">${entry.template}</span>
                </div>
                <div class="history-item-title">${entry.title}</div>
            </div>`;
      })
      .join("");

    // If no history, show a message
    const noHistoryHtml =
      this._history.length === 0
        ? '<div class="no-history">No PR summaries generated yet.</div>'
        : "";

    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PR Summary History</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 20px;
                    color: var(--vscode-foreground);
                    display: flex;
                    flex-direction: column;
                    height: 90vh;
                }
                .main-container {
                    display: flex;
                    flex-grow: 1;
                    margin-top: 20px;
                }
                .history-list {
                    width: 40%;
                    overflow-y: auto;
                    margin-right: 20px;
                    border: 1px solid var(--vscode-panel-border);
                }
                .details-panel {
                    width: 60%;
                    border: 1px solid var(--vscode-panel-border);
                    padding: 10px;
                    overflow-y: auto;
                }
                .history-item {
                    padding: 10px;
                    cursor: pointer;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                .history-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .history-item.selected {
                    background-color: var(--vscode-list-activeSelectionBackground);
                    color: var(--vscode-list-activeSelectionForeground);
                }
                .history-item-header {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.8em;
                    margin-bottom: 5px;
                }
                .history-item-title {
                    font-weight: bold;
                }
                .no-history {
                    padding: 10px;
                    font-style: italic;
                }
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 12px;
                    border-radius: 2px;
                    cursor: pointer;
                    margin-right: 10px;
                    margin-top: 10px;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .details-title, .details-description {
                    margin-top: 10px;
                }
                pre {
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
            </style>
        </head>
        <body>
            <h2>PR Summary History</h2>
            
            <div class="main-container">
                <div class="history-list">
                    ${noHistoryHtml}
                    ${historyItemsHtml}
                </div>
                
                <div class="details-panel" id="detailsPanel">
                    <div style="padding: 10px;">Select an item from the history to view details.</div>
                </div>
            </div>
            
            <script>
                (function() {
                    // Get history data
                    const history = ${JSON.stringify(this._history)};
                    
                    // Elements
                    const detailsPanel = document.getElementById('detailsPanel');
                    const historyItems = document.querySelectorAll('.history-item');
                    
                    // Add click event to history items
                    historyItems.forEach(item => {
                        item.addEventListener('click', () => {
                            // Clear previous selection
                            const previousSelected = document.querySelector('.history-item.selected');
                            if (previousSelected) {
                                previousSelected.classList.remove('selected');
                            }
                            
                            // Set new selection
                            item.classList.add('selected');
                            
                            // Get entry index
                            const index = parseInt(item.dataset.index);
                            const entry = history[index];
                            
                            // Update details panel
                            detailsPanel.innerHTML = \`
                                <div>
                                    <h3>PR Title</h3>
                                    <div class="details-title">
                                        <pre>\${entry.title}</pre>
                                        <button class="copy-button" onclick="copyToClipboard('\${encodeURIComponent(entry.title)}')">Copy Title</button>
                                    </div>
                                    
                                    <h3>PR Description</h3>
                                    <div class="details-description">
                                        <pre>\${entry.description}</pre>
                                        <button class="copy-button" onclick="copyToClipboard('\${encodeURIComponent(entry.description)}')">Copy Description</button>
                                    </div>
                                    
                                    <p>Template: \${entry.template}</p>
                                    <p>Generated: \${new Date(entry.timestamp).toLocaleString()}</p>
                                </div>
                            \`;
                        });
                    });
                    
                    // Copy to clipboard function
                    window.copyToClipboard = function(text) {
                        const decodedText = decodeURIComponent(text);
                        const vscode = acquireVsCodeApi();
                        vscode.postMessage({
                            command: 'copyToClipboard',
                            text: decodedText
                        });
                    };
                })();
            </script>
        </body>
        </html>`;
  }
}
