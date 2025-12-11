const { execSync } = require('child_process');
const maxAttempts = parseInt(process.env.MAX_ATTEMPTS || '30', 10);
const delayMs = parseInt(process.env.DELAY_MS || '200', 10);
let found = false;
for (let i = 0; i < maxAttempts; i++) {
  try {
    const out = execSync('netstat -ano').toString();
    if (out.includes(':3000')) {
      console.log('Port 3000 is listening');
      found = true;
      break;
    }
  } catch (err) {
    // ignore
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
}
if (!found) {
  console.error('Timeout waiting for port 3000');
  process.exit(1);
}
process.exit(0);
