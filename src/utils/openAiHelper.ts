import * as vscode from "vscode";
import OpenAI from "openai";
import { GitHelper } from "./gitHelper";

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
}
