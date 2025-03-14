import * as vscode from "vscode";
import { STORAGE_KEYS } from "../constants";

export interface PrSummaryHistoryEntry {
  created: number;
  branchName: string;
  jiraTicket?: string;
  summary: string;
  model: string;
  template: string;
}

export class HistoryManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Save a PR summary to history
   */
  async saveSummary(
    branchName: string,
    jiraTicket: string | undefined,
    summary: string,
    model: string,
    template: string
  ): Promise<void> {
    // Get existing history
    const history = await this.getHistory();

    // Create new entry
    const entry: PrSummaryHistoryEntry = {
      created: Date.now(),
      branchName,
      jiraTicket,
      summary,
      model,
      template,
    };

    // Add entry to history and save
    history.push(entry);

    // Limit history to 50 entries
    if (history.length > 50) {
      history.shift(); // Remove oldest entry
    }

    // Save history
    await this.context.globalState.update(STORAGE_KEYS.HISTORY, history);
  }

  /**
   * Get PR summary history
   */
  async getHistory(): Promise<PrSummaryHistoryEntry[]> {
    const history = this.context.globalState.get<PrSummaryHistoryEntry[]>(
      STORAGE_KEYS.HISTORY,
      []
    );

    return history;
  }

  /**
   * Clear PR summary history
   */
  async clearHistory(): Promise<void> {
    await this.context.globalState.update(STORAGE_KEYS.HISTORY, []);
  }
}
