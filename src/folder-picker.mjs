/**
 * Interactive terminal folder picker.
 * Navigate with arrow keys, Enter to open/select, Esc to cancel.
 * Zero extra dependencies — uses Node.js built-ins only.
 */

import { readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

// ── ANSI helpers ──────────────────────────────────────────────

const A = {
  clearLine : '\x1b[2K\r',
  up        : (n) => `\x1b[${n}A`,
  bold      : (s) => `\x1b[1m${s}\x1b[0m`,
  dim       : (s) => `\x1b[2m${s}\x1b[0m`,
  cyan      : (s) => `\x1b[36m${s}\x1b[0m`,
  green     : (s) => `\x1b[32m${s}\x1b[0m`,
  yellow    : (s) => `\x1b[33m${s}\x1b[0m`,
};

// ── Directory helpers ─────────────────────────────────────────

function listSubdirs(dir) {
  try {
    return readdirSync(dir)
      .filter((name) => {
        try { return statSync(join(dir, name)).isDirectory(); }
        catch { return false; }
      })
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

// ── Renderer ──────────────────────────────────────────────────

const VISIBLE = 10; // max rows shown at once

function buildLines(dir, entries, cursor, scrollOffset) {
  const lines = [];

  lines.push(
    `  ${A.bold('Choose folder')}  ${A.dim('─')}  ${A.cyan(dir)}`,
  );
  lines.push('');

  const window = entries.slice(scrollOffset, scrollOffset + VISIBLE);
  for (let i = 0; i < window.length; i++) {
    const entry    = window[i];
    const absIdx   = scrollOffset + i;
    const isCursor = absIdx === cursor;
    const marker   = isCursor ? `  ${A.bold('❯')} ` : '    ';

    let label;
    if (entry.type === 'select') {
      label = isCursor ? A.green(A.bold('✓  Select this folder')) : A.green('✓  Select this folder');
    } else if (entry.type === 'parent') {
      label = A.dim('../');
    } else {
      label = isCursor ? A.bold(A.cyan(`${entry.name}/`)) : A.dim(`${entry.name}/`);
    }

    lines.push(`${marker}${label}`);
  }

  // Scroll indicators
  if (scrollOffset > 0) {
    lines.splice(2, 0, A.dim('    ↑ more above'));
  }
  if (scrollOffset + VISIBLE < entries.length) {
    lines.push(A.dim('    ↓ more below'));
  }

  lines.push('');
  lines.push(A.dim('  ↑↓ navigate  ·  Enter open/select  ·  Esc cancel'));

  return lines;
}

// ── Main export ───────────────────────────────────────────────

/**
 * Opens an interactive folder browser starting at `startDir`.
 * Returns the chosen absolute path, or throws if cancelled.
 */
export function pickFolder(startDir = process.cwd()) {
  return new Promise((res, rej) => {
    let dir          = resolve(startDir);
    let entries      = [];
    let cursor       = 0;
    let scrollOffset = 0;
    let lastLineCount = 0;

    const { stdin, stdout } = process;

    // ── Build entries list ──────────────────────────────────
    function buildEntries() {
      const subdirs = listSubdirs(dir);
      entries = [
        { type: 'select' },
        { type: 'parent' },
        ...subdirs.map((name) => ({ type: 'dir', name })),
      ];
    }

    function clampScroll() {
      if (cursor < scrollOffset) scrollOffset = cursor;
      if (cursor >= scrollOffset + VISIBLE) scrollOffset = cursor - VISIBLE + 1;
    }

    // ── Render ──────────────────────────────────────────────
    function render() {
      clampScroll();
      const lines = buildLines(dir, entries, cursor, scrollOffset);

      // Erase previous render
      if (lastLineCount > 0) {
        stdout.write(A.up(lastLineCount));
      }

      const out = lines.map((l) => A.clearLine + l).join('\n') + '\n';
      stdout.write(out);
      lastLineCount = lines.length;
    }

    function refresh(resetCursor = true) {
      buildEntries();
      if (resetCursor) { cursor = 0; scrollOffset = 0; }
      render();
    }

    // ── Keyboard ─────────────────────────────────────────────
    function onKey(key) {
      const UP    = '\x1b[A';
      const DOWN  = '\x1b[B';
      const ENTER = '\r';
      const ESC   = '\x1b';
      const CTRL_C = '\x03';

      if (key === CTRL_C) {
        cleanup();
        process.exit(0);
      }

      if (key === ESC) {
        cleanup();
        rej(new Error('cancelled'));
        return;
      }

      if (key === UP) {
        cursor = (cursor - 1 + entries.length) % entries.length;
        render();
        return;
      }

      if (key === DOWN) {
        cursor = (cursor + 1) % entries.length;
        render();
        return;
      }

      if (key === ENTER) {
        const entry = entries[cursor];
        if (!entry) return;

        if (entry.type === 'select') {
          cleanup();
          res(dir);
        } else if (entry.type === 'parent') {
          dir = dirname(dir);
          refresh();
        } else {
          dir = join(dir, entry.name);
          refresh();
        }
      }
    }

    // ── Cleanup ──────────────────────────────────────────────
    function cleanup() {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onKey);
      // Print a blank line so subsequent clack output is clean
      stdout.write('\n');
    }

    // ── Start ────────────────────────────────────────────────
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf-8');
    stdin.on('data', onKey);

    refresh();
  });
}
