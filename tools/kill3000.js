const { execSync } = require('child_process');
try {
  const out = execSync('netstat -ano').toString();
  const lines = out.split(/\r?\n/).filter(l => l.includes(':3000'));
  if (!lines.length) {
    console.log('No process on :3000');
    process.exit(0);
  }
  for (const l of lines) {
    const cols = l.trim().split(/\s+/);
    const pid = cols[cols.length - 1];
    if (!pid || isNaN(Number(pid))) continue;
    try {
      console.log('Killing PID', pid);
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'inherit' });
    } catch (err) {
      console.error('Failed to kill', pid, err.message);
    }
  }
} catch (err) {
  console.error('Error running netstat:', err.message);
  process.exit(1);
}
