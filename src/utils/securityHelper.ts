/**
 * Security helper utilities for handling sensitive data
 */

/**
 * Masks a sensitive string value for display purposes
 * @param value The sensitive value to mask
 * @param visibleStart Number of characters to show at the start (default: 4)
 * @param visibleEnd Number of characters to show at the end (default: 4)
 * @param maskChar Character to use for masking (default: '*')
 * @returns Masked string or empty string if value is falsy
 */
export function maskSensitiveValue(
  value: string | undefined | null,
  visibleStart: number = 4,
  visibleEnd: number = 4,
  maskChar: string = "*"
): string {
  if (!value || value.trim() === "") {
    return "";
  }

  const trimmedValue = value.trim();
  const minLength = visibleStart + visibleEnd;

  // If value is too short, mask everything except first character
  if (trimmedValue.length <= minLength) {
    if (trimmedValue.length <= 1) {
      return maskChar.repeat(8); // Standard mask length for very short values
    }
    return (
      trimmedValue.charAt(0) +
      maskChar.repeat(Math.max(7, trimmedValue.length - 1))
    );
  }

  // For longer values, show start and end with mask in middle
  const start = trimmedValue.substring(0, visibleStart);
  const end = trimmedValue.substring(trimmedValue.length - visibleEnd);
  const maskLength = Math.max(
    4,
    trimmedValue.length - visibleStart - visibleEnd
  );

  return start + maskChar.repeat(maskLength) + end;
}

/**
 * Checks if a value appears to be a sensitive token or API key
 * @param value The value to check
 * @returns True if the value looks like a sensitive token
 */
export function isSensitiveValue(value: string | undefined | null): boolean {
  if (!value || value.trim() === "") {
    return false;
  }

  const trimmedValue = value.trim();

  // Check common API key/token patterns
  const sensitivePatterns = [
    /^sk-/, // OpenAI API keys
    /^ghp_/, // GitHub personal access tokens
    /^github_pat_/, // GitHub personal access tokens (new format)
    /^glpat-/, // GitLab personal access tokens
    /^xoxb-/, // Slack bot tokens
    /^xoxp-/, // Slack user tokens
    /^ya29\./, // Google OAuth tokens
    /^AKIA/, // AWS access keys
    /^[A-Za-z0-9+/]{40,}={0,2}$/, // Base64 encoded tokens (40+ chars)
  ];

  return sensitivePatterns.some((pattern) => pattern.test(trimmedValue));
}

/**
 * Masks API keys and tokens for display in configuration status
 * @param value The value to mask
 * @returns Masked display string or "Not configured" if empty
 */
export function getMaskedConfigurationStatus(
  value: string | undefined | null
): string {
  if (!value || value.trim() === "") {
    return "Not configured";
  }

  if (isSensitiveValue(value)) {
    return `Configured (${maskSensitiveValue(value, 3, 3)})`;
  }

  // For non-sensitive values (like URLs), show more characters
  return `Configured (${maskSensitiveValue(value, 8, 4, "...")})`;
}
