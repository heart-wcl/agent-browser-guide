#!/usr/bin/env node
/**
 * Agent Browser CLI Auto-Installer
 * Installs only the local agent-browser CLI (no MCP server).
 * After installation, browser commands are available immediately via Bash.
 *
 * Usage: node install.js [--check-only]
 *   --check-only    Only check if agent-browser CLI is available
 *
 * Exit codes:
 *   0 = agent-browser CLI is available
 *   1 = agent-browser CLI not available and installation failed
 *   2 = prerequisites missing (Node.js/npm not found)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHECK_ONLY = process.argv.includes('--check-only');
const IS_WIN = os.platform() === 'win32';

// ─── Colors ──────────────────────────────────────────────────────────────────
const R = '\x1b[31m', G = '\x1b[32m', Y = '\x1b[33m', B = '\x1b[34m', C = '\x1b[36m', N = '\x1b[0m';
function log(level, msg) {
  const prefix = level === 'ok' ? `${G}[OK]${N}` : level === 'warn' ? `${Y}[WARN]${N}` : level === 'err' ? `${R}[ERR]${N}` : `${B}[INFO]${N}`;
  console.log(`${prefix} ${msg}`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function run(cmd, opts = {}) {
  try {
    const r = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts });
    return { ok: true, out: r.trim() };
  } catch (e) {
    return { ok: false, out: '', err: e.stderr?.toString() || e.message };
  }
}

function which(bin) {
  const cmd = IS_WIN ? `where ${bin} 2>nul` : `which ${bin} 2>/dev/null`;
  const r = run(cmd);
  return r.ok ? r.out.split(/\r?\n/)[0].trim() : null;
}

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

// ─── Check if agent-browser CLI works ────────────────────────────────────────
function checkAgentBrowser() {
  const r = run('agent-browser --version', { timeout: 10000 });
  if (r.ok) return { available: true, version: r.out, path: which('agent-browser') };

  const r2 = run('npx agent-browser --version', { timeout: 30000 });
  if (r2.ok) return { available: true, version: r2.out, via: 'npx' };

  // Check npm global bin as fallback
  const npmBin = run('npm bin -g');
  if (npmBin.ok) {
    const globalAgentBrowser = path.join(npmBin.out, IS_WIN ? 'agent-browser.cmd' : 'agent-browser');
    if (exists(globalAgentBrowser)) {
      const r3 = run(`"${globalAgentBrowser}" --version`, { timeout: 10000 });
      if (r3.ok) return { available: true, version: r3.out, path: globalAgentBrowser };
    }
  }

  return { available: false };
}

// ─── Install agent-browser CLI ───────────────────────────────────────────────
function installAgentBrowserCLI() {
  log('info', 'Installing agent-browser CLI...');

  // Try global install first
  const r = run('npm install -g agent-browser', { timeout: 180000 });
  if (r.ok) {
    log('ok', 'agent-browser CLI installed globally');
    return { ok: true };
  }

  log('warn', `Global install failed: ${r.err}`);
  log('info', 'Trying local install in skill directory...');

  // Fallback: local install in skill directory
  const skillDir = path.dirname(__dirname);
  const localDir = path.join(skillDir, '.local');
  fs.mkdirSync(localDir, { recursive: true });

  const r2 = run('npm init -y && npm install agent-browser', { cwd: localDir, timeout: 180000 });
  if (r2.ok) {
    const localBin = path.join(localDir, 'node_modules', '.bin');
    log('ok', `Installed locally at ${localBin}`);
    return { ok: true, localBin };
  }

  return { ok: false, error: r2.err || r.err };
}

// ─── Install Chrome ──────────────────────────────────────────────────────────
function installChrome() {
  log('info', 'Installing Chrome for Testing (~150MB, may take a few minutes)...');
  const r = run('agent-browser install', { timeout: 600000 });
  if (r.ok) {
    log('ok', 'Chrome installed successfully');
    return { ok: true };
  }

  log('warn', `Chrome install failed: ${r.err}`);
  log('info', 'You may already have Chrome installed, or you can install it later with: agent-browser install');
  return { ok: false, warning: true };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`${C}╔══════════════════════════════════════════════════════════════╗${N}`);
  console.log(`${C}║     Agent Browser CLI Installer                              ║${N}`);
  console.log(`${C}║     (Local CLI commands — no MCP restart needed)             ║${N}`);
  console.log(`${C}╚══════════════════════════════════════════════════════════════╝${N}\n`);

  // Check prerequisites
  log('info', 'Checking prerequisites...');
  const nodePath = which('node');
  const npmPath = which('npm');
  if (!nodePath || !npmPath) {
    log('err', 'Node.js and npm are required. Please install from https://nodejs.org');
    process.exit(2);
  }
  log('ok', `Node.js: ${nodePath}`);
  log('ok', `npm: ${npmPath}`);

  // Check if already available
  log('info', 'Checking if agent-browser CLI is available...');
  const abCheck = checkAgentBrowser();
  if (abCheck.available) {
    log('ok', `agent-browser CLI ready: ${abCheck.version}`);
    if (abCheck.path) log('info', `Path: ${abCheck.path}`);
    if (CHECK_ONLY) process.exit(0);

    // Ensure Chrome is installed
    const chromeCheck = run('agent-browser install --check', { timeout: 30000 });
    if (!chromeCheck.ok) {
      log('warn', 'Chrome may not be installed. Attempting to install...');
      installChrome();
    } else {
      log('ok', 'Chrome is ready');
    }

    console.log(`\n${G}✓ agent-browser CLI is already installed and ready to use.${N}`);
    console.log(`${B}  Try: agent-browser open https://example.com${N}\n`);
    process.exit(0);
  }

  if (CHECK_ONLY) {
    log('err', 'agent-browser CLI is NOT installed');
    process.exit(1);
  }

  // Install
  log('warn', 'agent-browser CLI not found. Starting installation...');
  const cliResult = installAgentBrowserCLI();
  if (!cliResult.ok) {
    log('err', `Installation failed: ${cliResult.error}`);
    console.log(`\n${Y}Please try manual installation:${N}`);
    console.log('  npm install -g agent-browser');
    console.log('  agent-browser install');
    process.exit(1);
  }

  // Install Chrome
  const chromeResult = installChrome();

  // Verify
  const abVerify = checkAgentBrowser();
  if (!abVerify.available) {
    log('err', 'agent-browser CLI still not working after installation');
    if (cliResult.localBin) {
      console.log(`\n${Y}CLI installed locally. Use this path:${N}`);
      console.log(`  ${cliResult.localBin}`);
    }
    process.exit(1);
  }

  log('ok', `Verified: ${abVerify.version}`);

  console.log(`\n${G}╔══════════════════════════════════════════════════════════════╗${N}`);
  console.log(`${G}║  Installation Complete!                                      ║${N}`);
  console.log(`${G}╚══════════════════════════════════════════════════════════════╝${N}`);
  console.log(`\n${G}✓ agent-browser CLI is ready to use immediately.${N}`);
  console.log(`${B}  No restart needed!${N}\n`);
  console.log('Quick start:');
  console.log('  agent-browser open https://example.com');
  console.log('  agent-browser screenshot');
  console.log('  agent-browser snapshot');
  if (cliResult.localBin) {
    console.log(`\n${Y}Note: Installed locally. Use full path or add to PATH:${N}`);
    console.log(`  export PATH="${cliResult.localBin}:$PATH"  # macOS/Linux`);
    console.log(`  set PATH=${cliResult.localBin};%PATH%       # Windows`);
  }
  console.log();
  process.exit(0);
}

main().catch(e => {
  console.error(`${R}[FATAL]${N}`, e.message);
  process.exit(1);
});
