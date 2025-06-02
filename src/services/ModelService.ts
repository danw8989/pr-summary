import * as vscode from "vscode";
import { OpenAIHelper } from "../utils/openAiHelper";

export interface ModelInfo {
  id: string;
  owned_by: string;
  created: number;
}

export class ModelService {
  /**
   * Get currently available models for selection
   */
  static async getAvailableModels(apiKey?: string): Promise<string[]> {
    const effectiveApiKey =
      apiKey ||
      vscode.workspace
        .getConfiguration("prSummary")
        .get<string>("openaiApiKey") ||
      process.env.OPENAI_API_KEY;

    if (!effectiveApiKey) {
      return ["gpt-4o-mini", "gpt-4o"]; // Fallback models
    }

    try {
      return await OpenAIHelper.fetchChatModels(effectiveApiKey);
    } catch (error) {
      console.warn(
        "Failed to fetch models from OpenAI, using fallback:",
        error
      );
      return ["gpt-4o-mini", "gpt-4o"];
    }
  }

  /**
   * Refresh models and update VS Code settings
   */
  static async refreshAndUpdateModels(apiKey: string): Promise<{
    success: boolean;
    models?: string[];
    error?: string;
  }> {
    try {
      const models = await OpenAIHelper.fetchChatModels(apiKey);

      if (models.length === 0) {
        return {
          success: false,
          error: "No suitable models found from OpenAI API",
        };
      }

      // Store the fetched models in workspace state for future use
      const context = vscode.workspace.getConfiguration("prSummary");
      const currentDefault = context.get<string>("defaultModel");

      // If current default is not in the new list, update it
      if (currentDefault && !models.includes(currentDefault)) {
        await context.update(
          "defaultModel",
          models[0],
          vscode.ConfigurationTarget.Global
        );
      }

      return {
        success: true,
        models: models,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get current default model, ensuring it's valid
   */
  static async getCurrentModel(apiKey?: string): Promise<string> {
    const config = vscode.workspace.getConfiguration("prSummary");
    const defaultModel = config.get<string>("defaultModel", "gpt-4o-mini");

    // Verify the model is still available
    const availableModels = await this.getAvailableModels(apiKey);

    if (availableModels.includes(defaultModel)) {
      return defaultModel;
    }

    // If current default is not available, return the first available model
    const newDefault = availableModels[0] || "gpt-4o-mini";

    // Update configuration to the new default
    await config.update(
      "defaultModel",
      newDefault,
      vscode.ConfigurationTarget.Global
    );

    return newDefault;
  }

  /**
   * Check if models need refreshing (could be extended with caching logic)
   */
  static shouldRefreshModels(): boolean {
    // For now, allow refresh anytime
    // Could be extended with timestamp checks, cache expiry, etc.
    return true;
  }
}
