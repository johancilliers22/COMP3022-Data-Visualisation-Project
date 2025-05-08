module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // React rules
    'react/prop-types': 'off', // We're not using prop-types validation
    'react/react-in-jsx-scope': 'off', // Not needed with new JSX transform
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // Base rules
    'no-unused-vars': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }], // Warn about console.log, but allow console.warn and console.error
    'prefer-const': 'warn',
    'no-var': 'warn',
    
    // Formatting
    'semi': ['warn', 'always'],
    'comma-dangle': ['warn', 'only-multiline'],
    'quotes': ['warn', 'single', { 'avoidEscape': true }],
    'max-len': ['warn', { 'code': 200, 'ignoreComments': true, 'ignoreStrings': true }],
  },
  // Ignore certain files
  ignorePatterns: [
    'node_modules/',
    'build/',
    'dist/',
    '*.min.js',
    '*.config.js',
    'reportWebVitals.js',
  ],
  // Override rules for specific files
  overrides: [
    {
      files: ['*.test.js', '*.spec.js', 'setupTests.js'],
      env: {
        jest: true,
      },
    },
  ],
}; 