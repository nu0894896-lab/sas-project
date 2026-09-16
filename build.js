const { execSync } = require('child_process');
const fs = require('fs');

if (fs.existsSync('frontend/package.json')) {
  console.log('Building frontend from root directory...');
  execSync('npm --prefix frontend run build', { stdio: 'inherit' });
} else {
  console.log('Building frontend directly...');
  execSync('npm run build', { stdio: 'inherit' });
}
