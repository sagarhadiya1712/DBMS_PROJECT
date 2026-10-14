const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting server build...');

// 1. Prisma Client generation
console.log('📦 Generating Prisma Client...');
execSync('npx prisma generate', { stdio: 'inherit' });

// 2. Build & sync client frontend into server/public if client folder exists
const rootDir = path.resolve(__dirname, '../..');
const clientDir = path.join(rootDir, 'client');
const clientDist = path.join(clientDir, 'dist');
const serverPublic = path.resolve(__dirname, '../public');

if (fs.existsSync(clientDir)) {
  console.log('🎨 Detected client directory. Checking frontend build...');
  try {
    if (!fs.existsSync(clientDist) || !fs.existsSync(path.join(clientDist, 'index.html'))) {
      console.log('🔨 Building frontend client...');
      execSync('npm --prefix ../client run build', { stdio: 'inherit' });
    }

    if (fs.existsSync(clientDist)) {
      console.log('📂 Syncing frontend build to server/public...');
      if (!fs.existsSync(serverPublic)) {
        fs.mkdirSync(serverPublic, { recursive: true });
      }
      fs.cpSync(clientDist, serverPublic, { recursive: true });
      console.log('✅ Frontend successfully synced into server/public!');
    }
  } catch (err) {
    console.warn('⚠️ Frontend sync notice (using existing build if available):', err.message);
  }
}

console.log('🎉 Server build finished successfully!');
