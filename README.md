# PR Summary Extension

Generate comprehensive PR summaries using OpenAI's models based on your Git commit history.

## Features

- **Generate PR Summaries**: Create professional PR titles and descriptions using OpenAI models
- **Multiple Template Styles**: Choose from Short, Medium, Long, or Thorough summary styles
- **JIRA Integration**: Link JIRA tickets to your PR summaries
- **History Management**: View and copy your previously generated PR summaries
- **VS Code Integration**: Access via Activity Bar, Command Palette, editor context menu, and keyboard shortcuts
- **Modern UI/UX**: Beautiful and intuitive interface for all extension features

## Getting Started

### Prerequisites

- A valid OpenAI API key
- Git repository with commits
- VS Code 1.96.2 or higher

### Installation

1. Install the extension from the VS Code marketplace
2. Configure your API keys (OpenAI and optionally JIRA)

## Usage

### Access the Extension

There are multiple ways to access the extension:

- Click the PR Summary icon in the Activity Bar
- Use keyboard shortcuts (see below)
- Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS)
- Right-click in the explorer or editor

### Generate a PR Summary

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS)
2. Select `PR Summary: Generate PR Summary`
3. Enter your OpenAI API key (or it will use the stored one)
4. Optionally customize the prompt, select JIRA ticket, or change other settings
5. Click "Generate PR Summary"
6. The extension will generate a title and description based on your Git commit history
7. Use the "Copy" buttons to easily copy the title or description to your clipboard

### Select a JIRA Ticket

1. In the PR Summary generator, click "Select JIRA Ticket"
2. Enter your JIRA credentials if not already stored
3. Optionally filter by project
4. Click "Load Tickets"
5. Select a ticket from the list
6. Click "Select Ticket" to associate it with your PR summary

### View History

1. Open the Command Palette
2. Select `PR Summary: View History`
3. Browse previously generated PR summaries
4. Click any entry to view details
5. Use the "Copy" buttons to reuse previous summaries

## Keyboard Shortcuts

- `Ctrl+Alt+P G` (macOS: `Cmd+Alt+P G`): Generate PR Summary
- `Ctrl+Alt+P H` (macOS: `Cmd+Alt+P H`): View History
- `Ctrl+Alt+P J` (macOS: `Cmd+Alt+P J`): Select JIRA Ticket

## Configuration

The extension stores the following settings:

- `prSummary.openaiApiKey`: Your OpenAI API key
- `prSummary.jiraUrl`: Your JIRA URL
- `prSummary.jiraEmail`: Your JIRA email
- `prSummary.jiraApiToken`: Your JIRA API token
- `prSummary.defaultModel`: Default OpenAI model to use (options: o3-mini, o1-preview, o1-mini, gpt-4o)
- `prSummary.defaultTemplate`: Default template style (options: Short, Medium, Long, Thorough)

## How It Works

The extension:

1. Gets your current branch name and commit messages
2. Optionally includes commit diffs for more context
3. Sends this information to OpenAI with a prompt template
4. Parses the response into a title and description
5. Formats the result and presents it for you to use

## UI Components

The extension provides several UI components:

- **PR Summary Panel**: Main interface for generating summaries
- **JIRA Ticket Selector**: Interface for finding and selecting JIRA tickets
- **History Panel**: Interface for viewing previous summaries
- **Activity Bar Integration**: Quick access to extension features
- **Status Bar Item**: Convenient access to PR summary generation

## Troubleshooting

If you encounter issues:

1. Check your OpenAI API key is valid and has sufficient credits
2. For JIRA integration issues, verify your JIRA URL, email, and API token
3. Ensure you have Git commits in your repository for the extension to analyze
4. Check VS Code's Developer Tools for any error messages

## License

[MIT](LICENSE)

## Feedback and Contributions

Please submit issues and pull requests to the [GitHub repository](https://github.com/danw8989/pr-summary).
