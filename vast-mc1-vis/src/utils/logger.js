/**
 * Logger utility for standardized logging across the application
 * 
 * In production, only error and warning logs will be displayed by default
 * In development, all logs including debug are shown
 * 
 * PRODUCTION OPTIMIZATION:
 * For production builds, it's recommended to use babel-plugin-transform-remove-console
 * to automatically remove all console.* calls, which improves performance.
 * 
 * Installation: npm i babel-plugin-transform-remove-console --save-dev
 * 
 * Then add to .babelrc:
 * {
 *   "env": {
 *     "production": {
 *       "plugins": ["transform-remove-console"]
 *     }
 *   }
 * }
 */

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

// Define log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3
};

// Current log level - DEBUG in dev, INFO in production
const currentLevel = LOG_LEVELS.INFO; // Default to INFO
// const currentLevel = LOG_LEVELS.DEBUG; // Uncomment for debug mode

/**
 * Logger object with methods for different log levels
 */
const logger = {
  /**
   * Log debug messages (only in development)
   * @param {string} message - The message to log
   * @param {any} args - Additional arguments to log
   */
  debug: (message, ...args) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      // eslint-disable-next-line no-console
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  /**
   * Log info messages
   * @param {string} message - The message to log
   * @param {any} args - Additional arguments to log
   */
  info: (message, ...args) => {
    if (currentLevel <= LOG_LEVELS.INFO) {
      // eslint-disable-next-line no-console
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * Log warning messages
   * @param {string} message - The message to log
   * @param {any} args - Additional arguments to log
   */
  warn: (message, ...args) => {
    if (currentLevel <= LOG_LEVELS.WARNING) {
      console.warn(`[WARNING] ${message}`, ...args);
    }
  },

  /**
   * Log error messages
   * @param {string} message - The message to log
   * @param {any} args - Additional arguments to log
   */
  error: (message, ...args) => {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },

  /**
   * Log progress messages (even in production for loading bars etc.)
   * @param {string} message - The progress message to log
   */
  progress: (message) => {
    // Progress logs are always displayed
    // eslint-disable-next-line no-console
    console.log(`[PROGRESS] ${message}`);
  }
};

export default logger; 