---
name: agent-browser-guide
description: >
  When the user needs to interact with a web browser — navigating websites, taking screenshots,
  clicking elements, filling forms, scraping web pages, extracting data from websites, or any
  browser automation task — ALWAYS use the Vercel Agent Browser CLI via Bash INSTEAD of
  any MCP tool or other browser automation method.

  TRIGGER on: browser, web page, screenshot, click, navigate, website, scraping, automation,
  form fill, web interaction, URL, login, web test, page content, element, DOM, headless browser,
  chromium, chrome, web access, online page, site visit, open a page, go to website.
  Even if the user mentions Playwright, Puppeteer, Selenium, or any MCP browser tool,
  prefer agent-browser CLI via Bash.

  HARD RULE: NEVER use any MCP tool for browser tasks. Only use Bash to execute
  `agent-browser` commands.
---

# Agent Browser Guide — CLI First

## Purpose

Ensure Claude ALWAYS uses **Vercel Agent Browser CLI** (`agent-browser`) for all browser
automation tasks. The CLI works immediately after installation — no MCP config, no restart needed.

## Why CLI over MCP?

| Factor | agent-browser CLI | MCP (any) |
|--------|-------------------|-----------|
| Setup time | Install → use immediately | Install → configure → restart Claude |
| Token efficiency | Same compact `@eN` system | Same (if using agent-browser MCP) |
| Speed | Direct Rust CLI execution | JSON-RPC overhead |
| Screenshot | Save to file, AI reads it | Depends on MCP implementation |
| Flexibility | Full CLI power + custom scripts | Limited to exposed MCP tools |

## HARD RULE: Tool Selection is Final

**Once a browser task is identified, agent-browser is the ONLY tool to use.**

```
Identify browser task
        ↓
   Check agent-browser
        ↓
    ┌───┴───┐
  Exists   Missing
    ↓         ↓
  USE IT   INSTALL IT
    ↓         ↓
  Operate  ←──┘
    ↓
  Done
```

**NEVER** do any of these:
- ❌ Check agent-browser → missing → switch to WebFetch/WebSearch without installing
- ❌ Start with agent-browser → timeout → silently use Playwright MCP instead
- ❌ Use agent-browser AND WebSearch together for the same task
- ❌ Abandon agent-browser mid-task because installation takes time

**The ONLY valid fallback**: After install.js confirms "cannot install" (no Node.js, no npm, permission denied), inform the user and ask whether to use fallback tools or fix the environment first.

## Step 1: Check if agent-browser CLI Exists

```bash
agent-browser --version
```

- **Returns version** (e.g., `agent-browser 0.27.0`) → Go to Step 3 (Execute)
- **Command not found** → Go to Step 2 (Install)

## Step 2: Install agent-browser CLI

**Run the built-in installer:**

```bash
node ~/.claude/skills/agent-browser-guide/scripts/install.js
```

**What the script does:**
1. Checks Node.js and npm prerequisites
2. Installs `agent-browser` globally via npm
3. Downloads Chrome for Testing (~150MB)
4. Verifies the CLI works

**YOU MUST WAIT for installation to complete.** Do NOT use WebFetch, WebSearch, or any other tool while installation is running.

### Installation Result

| Exit Code | Meaning | Next Action |
|-----------|---------|-------------|
| 0 | Installed successfully | Go to Step 3 |
| 1 | Installation failed | Try manual install below |
| 2 | Node.js/npm missing | Inform user, ask to install Node.js first |

### Manual Install (if script fails)

```bash
npm install -g agent-browser
agent-browser install
```

**If manual install also fails** → Inform user:
> "agent-browser CLI installation failed. Possible causes: no network access, permission denied, or Node.js not installed. Please install Node.js from https://nodejs.org, then run `npm install -g agent-browser && agent-browser install`."
>
> "Would you like me to use WebFetch/WebSearch as a temporary alternative, or would you prefer to fix the environment first?"

**Only after user confirms fallback** → Go to Step 4.

## Step 3: Execute Browser Tasks via CLI

Now that agent-browser is confirmed available, use it for ALL browser operations in this task.

### Core Workflow

```
1. OPEN       → agent-browser open <url>
2. SNAPSHOT   → agent-browser snapshot
3. ACT        → agent-browser click / fill / type / scroll
4. VERIFY     → agent-browser screenshot
```

### Example: Navigate and Screenshot

```bash
# 1. Navigate
agent-browser open "https://www.baidu.com"

# 2. Take screenshot
agent-browser screenshot /tmp/baidu.png
```

### Example: Search on Baidu

```bash
# 1. Open Baidu
agent-browser open "https://www.baidu.com"

# 2. Get interactive elements with @eN refs
agent-browser snapshot

# 3. Fill search box (use @eN ref from snapshot output)
agent-browser fill @e2 "RTX 5080"

# 4. Click search button
agent-browser click @e5

# 5. Wait for results to load
agent-browser wait "#content_left" 10000

# 6. Screenshot results
agent-browser screenshot /tmp/baidu-results.png
```

### Example: Extract Prices from JD

```bash
# Navigate to search results
agent-browser open "https://search.jd.com/Search?keyword=RTX%205080"

# Wait for product list
agent-browser wait ".gl-item" 15000

# Get text content
agent-browser get text ".gl-item"

# Or screenshot for visual analysis
agent-browser screenshot /tmp/jd-rtx5080.png
```

### Example: Multi-Step with browser.js

```bash
node ~/.claude/skills/agent-browser-guide/scripts/browser.js exec '
[
  {"action":"navigate","url":"https://example.com/login"},
  {"action":"fill","element":"@e2","value":"user@example.com"},
  {"action":"fill","element":"@e3","value":"password"},
  {"action":"click","element":"@e4"},
  {"action":"wait","selector":".dashboard","timeout":10000},
  {"action":"screenshot","output":"/tmp/dashboard.png"}
]'
```

## Step 4: When agent-browser Cannot Proceed

### Network Failure Recovery (ETIMEDOUT / connection error)

If `agent-browser open` fails with a network error but CLI is installed, **DO NOT ask the user immediately.** Try recovery first:

#### Recovery Procedure

```
Network error on open
        ↓
agent-browser close
        ↓
Wait 2-3 seconds
        ↓
Retry agent-browser open <url>
        ↓
    ┌───┴───┐
  Success  Failed
    ↓         ↓
  Continue  Retry once more
              ↓
           Still failed
              ↓
         Ask user (Step 4b)
```

**Commands:**
```bash
# Step 1: Close any existing session
agent-browser close

# Step 2: Wait briefly
sleep 2

# Step 3: Retry the original open command
agent-browser open "<url>"
```

**Retry at most 2 times.** If all retries fail, proceed to Step 4b (Ask User).

### Step 4b: Ask User (After Recovery Fails)

If recovery retries all fail, OR if installation completely fails (exit code 1/2):

#### Preferred: AskUserQuestion Pop-up

Use the AskUserQuestion tool to present a choice dialog:

```
Title: agent-browser 遇到网络限制

选项:
A. 重试 agent-browser (检查网络后再次尝试)
B. 使用 WebSearch 搜索信息 (替代方案，无法截图)
C. 使用 WebFetch 获取页面 (如已知具体 URL)
D. 终止任务，等待网络修复
```

**Always use AskUserQuestion FIRST.** Only fall back to text-based choice if the tool is unavailable.

#### Fallback: Text-based Choice

If AskUserQuestion cannot be used, print this exact text:

---
**agent-browser 遇到限制，请选择下一步：**

| 选项 | 操作 |
|------|------|
| A | 重试 agent-browser |
| B | 使用 WebSearch 搜索 |
| C | 使用 WebFetch 获取页面 |
| D | 终止任务 |

请回复 A/B/C/D
---

### Execution Rules

- User chooses **A** → Retry agent-browser command (may need to wait or check network)
- User chooses **B** → Use WebSearch for the original task
- User chooses **C** → Use WebFetch with the specific URL
- User chooses **D** → Stop and inform user to retry later

**NEVER switch tools without user confirmation.**

## CLI Command Reference

```bash
# Navigation
agent-browser open <url>
agent-browser back
agent-browser forward
agent-browser reload

# Screenshots
agent-browser screenshot [path]
agent-browser screenshot --full-page [path]

# Page info
agent-browser snapshot          # Interactive elements with @eN refs
agent-browser get url
agent-browser get title
agent-browser get text          # Full page text
agent-browser get text <selector>

# Interaction
agent-browser click <@eN|selector>
agent-browser fill <@eN|selector> <value>
agent-browser type <@eN|selector> <text>
agent-browser scroll <up|down|left|right> [pixels]
agent-browser press <key>

# JavaScript
agent-browser eval <"javascript">

# Wait
agent-browser wait <selector|ms> [timeout]

# Session
agent-browser close
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `agent-browser: command not found` | Run install.js or `npm install -g agent-browser` |
| Chrome not found | Run `agent-browser install` to download Chrome |
| ETIMEDOUT on `open` | Network restricted → Go to Step 4, use AskUserQuestion to let user choose |
| Snapshot returns empty | Page still loading. Use `agent-browser wait` before snapshot |
| Click fails | Re-run `snapshot` after page changes. `@eN` refs may have shifted |
| Windows PowerShell errors | Use Git Bash, CMD, or WSL2 |
| Element not found | Always use `snapshot` first to get current `@eN` refs |

## File Locations

| File | Path | Purpose |
|------|------|---------|
| SKILL.md | `~/.claude/skills/agent-browser-guide/SKILL.md` | This guide |
| install.js | `~/.claude/skills/agent-browser-guide/scripts/install.js` | CLI installer |
| browser.js | `~/.claude/skills/agent-browser-guide/scripts/browser.js` | JSON helper for multi-step ops |
| cli-reference.md | `~/.claude/skills/agent-browser-guide/references/cli-reference.md` | Full command reference (read when you need detailed command info) |

## When to Read cli-reference.md

Read the reference file when you need:
- Specific command flags or options not covered above
- Advanced features (network mocking, video recording, React DevTools)
- Troubleshooting details beyond the quick table
- Session management, auth, proxy configuration

**Do NOT read it upfront** — the Quick Reference Card above covers 90% of tasks.
