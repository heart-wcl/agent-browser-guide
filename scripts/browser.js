#!/usr/bin/env node
/**
 * Agent Browser Helper — CLI wrapper for browser automation.
 * Output: JSON { success, results, screenshots? }
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const IS_WIN = os.platform() === 'win32';

function runFile(command, args = [], timeout = 60000) {
  try {
    const out = execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout,
    });
    return { ok: true, out: out.trim() };
  } catch (e) {
    return { ok: false, out: e.stdout?.toString() || '', err: e.stderr?.toString() || e.message };
  }
}

function findBinary() {
  const direct = runFile('agent-browser', ['--version'], 5000);
  if (direct.ok) return 'agent-browser';

  const npmBin = runFile('npm', ['bin', '-g'], 5000);
  if (!npmBin.ok) return null;

  const binaryPath = path.join(npmBin.out, IS_WIN ? 'agent-browser.cmd' : 'agent-browser');
  return fs.existsSync(binaryPath) ? binaryPath : null;
}

const AGENT_BROWSER = findBinary();

function runAgentBrowser(args, timeout = 60000) {
  if (!AGENT_BROWSER) {
    return { ok: false, err: 'agent-browser CLI not found. Run: node install.js' };
  }
  return runFile(AGENT_BROWSER, args, timeout);
}

const handlers = {
  navigate: async (action, state) => {
    const url = action.url || action.target;
    if (!url) throw new Error('navigate requires "url"');
    const r = runAgentBrowser(['open', url], 30000);
    if (!r.ok) throw new Error(r.err);
    state.hasSnapshot = false;
    return { url, message: r.out || 'Navigated' };
  },

  screenshot: async (action, state) => {
    if (!state.hasSnapshot) {
      throw new Error('snapshot required before screenshot');
    }
    const outPath = action.output || action.path || path.join(os.tmpdir(), `ab-screenshot-${Date.now()}.png`);
    const args = action.fullPage
      ? ['screenshot', '--full-page', '--output', outPath]
      : ['screenshot', '--output', outPath];
    const r = runAgentBrowser(args, 30000);
    if (!r.ok) throw new Error(r.err);
    const base64 = fs.existsSync(outPath) ? fs.readFileSync(outPath).toString('base64') : null;
    return { path: outPath, base64: base64 ? `data:image/png;base64,${base64}` : null };
  },

  snapshot: async (action, state) => {
    const args = action.interactive === false ? ['snapshot'] : ['snapshot', '-i'];
    const r = runAgentBrowser(args, 30000);
    if (!r.ok) throw new Error(r.err);
    state.hasSnapshot = true;
    return { snapshot: r.out };
  },

  click: async (action, state) => {
    const el = action.element || action.ref || action.target;
    if (!el) throw new Error('click requires "element"');
    const r = runAgentBrowser(['click', el], 30000);
    if (!r.ok) throw new Error(r.err);
    state.hasSnapshot = false;
    return { clicked: el, result: r.out };
  },

  fill: async (action, state) => {
    const el = action.element || action.ref;
    const val = action.value || action.text;
    if (!el || val === undefined) throw new Error('fill requires "element" and "value"');
    const r = runAgentBrowser(['fill', el, String(val)], 30000);
    if (!r.ok) throw new Error(r.err);
    state.hasSnapshot = false;
    return { filled: el, value: val };
  },

  type: async (action, state) => {
    const el = action.element || action.ref;
    const text = action.text || action.value;
    if (!el || !text) throw new Error('type requires "element" and "text"');
    const r = runAgentBrowser(['type', el, String(text)], 30000);
    if (!r.ok) throw new Error(r.err);
    state.hasSnapshot = false;
    return { typed: text, element: el };
  },

  scroll: async (action, state) => {
    const dir = action.direction || action.dir || 'down';
    const amount = action.amount || action.distance || '1000';
    const r = runAgentBrowser(['scroll', dir, String(amount)], 30000);
    if (!r.ok) throw new Error(r.err);
    state.hasSnapshot = false;
    return { direction: dir, amount };
  },

  press: async (action, state) => {
    const key = action.key || action.button;
    if (!key) throw new Error('press requires "key"');
    const r = runAgentBrowser(['press', key], 30000);
    if (!r.ok) throw new Error(r.err);
    state.hasSnapshot = false;
    return { pressed: key };
  },

  evaluate: async (action, state) => {
    const script = action.script || action.js || action.code;
    if (!script) throw new Error('evaluate requires "script"');
    const r = runAgentBrowser(['eval', script], 30000);
    if (!r.ok) throw new Error(r.err);
    state.hasSnapshot = false;
    return { result: r.out };
  },

  wait: async (action) => {
    const target = action.selector || action.element || action.for || action.ms || action.timeoutMs;
    const timeout = action.timeout || 30000;
    if (!target) throw new Error('wait requires "selector" or "ms"');
    const r = runAgentBrowser(['wait', String(target), String(timeout)], timeout + 5000);
    if (!r.ok) throw new Error(r.err);
    return { waitedFor: target };
  },

  close: async () => {
    const r = runAgentBrowser(['close'], 15000);
    return { closed: true, result: r.out };
  },

  getText: async (action) => {
    const args = action.selector || action.element
      ? ['get', 'text', action.selector || action.element]
      : ['get', 'text'];
    const r = runAgentBrowser(args, 30000);
    if (!r.ok) throw new Error(r.err);
    return { text: r.out };
  },

  getUrl: async () => {
    const r = runAgentBrowser(['get', 'url'], 10000);
    if (!r.ok) throw new Error(r.err);
    return { url: r.out };
  },

  getTitle: async () => {
    const r = runAgentBrowser(['get', 'title'], 10000);
    if (!r.ok) throw new Error(r.err);
    return { title: r.out };
  },
};

function parseActions() {
  const execArg = process.argv.find((_, i) => process.argv[i - 1] === 'exec');
  if (execArg) {
    const parsedActions = JSON.parse(execArg);
    return Array.isArray(parsedActions) ? parsedActions : [parsedActions];
  }

  if (process.argv[2] && !process.argv[2].startsWith('{')) {
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
    if (!actionMap[cmd]) throw new Error(`Unknown command: ${cmd}`);
    return [actionMap[cmd]];
  }

  const stdin = fs.readFileSync(0, 'utf8');
  const parsedActions = JSON.parse(stdin);
  return Array.isArray(parsedActions) ? parsedActions : [parsedActions];
}

async function executeAction(action, state) {
  const handler = handlers[action.action];
  if (!handler) {
    throw new Error(`Unknown action: ${action.action}. Available: ${Object.keys(handlers).join(', ')}`);
  }
  return await handler(action, state);
}

async function main() {
  const actions = parseActions();
  const state = { hasSnapshot: false };
  const results = [];
  const screenshots = [];

  for (const action of actions) {
    try {
      const result = await executeAction(action, state);
      results.push({ action: action.action, success: true, data: result });
      if (result.base64) screenshots.push({ action: action.action, path: result.path, base64: result.base64 });
    } catch (e) {
      results.push({ action: action.action, success: false, error: e.message });
    }
  }

  console.log(JSON.stringify({
    success: results.every((r) => r.success),
    results,
    screenshots: screenshots.length > 0 ? screenshots : undefined,
  }, null, 2));
}

main().catch((e) => {
  console.log(JSON.stringify({
    success: false,
    error: e.message || 'Usage: node browser.js exec \'{"action":"navigate","url":"..."}\' OR pipe JSON array',
  }));
  process.exit(1);
});
