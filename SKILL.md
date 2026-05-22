---
name: agent-browser-guide
description: Use when a task involves browser automation, website navigation, screenshots, web pages, clicking, forms, scraping, page content, login, CAPTCHA, anti-bot, URL inspection, DOM elements, Chrome, Chromium, Playwright, Puppeteer, Selenium, browser MCPs, or web tests.
---

# Agent Browser Guide — CLI First

## Non-Negotiable Execution Contract

Follow this contract literally. Do not reinterpret it. Do not optimize it. Do not skip steps because the task looks simple.

1. Browser task detected → use this skill.
2. Browser task detected → use Bash only.
3. Bash command target → `agent-browser` only.
4. If `agent-browser` is missing → install it and wait.
5. After opening a page → run `snapshot` before any screenshot or visual reasoning.
6. After page-changing actions → run `snapshot` again.
7. If blocked → recover only with the procedures in this file.
8. If still blocked → use AskUserQuestion.
9. Without explicit user approval → never use WebSearch, WebFetch, Playwright, Puppeteer, Selenium, browser MCPs, or another website.
10. Before saying done → verify final state with snapshot, URL, title, text, or screenshot when visual validation is required.

If any step cannot be completed, stop at that step and ask the user. Never silently choose a different tool or source.

## One-Screen Checklist for Weak Models

Copy this checklist mentally before every browser task:

```text
[ ] Is this a browser/webpage/screenshot/click/form/navigation task? If yes, use this skill.
[ ] Run: agent-browser --version
[ ] If missing, run: node ~/.claude/skills/agent-browser-guide/scripts/install.js
[ ] Run: agent-browser open "<url>"
[ ] Run: agent-browser wait 1000
[ ] Run: agent-browser snapshot
[ ] Use @eN refs from the latest snapshot only
[ ] After click/fill/type/scroll/press/navigation, run snapshot again
[ ] Use screenshot only after snapshot, and only for visual evidence/fallback
[ ] If CAPTCHA/login/anti-bot/network/install failure blocks progress, use AskUserQuestion
[ ] Before final answer, verify with snapshot/get url/get title/get text/screenshot
```

## Forbidden Tool Matrix

| Situation | Forbidden action | Required action |
|-----------|------------------|-----------------|
| CLI missing | Use WebSearch/WebFetch instead | Install agent-browser and wait |
| Install slow | Start a different tool in parallel | Wait for installer to finish |
| Install failed | Pick fallback yourself | AskUserQuestion |
| Open timeout | Use another site/search engine | Close, retry twice, then AskUserQuestion |
| CAPTCHA/login/anti-bot | Bypass or switch source | AskUserQuestion |
| Snapshot empty | Start screenshot immediately | Wait, snapshot again, then screenshot fallback if needed |
| User asks screenshot | Screenshot first | Snapshot first, then screenshot |
| Need page facts | Infer from image only | Snapshot/get text first |
| Element ref fails | Keep clicking old ref | Snapshot again and use new ref |
| Any browser MCP available | Use MCP because convenient | Do not use MCP |

## Purpose

Ensure Claude ALWAYS uses **Vercel Agent Browser CLI** (`agent-browser`) for all browser
automation tasks. The CLI works immediately after installation — no MCP config, no restart needed.

## Red Flags — Stop Immediately

If any of these thoughts appear, the model is about to violate the skill:

- "This is just a quick website lookup."
- "The CLI failed once, so WebSearch is faster."
- "The user asked for a screenshot, so snapshot is unnecessary."
- "Playwright MCP is already available, so I can use it."
- "The page has CAPTCHA, so I can search another site."
- "I can infer the result from the screenshot."
- "The previous @eN ref probably still works."
- "I will install agent-browser in the background and use another tool meanwhile."

All red flags mean: stop, return to the Non-Negotiable Execution Contract, and continue from the first incomplete checkbox.

## Common Rationalizations and Required Corrections

| Rationalization | Correction |
|-----------------|------------|
| "WebSearch gives the answer faster." | Browser task already selected agent-browser. AskUserQuestion before fallback. |
| "The CLI is not installed." | Install it. Do not choose another tool. |
| "Installation is slow." | Wait. Do not parallelize another browser/search tool. |
| "Screenshot is what the user asked for." | Snapshot first, screenshot second. |
| "CAPTCHA blocks automation." | AskUserQuestion. Do not bypass or switch source. |
| "The page changed a little." | Old `@eN` refs are invalid; snapshot again. |
| "MCP is also agent-browser." | This skill is CLI-only; MCP is forbidden. |
| "I already know the page structure." | Verify current state with snapshot/get text/get url/get title. |

## Required User-Facing Status Lines

Use short status lines so the user can tell the protocol is being followed:

- Before first command: "我会使用 agent-browser CLI，并先检查是否已安装。"
- Before install: "agent-browser 未可用，我会先安装并等待完成，不切换其它工具。"
- Before first page inspection: "页面打开后我会先 snapshot，再决定是否需要截图。"
- When blocked: "agent-browser 被限制，我会用选择面板让你决定下一步。"
- Before final answer: "我会先验证最终页面状态，再汇报结果。"

## Why CLI over MCP?

| Factor | agent-browser CLI | MCP (any) |
|--------|-------------------|-----------|
| Setup time | Install → use immediately | Install → configure → restart Claude |
| Token efficiency | Same compact `@eN` system | Same (if using agent-browser MCP) |
| Speed | Direct Rust CLI execution | JSON-RPC overhead |
| Screenshot | Save to file, AI reads it | Depends on MCP implementation |
| Flexibility | Full CLI power + custom scripts | Limited to exposed MCP tools |

## HARD RULE: Tool Selection is Final

**Once a browser task is identified, agent-browser is the ONLY tool to use.** This includes failures, slow installs, CAPTCHAs, login walls, anti-bot pages, empty snapshots, and network errors. Do not switch to WebSearch, WebFetch, Playwright, Puppeteer, Selenium, browser MCPs, or a different website unless the user explicitly chooses that fallback through AskUserQuestion.

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
- Check agent-browser → missing → switch to WebFetch/WebSearch without installing
- Start with agent-browser → timeout → silently use Playwright MCP instead
- Use agent-browser AND WebSearch together for the same task
- Abandon agent-browser mid-task because installation takes time
- Hit CAPTCHA/login/anti-bot → switch search engines or scrape another source without user approval
- User asks for screenshot → skip snapshot and inspect only the image

**The ONLY valid fallback**: After install.js confirms "cannot install" (no Node.js, no npm, permission denied), or after agent-browser cannot proceed through the recovery rules below, use AskUserQuestion to ask whether to use fallback tools or fix the environment first.

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

If install.js reports a local fallback path under `.local/node_modules/.bin`, use that exact executable path for all later commands in this task instead of assuming `agent-browser` is globally available.

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
1. OPEN        → agent-browser open <url>
2. WAIT        → agent-browser wait 1000
3. SNAPSHOT    → agent-browser snapshot          ← ALWAYS first
4. ACT         → agent-browser click / fill / type / scroll
5. RESNAPSHOT  → agent-browser snapshot          ← after every page-changing action
6. FALLBACK    → agent-browser screenshot        ← ONLY when snapshot is insufficient
```

### Snapshot-First State Machine

```
open URL
  ↓
wait 1000-3000ms
  ↓
snapshot
  ↓
empty or missing actionable refs?
  ├─ no  → continue with @eN refs
  └─ yes → wait longer or wait for a known selector
            ↓
          snapshot again
            ↓
          still empty/incomplete?
            ├─ no  → continue with @eN refs
            └─ yes → screenshot fallback, but only for visual inspection
```

### Snapshot-First Rule

**ALWAYS use `snapshot` before `screenshot`.** Snapshot provides structured interactive element references (`@eN`) and is vastly more token-efficient. Screenshot is a visual-only fallback. Even when the user explicitly asks for a screenshot, run `snapshot` first unless the page is already known to be impossible to snapshot.

**When to use snapshot (default):**
- Finding clickable elements, buttons, links, inputs
- Understanding page structure and navigation
- Filling forms, clicking, typing
- Any task where you need to interact with the page

**When to use screenshot (fallback only):**
- Snapshot returns empty or incomplete (e.g., canvas-based UI, heavy JS frameworks)
- Visual layout validation is required (e.g., "does this look correct?")
- The task explicitly asks for a visual comparison or design check
- After trying snapshot twice and it cannot provide actionable element refs

**NEVER skip snapshot and go straight to screenshot.** Always attempt snapshot first, document why it failed, then fallback to screenshot.

### Re-Snapshot Rule

`@eN` refs are only valid for the current page state. Re-run `agent-browser snapshot` after any action that may change the page:

- click
- fill followed by submit/navigation
- type followed by dynamic search/autocomplete
- press Enter
- scroll
- route changes in single-page apps
- modal/dialog open or close

Do not continue using old `@eN` refs after the page changes.

### Completion Verification

Before reporting a browser task complete, verify the final state with at least one of:

- `agent-browser snapshot`
- `agent-browser get url`
- `agent-browser get title`
- `agent-browser get text`
- `agent-browser screenshot` only when visual validation is required

### Example: Navigate and Inspect

```bash
# 1. Navigate
agent-browser open "https://www.baidu.com"

# 2. ALWAYS snapshot first
agent-browser snapshot

# 3. Only screenshot if snapshot cannot provide what you need
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

# 6. Re-snapshot after navigation/results update
agent-browser snapshot

# 7. Screenshot only if the user needs visual evidence
agent-browser screenshot /tmp/baidu-results.png
```

### Example: Extract Prices from JD

```bash
# Navigate to search results
agent-browser open "https://search.jd.com/Search?keyword=RTX%205080"

# Always snapshot before extraction
agent-browser wait 2000
agent-browser snapshot

# Wait for product list if snapshot shows the page is still loading
agent-browser wait ".gl-item" 15000

# Re-snapshot after the product list appears
agent-browser snapshot

# Get text content
agent-browser get text ".gl-item"

# Screenshot only if visual confirmation is needed
agent-browser screenshot /tmp/jd-rtx5080.png
```

### Example: Multi-Step with browser.js

```bash
node ~/.claude/skills/agent-browser-guide/scripts/browser.js exec '
[
  {"action":"navigate","url":"https://example.com/login"},
  {"action":"snapshot"},
  {"action":"fill","element":"@e2","value":"user@example.com"},
  {"action":"fill","element":"@e3","value":"password"},
  {"action":"click","element":"@e4"},
  {"action":"wait","selector":".dashboard","timeout":10000},
  {"action":"snapshot"}
]'
```

Use `screenshot` in browser.js only when the task needs visual validation.

## Step 4: When agent-browser Cannot Proceed

### CAPTCHA, Login Wall, or Anti-Bot Page

If a CAPTCHA, login wall, bot check, manual verification, or anti-bot page appears:

- Do not bypass it.
- Do not switch to another search engine, WebSearch, WebFetch, Playwright, MCP, or scraping source.
- Do not claim success from partial page content.
- Use AskUserQuestion to ask the user what to do next.

Preferred AskUserQuestion options:

| Option | Action |
|--------|--------|
| A | User completes verification manually, then continue with `snapshot` |
| B | Use an existing browser profile/session if the user provides one |
| C | Retry the same site with agent-browser |
| D | Stop, or use a non-browser fallback only if the user explicitly approves |

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

# Step 2: Wait briefly in Bash/Git Bash
sleep 2

# Step 3: Retry the original open command
agent-browser open "<url>"
```

On Windows PowerShell, use `Start-Sleep -Seconds 2` instead of `sleep 2`.

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
| Snapshot returns empty | Page still loading. Use `agent-browser wait` before snapshot. If still empty after waiting, page may use canvas/heavy JS → fallback to `screenshot` |
| Click fails | Re-run `snapshot` after page changes. `@eN` refs may have shifted |
| Snapshot vs screenshot | **Default to snapshot.** Only use screenshot when: (1) snapshot is empty after retry, (2) visual layout check required, (3) explicit user request for visual comparison |
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
