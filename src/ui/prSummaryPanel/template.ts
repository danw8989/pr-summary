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
  jiraTicketDisplay: string = "", // This is now less relevant for initial display
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

  // Determine if core configuration is missing
  const isOpenAiConfigured = !!openaiApiKey;
  const isJiraConfigured = !!(jiraUrl && jiraEmail && jiraApiToken);
  const isConfigured = isOpenAiConfigured && isJiraConfigured;

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
            padding: 10px 20px; /* Reduced top/bottom padding */
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .section {
            margin-bottom: 20px;
        }
        .form-group {
            margin-bottom: 12px; /* Slightly reduced margin */
        }
        label {
            display: block;
            margin-bottom: 4px; /* Slightly reduced margin */
            font-weight: 600; /* Make labels slightly bolder */
        }
        vscode-text-field, vscode-text-area, vscode-dropdown {
            width: 100%;
            margin-bottom: 5px; /* Reduced margin */
        }
        vscode-divider {
            margin: 20px 0;
        }
        .output-section {
            margin-top: 20px;
        }
        #status {
            margin-top: 10px;
            font-style: italic;
            min-height: 1.2em; /* Reserve space for status */
        }
        .selected-jira-ticket {
            margin-top: 5px;
            font-style: italic;
            margin-left: 10px;
            color: var(--vscode-descriptionForeground); /* Use theme color */
        }
        .custom-template-item {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            padding: 5px;
            border-radius: 4px;
            background-color: var(--vscode-list-inactiveSelectionBackground); /* Subtle background */
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
        .flex-row {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        details > summary {
            cursor: pointer;
            font-weight: bold;
            margin-bottom: 10px;
            color: var(--vscode-textLink-foreground); /* Use link color for summary */
        }
        details > summary:hover {
            color: var(--vscode-textLink-activeForeground);
        }
        details[open] > summary {
            margin-bottom: 15px; /* More space when open */
        }
        .config-message {
            margin-bottom: 10px;
            padding: 8px;
            border-radius: 4px;
            background-color: var(--vscode-inputValidation-infoBackground);
            color: var(--vscode-inputValidation-infoForeground);
            border: 1px solid var(--vscode-inputValidation-infoBorder);
        }
        .error-message {
             background-color: var(--vscode-inputValidation-errorBackground);
             color: var(--vscode-inputValidation-errorForeground);
             border: 1px solid var(--vscode-inputValidation-errorBorder);
        }
        .success-message {
             background-color: var(--vscode-inputValidation-warningBackground); /* Using warning for success highlight */
             color: var(--vscode-inputValidation-warningForeground);
             border: 1px solid var(--vscode-inputValidation-warningBorder);
        }
        /* Add styles for codicon */
        .codicon {
            display: inline-block;
            vertical-align: text-bottom;
            /* You might need to link a codicon CSS file if not using built-in VS Code rendering */
        }
    </style>
</head>
<body>
    <h2>PR Summary Generator</h2>

    <details class="section" id="configSection">
        <summary>Configuration</summary>
        ${
          !isConfigured
            ? `<div class="config-message error-message">Configuration required. Please set API keys/details below or in VS Code settings.</div>`
            : ""
        }

        <div class="form-group">
            <label for="openaiApiKey">OpenAI API Key:</label>
            <vscode-text-field id="openaiApiKey" type="password" value="${openaiApiKey}"></vscode-text-field>
            ${
              !isOpenAiConfigured
                ? `<small>Required. Get from OpenAI.</small>`
                : ""
            }
        </div>

        <div class="form-group">
            <label for="jiraUrl">JIRA URL:</label>
            <vscode-text-field id="jiraUrl" value="${jiraUrl}" placeholder="e.g., https://your-domain.atlassian.net"></vscode-text-field>
        </div>

        <div class="form-group">
            <label for="jiraEmail">JIRA Email:</label>
            <vscode-text-field id="jiraEmail" value="${jiraEmail}" placeholder="Your JIRA login email"></vscode-text-field>
        </div>

        <div class="form-group">
            <label for="jiraApiToken">JIRA API Token:</label>
            <vscode-text-field id="jiraApiToken" type="password" value="${jiraApiToken}"></vscode-text-field>
             ${
               !isJiraConfigured && (jiraUrl || jiraEmail || jiraApiToken)
                 ? `<small>URL, Email, and Token required for JIRA integration.</small>`
                 : ""
             }
        </div>
         <vscode-button id="openSettingsButton">Open Extension Settings</vscode-button>
    </details>

    <vscode-divider></vscode-divider>

    <div class="section">
        <h3>Generation Options</h3>
        <div class="form-group">
            <label for="jiraTicket">JIRA Ticket (optional):</label>
            <div class="flex-row">
                <vscode-button id="selectJiraButton" ${
                  !isJiraConfigured ? "disabled" : ""
                }>Select JIRA Ticket</vscode-button>
                <div id="selectedJiraTicket" class="selected-jira-ticket"></div>
            </div>
             ${
               !isJiraConfigured
                 ? `<small>Configure JIRA above to enable selection.</small>`
                 : ""
             }
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
            <label for="additionalPrompt">Additional Prompt Instructions (optional):</label>
            <vscode-text-area id="additionalPrompt" rows="3" placeholder="e.g., Focus on UI changes"></vscode-text-area>
        </div>

        <div class="form-group">
            <vscode-checkbox id="includeDiffs">Include Diffs in context (more tokens)</vscode-checkbox>
        </div>
    </div>

    <vscode-divider></vscode-divider>

    <div class="section">
        <vscode-button id="generateButton" appearance="primary" ${
          !isOpenAiConfigured ? "disabled" : ""
        }>Generate PR Summary</vscode-button>
        ${
          !isOpenAiConfigured
            ? `<small style="margin-left: 10px;">OpenAI API Key required.</small>`
            : ""
        }
        <div id="status"></div>
    </div>

    <div class="output-section section" id="outputSection" style="display: none;">
        <vscode-divider></vscode-divider>
        <h3>Generated Summary</h3>
        <div class="form-group">
            <label for="titleOutput">Title:</label>
            <div class="flex-row">
                <vscode-text-area id="titleOutput" rows="2" readonly></vscode-text-area>
                <vscode-button id="copyTitleButton" appearance="secondary" title="Copy Title">
                    <span class="codicon codicon-copy"></span>
                </vscode-button>
            </div>
        </div>

        <div class="form-group">
            <label for="descriptionOutput">Description:</label>
             <div class="flex-row">
                <vscode-text-area id="descriptionOutput" rows="15" readonly></vscode-text-area>
                <vscode-button id="copyDescriptionButton" appearance="secondary" title="Copy Description">
                     <span class="codicon codicon-copy"></span>
                </vscode-button>
            </div>
        </div>
    </div>

    <vscode-divider></vscode-divider>

    <details class="section" id="customTemplatesSection">
         <summary>Custom Templates</summary>
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
             <div class="custom-template-placeholder">Loading...</div>
         </div>
    </details>

    <script>
        (function() {
            const vscode = acquireVsCodeApi();

            // --- Element Cache ---
            const elements = {
                openaiApiKeyInput: document.getElementById('openaiApiKey'),
                jiraUrlInput: document.getElementById('jiraUrl'),
                jiraEmailInput: document.getElementById('jiraEmail'),
                jiraApiTokenInput: document.getElementById('jiraApiToken'),
                selectJiraButton: document.getElementById('selectJiraButton'),
                selectedJiraTicket: document.getElementById('selectedJiraTicket'),
                includeDiffsCheckbox: document.getElementById('includeDiffs'),
                modelSelect: document.getElementById('model'),
                templateSelect: document.getElementById('template'),
                sourceBranchSelect: document.getElementById('sourceBranch'),
                targetBranchSelect: document.getElementById('targetBranch'),
                additionalPromptInput: document.getElementById('additionalPrompt'),
                generateButton: document.getElementById('generateButton'),
                statusDiv: document.getElementById('status'),
                outputSection: document.getElementById('outputSection'),
                titleOutput: document.getElementById('titleOutput'),
                descriptionOutput: document.getElementById('descriptionOutput'),
                copyTitleButton: document.getElementById('copyTitleButton'),
                copyDescriptionButton: document.getElementById('copyDescriptionButton'),
                customTemplateNameInput: document.getElementById('customTemplateName'),
                customTemplatePromptInput: document.getElementById('customTemplatePrompt'),
                saveTemplateButton: document.getElementById('saveTemplateButton'),
                customTemplatesList: document.getElementById('customTemplatesList'),
                openSettingsButton: document.getElementById('openSettingsButton')
                // Add other elements as needed
            };

            // --- Initial State ---
            const state = {
                isJiraConfigured: ${isJiraConfigured},
                isOpenAiConfigured: ${isOpenAiConfigured}
            };

            // --- Event Listeners ---
            function setupEventListeners() {
                elements.generateButton?.addEventListener('click', generateSummary);
                elements.selectJiraButton?.addEventListener('click', selectJiraTicket);
                elements.copyTitleButton?.addEventListener('click', () => copyToClipboard(elements.titleOutput.value));
                elements.copyDescriptionButton?.addEventListener('click', () => copyToClipboard(elements.descriptionOutput.value));
                elements.saveTemplateButton?.addEventListener('click', saveCustomTemplate);
                elements.openSettingsButton?.addEventListener('click', openSettings);

                // Add listeners for config inputs to potentially re-enable buttons if filled
                ['openaiApiKeyInput', 'jiraUrlInput', 'jiraEmailInput', 'jiraApiTokenInput'].forEach(id => {
                    elements[id]?.addEventListener('input', checkConfiguration);
                });

                window.addEventListener('message', handleExtensionMessage);
            }

             // --- Configuration Check ---
            function checkConfiguration() {
                state.isOpenAiConfigured = !!elements.openaiApiKeyInput.value;
                state.isJiraConfigured = !!(elements.jiraUrlInput.value && elements.jiraEmailInput.value && elements.jiraApiTokenInput.value);

                // Update button states based on config
                if (elements.generateButton) {
                    elements.generateButton.disabled = !state.isOpenAiConfigured;
                }
                 if (elements.selectJiraButton) {
                    elements.selectJiraButton.disabled = !state.isJiraConfigured;
                }
                // Maybe update config warning messages here too if needed
            }

            // --- Command Functions ---
            function generateSummary() {
                if (!state.isOpenAiConfigured) {
                    showStatus('Error: OpenAI API Key is required in Configuration section or VS Code settings.', 'error');
                    return;
                }
                showStatus('Generating PR summary...', 'info');
                elements.generateButton.disabled = true;

                vscode.postMessage({
                    command: 'generateSummary',
                    openaiApiKey: elements.openaiApiKeyInput.value,
                    additionalPrompt: elements.additionalPromptInput.value,
                    includeDiffs: elements.includeDiffsCheckbox.checked,
                    model: elements.modelSelect.value,
                    template: elements.templateSelect.value,
                    sourceBranch: elements.sourceBranchSelect.value,
                    targetBranch: elements.targetBranchSelect.value
                    // JIRA details are read from config by the extension if needed
                });
            }

            function selectJiraTicket() {
                 if (!state.isJiraConfigured) {
                    showStatus('Error: JIRA URL, Email, and API Token required in Configuration section or VS Code settings.', 'error');
                    return;
                }
                showStatus('Opening JIRA ticket selector...', 'info');
                vscode.postMessage({
                    command: 'selectJiraTicket',
                    // Send current values from panel in case they were just entered
                    jiraUrl: elements.jiraUrlInput.value,
                    jiraEmail: elements.jiraEmailInput.value,
                    jiraApiToken: elements.jiraApiTokenInput.value
                });
            }

            function copyToClipboard(text) {
                vscode.postMessage({ command: 'copyToClipboard', text: text });
                // The extension shows the confirmation message
            }

            function saveCustomTemplate() {
                const name = elements.customTemplateNameInput.value.trim();
                const prompt = elements.customTemplatePromptInput.value.trim();
                if (!name || !prompt) {
                    showStatus('Template name and prompt are required', 'error');
                    return;
                }
                vscode.postMessage({ command: 'saveCustomTemplate', templateName: name, templatePrompt: prompt });
                elements.customTemplateNameInput.value = '';
                elements.customTemplatePromptInput.value = '';
            }

             function deleteCustomTemplate(name) {
                vscode.postMessage({ command: 'deleteCustomTemplate', templateName: name });
            }

            function openSettings() {
                 vscode.postMessage({ command: 'openSettings' }); // Ask extension to open settings
            }

            // --- UI Update Functions ---
            function showStatus(message, type = 'info') { // types: info, error, success
                if (!elements.statusDiv) return;
                elements.statusDiv.textContent = message;
                elements.statusDiv.className = ''; // Clear previous classes
                if (type === 'error') {
                    elements.statusDiv.classList.add('config-message', 'error-message');
                } else if (type === 'success') {
                     elements.statusDiv.classList.add('config-message', 'success-message');
                } else {
                    elements.statusDiv.classList.add('config-message'); // Default info style
                }
            }

            function renderCustomTemplates(templates) {
                 if (!elements.customTemplatesList) return;
                 elements.customTemplatesList.innerHTML = ''; // Clear existing

                if (!templates || templates.length === 0) {
                    elements.customTemplatesList.innerHTML = '<div class="custom-template-placeholder">No custom templates yet.</div>';
                    return;
                }

                templates.forEach(template => {
                    const item = document.createElement('div');
                    item.className = 'custom-template-item';

                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = template.name;
                    nameSpan.title = template.prompt; // Show prompt on hover

                    const actions = document.createElement('div');
                    actions.className = 'custom-template-actions';

                    const deleteButton = document.createElement('vscode-button');
                    deleteButton.innerHTML = '<span class="codicon codicon-trash"></span>'; // Use icon
                    deleteButton.setAttribute('appearance', 'icon');
                    deleteButton.setAttribute('title', 'Delete Template');
                    deleteButton.onclick = () => deleteCustomTemplate(template.name);

                    actions.appendChild(deleteButton);
                    item.appendChild(nameSpan);
                    item.appendChild(actions);
                    elements.customTemplatesList.appendChild(item);
                });
            }

            function populateBranchDropdowns(branches, currentBranch) {
                if (!elements.sourceBranchSelect || !elements.targetBranchSelect) return;

                // Clear options
                elements.sourceBranchSelect.innerHTML = '';
                elements.targetBranchSelect.innerHTML = '';

                // Add default empty option for target branch
                const defaultOption = document.createElement('vscode-option');
                defaultOption.value = '';
                defaultOption.textContent = 'Select target branch...';
                elements.targetBranchSelect.appendChild(defaultOption);

                // Add branches
                if (branches.length > 0) {
                    // Always select the first branch for source (which is current branch)
                    let isFirstBranch = true;
                    
                    branches.forEach(branch => {
                        const sourceOption = document.createElement('vscode-option');
                        sourceOption.value = branch;
                        sourceOption.textContent = branch;
                        
                        // If it's the first branch or matches current branch
                        if (isFirstBranch || branch === currentBranch) {
                            sourceOption.selected = true;
                            isFirstBranch = false;
                        }
                        elements.sourceBranchSelect.appendChild(sourceOption);

                        const targetOption = document.createElement('vscode-option');
                        targetOption.value = branch;
                        targetOption.textContent = branch;
                        elements.targetBranchSelect.appendChild(targetOption);
                    });
                }
            }

            // --- Message Handling ---
            function handleExtensionMessage(event) {
                const message = event.data;
                switch (message.type) {
                    case 'summaryGenerated':
                        elements.generateButton.disabled = false;
                        elements.titleOutput.value = message.title;
                        elements.descriptionOutput.value = message.description;
                        elements.outputSection.style.display = 'block';
                        showStatus('PR summary generated successfully.', 'success');
                        break;
                    case 'error':
                        elements.generateButton.disabled = false;
                        showStatus(message.message, 'error');
                        break;
                    case 'jiraTicketSelected':
                        elements.selectedJiraTicket.textContent = message.ticket;
                        showStatus('JIRA ticket selected.', 'info');
                        break;
                    case 'templatesLoaded':
                        // Update template select options
                        if (elements.templateSelect) {
                            const currentTemplateValue = elements.templateSelect.value;
                            elements.templateSelect.innerHTML = '';
                            message.allOptions.forEach(option => {
                                const optionElement = document.createElement('vscode-option');
                                optionElement.value = option;
                                optionElement.textContent = option;
                                if (option === currentTemplateValue) {
                                    optionElement.selected = true; // Preserve selection
                                }
                                elements.templateSelect.appendChild(optionElement);
                            });
                         }
                        // Render custom templates list
                        renderCustomTemplates(message.templates);
                        break;
                    case 'templateSaved':
                        showStatus('Template "' + message.name + '" saved successfully.', 'success');
                        // The extension sends 'templatesLoaded' automatically after save/delete
                        break;
                    case 'templateDeleted':
                        showStatus('Template "' + message.name + '" deleted successfully.', 'success');
                        // The extension sends 'templatesLoaded' automatically
                        break;
                    case 'branchesLoaded':
                        populateBranchDropdowns(message.branches, message.currentBranch);
                        break;
                }
            }

            // --- Initialization ---
            function initializeApp() {
                console.log("Initializing PR Summary Panel UI...");
                if (!elements.generateButton) {
                     console.error("UI components not found. Initialization failed.");
                     document.body.innerHTML = '<h2 style="color: var(--vscode-errorForeground);">Error: Failed to initialize UI. Please try reloading the webview.</h2>';
                     return;
                }
                setupEventListeners();
                checkConfiguration(); // Set initial button states

                // Request initial data
                vscode.postMessage({ command: 'getCustomTemplates' });
                vscode.postMessage({ command: 'getBranches' });
                console.log("PR Summary Panel UI Initialized.");
            }

            // Wait for toolkit components to be ready before initializing
             if (customElements.get('vscode-button')) {
                 initializeApp();
             } else {
                 window.addEventListener('load', initializeApp); // Fallback if components load later
             }

        })();
    </script>
</body>
</html>`;
}
