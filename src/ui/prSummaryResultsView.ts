import * as vscode from "vscode";

export class PrSummaryResultProvider
  implements vscode.TextDocumentContentProvider
{
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  private _summaries = new Map<string, string>();

  readonly onDidChange = this._onDidChange.event;

  provideTextDocumentContent(uri: vscode.Uri): string {
    const key = uri.path;
    return this._summaries.get(key) || "Summary not found";
  }

  static async showSummary(summary: string, metadata?: any): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = metadata?.branch
      ? `PR-Summary-${metadata.branch}-${timestamp}.md`
      : `PR-Summary-${timestamp}.md`;

    // Create a new untitled document with markdown content
    const content = this.formatSummaryAsMarkdown(summary, metadata);
    const document = await vscode.workspace.openTextDocument({
      content,
      language: "markdown",
    });

    // Show the document in a new editor
    await vscode.window.showTextDocument(document, {
      viewColumn: vscode.ViewColumn.One,
      preview: false,
    });
  }

  private static formatSummaryAsMarkdown(
    summary: string,
    metadata?: any
  ): string {
    let content = "";

    if (metadata) {
      content += `# PR Summary\n\n`;
      content += `**Branch:** ${metadata.branch}\n`;
      content += `**Template:** ${metadata.template}\n`;
      if (metadata.jiraTicket) {
        content += `**JIRA Ticket:** ${metadata.jiraTicket}\n`;
      }

      // Safely handle timestamp
      let generatedTime: string;
      try {
        if (metadata.timestamp && typeof metadata.timestamp === "string") {
          // If it's already a formatted string, use it directly
          generatedTime = metadata.timestamp;
        } else if (
          metadata.timestamp &&
          typeof metadata.timestamp === "number"
        ) {
          // If it's a number timestamp, convert it
          generatedTime = new Date(metadata.timestamp).toLocaleString();
        } else {
          // Fallback to current time
          generatedTime = new Date().toLocaleString();
        }
      } catch (error) {
        generatedTime = new Date().toLocaleString();
      }

      content += `**Generated:** ${generatedTime}\n\n`;
      content += `---\n\n`;
    }

    content += summary;

    return content;
  }
}
