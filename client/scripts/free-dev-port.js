/**
 * Free the dev port before starting (Windows) so CRA does not fall back to 3001.
 */
const { execSync } = require('child_process');

const PORT = String(process.env.PORT || '7760').trim();

if (process.platform !== 'win32') {
  process.exit(0);
}

try {
  const out = execSync(`netstat -ano | findstr :${PORT}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  const pids = new Set();
  out.split('\n').forEach((line) => {
    if (!line.includes('LISTENING')) return;
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && pid !== '0') pids.add(pid);
  });
  pids.forEach((pid) => {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      // eslint-disable-next-line no-console
      console.log(`Freed port ${PORT} (stopped PID ${pid})`);
    } catch (_) {
      // ignore
    }
  });
} catch (_) {
  // Port already free
}
