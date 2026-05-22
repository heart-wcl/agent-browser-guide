#!/usr/bin/env node
/**
 * Agent Browser Helper — CLI wrapper for browser automation
 * Simplifies agent-browser CLI usage with JSON input/output.
 *
 * Usage:
 *   node browser.js exec '{"action":"navigate","url":"https://example.com"}'
 *   node browser.js exec '{"action":"screenshot","output":"/tmp/page.png"}'
 *   node browser.js exec '{"action":"snapshot"}'
 *   node browser.js exec '{"action":"click","element":"@e3"}'
 *   node browser.js exec '{"action":"fill","element":"@e2","value":"text"}'
 *
 * Or pipe JSON array of actions:
 *   echo '[{"action":"navigate","url":"..."},{"action":"screenshot"}]' | node browser.js
 *
 * Output: JSON { success, data, error, screenshots:[] }
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const IS_WIN = os.platform() === 'win32';

// ─── Find agent-browser binary ───────────────────────────────────────────────
function findBinary() {
  try {
    execSync('agent-browser --version', { stdio: 'pipe', timeout: 5000 });
    return 'agent-browser';
  } catch {
    try {
      const npmBin = execSync('npm bin -g', { encoding: 'utf8', stdio: 'pipe' }).trim();
      const p = path.join(npmBin, IS_WIN ? 'agent-browser.cmd' : 'agent-browser');
      if (fs.existsSync(p)) return `"${p}"`;
    } catch { /* ignore */ }
  }
  return null;
}

const AGENT_BROWSER = findBinary();

function run(cmd, timeout = 60000) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout });
    return { ok: true, out: out.trim() };
  } catch (e) {
    return { ok: false, out: e.stdout?.toString() || '', err: e.stderr?.toString() || e.message };
  }
}

// ─── Action handlers ─────────────────────────────────────────────────────────
const handlers = {
  navigate: async (action) => {
    const url = action.url || action.target;
    if (!url) throw new Error('navigate requires "url"');
    const r = run(`${AGENT_BROWSER} open "${url}"`, 30000);
    if (!r.ok) throw new Error(r.err);
    return { url, message: r.out || 'Navigated' };
  },

  screenshot: async (action) => {
    const outPath = action.output || action.path || path.join(os.tmpdir(), `ab-screenshot-${Date.now()}.png`);
    const fullPage = action.fullPage ? '--full-page' : '';
    const r = run(`${AGENT_BROWSER} screenshot ${fullPage} --output "${outPath}"`, 30000);
    if (!r.ok) throw new Error(r.err);
    // Read screenshot as base64 for AI to use
    let base64 = null;
    if (fs.existsSync(outPath)) {
      base64 = fs.readFileSync(outPath).toString('base64');
    }
    return { path: outPath, base64: base64 ? `data:image/png;base64,${base64}` : null };
  },

  snapshot: async (action) => {
    const interactive = action.interactive !== false ? '-i' : '';
    const r = run(`${AGENT_BROWSER} snapshot ${interactive}`, 30000);
    if (!r.ok) throw new Error(r.err);
    return { snapshot: r.out };
  },

  click: async (action) => {
    const el = action.element || action.ref || action.target;
    if (!el) throw new Error('click requires "element"');
    const r = run(`${AGENT_BROWSER} click "${el}"`, 30000);
    if (!r.ok) throw new Error(r.err);
    return { clicked: el, result: r.out };
  },

  fill: async (action) => {
    const el = action.element || action.ref;
    const val = action.value || action.text;
    if (!el || val === undefined) throw new Error('fill requires "element" and "value"');
    const r = run(`${AGENT_BROWSER} fill "${el}" "${val}"`, 30000);
    if (!r.ok) throw new Error(r.err);
    return { filled: el, value: val };
  },

  type: async (action) => {
    const el = action.element || action.ref;
    const text = action.text || action.value;
    if (!el || !text) throw new Error('type requires "element" and "text"');
    const r = run(`${AGENT_BROWSER} type "${el}" "${text}"`, 30000);
    if (!r.ok) throw new Error(r.err);
    return { typed: text, element: el };
  },

  scroll: async (action) => {
    const dir = action.direction || action.dir || 'down';
    const amount = action.amount || action.distance || '1000';
    const r = run(`${AGENT_BROWSER} scroll ${dir} ${amount}`, 30000);
    if (!r.ok) throw new Error(r.err);
    return { direction: dir, amount };
  },

  press: async (action) => {
    const key = action.key || action.button;
    if (!key) throw new Error('press requires "key"');
    const r = run(`${AGENT_BROWSER} press "${key}"`, 30000);
    if (!r.ok) throw new Error(r.err);
    return { pressed: key };
  },

  evaluate: async (action) => {
    const script = action.script || action.js || action.code;
    if (!script) throw new Error('evaluate requires "script"');
    const r = run(`${AGENT_BROWSER} evaluate "${script.replace(/"/g, '\\"')}"`, 30000);
    if (!r.ok) throw new Error(r.err);
    return { result: r.out };
  },

  wait: async (action) => {
    const selector = action.selector || action.element || action.for;
    const state = action.state || 'visible';
    const timeout = action.timeout || 30000;
    if (!selector) throw new Error('wait requires "selector"');
    const r = run(`${AGENT_BROWSER} wait-for "${selector}" --state ${state} --timeout ${timeout}`, timeout + 5000);
    if (!r.ok) throw new Error(r.err);
    return { waitedFor: selector, state };
  },

  close: async (action) => {
    const r = run(`${AGENT_BROWSER} close`, 15000);
    return { closed: true, result: r.out };
  },

  getText: async (action) => {
    const selector = action.selector || action.element;
    const cmd = selector
      ? `${AGENT_BROWSER} get-text "${selector}"`
      : `${AGENT_BROWSER} get-text`;
    const r = run(cmd, 30000);
    if (!r.ok) throw new Error(r.err);
    return { text: r.out };
  },

  getUrl: async (action) => {
    const r = run(`${AGENT_BROWSER} get-url`, 10000);
    if (!r.ok) throw new Error(r.err);
    return { url: r.out };
  },

  getTitle: async (action) => {
    const r = run(`${AGENT_BROWSER} get-title`, 10000);
    if (!r.ok) throw new Error(r.err);
    return { title: r.out };
  },
};

// ─── Execute single action ───────────────────────────────────────────────────
async function executeAction(action) {
  const handler = handlers[action.action];
  if (!handler) {
    throw new Error(`Unknown action: ${action.action}. Available: ${Object.keys(handlers).join(', ')}`);
  }
  return await handler(action);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  if (!AGENT_BROWSER) {
    console.log(JSON.stringify({
      success: false,
      error: 'agent-browser CLI not found. Run: node install.js'
    }));
    process.exit(1);
  }

  let actions = [];

  // Parse input
  const execArg = process.argv.find((_, i) => process.argv[i - 1] === 'exec');
  if (execArg) {
    try {
      actions = [JSON.parse(execArg)];
    } catch (e) {
      console.log(JSON.stringify({ success: false, error: `Invalid JSON: ${e.message}` }));
      process.exit(1);
    }
  } else if (process.argv[2] && !process.argv[2].startsWith('{')) {
    // Direct command mode: node browser.js navigate https://example.com
    const cmd = process.argv[2];
    const args = process.argv.slice(3);
    const actionMap = {
      navigate: { action: 'navigate', url: args[0] },
      screenshot: { action: 'screenshot', output: args[0] },
      snapshot: { action: 'snapshot' },
      click: { action: 'click', element: args[0] },
      fill: { action: 'fill', element: args[0], value: args[1] },
      type: { action: 'type', element: args[0], text: args[1] },
      scroll: { action: 'scroll', direction: args[0], amount: args[1] },
      press: { action: 'press', key: args[0] },
      evaluate: { action: 'evaluate', script: args[0] },
      wait: { action: 'wait', selector: args[0] },
      close: { action: 'close' },
    };
    if (actionMap[cmd]) {
      actions = [actionMap[cmd]];
    } else {
      console.log(JSON.stringify({ success: false, error: `Unknown command: ${cmd}` }));
      process.exit(1);
    }
  } else {
    // Read from stdin
    let stdin = '';
    try {
      stdin = fs.readFileSync(0, 'utf8');
      actions = JSON.parse(stdin);
      if (!Array.isArray(actions)) actions = [actions];
    } catch {
      console.log(JSON.stringify({
        success: false,
        error: 'Usage: node browser.js exec \'{"action":"navigate","url":"..."}\'  OR  pipe JSON array'
      }));
      process.exit(1);
    }
  }

  // Execute actions
  const results = [];
  const screenshots = [];

  for (const action of actions) {
    try {
      const result = await executeAction(action);
      results.push({ action: action.action, success: true, data: result });
      if (result.base64) {
        screenshots.push({ action: action.action, path: result.path, base64: result.base64 });
      }
    } catch (e) {
      results.push({ action: action.action, success: false, error: e.message });
    }
  }

  const output = {
    success: results.every(r => r.success),
    results,
    screenshots: screenshots.length > 0 ? screenshots : undefined,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch(e => {
  console.log(JSON.stringify({ success: false, error: e.message }));
  process.exit(1);
});
