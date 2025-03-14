import * as vscode from "vscode";
import { STORAGE_KEYS, TEMPLATE_PROMPTS } from "../constants";

export interface CustomTemplate {
  name: string;
  prompt: string;
}

export class TemplateManager {
  /**
   * Get all templates including default and custom ones
   */
  static async getAllTemplatePrompts(
    context: vscode.ExtensionContext
  ): Promise<Record<string, string>> {
    // Get custom templates
    const customTemplates = await this.getCustomTemplates(context);

    // Combine default and custom templates
    const allTemplates: Record<string, string> = { ...TEMPLATE_PROMPTS };

    // Add custom templates
    customTemplates.forEach((template) => {
      allTemplates[template.name] = template.prompt;
    });

    return allTemplates;
  }

  /**
   * Get all template options (names)
   */
  static async getAllTemplateOptions(
    context: vscode.ExtensionContext
  ): Promise<string[]> {
    // Get custom templates
    const customTemplates = await this.getCustomTemplates(context);

    // Get default template options from constants
    const defaultOptions = Object.keys(TEMPLATE_PROMPTS);

    // Get custom template names
    const customOptions = customTemplates.map((template) => template.name);

    // Combine and return all options
    return [...defaultOptions, ...customOptions];
  }

  /**
   * Save a custom template
   */
  static async saveCustomTemplate(
    context: vscode.ExtensionContext,
    name: string,
    prompt: string
  ): Promise<void> {
    // Get existing custom templates
    const templates = await this.getCustomTemplates(context);

    // Check if template with this name already exists
    const existingIndex = templates.findIndex((t) => t.name === name);

    if (existingIndex >= 0) {
      // Update existing template
      templates[existingIndex].prompt = prompt;
    } else {
      // Add new template
      templates.push({ name, prompt });
    }

    // Save updated templates
    await context.globalState.update(STORAGE_KEYS.CUSTOM_TEMPLATES, templates);
  }

  /**
   * Delete a custom template
   */
  static async deleteCustomTemplate(
    context: vscode.ExtensionContext,
    name: string
  ): Promise<void> {
    // Get existing custom templates
    const templates = await this.getCustomTemplates(context);

    // Filter out the template to delete
    const updatedTemplates = templates.filter((t) => t.name !== name);

    // Save updated templates
    await context.globalState.update(
      STORAGE_KEYS.CUSTOM_TEMPLATES,
      updatedTemplates
    );
  }

  /**
   * Get all custom templates
   */
  static async getCustomTemplates(
    context: vscode.ExtensionContext
  ): Promise<CustomTemplate[]> {
    const templates = context.globalState.get<CustomTemplate[]>(
      STORAGE_KEYS.CUSTOM_TEMPLATES
    );
    return templates || [];
  }

  /**
   * Check if a template is a custom template
   */
  static async isCustomTemplate(
    context: vscode.ExtensionContext,
    name: string
  ): Promise<boolean> {
    const templates = await this.getCustomTemplates(context);
    return templates.some((t) => t.name === name);
  }
}
