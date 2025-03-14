import { OPENAI_MODELS, TEMPLATE_OPTIONS } from "../../constants";

/**
 * Generate the webview HTML for the PR Summary Panel
 */
export function getPrSummaryPanelHtml(
  openaiApiKey: string,
  jiraUrl: string,
  jiraEmail: string,
  jiraApiToken: string,
  defaultModel: string,
  defaultTemplate: string,
  jiraTicketDisplay: string = ""
): string {
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
