# Agent Browser Guide

[![skills.sh](https://skills.sh/b/heart-wcl/agent-browser-guide)](https://skills.sh/heart-wcl/agent-browser-guide)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A **Claude Code skill** that forces browser automation tasks to use the **Vercel Agent Browser CLI** instead of MCP tools or Playwright.

**Keywords**: `claude-code`, `agent-skills`, `browser-automation`, `playwright-alternative`, `mcp-replacement`, `vercel`, `agent-browser`, `headless-browser`, `chrome-automation`, `cli-tools`, `web-scraping`, `screenshot`, `form-automation`

## Why

By default, Claude Code may use Playwright MCP or other browser MCP tools for web automation. This skill enforces a **CLI-first** approach using the `agent-browser` command, which:

- Works immediately after installation (no MCP config, no restart needed)
- Is more token-efficient than MCP-based browser tools
- Supports screenshots, snapshots, form filling, clicking, and JavaScript evaluation

## Installation

```bash
npx skills add heart-wcl/agent-browser-guide
```

Or install globally:

```bash
npx skills add heart-wcl/agent-browser-guide -g
```

## Prerequisites

- Node.js >= 18
- npm

The skill includes an auto-installer that downloads and sets up `agent-browser` CLI and Chrome for Testing automatically.

## Agent Browser CLI vs Playwright MCP

| Factor | Agent Browser CLI | Playwright MCP |
|--------|-------------------|----------------|
| Setup | Install → use immediately | Configure → restart Claude |
| Token usage | Compact `@eN` refs (~7K for 10 steps) | Full DOM snapshots (~114K for 10 steps) |
| Screenshot | Save to file, AI reads | Depends on MCP implementation |
| Speed | Direct Rust CLI execution | JSON-RPC overhead |
| Chrome download | ~150MB, auto-install | Requires separate Playwright install |

## Supported Agents

This skill works with any agent that supports the [Agent Skills specification](https://agentskills.io), including:

- **Claude Code** (primary target)
- **Codex**
- **Cursor**
- **OpenCode**
- **Kiro CLI**
- And [50+ more agents](https://github.com/vercel-labs/skills#supported-agents)

## Use Cases

- **Web scraping** — Extract data from websites programmatically
- **UI testing** — Screenshot and verify frontend changes
- **Form automation** — Fill forms, click buttons, navigate workflows
- **Price monitoring** — Check e-commerce sites for price changes
- **Content verification** — Verify web pages load correctly after deployments
- **Research** — Search and summarize web content

## Usage

Once installed, any browser-related request (navigate, screenshot, click, fill form, etc.) will automatically trigger this skill and use `agent-browser` CLI via Bash.

### Examples

```bash
# Navigate
agent-browser open https://example.com

# Screenshot
agent-browser screenshot ./result.png

# Get interactive elements
agent-browser snapshot

# Click element by @eN ref
agent-browser click @e5

# Fill form
agent-browser fill @e2 "search text"

# Wait for element
agent-browser wait "#results" 10000
```

## Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Skill definition with rules and workflows |
| `scripts/install.js` | Auto-installer for agent-browser CLI |
| `scripts/browser.js` | JSON wrapper for batch browser operations |
| `references/cli-reference.md` | Complete CLI command reference |

## Rules

- **HARD RULE**: NEVER use MCP tools for browser tasks
- **HARD RULE**: Once agent-browser is selected, never switch to other tools
- Install `agent-browser` automatically if not present
- Retry up to 2 times on network failure before asking user

## License

MIT
