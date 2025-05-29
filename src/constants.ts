// Template instructions for different PR styles
export const TEMPLATE_PROMPTS: Record<string, string> = {
  Short: "Generate a concise and brief PR summary.",
  Medium: "Generate a moderately detailed PR summary.",
  Long: "Generate a detailed PR summary with additional context.",
  Thorough:
    "Generate a very thorough PR summary including detailed description and potential impacts.",
  "Bug Fix": `Generate a PR summary focused on bug fixes with the following structure:
- Brief description of the bug that was fixed
- Root cause analysis
- How the fix addresses the issue
- Any side effects or considerations
- Testing approach used to verify the fix`,
  "Feature Request": `Generate a PR summary for new features with this structure:
- Clear description of the new functionality
- User benefits and use cases
- Implementation approach and key decisions
- Any breaking changes or migration notes
- Testing coverage for the new feature`,
  Documentation: `Generate a PR summary for documentation updates:
- What documentation was added/updated/removed
- Reason for the documentation changes
- Target audience (developers, users, etc.)
- Any related code changes that prompted this documentation update`,
  Refactoring: `Generate a PR summary for code refactoring:
- What code was refactored and why
- Benefits of the refactoring (performance, maintainability, etc.)
- Confirmation that functionality remains unchanged
- Any architectural improvements
- Testing approach to ensure no regressions`,
  "Security Fix": `Generate a PR summary for security-related changes:
- Description of the security issue addressed (without exposing sensitive details)
- Impact and severity level
- How the fix mitigates the security risk
- Any additional security measures implemented
- Testing and validation performed`,
  Performance: `Generate a PR summary focused on performance improvements:
- Performance metrics before and after (if available)
- What specific optimizations were made
- Expected impact on user experience
- Any trade-offs or considerations
- Benchmarking or profiling results`,
  Dependencies: `Generate a PR summary for dependency updates:
- Which dependencies were updated/added/removed
- Version changes and reasons for the update
- Security fixes or new features gained
- Any breaking changes or migration steps
- Testing performed to ensure compatibility`,
  Infrastructure: `Generate a PR summary for infrastructure or DevOps changes:
- What infrastructure components were modified
- Reason for the changes (scaling, security, cost optimization, etc.)
- Deployment considerations or rollback procedures
- Impact on development workflow
- Monitoring or observability improvements`,
};

// Models
export const OPENAI_MODELS = ["gpt-4o", "gpt-4o-mini"];

// Template options
export const TEMPLATE_OPTIONS = [
  "Short",
  "Medium",
  "Long",
  "Thorough",
  "Bug Fix",
  "Feature Request",
  "Documentation",
  "Refactoring",
  "Security Fix",
  "Performance",
  "Dependencies",
  "Infrastructure",
];

// Context value storage keys
export const STORAGE_KEYS = {
  PR_SUMMARY_HISTORY: "prSummaryHistory", // Legacy key
  HISTORY: "prSummaryHistory", // New key (using same value for backward compatibility)
  CUSTOM_TEMPLATES: "customTemplates",
};
