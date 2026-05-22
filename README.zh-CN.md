# Agent Browser Guide

一个 Claude Code skill，强制所有浏览器自动化任务使用 **Vercel Agent Browser CLI**，而非 MCP 工具或 Playwright。

## 为什么

默认情况下，Claude Code 可能会使用 Playwright MCP 或其他浏览器 MCP 工具进行网页自动化。本 skill 强制采用 **CLI 优先** 的方式，使用 `agent-browser` 命令：

- 安装后立即可用（无需 MCP 配置，无需重启）
- 比基于 MCP 的浏览器工具更节省 token
- 支持截图、快照、表单填写、点击和 JavaScript 执行

## 安装

```bash
npx skills add heart-wcl/agent-browser-guide
```

或全局安装：

```bash
npx skills add heart-wcl/agent-browser-guide -g
```

## 前置条件

- Node.js >= 18
- npm

本 skill 包含自动安装器，会自动下载并配置 `agent-browser` CLI 和 Chrome for Testing。

## 使用

安装后，任何浏览器相关请求（导航、截图、点击、填写表单等）都会自动触发本 skill，通过 Bash 使用 `agent-browser` CLI 执行。

### 示例

```bash
# 导航
agent-browser open https://example.com

# 截图
agent-browser screenshot ./result.png

# 获取可交互元素
agent-browser snapshot

# 点击元素（通过 @eN 引用）
agent-browser click @e5

# 填写表单
agent-browser fill @e2 "搜索文本"

# 等待元素出现
agent-browser wait "#results" 10000
```

## 文件说明

| 文件 | 用途 |
|------|---------|
| `SKILL.md` | Skill 定义，包含规则和工作流 |
| `scripts/install.js` | agent-browser CLI 自动安装器 |
| `scripts/browser.js` | 批量浏览器操作的 JSON 封装 |
| `references/cli-reference.md` | 完整 CLI 命令参考 |

## 规则

- **硬性规则**: 永远不要使用 MCP 工具进行浏览器任务
- **硬性规则**: 一旦选定 agent-browser，绝不要切换到其他工具
- 如果未安装 `agent-browser`，自动运行内置安装脚本
- 网络故障时最多重试 2 次，之后询问用户

## 许可证

MIT
