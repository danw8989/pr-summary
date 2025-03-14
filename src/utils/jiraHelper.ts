import * as vscode from "vscode";
import axios from "axios";

export interface JiraTicket {
  key: string;
  summary: string;
  description?: string;
  status: string;
  type?: string;
  priority?: string;
}

// Original JiraTicket interface for API compatibility
interface JiraApiTicket {
  key: string;
  fields: {
    summary: string;
    description?: string;
    status?: {
      name: string;
    };
    issuetype?: {
      name: string;
    };
    priority?: {
      name: string;
    };
    [key: string]: any;
  };
}

export class JiraHelper {
  private jiraUrl: string;
  private jiraEmail: string;
  private jiraApiToken: string;

  constructor(jiraUrl: string, jiraEmail: string, jiraApiToken: string) {
    this.jiraUrl = jiraUrl;
    this.jiraEmail = jiraEmail;
    this.jiraApiToken = jiraApiToken;
  }

  /**
   * Get recent JIRA tickets
   */
  async getRecentTickets(project?: string): Promise<JiraTicket[]> {
    const apiTickets = await JiraHelper.getJiraTickets(
      this.jiraUrl,
      this.jiraEmail,
      this.jiraApiToken,
      project
    );

    // Convert API tickets to simplified format
    return apiTickets.map((ticket) => ({
      key: ticket.key,
      summary: ticket.fields.summary,
      description: ticket.fields.description,
      status: ticket.fields.status?.name || "Unknown",
      type: ticket.fields.issuetype?.name || "Unknown",
      priority: ticket.fields.priority?.name || "Unknown",
    }));
  }

  /**
   * Get JIRA tickets from the server
   */
  static async getJiraTickets(
    jiraUrl: string,
    jiraEmail: string,
    jiraApiToken: string,
    project?: string
  ): Promise<JiraApiTicket[]> {
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
