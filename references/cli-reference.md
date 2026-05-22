# Agent Browser CLI 参考手册

> 内置精简版。完整版请运行: `agent-browser skills get core --full`

## 核心工作流 (必看)

```bash
agent-browser open <url>        # 1. 打开页面
agent-browser snapshot -i       # 2. 获取交互元素 @eN refs
agent-browser click @e3         # 3. 用 ref 操作
agent-browser snapshot -i       # 4. 页面变化后重新 snapshot
```

**关键规则**: `@eN` refs 在页面变化后立即失效，每次操作后必须重新 snapshot。

---

## 导航

```bash
agent-browser open <url>              # 打开 URL
agent-browser open --enable react-devtools <url>  # 带 React DevTools
agent-browser back                    # 后退
agent-browser forward                 # 前进
agent-browser reload                  # 刷新
agent-browser pushstate <url>         # SPA 路由导航
agent-browser close                   # 关闭浏览器
```

---

## 页面分析 (Snapshot)

```bash
agent-browser snapshot                # 完整可访问性树
agent-browser snapshot -i             # 仅交互元素 (推荐)
agent-browser snapshot -i -u          # 包含链接 href
agent-browser snapshot -i -c          # 紧凑模式
agent-browser snapshot -i -d 3        # 限制深度3层
agent-browser snapshot -s "#main"     # 限定 CSS 选择器范围
agent-browser snapshot -i --json      # JSON 格式输出
```

### Snapshot 输出示例

```
Page: Example - Log in
URL: https://example.com/login

@e1 [heading] "Log in"
@e2 [form]
  @e3 [input type="email"] placeholder="Email"
  @e4 [input type="password"] placeholder="Password"
  @e5 [button type="submit"] "Continue"
  @e6 [link] "Forgot password?"
```

---

## 交互操作

```bash
agent-browser click @e1                    # 点击
agent-browser click @e1 --new-tab          # 新标签页打开
agent-browser dblclick @e1                 # 双击
agent-browser hover @e1                    # 悬停
agent-browser focus @e1                    # 聚焦
agent-browser fill @e2 "hello"             # 清空后输入
agent-browser type @e2 " world"            # 追加输入
agent-browser press Enter                  # 按键
agent-browser press Control+a              # 组合键
agent-browser check @e3                   # 勾选
agent-browser uncheck @e3                 # 取消勾选
agent-browser select @e4 "option-value"   # 下拉选择
agent-browser select @e4 "a" "b"          # 多选
agent-browser upload @e5 file1.pdf        # 上传文件
agent-browser scroll down 500             # 滚动
agent-browser scrollintoview @e1          # 滚动到元素可见
agent-browser drag @e1 @e2                # 拖拽
```

### 语义定位 (不用 snapshot 时)

```bash
agent-browser find role button click --name "Submit"
agent-browser find text "Sign In" click
agent-browser find label "Email" fill "user@test.com"
agent-browser find placeholder "Search" type "query"
agent-browser find testid "submit-btn" click
agent-browser find first ".card" click
agent-browser find nth 2 ".card" hover
```

### 原始 CSS 选择器 (fallback)

```bash
agent-browser click "#submit"
agent-browser fill "input[name=email]" "user@test.com"
agent-browser click "button.primary"
```

**优先级**: snapshot + @eN refs > find 语义定位 > 原始 CSS

---

## 等待 (非常重要)

Agents 失败更多是因为等待不当而不是选择器问题。

```bash
agent-browser wait @e1                     # 等待元素出现
agent-browser wait 2000                    # 固定等待毫秒 (最后手段)
agent-browser wait --text "Success"        # 等待文本出现
agent-browser wait --url "**/dashboard"    # 等待 URL 匹配
agent-browser wait --load networkidle      # 网络空闲 (SPA 导航推荐)
agent-browser wait --load domcontentloaded # DOM 加载完成
agent-browser wait --fn "window.ready"     # JS 条件满足
```

**页面变化后的等待策略**:
- 等待特定元素: `wait @ref` 或 `wait --text "..."`
- 等待 URL 变化: `wait --url "**/new-page"`
- 等待网络空闲: `wait --load networkidle` (SPA 推荐)
- 避免裸 `wait 2000` — 慢且不稳定

默认超时: 25 秒。

---

## 信息提取

```bash
agent-browser get text @e1               # 元素可见文本
agent-browser get html @e1               # innerHTML
agent-browser get value @e1              # input 值
agent-browser get attr @e1 href          # 任意属性
agent-browser get title                  # 页面标题
agent-browser get url                    # 当前 URL
agent-browser get count ".item"          # 匹配元素数量
agent-browser get box @e1                # 边界框
agent-browser get styles @e1             # 计算样式
```

---

## 截图

截图永远不是第一步。必须先执行 `agent-browser snapshot -i`，只有在已经拿到 snapshot 或 snapshot 无法支撑视觉判断时才截图。

```bash
agent-browser snapshot -i                       # 必须先做
agent-browser screenshot                        # 临时路径
agent-browser screenshot page.png               # 指定路径
agent-browser screenshot --full full.png        # 全页截图
agent-browser screenshot --annotate map.png     # 带编号标注 (多模态模型友好)
```

`--annotate`: 每个 `[N]` 标签映射到 snapshot ref `@eN`。

---

## JavaScript 执行

```bash
agent-browser eval "document.title"          # 简单表达式
agent-browser eval -b "<base64>"              # 任意 JS (base64)
agent-browser eval --stdin                    # 从 stdin 读取
```

**复杂脚本用 heredoc**:
```bash
cat <<'EOF' | agent-browser eval --stdin
const rows = document.querySelectorAll("table tbody tr");
Array.from(rows).map(r => ({
  name: r.cells[0].innerText,
  price: r.cells[1].innerText,
}));
EOF
```

---

## 标签页管理

```bash
agent-browser tab                              # 列出标签页
agent-browser tab new https://docs...          # 新建标签页
agent-browser tab new --label docs [url]       # 带标签名
agent-browser tab t2                           # 切换到 t2
agent-browser tab docs                         # 按标签名切换
agent-browser tab close t2                     # 关闭标签页
```

标签 ID 是稳定的 (`t1`, `t2`...)，不会因其他标签变化而变。

---

## 会话管理

```bash
agent-browser state save auth.json     # 保存 cookies/storage
agent-browser state load auth.json     # 恢复
```

### 自动保存/恢复

```bash
# 自动保存/恢复
AGENT_BROWSER_SESSION_NAME=myapp agent-browser open https://app.com

# 加密
export AGENT_BROWSER_ENCRYPTION_KEY=$(openssl rand -hex 32)
agent-browser --session-name secure open https://app.com
```

### 多会话并行

```bash
agent-browser --session a open https://app.com
agent-browser --session b open https://app.com
agent-browser --session a fill @e1 "alice"
agent-browser --session b fill @e1 "bob"
```

---

## 网络拦截

```bash
agent-browser network route "**/api/users" --body '{"users":[]}'   # mock
agent-browser network route "**/analytics" --abort                  # 阻断
agent-browser network requests                                      # 查看请求
agent-browser network har start                                     # 录制 HAR
agent-browser network har stop /tmp/trace.har                       # 保存
```

---

## 视频录制

```bash
agent-browser record start demo.webm
agent-browser open https://example.com
agent-browser click @e3
agent-browser record stop
```

---

## 对话框

```bash
agent-browser dialog status         # 检查是否有待处理对话框
agent-browser dialog accept         # 接受
agent-browser dialog accept "text"  # 接受并输入
agent-browser dialog dismiss        # 取消
```

`alert` 和 `beforeunload` 默认自动接受，不会阻塞。

---

## React / Web Vitals

```bash
agent-browser open --enable react-devtools http://localhost:3000
agent-browser react tree                         # 组件树
agent-browser react inspect <fiberId>            # props/hooks/state
agent-browser react renders start                # 开始录制重渲染
agent-browser react renders stop                 # 停止并输出
agent-browser vitals [url]                       # LCP/CLS/TTFB/FCP/INP
agent-browser pushstate <url>                    # SPA 导航
```

---

## 诊断

```bash
agent-browser doctor                     # 完整诊断
agent-browser doctor --offline --quick   # 快速本地诊断
agent-browser doctor --fix               # 自动修复
```

---

## 全局选项

```bash
--session <name>        # 隔离会话
--json                  # JSON 输出
--headed                # 显示窗口 (默认 headless)
--full                  # 全页截图 (-f)
--proxy <url>           # 代理
--headers <json>        # HTTP 头
--state <path>          # 加载保存的状态
--session-name <name>   # 自动保存/恢复
```

---

## 故障排查速查

| 问题 | 解决 |
|------|------|
| Ref not found / Element not found: @eN | 页面变了，重新 snapshot |
| 元素在 DOM 但不在 snapshot | 滚动或等待: `scroll down 1000` 或 `wait --text "..."` |
| 点击无效 / 被覆盖 | Snapshot 找关闭/取消按钮，点击后重新 snapshot |
| fill/type 无效 | `focus @e1` 然后 `keyboard inserttext "text"` |
| 跨域 iframe 不可访问 | 用 `frame` 命令切换或改用 `eval` |
| 认证过期 | 用 `--session-name` 或 `state save/load` 持久化 |

---

## 环境变量

```bash
AGENT_BROWSER_SESSION="mysession"            # 默认会话名
AGENT_BROWSER_EXECUTABLE_PATH="/path/chrome" # 自定义浏览器路径
AGENT_BROWSER_ENABLE="react-devtools"        # 启用功能
```
