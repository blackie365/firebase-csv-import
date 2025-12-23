// Test environment setup and mock configuration
// Sets up test environment variables and Firebase mocks
process.env.NODE_ENV = 'test';
process.env.PORT = '9999';
process.env.FIREBASE_PROJECT_ID = 'test-project';

/**
* Creates a mock Firestore DocumentSnapshot
* @param {boolean} exists - Whether the document exists
* @param {object} data - The document data
* @param {string} id - The document ID
* @returns {object} Mock DocumentSnapshot
*/
const createDocumentSnapshotMock = (exists = true, data = {}, id = 'test-id') => ({
    exists,
    data: () => data,
    id,
    ref: {
        path: `collection/${id}`,
        id,
        parent: {
            id: 'collection'
        }
    }
});

/**
* Creates a mock Firestore QuerySnapshot
* @param {Array} docs - Array of document snapshots
* @returns {object} Mock QuerySnapshot
*/
const createQuerySnapshotMock = (docs = []) => ({
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback) => docs.forEach(callback)
});

/**
* Creates a mock Firestore Query
* @returns {object} Mock Query with chainable methods
*/
const createQueryMock = () => ({
    doc: jest.fn().mockReturnThis(),
    collection: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue(createQuerySnapshotMock()),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    set: jest.fn().mockResolvedValue({}),
    add: jest.fn().mockResolvedValue({ id: 'new-doc-id' })
});

// Initialize mockFirestore instance
const initializeMockFirestore = (errorConfig = {}) => ({
    collection: jest.fn(() => createQueryMock()),
    batch: jest.fn(() => ({
        set: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        commit: jest.fn().mockImplementation(() => 
            errorConfig.batchError 
                ? Promise.reject(new Error('Batch error'))
                : Promise.resolve({})
        )
    })),
    runTransaction: jest.fn((callback) => 
        errorConfig.transactionError
            ? Promise.reject(new Error('Transaction error'))
            : Promise.resolve(callback({
                get: jest.fn().mockResolvedValue(createDocumentSnapshotMock()),
                set: jest.fn().mockResolvedValue({}),
                update: jest.fn().mockResolvedValue({}),
                delete: jest.fn().mockResolvedValue({})
            }))
    ),
    doc: jest.fn(() => createQueryMock()),
    get: jest.fn().mockResolvedValue(createDocumentSnapshotMock()),
    set: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({})
});

// Initialize mockFirestore instance
const mockFirestore = initializeMockFirestore();

// Initialize mockApp with Firestore
const mockApp = {
    firestore: jest.fn().mockReturnValue(mockFirestore),
    delete: jest.fn().mockResolvedValue({})
};
// Mock Firebase Admin
jest.mock('firebase-admin', () => {
return {
    initializeApp: jest.fn(),
    firestore: jest.fn().mockReturnValue(mockFirestore),
    delete: jest.fn().mockResolvedValue({})
};
});
    class Timestamp {
        constructor(seconds, nanoseconds) {
            this.seconds = seconds;
            this.nanoseconds = nanoseconds;
        }
        toDate() {
            return new Date(this.seconds * 1000);
        }
        static now() {
            const now = new Date();
            return new this(Math.floor(now.getTime() / 1000), 0);
        }
    }
const admin = jest.requireMock('firebase-admin');
admin.initializeApp.mockImplementation(() => mockApp);
