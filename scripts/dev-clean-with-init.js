#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const http = require('http');

console.log('🧹 Cleaning caches...');

// Clean caches first
exec('rm -rf .next && rm -rf node_modules/.cache', (error) => {
  if (error) {
    console.error('❌ Error cleaning caches:', error);
    process.exit(1);
  }

  console.log('✅ Caches cleaned');
  console.log('🚀 Starting development server...');

  // Start the dev server
  const devServer = spawn('npx', ['next', 'dev', '--turbopack'], {
    stdio: ['inherit', 'pipe', 'inherit'],
    shell: true
  });

  let serverPort = null;

  // Listen for server output to detect when it's ready and which port
  devServer.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(data); // Still show the output

    // Look for the "Ready" message and extract port
    const readyMatch = output.match(/- Local:\s+http:\/\/localhost:(\d+)/);
    if (readyMatch) {
      serverPort = readyMatch[1];
      console.log(`🔍 Detected server on port ${serverPort}`);

      // Wait a bit more then init database
      setTimeout(() => {
        initDatabase(serverPort);
      }, 2000);
    }
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    devServer.kill('SIGINT');
    process.exit(0);
  });

  devServer.on('close', (code) => {
    process.exit(code);
  });
});

// Function to initialize database with retry logic
async function initDatabase(port) {
  console.log('🗄️ Initializing database...');

  const maxRetries = 10;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await fetch(`http://localhost:${port}/api/debug/init-db`);
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Database initialized with your admin account on port ${port}!`);
        console.log('📧 Login: cryborg.live@gmail.com');
        console.log('🎉 Ready to go!');
        return;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      retries++;
      if (retries < maxRetries) {
        console.log(`⏳ Database not ready yet, retrying in 2s... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log(`❌ Failed to initialize database after ${maxRetries} attempts`);
        console.log(`💡 You can run manually: curl http://localhost:${port}/api/debug/init-db`);
        return;
      }
    }
  }
}