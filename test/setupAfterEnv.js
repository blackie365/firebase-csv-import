// Add custom matchers
expect.extend({
toBeValidTimestamp(received) {
    const pass = !isNaN(Date.parse(received));
    return {
    pass,
    message: () => `expected ${received} to be a valid timestamp`
    };
},
toMatchApiResponse(received, expected) {
    const pass = Object.keys(expected).every(key => 
    JSON.stringify(received[key]) === JSON.stringify(expected[key])
    );
    return {
    pass,
    message: () => `expected ${JSON.stringify(received)} to match API response format`
    };
}
});
module.exports = {};  // Ensure the file exports if needed

// Global test setup
beforeAll(() => {
// Set default timeout
jest.setTimeout(10000);
// Reset Firebase mocks
jest.clearAllMocks();
});

// Reset all mocks before each test
beforeEach(() => {
jest.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
// Clear any timeouts/intervals
jest.useRealTimers();
});

// Global teardown
afterAll(async () => {
try {
    // Delete Firebase app
    const admin = require('firebase-admin');
    if (admin.apps && admin.apps.length > 0) {
        await Promise.all(admin.apps.map(app => app.delete()));
    }
} catch (error) {
    console.error('Error cleaning up Firebase:', error);
}
// Reset all mocks
jest.resetModules();
});
