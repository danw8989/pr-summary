import * as vscode from "vscode";
import axios from "axios";

export interface JiraTicket {
  key: string;
  fields: {
    summary: string;
    description?: string;
    status?: {
      name: string;
    };
    [key: string]: any;
  };
}

export class JiraHelper {
  /**
   * Get JIRA tickets from the server
   */
  static async getJiraTickets(
    jiraUrl: string,
    jiraEmail: string,
    jiraApiToken: string,
    project?: string
  ): Promise<JiraTicket[]> {
    if (!jiraUrl) {
      throw new Error("Missing JIRA URL");
    }

    // Create JQL query
    const jql = project
      ? `project = ${project} ORDER BY updated DESC`
      : "ORDER BY updated DESC";

    // Set up request params
    const params = {
      jql: jql,
      maxResults: 50,
    };

    // Set up auth and headers
    const auth = {
      username: jiraEmail,
      password: jiraApiToken,
    };

    const headers = {
      Accept: "application/json",
    };

    try {
      // Make the API request
      const response = await axios.get(`${jiraUrl}/rest/api/2/search`, {
        params,
        auth,
        headers,
      });

      if (response.status !== 200) {
        throw new Error(
          `JIRA API returned status ${response.status}: ${response.data}`
        );
      }

      return response.data.issues || [];
    } catch (error) {
      throw new Error(`Failed to fetch JIRA tickets: ${error}`);
    }
  }
}
