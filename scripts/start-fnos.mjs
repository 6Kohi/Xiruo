import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const children = new Set();
let shuttingDown = false;

// The cache service, source gateway, and web worker share this process
// environment. Generate an ephemeral internal secret when an external gateway
// has not supplied one so a fresh Compose deployment needs no secret setup.
if (!process.env.XIRUO_PROXY_SECRET?.trim()) {
  process.env.XIRUO_PROXY_SECRET = randomBytes(32).toString('hex');
}

function start(args) {
  const child = spawn(process.execPath, args, { cwd: process.cwd(), stdio: 'inherit', env: process.env });
  children.add(child);
  child.once('exit', (code) => {
    children.delete(child);
    if (!shuttingDown) shutdown(code ?? 1);
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}

function workerVar(name, fallback = '') {
  return ['--var', `${name}:${process.env[name]?.trim() || fallback}`];
}

start(['scripts/cache-service.mjs']);
if (!process.env.XIRUO_SOURCE_GATEWAY?.trim()) process.env.XIRUO_SOURCE_GATEWAY = `http://127.0.0.1:${process.env.XIRUO_SOURCE_GATEWAY_PORT || 4010}/fetch`;
start(['scripts/source-gateway.mjs']);
start([
  'node_modules/wrangler/bin/wrangler.js',
  'dev',
  '--config',
  'dist/server/wrangler.json',
  '--ip',
  '0.0.0.0',
  '--port',
  process.env.PORT || '3000',
  '--show-interactive-dev-session=false',
  ...workerVar('XIRUO_PROXY_SECRET'),
  ...workerVar('XIRUO_ENABLE_REAL_SOURCES', 'false'),
  ...workerVar('XIRUO_CACHE_SERVICE', 'http://127.0.0.1:4011'),
  ...workerVar('XIRUO_SOURCE_GATEWAY'),
]);

process.once('SIGINT', () => shutdown(0));
process.once('SIGTERM', () => shutdown(0));
