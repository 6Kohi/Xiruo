import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const children = new Set();
let shuttingDown = false;

function start(args) {
  const child = spawn(process.execPath, args, { cwd: process.cwd(), stdio: 'inherit' });
  children.add(child);
  child.once('exit', (code) => {
    children.delete(child);
    if (!shuttingDown) shutdown(code ?? 1);
  });
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
start(['scripts/cache-service.mjs']);
if (process.env.XIRUO_OUTBOUND_PROXY) {
  if (!process.env.XIRUO_SOURCE_GATEWAY?.trim()) process.env.XIRUO_SOURCE_GATEWAY = `http://127.0.0.1:${process.env.XIRUO_SOURCE_GATEWAY_PORT || 4010}/fetch`;
  start(['scripts/source-gateway.mjs']);
}
start(['node_modules/vinext/dist/cli.js', 'dev']);

process.once('SIGINT', () => shutdown(0));
process.once('SIGTERM', () => shutdown(0));
