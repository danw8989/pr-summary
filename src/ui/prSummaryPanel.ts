import * as vscode from "vscode";
import { OpenAIHelper, PrSummary } from "../utils/openAiHelper";
import { HistoryManager } from "../utils/historyManager";
import {
  TEMPLATE_PROMPTS,
  OPENAI_MODELS,
  TEMPLATE_OPTIONS,
} from "../constants";

export class PrSummaryPanel {
  public static currentPanel: PrSummaryPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _context: vscode.ExtensionContext;
  private _disposables: vscode.Disposable[] = [];
  private _jiraTicket: string | undefined;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._context = context;

    this._update();

    // Set up message handling
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "generateSummary":
            await this._generateSummary(
              message.openaiApiKey,
              message.additionalPrompt,
              message.includeDiffs,
              message.model,
              message.template
            );
            return;
          case "selectJiraTicket":
            this._selectJiraTicket(
              message.jiraUrl,
              message.jiraEmail,
              message.jiraApiToken
            );
            return;
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
   * Create or show the PR Summary panel
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (PrSummaryPanel.currentPanel) {
      PrSummaryPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      "prSummaryGenerator",
      "PR Summary Generator",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
      }
    );

    PrSummaryPanel.currentPanel = new PrSummaryPanel(
      panel,
      extensionUri,
      context
    );
  }

  /**
   * Close the panel
   */
  public dispose() {
    PrSummaryPanel.currentPanel = undefined;

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
    const openaiApiKey = config.get<string>("openaiApiKey", "");
    const jiraUrl = config.get<string>("jiraUrl", "");
    const jiraEmail = config.get<string>("jiraEmail", "");
    const jiraApiToken = config.get<string>("jiraApiToken", "");
    const defaultModel = config.get<string>("defaultModel", "o3-mini");
    const defaultTemplate = config.get<string>("defaultTemplate", "Medium");

    this._panel.webview.html = this._getHtmlForWebview(
      openaiApiKey,
      jiraUrl,
      jiraEmail,
      jiraApiToken,
      defaultModel,
      defaultTemplate
    );
  }

  /**
   * Generate the webview HTML
   */
  private _getHtmlForWebview(
    openaiApiKey: string,
    jiraUrl: string,
    jiraEmail: string,
    jiraApiToken: string,
    defaultModel: string,
    defaultTemplate: string
  ): string {
    const jiraTicketDisplay = this._jiraTicket || "";

    // Generate model options HTML
    const modelOptionsHtml = OPENAI_MODELS.map(
      (model) =>
        `<option value="${model}" ${
          model === defaultModel ? "selected" : ""
        }>${model}</option>`
    ).join("");

    // Generate template options HTML
    const templateOptionsHtml = TEMPLATE_OPTIONS.map(
      (template) =>
        `<option value="${template}" ${
          template === defaultTemplate ? "selected" : ""
        }>${template}</option>`
    ).join("");

    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PR Summary Generator</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 20px;
                    color: var(--vscode-foreground);
                }
                .form-group {
                    margin-bottom: 15px;
                }
                label {
                    display: block;
                    margin-bottom: 5px;
                }
                input[type="text"], input[type="password"], textarea, select {
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
                .copy-button {
                    margin-top: 5px;
                }
                .output-section {
                    margin-top: 20px;
                }
                #status {
                    margin-top: 10px;
                    font-style: italic;
                }
                .selected-jira-ticket {
                    margin-top: 5px;
                    font-style: italic;
                }
            </style>
        </head>
        <body>
            <h2>PR Summary Generator</h2>
            
            <div class="form-group">
                <label for="openaiApiKey">OpenAI API Key:</label>
                <input type="password" id="openaiApiKey" value="${openaiApiKey}" />
            </div>
            
            <div class="form-group">
                <label for="additionalPrompt">Additional Prompt (optional):</label>
                <textarea id="additionalPrompt" rows="4"></textarea>
            </div>
            
            <div class="form-group">
                <label for="jiraUrl">JIRA URL:</label>
                <input type="text" id="jiraUrl" value="${jiraUrl}" />
            </div>
            
            <div class="form-group">
                <label for="jiraEmail">JIRA Email:</label>
                <input type="text" id="jiraEmail" value="${jiraEmail}" />
            </div>
            
            <div class="form-group">
                <label for="jiraApiToken">JIRA API Token:</label>
                <input type="password" id="jiraApiToken" value="${jiraApiToken}" />
            </div>
            
            <div class="form-group">
                <label for="jiraTicket">JIRA Ticket (optional):</label>
                <div style="display: flex; align-items: center;">
                    <button id="selectJiraButton">Select JIRA Ticket</button>
                    <div id="selectedJiraTicket" class="selected-jira-ticket">${jiraTicketDisplay}</div>
                </div>
            </div>
            
            <div class="form-group">
                <label for="includeDiffs">
                    <input type="checkbox" id="includeDiffs" />
                    Include Diffs
                </label>
            </div>
            
            <div class="form-group">
                <label for="model">OpenAI Model:</label>
                <select id="model">
                    ${modelOptionsHtml}
                </select>
            </div>
            
            <div class="form-group">
                <label for="template">Template Style:</label>
                <select id="template">
                    ${templateOptionsHtml}
                </select>
            </div>
            
            <button id="generateButton">Generate PR Summary</button>
            <div id="status"></div>
            
            <div class="output-section" id="outputSection" style="display: none;">
                <h3>Generated PR Title:</h3>
                <div style="display: flex; align-items: center;">
                    <textarea id="titleOutput" rows="2" readonly></textarea>
                    <button class="copy-button" id="copyTitleButton">Copy</button>
                </div>
                
                <h3>Generated PR Description:</h3>
                <div style="display: flex; align-items: center;">
                    <textarea id="descriptionOutput" rows="15" readonly></textarea>
                    <button class="copy-button" id="copyDescriptionButton">Copy</button>
                </div>
            </div>
            
            <script>
                (function() {
                    // Elements
                    const openaiApiKeyInput = document.getElementById('openaiApiKey');
                    const additionalPromptInput = document.getElementById('additionalPrompt');
                    const jiraUrlInput = document.getElementById('jiraUrl');
                    const jiraEmailInput = document.getElementById('jiraEmail');
                    const jiraApiTokenInput = document.getElementById('jiraApiToken');
                    const selectJiraButton = document.getElementById('selectJiraButton');
                    const selectedJiraTicket = document.getElementById('selectedJiraTicket');
                    const includeDiffsCheckbox = document.getElementById('includeDiffs');
                    const modelSelect = document.getElementById('model');
                    const templateSelect = document.getElementById('template');
                    const generateButton = document.getElementById('generateButton');
                    const statusDiv = document.getElementById('status');
                    const outputSection = document.getElementById('outputSection');
                    const titleOutput = document.getElementById('titleOutput');
                    const descriptionOutput = document.getElementById('descriptionOutput');
                    const copyTitleButton = document.getElementById('copyTitleButton');
                    const copyDescriptionButton = document.getElementById('copyDescriptionButton');
                    
                    // Event listeners
                    generateButton.addEventListener('click', generateSummary);
                    selectJiraButton.addEventListener('click', selectJiraTicket);
                    copyTitleButton.addEventListener('click', () => copyToClipboard(titleOutput.value));
                    copyDescriptionButton.addEventListener('click', () => copyToClipboard(descriptionOutput.value));
                    
                    // Set initial JIRA ticket if we have one
                    selectedJiraTicket.textContent = '${jiraTicketDisplay}';
                    
                    // Function to generate summary
                    function generateSummary() {
                        // Validate inputs
                        if (!openaiApiKeyInput.value) {
                            statusDiv.textContent = 'Error: OpenAI API Key is required';
                            return;
                        }
                        
                        // Update status
                        statusDiv.textContent = 'Generating PR summary...';
                        generateButton.disabled = true;
                        
                        // Get form values
                        const formData = {
                            command: 'generateSummary',
                            openaiApiKey: openaiApiKeyInput.value,
                            additionalPrompt: additionalPromptInput.value,
                            includeDiffs: includeDiffsCheckbox.checked,
                            model: modelSelect.value,
                            template: templateSelect.value,
                            jiraTicket: selectedJiraTicket.textContent || undefined
                        };
                        
                        // Send message to extension
                        const vscode = acquireVsCodeApi();
                        vscode.postMessage(formData);
                    }
                    
                    // Function to select JIRA ticket
                    function selectJiraTicket() {
                        // Validate inputs
                        if (!jiraUrlInput.value) {
                            statusDiv.textContent = 'Error: JIRA URL is required';
                            return;
                        }
                        
                        // Send message to extension
                        const vscode = acquireVsCodeApi();
                        vscode.postMessage({
                            command: 'selectJiraTicket',
                            jiraUrl: jiraUrlInput.value,
                            jiraEmail: jiraEmailInput.value,
                            jiraApiToken: jiraApiTokenInput.value
                        });
                    }
                    
                    // Function to copy text to clipboard
                    function copyToClipboard(text) {
                        const vscode = acquireVsCodeApi();
                        vscode.postMessage({
                            command: 'copyToClipboard',
                            text: text
                        });
                    }
                    
                    // Handle messages from extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        
                        switch (message.type) {
                            case 'summaryGenerated':
                                // Update UI with generated summary
                                statusDiv.textContent = 'PR summary generated successfully';
                                titleOutput.value = message.title;
                                descriptionOutput.value = message.description;
                                outputSection.style.display = 'block';
                                generateButton.disabled = false;
                                break;
                                
                            case 'error':
                                // Display error
                                statusDiv.textContent = 'Error: ' + message.message;
                                generateButton.disabled = false;
                                break;
                                
                            case 'jiraTicketSelected':
                                // Update selected JIRA ticket
                                selectedJiraTicket.textContent = message.ticket;
                                break;
                        }
                    });
                })();
            </script>
        </body>
        </html>`;
  }

  /**
   * Generate PR summary
   */
  private async _generateSummary(
    openaiApiKey: string,
    additionalPrompt: string,
    includeDiffs: boolean,
    model: string,
    template: string
  ) {
    try {
      // Get template prompt
      const templatePrompt = TEMPLATE_PROMPTS[template];
      const fullPrompt = `${templatePrompt} ${additionalPrompt}`.trim();

      // Generate summary
      const summary = await OpenAIHelper.generatePrSummary(
        openaiApiKey,
        fullPrompt,
        includeDiffs,
        this._jiraTicket,
        model
      );

      // Save to history
      await HistoryManager.savePrSummary(
        this._context,
        summary.title,
        summary.description,
        template
      );

      // Send results back to webview
      this._panel.webview.postMessage({
        type: "summaryGenerated",
        title: summary.title,
        description: summary.description,
      });

      // Save configuration
      const config = vscode.workspace.getConfiguration("prSummary");
      await config.update("openaiApiKey", openaiApiKey, true);
      await config.update("defaultModel", model, true);
      await config.update("defaultTemplate", template, true);
    } catch (error) {
      // Send error message back to webview
      this._panel.webview.postMessage({
        type: "error",
        message: `${error}`,
      });
    }
  }

  /**
   * Open JIRA ticket selector
   */
  private _selectJiraTicket(
    jiraUrl: string,
    jiraEmail: string,
    jiraApiToken: string
  ) {
    // Save JIRA configuration
    const config = vscode.workspace.getConfiguration("prSummary");
    config.update("jiraUrl", jiraUrl, true);
    config.update("jiraEmail", jiraEmail, true);
    config.update("jiraApiToken", jiraApiToken, true);

    // Open ticket selector using command
    vscode.commands.executeCommand("pr-summary.selectJiraTicket");
  }

  /**
   * Set selected JIRA ticket
   */
  public setJiraTicket(ticket: string) {
    this._jiraTicket = ticket;

    // Send to webview
    if (this._panel) {
      this._panel.webview.postMessage({
        type: "jiraTicketSelected",
        ticket: ticket,
      });
    }
  }
}
