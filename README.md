# PR Summary Extension

Generate comprehensive PR summaries using OpenAI's models based on your Git commit history with VS Code's native interface.

## Features

- **Native VS Code Tree View**: Integrated seamlessly into VS Code's Activity Bar with familiar tree-based navigation
- **Smart Branch Selection**: Choose both source and target branches with intelligent defaults (main/master/develop)
- **Multiple Template Styles**: Choose from 12 professionally-crafted templates including general styles (Short, Medium, Long, Thorough) and specialized templates (Bug Fix, Feature Request, Documentation, Refactoring, Security Fix, Performance, Dependencies, Infrastructure)
- **Custom Templates**: Create, edit, and manage your own custom templates with a built-in editor
- **JIRA Integration**: Optional integration to link JIRA tickets to your PR summaries
- **History Management**: View and reuse your previously generated PR summaries
- **Native Document Display**: View results in VS Code's markdown editor with syntax highlighting
- **Configuration Management**: Easy setup and management of API keys and settings

## Getting Started

### Prerequisites

- A valid OpenAI API key
- Git repository with commits
- VS Code 1.96.2 or higher

### Installation

1. Install the extension from the VS Code marketplace
2. Open the PR Summary panel from the Activity Bar
3. Configure your OpenAI API key
4. Optionally configure JIRA integration

## Usage

### Access the Extension

The extension adds a **PR Summary** icon to your Activity Bar (left sidebar). Click it to open the tree view interface.

### Generate a PR Summary

1. **Click the PR Summary icon** in the Activity Bar to open the tree view
2. **Configure API Key**: If not set, click "OpenAI API Key: Not Set" to configure
3. **Select Source Branch**: Choose the feature branch you want to create a PR for
4. **Select Target Branch**: Choose the target branch (defaults to main/master/develop)
5. **Select Template**: Choose your preferred summary style
6. **Select JIRA Ticket** (Optional): Link a JIRA ticket if configured
7. **Generate PR Summary**: Click to create your summary
8. **View Results**: The summary opens in a new markdown document for easy copying

### Branch Selection Features

- **Intelligent Target Branch Detection**: Automatically detects and suggests main, master, develop, or dev branches
- **Visual Branch Picker**: Common target branches are highlighted as "Recommended"
- **Current Selection Display**: See your selected branches at a glance in the tree view

### JIRA Integration (Optional)

1. In the Configuration section, click "JIRA: Not Configured"
2. Enter your JIRA URL, email, and API token
3. Once configured, you can select JIRA tickets when generating summaries
4. Recent tickets are automatically loaded for easy selection

### View History

1. Expand the "Recent Summaries" section in the tree view
2. Click any previous summary to view it in a new document
3. Copy and reuse previous summaries as needed

### Custom Templates

- Create new custom templates with guided editor
- Edit or delete existing custom templates
- Templates appear in template selector alongside built-in options

## Configuration

### Extension Settings

Access via Command Palette > "Preferences: Open Settings" and search for "PR Summary":

- `prSummary.openaiApiKey`: Your OpenAI API key
- `prSummary.jiraUrl`: Your JIRA URL (e.g., https://yourcompany.atlassian.net)
- `prSummary.jiraEmail`: Your JIRA email address
- `prSummary.jiraApiToken`: Your JIRA API token
- `prSummary.defaultModel`: Default OpenAI model (gpt-4o, gpt-4o-mini)
- `prSummary.defaultTemplate`: Default template style (Short, Medium, Long, Thorough, Bug Fix, Feature Request, Documentation, Refactoring, Security Fix, Performance, Dependencies, Infrastructure)

### Quick Configuration

Use the tree view for quick setup:

- Click "OpenAI API Key: Not Set" to configure your API key
- Click "JIRA: Not Configured" to set up JIRA integration
- Click "Open Extension Settings" for advanced configuration

## Available Commands

Access these via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- `PR Summary: Generate PR Summary` - Generate a new PR summary
- `PR Summary: View History` - View previous summaries
- `PR Summary: Select JIRA Ticket` - Select a JIRA ticket for the PR
- `Configure OpenAI API Key` - Set up your OpenAI API key
- `Configure JIRA` - Set up JIRA integration
- `Select Source Branch` - Choose the branch to create PR from
- `Select Target Branch` - Choose the target branch for comparison
- `Select Template` - Choose summary template style
- `Create Custom Template` - Create a new custom template
- `Edit Custom Template` - Edit or delete existing custom templates

## How It Works

The extension:

1. **Analyzes Git History**: Compares your source branch against the target branch
2. **Extracts Commit Data**: Gets commit messages and optionally includes diffs
3. **Applies Template**: Uses your selected template style for formatting
4. **Generates Summary**: Sends data to OpenAI with structured prompts
5. **Displays Results**: Opens a formatted markdown document with your PR summary
6. **Saves History**: Automatically saves summaries for future reference

## Tree View Interface

The extension provides a clean, organized tree view with three main sections:

### Configuration

- OpenAI API Key status and configuration
- JIRA integration status and setup
- Quick access to extension settings

### PR Summary Generation

- Source branch selection
- Target branch selection with smart defaults
- JIRA ticket selection (when configured)
- Template style selection
- Generate summary action

### Recent Summaries

- View up to 10 recent summaries
- Click to reopen any previous summary
- Shows branch name, timestamp, and linked JIRA ticket

### Custom Templates

- Create new custom templates with guided editor
- Edit or delete existing custom templates
- Templates appear in template selector alongside built-in options

## Template Styles

### General Purpose Templates

- **Short**: Brief summary with key changes only
- **Medium**: Balanced summary with moderate detail (default)
- **Long**: Comprehensive summary with full context
- **Thorough**: Very detailed summary including potential impacts

### Specialized Templates

- **Bug Fix**: Structured format for bug fixes including root cause analysis and testing approach
- **Feature Request**: Feature-focused summary highlighting user benefits and implementation decisions
- **Documentation**: Optimized for documentation updates with target audience considerations
- **Refactoring**: Emphasizes code improvements while confirming functional equivalence
- **Security Fix**: Security-focused format addressing risks and mitigation strategies
- **Performance**: Performance optimization summary with metrics and benchmarking results
- **Dependencies**: Dependency update summary covering version changes and compatibility
- **Infrastructure**: DevOps and infrastructure changes with deployment considerations

These templates are based on [industry best practices for GitHub pull request templates](https://axolo.co/blog/p/part-3-github-pull-request-template) and provide structured guidance for different types of changes.

### Custom Templates

Create your own templates tailored to your team's specific needs:

1. **Create New Template**: Click "Create New Template" in the Custom Templates section
2. **Template Editor**: Use the built-in markdown editor with guided instructions
3. **Edit Templates**: Click any existing custom template to edit or delete it
4. **Team-Specific**: Perfect for organization-specific workflows, compliance requirements, or specialized processes

**Example Custom Template Use Cases:**

- QA-focused templates requiring specific testing scenarios
- Security review templates for sensitive changes
- Compliance templates for regulated industries
- Team-specific formatting and information requirements

Custom templates integrate seamlessly with the existing workflow and appear alongside built-in templates in the template selector.

## Troubleshooting

### Common Issues

1. **"Command not found" errors**: Restart VS Code after installation
2. **No branches found**: Ensure you're in a Git repository with commits
3. **API key errors**: Verify your OpenAI API key is valid and has credits
4. **JIRA connection issues**: Check your JIRA URL, email, and API token
5. **Invalid time value errors**: The extension automatically cleans up corrupted history data

### Getting Help

- Check the extension's output panel for detailed error messages
- Ensure your workspace contains a valid Git repository
- Verify network connectivity for OpenAI and JIRA API calls

## Privacy & Security

- API keys are stored securely in VS Code's encrypted storage
- Git data is sent only to OpenAI's API (not stored by the extension)
- JIRA credentials are encrypted and stored locally
- No telemetry or usage data is collected

## License

[MIT](LICENSE)

## Feedback and Contributions

Please submit issues and pull requests to the [GitHub repository](https://github.com/danw8989/pr-summary).
