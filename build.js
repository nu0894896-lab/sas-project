const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

if (fs.existsSync('frontend/package.json')) {
  console.log('Building frontend from root directory...');
  execSync('npm --prefix frontend run build', { stdio: 'inherit' });
  try {
    fs.cpSync('frontend/dist', 'dist', { recursive: true });
  } catch (e) {}
} else {
  console.log('Building frontend directly...');
  execSync('npm run build', { stdio: 'inherit' });
  try {
    fs.cpSync('dist', path.join('frontend', 'dist'), { recursive: true });
  } catch (e) {}
}
