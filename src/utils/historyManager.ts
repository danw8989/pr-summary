import * as vscode from "vscode";
import { STORAGE_KEYS } from "../constants";

export interface PrSummaryHistoryEntry {
  timestamp: string;
  title: string;
  description: string;
  template: string;
}

export class HistoryManager {
  /**
   * Save a PR summary to history
   */
  static async savePrSummary(
    context: vscode.ExtensionContext,
    title: string,
    description: string,
    template: string
  ): Promise<void> {
    // Get existing history
    const history = await this.getPrSummaryHistory(context);

    // Create new entry
    const entry: PrSummaryHistoryEntry = {
      timestamp: new Date().toISOString(),
      title,
      description,
      template,
    };

    // Add entry to history
    history.push(entry);

    // Save updated history
    await context.globalState.update(STORAGE_KEYS.PR_SUMMARY_HISTORY, history);
  }

  /**
   * Get PR summary history
   */
  static async getPrSummaryHistory(
    context: vscode.ExtensionContext
  ): Promise<PrSummaryHistoryEntry[]> {
    const history = context.globalState.get<PrSummaryHistoryEntry[]>(
      STORAGE_KEYS.PR_SUMMARY_HISTORY
    );
    return history || [];
  }
}
