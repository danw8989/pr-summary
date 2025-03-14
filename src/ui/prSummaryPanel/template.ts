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
  jiraTicketDisplay: string = "",
  templateOptions: string[] = TEMPLATE_OPTIONS
): string {
  // Generate model options HTML
  const modelOptionsHtml = OPENAI_MODELS.map(
    (model) =>
      `<option value="${model}" ${
        model === defaultModel ? "selected" : ""
      }>${model}</option>`
  ).join("");

  // Generate template options HTML
  const templateOptionsHtml = templateOptions
    .map(
      (template) =>
        `<option value="${template}" ${
          template === defaultTemplate ? "selected" : ""
        }>${template}</option>`
    )
    .join("");

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
        .custom-templates-section {
            margin-top: 20px;
            border-top: 1px solid var(--vscode-panel-border);
            padding-top: 15px;
        }
        .custom-template-item {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }
        .custom-template-item span {
            flex: 1;
            margin-right: 10px;
        }
        .custom-template-actions button {
            padding: 4px 8px;
            margin-left: 5px;
        }
        #customTemplatesList {
            margin-top: 10px;
            margin-bottom: 15px;
        }
        .toggle-button {
            background: none;
            border: none;
            color: var(--vscode-textLink-foreground);
            padding: 0;
            cursor: pointer;
            font-size: 14px;
            margin-bottom: 10px;
        }
        .toggle-button:hover {
            color: var(--vscode-textLink-activeForeground);
            background: none;
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
    
    <div class="custom-templates-section">
        <button class="toggle-button" id="toggleCustomTemplates">▶ Custom Templates</button>
        <div id="customTemplatesContent" style="display: none;">
            <p>Create and manage your own custom templates:</p>
            
            <div class="form-group">
                <label for="customTemplateName">Template Name:</label>
                <input type="text" id="customTemplateName" placeholder="Enter a descriptive name" />
            </div>
            
            <div class="form-group">
                <label for="customTemplatePrompt">Template Prompt:</label>
                <textarea id="customTemplatePrompt" rows="4" placeholder="Enter your template instructions..."></textarea>
            </div>
            
            <button id="saveTemplateButton">Save Template</button>
            
            <h4>Your Custom Templates:</h4>
            <div id="customTemplatesList">
                <div class="custom-template-placeholder">No custom templates yet.</div>
            </div>
        </div>
    </div>
    
    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            
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
            
            // Custom template elements
            const toggleCustomTemplatesButton = document.getElementById('toggleCustomTemplates');
            const customTemplatesContent = document.getElementById('customTemplatesContent');
            const customTemplateNameInput = document.getElementById('customTemplateName');
            const customTemplatePromptInput = document.getElementById('customTemplatePrompt');
            const saveTemplateButton = document.getElementById('saveTemplateButton');
            const customTemplatesList = document.getElementById('customTemplatesList');
            
            // Event listeners
            generateButton.addEventListener('click', generateSummary);
            selectJiraButton.addEventListener('click', selectJiraTicket);
            copyTitleButton.addEventListener('click', () => copyToClipboard(titleOutput.value));
            copyDescriptionButton.addEventListener('click', () => copyToClipboard(descriptionOutput.value));
            
            // Custom template event listeners
            toggleCustomTemplatesButton.addEventListener('click', toggleCustomTemplatesSection);
            saveTemplateButton.addEventListener('click', saveCustomTemplate);
            
            // Set initial JIRA ticket if we have one
            selectedJiraTicket.textContent = '${jiraTicketDisplay}';
            
            // Function to toggle custom templates section
            function toggleCustomTemplatesSection() {
                const isHidden = customTemplatesContent.style.display === 'none';
                customTemplatesContent.style.display = isHidden ? 'block' : 'none';
                toggleCustomTemplatesButton.textContent = isHidden ? '▼ Custom Templates' : '▶ Custom Templates';
            }
            
            // Function to save a custom template
            function saveCustomTemplate() {
                const name = customTemplateNameInput.value.trim();
                const prompt = customTemplatePromptInput.value.trim();
                
                if (!name || !prompt) {
                    showStatus('Template name and prompt are required', true);
                    return;
                }
                
                // Send to extension
                vscode.postMessage({
                    command: 'saveCustomTemplate',
                    templateName: name,
                    templatePrompt: prompt
                });
                
                // Clear inputs
                customTemplateNameInput.value = '';
                customTemplatePromptInput.value = '';
            }
            
            // Function to render custom templates
            function renderCustomTemplates(templates) {
                customTemplatesList.innerHTML = '';
                
                if (templates.length === 0) {
                    customTemplatesList.innerHTML = '<div class="custom-template-placeholder">No custom templates yet.</div>';
                    return;
                }
                
                templates.forEach(template => {
                    const item = document.createElement('div');
                    item.className = 'custom-template-item';
                    
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = template.name;
                    
                    const actions = document.createElement('div');
                    actions.className = 'custom-template-actions';
                    
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete';
                    deleteButton.onclick = () => deleteCustomTemplate(template.name);
                    
                    actions.appendChild(deleteButton);
                    item.appendChild(nameSpan);
                    item.appendChild(actions);
                    
                    customTemplatesList.appendChild(item);
                });
            }
            
            // Function to delete a custom template
            function deleteCustomTemplate(name) {
                vscode.postMessage({
                    command: 'deleteCustomTemplate',
                    templateName: name
                });
            }
            
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
                
                // Send to extension
                vscode.postMessage({
                    command: 'generateSummary',
                    openaiApiKey: openaiApiKeyInput.value,
                    additionalPrompt: additionalPromptInput.value,
                    includeDiffs: includeDiffsCheckbox.checked,
                    model: modelSelect.value,
                    template: templateSelect.value,
                    jiraUrl: jiraUrlInput.value,
                    jiraEmail: jiraEmailInput.value,
                    jiraApiToken: jiraApiTokenInput.value
                });
            }
            
            // Function to select JIRA ticket
            function selectJiraTicket() {
                vscode.postMessage({
                    command: 'selectJiraTicket',
                    jiraUrl: jiraUrlInput.value,
                    jiraEmail: jiraEmailInput.value,
                    jiraApiToken: jiraApiTokenInput.value
                });
            }
            
            // Function to copy to clipboard
            function copyToClipboard(text) {
                vscode.postMessage({
                    command: 'copyToClipboard',
                    text: text
                });
            }
            
            // Function to show status
            function showStatus(message, isError = false) {
                statusDiv.textContent = message;
                statusDiv.style.color = isError ? 'var(--vscode-errorForeground)' : 'inherit';
            }
            
            // Handle messages from extension
            window.addEventListener('message', event => {
                const message = event.data;
                
                switch (message.type) {
                    case 'summaryGenerated':
                        // Enable button
                        generateButton.disabled = false;
                        
                        // Update outputs
                        titleOutput.value = message.title;
                        descriptionOutput.value = message.description;
                        
                        // Show output section
                        outputSection.style.display = 'block';
                        
                        // Clear status
                        statusDiv.textContent = 'PR summary generated successfully';
                        break;
                        
                    case 'error':
                        // Enable button
                        generateButton.disabled = false;
                        
                        // Show error
                        showStatus(message.message, true);
                        break;
                        
                    case 'jiraTicketSelected':
                        // Update selected ticket
                        selectedJiraTicket.textContent = message.ticket;
                        break;
                        
                    case 'templatesLoaded':
                        // Update template select options
                        templateSelect.innerHTML = '';
                        message.allOptions.forEach(option => {
                            const optionElement = document.createElement('option');
                            optionElement.value = option;
                            optionElement.textContent = option;
                            templateSelect.appendChild(optionElement);
                        });
                        
                        // Render custom templates
                        renderCustomTemplates(message.templates);
                        break;
                        
                    case 'templateSaved':
                        showStatus('Template "' + message.name + '" saved successfully');
                        break;
                        
                    case 'templateDeleted':
                        showStatus('Template "' + message.name + '" deleted successfully');
                        break;
                }
            });
            
            // Request custom templates on load
            vscode.postMessage({
                command: 'getCustomTemplates'
            });
        })();
    </script>
</body>
</html>`;
}
