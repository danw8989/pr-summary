// Template instructions for different PR styles
export const TEMPLATE_PROMPTS: Record<string, string> = {
  Short: "Generate a concise and brief PR summary.",
  Medium: "Generate a moderately detailed PR summary.",
  Long: "Generate a detailed PR summary with additional context.",
  Thorough:
    "Generate a very thorough PR summary including detailed description and potential impacts.",
};

// Models
export const OPENAI_MODELS = ["o3-mini", "o1-preview", "o1-mini", "gpt-4o"];

// Template options
export const TEMPLATE_OPTIONS = ["Short", "Medium", "Long", "Thorough"];

// Context value storage keys
export const STORAGE_KEYS = {
  PR_SUMMARY_HISTORY: "prSummaryHistory",
};
