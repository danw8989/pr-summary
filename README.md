# 🚀 AI PR Summary Generator

**Automate your pull request documentation with AI!** Generate professional, comprehensive PR summaries from your Git commit history using OpenAI's powerful models.

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/InZarys.pr-summary)](https://marketplace.visualstudio.com/items?itemName=InZarys.pr-summary)
[![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/InZarys.pr-summary)](https://marketplace.visualstudio.com/items?itemName=InZarys.pr-summary)
[![Visual Studio Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/InZarys.pr-summary)](https://marketplace.visualstudio.com/items?itemName=InZarys.pr-summary)

## ✨ Why AI PR Summary?

- **⏱️ Save Hours Weekly**: Turn minutes of commit messages into professional PR summaries instantly
- **🎯 12 Professional Templates**: From bug fixes to infrastructure changes, choose the perfect format
- **🤖 AI-Powered**: Leverages OpenAI models to understand your code changes and generate meaningful descriptions
- **🔄 Auto-Post to GitHub/GitLab**: One-click generation and posting to your repositories
- **🎫 JIRA Integration**: Seamlessly link tickets to your PRs
- **📈 Built for Teams**: Standardize PR documentation across your organization

## 🎯 Key Features

### 🎨 **Smart Template System**

- **12 Professional Templates**: Short, Medium, Long, Thorough, Bug Fix, Feature Request, Documentation, Refactoring, Security Fix, Performance, Dependencies, Infrastructure
- **Custom Templates**: Create and manage your own templates with built-in editor
- **Context-Aware**: AI adapts descriptions based on selected template style

### 🔗 **Seamless Integrations**

- **GitHub & GitLab Auto-Post**: Generate and post PRs/MRs with one click
- **JIRA Ticket Linking**: Connect PRs to tickets automatically
- **Platform Detection**: Automatically detects GitHub vs GitLab (including self-hosted)

### ⚡ **Developer Experience**

- **Native VS Code Integration**: Dedicated Activity Bar panel with tree view
- **Intelligent Branch Selection**: Smart detection of main/master/develop branches
- **History Management**: View and reuse previously generated summaries
- **Markdown Preview**: Results open in VS Code's native markdown editor

### 🛡️ **Enterprise Ready**

- **Secure Token Storage**: Encrypted storage in VS Code settings
- **Team Configuration**: Standardized templates and settings
- **Self-Hosted Support**: Works with GitHub Enterprise and self-hosted GitLab

## ⚡ Quick Start

### Step 1: Install & Configure

1. **Install** from VS Code Marketplace
2. **Open** the PR Summary panel from Activity Bar
3. **Configure** your OpenAI API key (one-time setup)

### Step 2: Generate Your First PR Summary

1. **Select** your feature branch
2. **Choose** a template (or use default)
3. **Generate** your professional PR summary
4. **Auto-post** to GitHub/GitLab (optional)

### Step 3: Optional Integrations

- **JIRA**: Link tickets to PRs automatically
- **Custom Templates**: Create team-specific formats
- **History**: Access previously generated summaries

> 💡 **Pro Tip**: Use the "Auto-detect" PR state to automatically create drafts for WIP branches!

---

## 📋 Detailed Documentation

For complete setup instructions, advanced features, and troubleshooting, see the sections below:

### 🔧 Configuration

Access extension settings via Command Palette > "Preferences: Open Settings" and search for "PR Summary":

- `prSummary.openaiApiKey`: Your OpenAI API key
- `prSummary.defaultModel`: Default OpenAI model (gpt-4o, gpt-4o-mini)
- `prSummary.defaultTemplate`: Default template style
- `prSummary.autoPost.enabled`: Enable auto-posting to GitHub/GitLab
- `prSummary.github.token`: GitHub Personal Access Token
- `prSummary.gitlab.token`: GitLab Personal Access Token
- `prSummary.jiraUrl`: Your JIRA URL (e.g., https://yourcompany.atlassian.net)
- `prSummary.jiraEmail`: Your JIRA email address
- `prSummary.jiraApiToken`: Your JIRA API token

### 📚 Complete Feature Documentation

## Features

- **Native VS Code Tree View**: Integrated seamlessly into VS Code's Activity Bar with familiar tree-based navigation
- **Smart Branch Selection**: Choose both source and target branches with intelligent defaults (main/master/develop)
- **Multiple Template Styles**: Choose from 12 professionally-crafted templates including general styles (Short, Medium, Long, Thorough) and specialized templates (Bug Fix, Feature Request, Documentation, Refactoring, Security Fix, Performance, Dependencies, Infrastructure)
- **Custom Templates**: Create, edit, and manage your own custom templates with a built-in editor
- **Auto-Post to GitHub/GitLab**: Automatically create PRs/MRs after generating summaries with intelligent platform detection
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

## Auto-Post to GitHub/GitLab

**🚀 Massive Productivity Boost**: Automatically create PRs/MRs directly from VS Code after generating summaries!

### Features

- **Intelligent Platform Detection**: Automatically detects whether you're using GitHub or GitLab based on your remote URL
- **Secure Token Management**: Store GitHub/GitLab tokens securely in VS Code settings
- **Smart State Detection**: Choose between Ready for Review, Draft, or Auto-detect based on branch naming patterns
- **Connection Testing**: Verify your tokens and authentication before creating PRs/MRs
- **One-Click Creation**: Generate summary and create PR/MR in a single workflow
- **Direct Browser Opening**: Automatically open the created PR/MR in your browser

### Setup

#### GitHub Setup

1. **Generate Personal Access Token**:

   - Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
   - Click "Generate new token (classic)"
   - Select scopes: `repo` (for private repos) or `public_repo` (for public repos)
   - Copy the token (starts with `ghp_` or `github_pat_`)

2. **Configure in Extension**:
   - Open PR Summary tree view
   - Expand "Auto-Post Settings"
   - Click "Configure GitHub Token"
   - Paste your token and save

#### GitLab Setup

**Supports both GitLab.com and self-hosted/enterprise GitLab instances**

1. **Generate Personal Access Token**:

   - **For GitLab.com**: Go to GitLab Settings > Access Tokens
   - **For self-hosted GitLab**: Go to your GitLab instance > Settings > Access Tokens
   - Create token with `api` scope
   - Copy the token (starts with `glpat-`)

2. **Configure in Extension**:
   - Open PR Summary tree view
   - Expand "Auto-Post Settings"
   - Click "Configure GitLab Token"
   - Paste your token and save

**Note**: The extension automatically detects your GitLab instance URL from your git remote and uses the appropriate API endpoint. Works with:

- GitLab.com (gitlab.com)
- Self-hosted GitLab instances (git.company.com, gitlab.company.com, etc.)
- GitLab Enterprise with custom domains

### Usage

1. **Enable Auto-Post**: Click "Auto-Post to GitHub/GitLab" to toggle on
2. **Set Default State**: Choose your preferred PR/MR state:
   - **Ready for Review**: Creates PR/MR ready for team review
   - **Draft**: Creates draft PR/MR for work-in-progress
   - **Auto-detect**: Detects from branch name patterns (draft/, wip/, etc.)
3. **Test Connection**: Verify your setup works correctly
4. **Generate & Post**: Use normal summary generation - you'll be prompted to auto-post

### Auto-Detection Features

- **Platform Detection**: Automatically detects GitHub vs GitLab from your git remote URL
  - **GitHub**: Always github.com
  - **GitLab**: Supports gitlab.com and custom/self-hosted instances
- **Branch Patterns**: Auto-detects draft state from branch names like:
  - `draft/feature-name`
  - `wip/work-in-progress`
  - `temp/temporary-fix`
- **Title Generation**: Creates meaningful PR/MR titles from branch names
- **Repository Context**: Uses your current repository and branch information

### Security & Privacy

- **Local Storage**: Tokens are stored securely in VS Code's encrypted settings
- **No External Storage**: Tokens never leave your machine except for direct API calls
- **Scope Validation**: Extension validates token format and required permissions
- **Connection Testing**: Test authentication without creating actual PRs/MRs

### Workflow Integration

The auto-post feature integrates seamlessly with your existing workflow:

1. **Generate Summary**: Use any template to create your PR summary
2. **Review Content**: Summary opens in VS Code for review/editing
3. **Auto-Post Prompt**: Extension asks if you want to create the PR/MR
4. **One-Click Creation**: Confirm to automatically create and open in browser
5. **Continue Working**: Return to VS Code while PR/MR is live

This eliminates the manual steps of:

- Copying summary content
- Opening GitHub/GitLab in browser
- Creating new PR/MR
- Pasting title and description
- Setting draft/ready state

## Configuration

### Extension Settings

Access via Command Palette > "Preferences: Open Settings" and search for "PR Summary":

- `prSummary.openaiApiKey`: Your OpenAI API key
- `prSummary.defaultModel`: Default OpenAI model (gpt-4o, gpt-4o-mini)
- `prSummary.defaultTemplate`: Default template style
- `prSummary.autoPost.enabled`: Enable auto-posting to GitHub/GitLab
- `prSummary.github.token`: GitHub Personal Access Token
- `prSummary.gitlab.token`: GitLab Personal Access Token
- `prSummary.jiraUrl`: Your JIRA URL (e.g., https://yourcompany.atlassian.net)
- `prSummary.jiraEmail`: Your JIRA email address
- `prSummary.jiraApiToken`: Your JIRA API token

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

### Auto-Post Settings

- Enable/disable auto-posting to GitHub/GitLab
- Configure GitHub and GitLab tokens
- Test platform connections
- Set default PR/MR state (Ready, Draft, Auto-detect)

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

---

## 🌟 Ready to Transform Your PR Workflow?

**Install AI PR Summary Generator today** and experience the power of AI-driven PR documentation!

### What Our Users Say

> _"This extension has completely transformed how our team handles PR documentation. We've gone from spending hours on descriptions to generating professional summaries in seconds."_

> _"The JIRA integration and auto-posting features have streamlined our entire workflow. It's like having an AI assistant for code reviews."_

> _"12 different templates mean we always have the right format for any type of change. The custom templates feature is perfect for our compliance requirements."_

### 🆘 Need Help?

- 📖 **Documentation**: Comprehensive guides in this README
- 🐛 **Issues**: Report bugs on [GitHub Issues](https://github.com/danw8989/pr-summary/issues)
- 💡 **Feature Requests**: Suggest improvements via GitHub
- 🗨️ **Community**: Join discussions and share tips

### 🤝 Connect With Us

- **GitHub**: [danw8989/pr-summary](https://github.com/danw8989/pr-summary)
- **Marketplace**: [AI PR Summary Generator](https://marketplace.visualstudio.com/items?itemName=InZarys.pr-summary)
- **License**: MIT - Free for personal and commercial use

**Happy coding! 🎉**
