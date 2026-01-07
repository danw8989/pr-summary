# Change Log

All notable changes to the "pr-summary" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.1.0] - 2024-03-14

- Initial release with core functionality
- Generate PR summaries using OpenAI models
- Multiple template styles (Short, Medium, Long, Thorough)
- JIRA integration for ticket linking
- History management for previous summaries
- VS Code integration via Activity Bar, Command Palette, and context menus
- Modern UI/UX for all extension features

## [Unreleased]

### Fixed
- Changed diff generation to use consolidated branch comparison instead of individual commit diffs
  - Now uses `git diff targetBranch...sourceBranch` for a single diff showing net changes
  - Prevents issues with large temporary files that were added and later removed
  - Significantly improves performance and reduces buffer overflow errors
  - Maintains separate commit messages for context while showing unified diff
