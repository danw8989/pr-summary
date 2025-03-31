import * as vscode from "vscode";
import { TemplateManager } from "../../../utils/templateManager";

/**
 * Handles custom template management (save, delete, load).
 */
export class TemplateHandler {
  constructor(
    private readonly webview: vscode.Webview,
    private readonly context: vscode.ExtensionContext
  ) {}

  /**
   * Handle saving a custom template
   */
  public async handleSaveCustomTemplate(
    templateName: string,
    templatePrompt: string
  ): Promise<void> {
    try {
      await TemplateManager.saveCustomTemplate(
        this.context,
        templateName,
        templatePrompt
      );

      // Refresh template list in the webview
      await this.handleGetCustomTemplates();

      // Send success message
      this.webview.postMessage({
        type: "templateSaved",
        name: templateName,
      });
    } catch (error) {
      this.webview.postMessage({
        type: "error",
        message: `Failed to save template: ${error}`,
      });
    }
  }

  /**
   * Handle deleting a custom template
   */
  public async handleDeleteCustomTemplate(templateName: string): Promise<void> {
    try {
      await TemplateManager.deleteCustomTemplate(this.context, templateName);

      // Refresh template list in the webview
      await this.handleGetCustomTemplates();

      // Send success message
      this.webview.postMessage({
        type: "templateDeleted",
        name: templateName,
      });
    } catch (error) {
      this.webview.postMessage({
        type: "error",
        message: `Failed to delete template: ${error}`,
      });
    }
  }

  /**
   * Handle getting all custom templates and options, then send them to the webview
   */
  public async handleGetCustomTemplates(): Promise<void> {
    try {
      const customTemplates = await TemplateManager.getCustomTemplates(
        this.context
      );
      const allOptions = await TemplateManager.getAllTemplateOptions(
        this.context
      );

      // Send templates to webview
      this.webview.postMessage({
        type: "templatesLoaded",
        templates: customTemplates,
        allOptions: allOptions,
      });
    } catch (error) {
      this.webview.postMessage({
        type: "error",
        message: `Failed to load templates: ${error}`,
      });
    }
  }
}
