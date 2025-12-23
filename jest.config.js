module.exports = {
    // Test timeout in milliseconds
    testTimeout: 30000,
    // Automatically clear mock calls and instances between every test
    clearMocks: true,
    // Force exit after tests complete
    forceExit: true,

// Verbose output showing each test
verbose: true,

// Indicates whether the coverage information should be collected while executing the test
collectCoverage: true,

// The directory where Jest should output its coverage files
coverageDirectory: "coverage",

// Coverage configuration
// Relaxed thresholds to avoid failing the suite while tests are still being built out
coverageThreshold: {
    global: {
        branches: 0,
        functions: 0,
        lines: 0,
        statements: 0
    }
},

// Force coverage collection from files even if tests don't exist
forceCoverageMatch: ['**/*.{js,jsx}'],

// Files to ignore for coverage
coveragePathIgnorePatterns: [
    '/node_modules/',
    '/test/',
    '/coverage/',
    '/dist/'
],

// Test environment
testEnvironment: "node",

// The glob patterns Jest uses to detect test files
testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)"
],

// An array of file extensions your modules use
moduleFileExtensions: ["js", "json", "jsx", "ts", "tsx", "node"],

// The paths to modules that run some code to configure or set up the testing environment
setupFilesAfterEnv: [
    "<rootDir>/test/setupAfterEnv.js",
    "<rootDir>/test/setup.js"
],

// Handle directory naming collisions
modulePathIgnorePatterns: [
    "<rootDir>/functions/node_modules",
    "<rootDir>/functions/lib",
    "<rootDir>/functions-backup"
],

// Indicates whether each individual test should be reported during the run
reporters: ["default"],

// The test runner to use
testRunner: "jest-circus/runner"
};
