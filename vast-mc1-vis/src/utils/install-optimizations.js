/**
 * Performance Optimization Setup Script
 * 
 * Run this script with: npm run optimize
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if we're in the project root
const isProjectRoot = fs.existsSync('package.json');
if (!isProjectRoot) {
  console.error('ERROR: Please run this script from the project root directory (vast-mc1-vis)');
  process.exit(1);
}

console.log('Setting up performance optimizations for the earthquake visualization...');

// Install babel-plugin-transform-remove-console
console.log('\n1. Installing babel-plugin-transform-remove-console...');
try {
  execSync('npm install --save-dev babel-plugin-transform-remove-console', { stdio: 'inherit' });
  console.log('✅ Successfully installed babel-plugin-transform-remove-console');
} catch (error) {
  console.error('❌ Failed to install babel-plugin-transform-remove-console:', error.message);
  console.log('Please install it manually with: npm install --save-dev babel-plugin-transform-remove-console');
}

// Create .babelrc file if it doesn't exist
const babelrcPath = path.join(__dirname, '../../.babelrc');
console.log('\n2. Creating/updating .babelrc file...');
try {
  const babelrcContent = {
    env: {
      production: {
        plugins: ['transform-remove-console']
      }
    }
  };
  
  fs.writeFileSync(babelrcPath, JSON.stringify(babelrcContent, null, 2));
  console.log('✅ Successfully created/updated .babelrc file');
} catch (error) {
  console.error('❌ Failed to create .babelrc file:', error.message);
  console.log('Please create it manually with the following content:');
  console.log(`{
  "env": {
    "production": {
      "plugins": ["transform-remove-console"]
    }
  }
}`);
}

// Success message
console.log(`
✅ Performance optimizations have been set up successfully!

The following optimizations have been implemented:
1. Removed console.log statements from production builds using babel-plugin-transform-remove-console
2. Optimized the dataLoader.js to remove the CSV fallback code
3. Simplified progress tracking in DataContext.js
4. Optimized useDataLoader.js to avoid using window event listeners
5. Optimized dataProcessor.js to reduce memory usage and improve performance

To build optimized production code, run:
npm run build:optimized

This will automatically remove all console.log calls in production, improving performance.
`);

process.exit(0); 