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
      `<vscode-option value="${model}" ${
        model === defaultModel ? "selected" : ""
      }>${model}</vscode-option>`
  ).join("");

  // Generate template options HTML
  const templateOptionsHtml = templateOptions
    .map(
      (template) =>
        `<vscode-option value="${template}" ${
          template === defaultTemplate ? "selected" : ""
        }>${template}</vscode-option>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PR Summary Generator</title>
    <script type="module" src="toolkit.min.js"></script>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
        }
        vscode-text-field, vscode-text-area, vscode-dropdown {
            width: 100%;
            margin-bottom: 8px;
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
            margin-left: 10px;
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
        .custom-template-actions {
            display: flex;
            gap: 5px;
        }
        #customTemplatesList {
            margin-top: 10px;
            margin-bottom: 15px;
        }
        .toggle-section {
            display: flex;
            align-items: center;
            cursor: pointer;
            margin-bottom: 10px;
        }
        .toggle-section span {
            margin-left: 5px;
        }
        .flex-row {
            display: flex;
            align-items: center;
            gap: 10px;
        }
    </style>
</head>
<body>
    <h2>PR Summary Generator</h2>
    
    <div class="form-group">
        <label for="openaiApiKey">OpenAI API Key:</label>
        <vscode-text-field id="openaiApiKey" type="password" value="${openaiApiKey}"></vscode-text-field>
    </div>
    
    <div class="form-group">
        <label for="additionalPrompt">Additional Prompt (optional):</label>
        <vscode-text-area id="additionalPrompt" rows="4"></vscode-text-area>
    </div>
    
    <div class="form-group">
        <label for="jiraUrl">JIRA URL:</label>
        <vscode-text-field id="jiraUrl" value="${jiraUrl}"></vscode-text-field>
    </div>
    
    <div class="form-group">
        <label for="jiraEmail">JIRA Email:</label>
        <vscode-text-field id="jiraEmail" value="${jiraEmail}"></vscode-text-field>
    </div>
    
    <div class="form-group">
        <label for="jiraApiToken">JIRA API Token:</label>
        <vscode-text-field id="jiraApiToken" type="password" value="${jiraApiToken}"></vscode-text-field>
    </div>
    
    <div class="form-group">
        <label for="jiraTicket">JIRA Ticket (optional):</label>
        <div class="flex-row">
            <vscode-button id="selectJiraButton">Select JIRA Ticket</vscode-button>
            <div id="selectedJiraTicket" class="selected-jira-ticket">${jiraTicketDisplay}</div>
        </div>
    </div>
    
    <div class="form-group">
        <vscode-checkbox id="includeDiffs">Include Diffs</vscode-checkbox>
    </div>
    
    <div class="form-group">
        <label for="model">OpenAI Model:</label>
        <vscode-dropdown id="model">
            ${modelOptionsHtml}
        </vscode-dropdown>
    </div>
    
    <div class="form-group">
        <label for="template">Template Style:</label>
        <vscode-dropdown id="template">
            ${templateOptionsHtml}
        </vscode-dropdown>
    </div>
    
    <div class="form-group">
        <label for="sourceBranch">Source Branch:</label>
        <vscode-dropdown id="sourceBranch">
            <vscode-option value="">Loading branches...</vscode-option>
        </vscode-dropdown>
    </div>
    
    <div class="form-group">
        <label for="targetBranch">Target Branch:</label>
        <vscode-dropdown id="targetBranch">
            <vscode-option value="">Loading branches...</vscode-option>
        </vscode-dropdown>
    </div>
    
    <vscode-button id="generateButton" appearance="primary">Generate PR Summary</vscode-button>
    <div id="status"></div>
    
    <div class="output-section" id="outputSection" style="display: none;">
        <h3>Generated PR Title:</h3>
        <div class="flex-row">
            <vscode-text-area id="titleOutput" rows="2" readonly></vscode-text-area>
            <vscode-button id="copyTitleButton" appearance="secondary">Copy</vscode-button>
        </div>
        
        <h3>Generated PR Description:</h3>
        <div class="flex-row">
            <vscode-text-area id="descriptionOutput" rows="15" readonly></vscode-text-area>
            <vscode-button id="copyDescriptionButton" appearance="secondary">Copy</vscode-button>
        </div>
    </div>
    
    <div class="custom-templates-section">
        <div class="toggle-section" id="toggleCustomTemplates">
            <span>▶ Custom Templates</span>
        </div>
        <div id="customTemplatesContent" style="display: none;">
            <p>Create and manage your own custom templates:</p>
            
            <div class="form-group">
                <label for="customTemplateName">Template Name:</label>
                <vscode-text-field id="customTemplateName" placeholder="Enter a descriptive name"></vscode-text-field>
            </div>
            
            <div class="form-group">
                <label for="customTemplatePrompt">Template Prompt:</label>
                <vscode-text-area id="customTemplatePrompt" rows="4" placeholder="Enter your template instructions..."></vscode-text-area>
            </div>
            
            <vscode-button id="saveTemplateButton">Save Template</vscode-button>
            
            <h4>Your Custom Templates:</h4>
            <div id="customTemplatesList">
                <div class="custom-template-placeholder">No custom templates yet.</div>
            </div>
        </div>
    </div>
    
    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            
            // Wait for VS Code components to be defined
            function waitForComponents() {
                return new Promise((resolve) => {
                    if (customElements.get('vscode-button')) {
                        resolve();
                        return;
                    }
                    
                    const checkInterval = setInterval(() => {
                        if (customElements.get('vscode-button')) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 50);
                    
                    // Timeout after 5 seconds
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        resolve();
                    }, 5000);
                });
            }
            
            // Initialize the app when components are ready
            waitForComponents().then(() => {
                initializeApp();
            }).catch(() => {
                document.body.innerHTML = '<h2 style="color: var(--vscode-errorForeground);">Failed to load UI components. Please try reloading the page.</h2>';
            });
            
            function initializeApp() {
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
                const sourceBranchSelect = document.getElementById('sourceBranch');
                const targetBranchSelect = document.getElementById('targetBranch');
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
                    toggleCustomTemplatesButton.querySelector('span').textContent = isHidden ? '▼ Custom Templates' : '▶ Custom Templates';
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
                        
                        const deleteButton = document.createElement('vscode-button');
                        deleteButton.textContent = 'Delete';
                        deleteButton.setAttribute('appearance', 'secondary');
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
                        jiraApiToken: jiraApiTokenInput.value,
                        sourceBranch: sourceBranchSelect.value,
                        targetBranch: targetBranchSelect.value
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
                                const optionElement = document.createElement('vscode-option');
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
                            
                        case 'branchesLoaded':
                            populateBranchDropdowns(message.branches, message.currentBranch);
                            break;
                    }
                });
                
                // Request custom templates on load
                vscode.postMessage({
                    command: 'getCustomTemplates'
                });

                // Function to populate branch dropdowns
                function populateBranchDropdowns(branches, currentBranch) {
                    // Clear options
                    sourceBranchSelect.innerHTML = '';
                    targetBranchSelect.innerHTML = '';
                    
                    // Add default option for target branch
                    const defaultOption = document.createElement('vscode-option');
                    defaultOption.value = '';
                    targetBranchSelect.appendChild(defaultOption);
                    
                    // Add branches to dropdowns
                    branches.forEach(branch => {
                        // Source branch option
                        const sourceOption = document.createElement('vscode-option');
                        sourceOption.value = branch;
                        sourceOption.textContent = branch;
                        
                        // Select current branch by default for source
                        if (branch === currentBranch) {
                            sourceOption.selected = true;
                        }
                        
                        sourceBranchSelect.appendChild(sourceOption);
                        
                        // Target branch option (skip current branch)
                        const targetOption = document.createElement('vscode-option');
                        targetOption.value = branch;
                        targetOption.textContent = branch;
                        targetBranchSelect.appendChild(targetOption);
                    });
                }

                // Request branches on load
                vscode.postMessage({
                    command: 'getBranches'
                });
            }
        })();
    </script>
</body>
</html>`;
}
