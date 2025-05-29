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

Access extension settings via Command Palette > "Preferences: Open Settings" and search for "PR Summary", or use the quick configuration options in the extension's Tree View:

- **OpenAI API Key**: Your OpenAI API key. Configure via Tree View: "OpenAI API Key: Not Set".
- `prSummary.defaultModel`: Default OpenAI model (gpt-4o, gpt-4o-mini).
- `prSummary.defaultTemplate`: Default template style.
- **Auto-Post to GitHub/GitLab**:
  - `prSummary.autoPost.enabled`: Enable auto-posting.
  - `prSummary.github.token`: GitHub Personal Access Token. Configure via Tree View under "Auto-Post Settings".
  - `prSummary.gitlab.token`: GitLab Personal Access Token. Configure via Tree View under "Auto-Post Settings".
- **JIRA Integration**:
  - `prSummary.jiraUrl`: Your JIRA URL (e.g., https://yourcompany.atlassian.net).
  - `prSummary.jiraEmail`: Your JIRA email address.
  - `prSummary.jiraApiToken`: Your JIRA API token.
  - Configure via Tree View: "JIRA: Not Configured".
- **Advanced Configuration**: Access all settings via "Open Extension Settings" in the Tree View.

### 📚 Key Features & Usage

#### Native VS Code Interface

- **Activity Bar Icon**: Access the extension via the "PR Summary" icon in the Activity Bar.
- **Tree View Navigation**: Integrated seamlessly into VS Code's Activity Bar with a familiar tree-based interface for all operations.
  - **Configuration Section**:
    - OpenAI API Key status and setup.
    - JIRA integration status and setup.
    - Quick access to all extension settings.
  - **Auto-Post Settings Section**:
    - Enable/disable auto-posting.
    - Configure GitHub and GitLab tokens.
    - Test platform connections.
    - Set default PR/MR state (Ready, Draft, Auto-detect).
  - **PR Summary Generation Section**:
    - Source and target branch selection.
    - JIRA ticket selection (if configured).
    - Template style selection.
    - "Generate summary" action.
  - **Recent Summaries Section**:
    - View up to 10 recent summaries.
    - Click to reopen, showing branch name, timestamp, and linked JIRA ticket.
  - **Custom Templates Section**:
    - Create, edit, or delete custom templates.

#### Smart Branch & Template System

- **Smart Branch Selection**:
  - Choose source and target branches with intelligent defaults (main/master/develop).
  - Visual branch picker highlights "Recommended" target branches.
  - Current selections are displayed in the tree view.
- **Multiple Template Styles**:
  - **12 Professional Templates**: Choose from general styles (Short, Medium, Long, Thorough) and specialized ones (Bug Fix, Feature Request, Documentation, Refactoring, Security Fix, Performance, Dependencies, Infrastructure). These are based on [industry best practices](https://axolo.co/blog/p/part-3-github-pull-request-template).
  - **General Purpose**: Short, Medium (default), Long, Thorough.
  - **Specialized**: Bug Fix, Feature Request, Documentation, Refactoring, Security Fix, Performance, Dependencies, Infrastructure.
- **Custom Templates**:
  - Create, edit, and manage your own templates with a built-in guided editor.
  - Templates appear in the selector alongside built-in options.
  - Ideal for team-specific workflows, QA requirements, compliance, etc.

#### Integrations & Automation

- **Auto-Post to GitHub/GitLab**:
  - **Productivity Boost**: Automatically create PRs/MRs directly from VS Code.
  - **Intelligent Platform Detection**: Detects GitHub or GitLab from your remote URL (supports GitLab.com and self-hosted).
  - **Secure Token Management**: Tokens stored in VS Code's encrypted settings.
  - **Smart State Detection**: Choose "Ready for Review", "Draft", or "Auto-detect" (from branch names like `draft/`, `wip/`).
  - **Connection Testing**: Verify token authentication.
  - **One-Click Creation & Opening**: Generate summary, create PR/MR, and open in browser.
  - **Workflow**:
    1. Enable "Auto-Post to GitHub/GitLab" in Tree View.
    2. Set default PR/MR state.
    3. Test connection (optional).
    4. Generate summary; a prompt will ask to auto-post.
- **JIRA Integration**:
  - Optionally link JIRA tickets to PR summaries.
  - Configure JIRA URL, email, and API token in settings.
  - Recent tickets load automatically for easy selection.
- **History Management**:
  - View and reuse previously generated PR summaries from the "Recent Summaries" section.
- **Native Document Display**: View results in VS Code's markdown editor.

### 🛠️ Getting Started

#### Prerequisites

- A valid OpenAI API key
- Git repository with commits
- VS Code 1.96.2 or higher

#### Installation

1. Install the extension from the VS Code marketplace.
2. Open the PR Summary panel from the Activity Bar.
3. Configure your OpenAI API key (and optionally JIRA integration) via the Tree View.

### ⚙️ How It Works

The extension:

1. **Analyzes Git History**: Compares your source branch against the target branch.
2. **Extracts Commit Data**: Gets commit messages (and optionally diffs).
3. **Applies Template**: Uses your selected template style.
4. **Generates Summary**: Sends data to OpenAI with structured prompts.
5. **Displays Results**: Opens a formatted markdown document.
6. **Saves History**: Automatically saves summaries.

### 📜 Available Commands

Access these via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- `PR Summary: Generate PR Summary`
- `PR Summary: View History`
- `PR Summary: Select JIRA Ticket`
- `PR Summary: Configure OpenAI API Key`
- `PR Summary: Configure JIRA`
- `PR Summary: Select Source Branch`
- `PR Summary: Select Target Branch`
- `PR Summary: Select Template`
- `PR Summary: Create Custom Template`
- `PR Summary: Edit Custom Template`

## Troubleshooting

### Common Issues

1. **"Command not found" errors**: Restart VS Code after installation.
2. **No branches found**: Ensure you're in a Git repository with commits.
3. **API key errors**: Verify your OpenAI API key is valid and has credits.
4. **JIRA connection issues**: Check your JIRA URL, email, and API token.
5. **Invalid time value errors**: The extension automatically cleans up corrupted history data.

### Getting Help

- Check the extension's output panel for detailed error messages.
- Ensure your workspace contains a valid Git repository.
- Verify network connectivity for OpenAI and JIRA API calls.

## Privacy & Security

- API keys and integration tokens are stored securely in VS Code's encrypted local storage.
- Git data is sent only to OpenAI's API for summary generation (not stored by the extension).
- No telemetry or usage data is collected.

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
