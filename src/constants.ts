// Template instructions for different PR styles
export const TEMPLATE_PROMPTS: Record<string, string> = {
  Short: "Generate a concise and brief PR summary.",
  Medium: "Generate a moderately detailed PR summary.",
  Long: "Generate a detailed PR summary with additional context.",
  Thorough:
    "Generate a very thorough PR summary including detailed description and potential impacts.",
};

// Models
export const OPENAI_MODELS = ["gpt-4o", "gpt-4o-mini"];

// Template options
export const TEMPLATE_OPTIONS = ["Short", "Medium", "Long", "Thorough"];

// Context value storage keys
export const STORAGE_KEYS = {
  PR_SUMMARY_HISTORY: "prSummaryHistory", // Legacy key
  HISTORY: "prSummaryHistory", // New key (using same value for backward compatibility)
  CUSTOM_TEMPLATES: "customTemplates",
};
