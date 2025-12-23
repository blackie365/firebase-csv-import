const request = require('supertest');
const admin = require('firebase-admin');
const app = require('../src/api/app');

// Test configuration
const DEFAULT_TIMEOUT = 10000;
const TEST_TIMEOUT = process.env.CI ? 30000 : DEFAULT_TIMEOUT;

// Helper function to create mock member data
const createMockData = (override = {}) => ({
    FirstName: 'John',
    LastName: 'Doe',
    Email: 'john@example.com',
    JoinDate: {
        toDate: () => new Date('2024-01-01'),
        _seconds: Math.floor(new Date('2024-01-01').getTime() / 1000),
        _nanoseconds: 0
    },
    Active: true,
    searchName: 'john doe',
    Bio: '',
    Headline: '',
    Location: '',
    Tags: [],
    LastActive: null,
    InvitationDate: null,
    EmailMarketing: false,
    Member: false,
    ProfileURL: '',
    WebsiteURL: '',
    TwitterURL: '',
    FacebookURL: '',
    LinkedInURL: '',
    InstagramURL: '',
    Posts: 0,
    Comments: 0,
    LikesReceived: 0,
    AvatarURL: '',
    ...override
});
// Base query object factory
const createQueryObject = (options = {}) => {
    const mockDoc = {
        id: 'doc1',
        data: () => createMockData(),
        exists: true
    };

    const {
        docs: inputDocs,
        empty: inputEmpty,
        size: inputSize,
        error = null
    } = options;

    const docs = inputDocs ?? [mockDoc];
    const size = inputSize ?? docs.length;
    const empty = inputEmpty ?? (docs.length === 0);

    return {
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockImplementation(() => {
            if (error) {
                return Promise.reject(error);
            }

            const snapshot = {
                docs,
                empty,
                size,
                forEach: (callback) => docs.forEach(callback)
            };

            return Promise.resolve(snapshot);
        }),
        getCountFromServer: jest.fn().mockResolvedValue({
            data: () => ({ count: size })
        })
    };
};

describe('GET /api/members', () => {
    let server;
    let agent;
    let firestore;
    let queryObject;

    beforeAll(() => {
        server = app.listen(0);
        agent = request.agent(server);
        firestore = admin.firestore();
    });

    afterAll(async () => {
        await server.close();
    });

    beforeEach(() => {
        queryObject = createQueryObject();
        // Make the API use our queryObject when it calls db.collection('members')
        firestore.collection.mockReturnValue(queryObject);
    });

    it('should return members list with pagination', async () => {
        const response = await agent.get('/api/members?page=1&limit=10');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('members');
        expect(response.body.data).toHaveProperty('pagination');
        expect(response.body.data.pagination).toEqual({
            total: 1,
            limit: 10,
            offset: 0,
            hasMore: false
        });
        expect(response.body.data.members[0]).toMatchObject({
            id: 'doc1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com'
        });
    });

    it('should handle search parameter correctly', async () => {
        const response = await agent.get('/api/members?search=john');
        expect(response.status).toBe(200);
        expect(queryObject.where).toHaveBeenCalledWith('searchName', '>=', 'john');
    });

    it('should handle invalid page parameter', async () => {
        const response = await agent.get('/api/members?page=invalid');
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toEqual({
            message: 'Invalid request parameters',
            status: 400,
            details: expect.any(Array)
        });
    });

    it('should handle empty results', async () => {
        queryObject = createQueryObject({ empty: true, docs: [] });
        firestore.collection.mockReturnValue(queryObject);
        
        const response = await agent.get('/api/members');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.members).toHaveLength(0);
        expect(response.body.data.pagination).toEqual({
            total: 0,
            limit: 10,
            offset: 0,
            hasMore: false
        });
    });

    it('should handle database errors', async () => {
        queryObject = createQueryObject({
            error: new Error('Database connection failed')
        });
        firestore.collection.mockReturnValue(queryObject);
        
        const response = await agent.get('/api/members');
        expect(response.status).toBe(503);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toEqual({
            message: 'Service temporarily unavailable',
            status: 503,
            details: 'Database operation failed'
        });
    });
});
