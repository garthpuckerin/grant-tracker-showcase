import { spawn as spawnProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { preview as vitePreview } from 'vite';

const HOST = '127.0.0.1';
const PORT = 3310;
const BASE_URL = `http://${HOST}:${PORT}`;
const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));
const SWEEP_SCRIPTS = [
  fileURLToPath(new URL('./mobile-sweep.mjs', import.meta.url)),
  fileURLToPath(new URL('./viewport-sweep.mjs', import.meta.url)),
  fileURLToPath(new URL('./whiteglove-sweep.mjs', import.meta.url)),
];

function runSweep(script, spawn) {
  return new Promise((resolveSweep, rejectSweep) => {
    const child = spawn(process.execPath, [script], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, BASE_URL },
      stdio: 'inherit',
      shell: false,
      windowsHide: true,
    });

    child.once('error', rejectSweep);
    child.once('exit', (exitCode, signal) => {
      if (exitCode === 0 && signal === null) {
        resolveSweep();
        return;
      }

      const outcome = signal ? `signal ${signal}` : `exit code ${exitCode}`;
      const error = new Error(`${script} failed with ${outcome}`);
      error.exitCode = exitCode;
      error.signal = signal;
      rejectSweep(error);
    });
  });
}

export async function runReleaseSweeps({
  preview = vitePreview,
  spawn = spawnProcess,
} = {}) {
  const server = await preview({
    root: PROJECT_ROOT,
    preview: { host: HOST, port: PORT, strictPort: true },
  });

  try {
    for (const script of SWEEP_SCRIPTS) {
      await runSweep(script, spawn);
    }
  } finally {
    await server.close();
  }
}

const isCli =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isCli) {
  runReleaseSweeps().catch((error) => {
    console.error(error.message);
    process.exitCode = Number.isInteger(error.exitCode) ? error.exitCode : 1;
  });
}
