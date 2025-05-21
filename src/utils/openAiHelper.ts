import * as vscode from "vscode";
import OpenAI from "openai";
import { GitHelper } from "./gitHelper";
import { OPENAI_MODELS as FALLBACK_MODELS } from "../constants"; // Import fallback

export interface PrSummary {
  title: string;
  description: string;
}

export class OpenAIHelper {
  /**
   * Generate PR title and description using OpenAI
   */
  static async generatePrSummary(
    apiKey: string,
    additionalPrompt: string,
    includeDiffs: boolean,
    jiraTicket: string | undefined,
    model: string,
    sourceBranch?: string,
    targetBranch?: string
  ): Promise<PrSummary> {
    // Get branch name and commit messages
    const currentBranch = await GitHelper.getCurrentBranchName();
    const branchName = sourceBranch || currentBranch;
    const commitMessagesWithDiff = await GitHelper.getCommitMessagesWithDiff(
      branchName,
      targetBranch,
      includeDiffs
    );

    // Define the OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Create the messages for the API
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "user",
        content: `Generate a PR title and description (format the description in markdown) based on the following branch name and commit messages with diffs. Include JIRA ticket information if provided. **Be concise.** ${
          additionalPrompt || ""
        }`,
      },
      { role: "user", content: `Branch Name: ${branchName}` },
      {
        role: "user",
        content: `Commit Messages with Diffs: ${commitMessagesWithDiff}`,
      },
    ];

    if (jiraTicket) {
      messages.push({ role: "user", content: `JIRA Ticket: ${jiraTicket}` });
    }

    try {
      // Make the API request
      const response = await openai.chat.completions.create({
        model: model,
        messages: messages,
      });

      // Parse the response
      const content = response.choices[0].message.content || "";
      const lines = content.split("\n");
      const title = lines[0];
      const description = lines.slice(1).join("\n");

      return {
        title: title.trim(),
        description: description.trim(),
      };
    } catch (error) {
      throw new Error(`OpenAI API request error: ${error}`);
    }
  }

  /**
   * Fetch available chat models from OpenAI API, with filtering.
   * Falls back to a minimal list if fetching or filtering fails.
   */
  static async fetchChatModels(apiKey: string): Promise<string[]> {
    if (!apiKey) {
      console.warn(
        "No API key provided for fetching models, returning fallback."
      );
      return FALLBACK_MODELS;
    }

    try {
      const openai = new OpenAI({ apiKey });
      const modelsResponse = await openai.models.list();
      const allModels = modelsResponse.data;

      const chatModelPrefixes = ["gpt-", "o1-", "o3-"];
      const excludedSubstrings = [
        "instruct",
        "vision",
        "audio",
        "embedding",
        "image",
        "dall-e",
        "whisper",
        "tts",
        "moderation",
        "search", // Can be fine-tuned if some search models are desired
        "babbage", // Older completion model
        "davinci", // Older completion model
        "curie", // Older completion model
        "ada", // Older completion model
      ];

      const filteredModels = allModels
        .map((model) => model.id)
        .filter(
          (id) =>
            chatModelPrefixes.some((prefix) => id.startsWith(prefix)) &&
            !excludedSubstrings.some((substring) => id.includes(substring))
        )
        .sort(); // Sort for consistent order

      if (filteredModels.length > 0) {
        console.log("Dynamically fetched and filtered models:", filteredModels);
        return filteredModels;
      }

      console.warn(
        "Dynamic fetching yielded no suitable models, returning fallback."
      );
      return FALLBACK_MODELS;
    } catch (error) {
      console.error(`Failed to fetch or filter OpenAI models: ${error}`);
      console.warn("Returning fallback models due to error.");
      return FALLBACK_MODELS;
    }
  }
}
