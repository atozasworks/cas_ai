const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const port = '4019';
const serverRoot = path.resolve(__dirname, '..', '..');

function request(pathname) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const req = http.get(
      { host: '127.0.0.1', port, path: pathname, timeout: 4000 },
      (res) => {
        res.resume();
        res.on('end', () => {
          resolve({ status: res.statusCode, ms: Date.now() - started });
        });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`timeout ${pathname}`));
    });
    req.on('error', reject);
  });
}

function waitForHealth() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      request('/api/v1/health')
        .then((result) => {
          if (result.status === 200) resolve(result);
          else if (Date.now() - started > 90000) reject(new Error(`health status ${result.status}`));
          else setTimeout(tick, 500);
        })
        .catch(() => {
          if (Date.now() - started > 90000) reject(new Error('server did not become healthy'));
          else setTimeout(tick, 500);
        });
    };
    tick();
  });
}

async function main() {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: serverRoot,
    env: {
      ...process.env,
      PORT: port,
      NODE_ENV: 'production',
      APP_ENV: 'ci',
      JWT_SECRET: 'ci-quality-gate',
      MONGODB_URI: 'mongodb://127.0.0.1:1/cas_ci_unreachable',
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: '1',
      CLIENT_URL: 'http://127.0.0.1',
      CORS_ORIGINS: 'http://127.0.0.1',
      LOG_LEVEL: 'error',
    },
    stdio: 'inherit',
  });

  try {
    const health = await waitForHealth();
    const config = await request('/api/v1/app-config');
    if (config.status !== 200) {
      throw new Error(`app-config status ${config.status}`);
    }

    const samples = [];
    for (let i = 0; i < 12; i += 1) {
      const sample = await request('/api/v1/health');
      if (sample.status !== 200) throw new Error(`health status ${sample.status}`);
      samples.push(sample.ms);
    }
    samples.sort((a, b) => a - b);
    const p95 = samples[Math.min(samples.length - 1, Math.ceil(samples.length * 0.95) - 1)];
    console.log(`API health ${health.ms}ms, app-config ${config.ms}ms, p95 ${p95}ms`);
    if (p95 > 800) {
      throw new Error(`p95 ${p95}ms exceeds 800ms`);
    }
  } finally {
    child.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
