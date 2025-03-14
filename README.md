# PR Summary Extension

Generate comprehensive PR summaries using OpenAI's models based on your Git commit history.

## Features

- **Generate PR Summaries**: Create professional PR titles and descriptions using OpenAI models
- **Multiple Template Styles**: Choose from Short, Medium, Long, or Thorough summary styles
- **JIRA Integration**: Link JIRA tickets to your PR summaries
- **History Management**: View and copy your previously generated PR summaries

## Getting Started

### Prerequisites

- A valid OpenAI API key
- Git repository with commits
- VS Code 1.98.0 or higher

### Installation

1. Install the extension from the VS Code marketplace
2. Configure your API keys (OpenAI and optionally JIRA)

## Usage

### Generate a PR Summary

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS)
2. Select `Generate PR Summary`
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
2. Select `View PR Summary History`
3. Browse previously generated PR summaries
4. Click any entry to view details
5. Use the "Copy" buttons to reuse previous summaries

## Configuration

The extension stores the following settings:

- `prSummary.openaiApiKey`: Your OpenAI API key
- `prSummary.jiraUrl`: Your JIRA URL
- `prSummary.jiraEmail`: Your JIRA email
- `prSummary.jiraApiToken`: Your JIRA API token
- `prSummary.defaultModel`: Default OpenAI model to use
- `prSummary.defaultTemplate`: Default template style

## How It Works

The extension:

1. Gets your current branch name and commit messages
2. Optionally includes commit diffs for more context
3. Sends this information to OpenAI with a prompt template
4. Parses the response into a title and description
5. Formats the result and presents it for you to use

## License

[MIT](LICENSE)
