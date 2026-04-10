import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { parseArgs } from '../src/parse-args.mjs';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('parseArgs', () => {
  it('no args returns defaults', () => {
    const result = parseArgs(['node', 's']);
    expect(result).toEqual({
      agents: [],
      dryRun: false,
      yes: false,
      help: false,
      dir: process.cwd(),
    });
  });

  it('--dry-run sets dryRun: true', () => {
    expect(parseArgs(['node', 's', '--dry-run']).dryRun).toBe(true);
  });

  it('-d sets dryRun: true', () => {
    expect(parseArgs(['node', 's', '-d']).dryRun).toBe(true);
  });

  it('-y sets yes: true', () => {
    expect(parseArgs(['node', 's', '-y']).yes).toBe(true);
  });

  it('--help sets help: true', () => {
    expect(parseArgs(['node', 's', '--help']).help).toBe(true);
  });

  it('-h sets help: true', () => {
    expect(parseArgs(['node', 's', '-h']).help).toBe(true);
  });

  it('--dir sets dir to resolved path', () => {
    expect(parseArgs(['node', 's', '--dir', '/some/path']).dir).toBe(resolve('/some/path'));
  });

  it('--dir with no following value calls process.exit(1)', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    parseArgs(['node', 's', '--dir']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('--claude-code adds to agents', () => {
    expect(parseArgs(['node', 's', '--claude-code']).agents).toEqual(['claude-code']);
  });

  it('multiple agent flags collected in order', () => {
    expect(parseArgs(['node', 's', '--claude-code', '--cursor']).agents).toEqual([
      'claude-code',
      'cursor',
    ]);
  });

  it('unknown flag calls process.exit(1)', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    parseArgs(['node', 's', '--unknown-flag-xyz']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('combined round-trip', () => {
    const result = parseArgs(['node', 's', '--claude-code', '--dry-run', '-y', '--dir', '/tmp']);
    expect(result).toEqual({
      agents: ['claude-code'],
      dryRun: true,
      yes: true,
      help: false,
      dir: resolve('/tmp'),
    });
  });
});
