const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Vehicle Rental & Fleet Management System (Monorepo)...\n');

// 1. Start Backend Server
const serverDir = path.join(__dirname, 'server');
const serverProcess = spawn('node', ['src/server.js'], {
  cwd: serverDir,
  shell: true,
  stdio: 'inherit',
});

// 2. Start Frontend Client
const clientDir = path.join(__dirname, 'client');
const clientProcess = spawn('npm.cmd', ['run', 'dev'], {
  cwd: clientDir,
  shell: true,
  stdio: 'inherit',
});

// Handle termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server and client...');
  serverProcess.kill();
  clientProcess.kill();
  process.exit(0);
});
