import { open, readFile, stat, unlink } from 'node:fs/promises';
import { readFileSync, unlinkSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { hostname } from 'node:os';
import { promisify } from 'node:util';
import path from 'node:path';

const execute = promisify(execFile);

async function isReusedWindowsProcess(pid, filename) {
  if (process.platform !== 'win32') return false;
  try {
    const lock = await stat(filename);
    const { stdout } = await execute('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      `$ErrorActionPreference = 'Stop'; try { $started = (Get-Process -Id ${pid}).StartTime; if ($null -eq $started) { exit 1 }; ([DateTimeOffset]$started).ToUnixTimeMilliseconds() } catch { exit 1 }`,
    ], { windowsHide: true, timeout: 5000 });
    const startedAt = Number(stdout.trim());
    // A process created after the lock cannot be its original owner. Windows
    // reuses PIDs after a restart; an unrelated Node process may now have that ID.
    return Number.isSafeInteger(startedAt) && startedAt > lock.mtimeMs + 1000;
  } catch {
    // Keep the lock when process identity cannot be confirmed.
    return false;
  }
}

// File-backed data and in-memory sessions require one application process.
// Refuse a second writer rather than silently corrupting the database.
export async function lockPlatformDirectory(directory) {
  const filename = path.join(directory, '.platform.lock');
  const owner = { pid: process.pid, host: hostname() };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const file = await open(filename, 'wx', 0o600);
      try { await file.writeFile(JSON.stringify(owner)); } finally { await file.close(); }
      process.once('exit', () => {
        try {
          const current = JSON.parse(readFileSync(filename, 'utf8'));
          if (current.pid === owner.pid && current.host === owner.host) unlinkSync(filename);
        } catch { /* Process termination may already have removed the lock. */ }
      });
      return;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let current;
      try { current = JSON.parse(await readFile(filename, 'utf8')); }
      catch { throw new Error('Platform data is locked. Check the existing application process before restarting.'); }
      if (current.host === owner.host && Number.isSafeInteger(current.pid) && current.pid > 0) {
        try { process.kill(current.pid, 0); }
        catch (probe) {
          if (probe.code === 'ESRCH') { await unlink(filename); continue; }
        }
        if (await isReusedWindowsProcess(current.pid, filename)) {
          await unlink(filename);
          continue;
        }
        if (current.pid === owner.pid) return;
      }
      throw new Error('Platform data is already in use. Configure this application to run as one Node.js worker.');
    }
  }
  throw new Error('Unable to acquire the platform data lock.');
}
