const createTestDate = (dateStr) => ({
    _seconds: Math.floor(new Date(dateStr).getTime() / 1000),
    _nanoseconds: 0,
    toDate: () => new Date(dateStr)
})

const createDocumentSnapshotMock = (id, data) => ({
    id,
    data: () => ({ ...data }),
    exists: true,
    ref: {}
})

const createQuerySnapshotMock = (docs) => ({
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback) => docs.forEach(callback)
})

const sampleMembers = [
    {
        name: 'John Doe',
        email: 'john@example.com',
        joinDate: createTestDate('2023-01-01'),
        createdAt: createTestDate('2023-01-01'),
        updatedAt: createTestDate('2023-01-01')
    },
    {
        name: 'Jane Smith',
        email: 'jane@example.com',
        joinDate: createTestDate('2023-01-02'),
        createdAt: createTestDate('2023-01-02'),
        updatedAt: createTestDate('2023-01-02')
    },
    {
        name: 'Bob Wilson',
        email: 'bob@example.com',
        joinDate: createTestDate('2023-01-03'),
        createdAt: createTestDate('2023-01-03'),
        updatedAt: createTestDate('2023-01-03')
    }
]

const createMockCollection = () => {
    let currentLimit = 10
    let currentOffset = 0
    let currentOrderBy = 'createdAt'
    let currentOrder = 'desc'
    let currentWhere = null

    const mockCollectionRef = {
        where: jest.fn((field, op, value) => {
            currentWhere = { field, op, value }
            return mockCollectionRef
        }),
        orderBy: jest.fn((field, order) => {
            currentOrderBy = field
            currentOrder = order
            return mockCollectionRef
        }),
        limit: jest.fn((val) => {
            currentLimit = val
            return mockCollectionRef
        }),
        offset: jest.fn((val) => {
            currentOffset = val
            return mockCollectionRef
        }),
        get: jest.fn(),
        add: jest.fn().mockResolvedValue({ id: 'mock-id' }),
        doc: jest.fn().mockReturnThis(),
        set: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue({ data: () => ({ count: sampleMembers.length }) })
    }

    mockCollectionRef.get.mockImplementation(() => {
        let filteredData = [...sampleMembers]

        if (currentWhere) {
            filteredData = filteredData.filter(doc => {
                if (currentWhere.op === '>=') {
                    return doc[currentWhere.field] >= currentWhere.value
                } else if (currentWhere.op === '<=') {
                    return doc[currentWhere.field] <= currentWhere.value
                }
                return true
            })
        }

        filteredData.sort((a, b) => {
            const aVal = a[currentOrderBy]
            const bVal = b[currentOrderBy]
            return currentOrder === 'desc' ?
                (bVal > aVal ? 1 : -1) :
                (aVal > bVal ? 1 : -1)
        })

        const paginatedData = filteredData
            .slice(currentOffset, currentOffset + currentLimit)
            .map((data, index) => createDocumentSnapshotMock(`member${index + 1}`, data))

        return Promise.resolve(createQuerySnapshotMock(paginatedData))
    })

    return mockCollectionRef
}

const mockFirestore = () => ({
    collection: jest.fn().mockReturnValue(createMockCollection()),
    batch: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        commit: jest.fn().mockResolvedValue({})
    }),
    Timestamp: {
        fromDate: jest.fn(createTestDate),
        now: jest.fn(() => createTestDate(new Date().toISOString()))
    },
    runTransaction: jest.fn((cb) => Promise.resolve(cb()))
})

module.exports = {
    createTestDate,
    createDocumentSnapshotMock,
    createQuerySnapshotMock,
    sampleMembers,
    createMockCollection,
    mockFirestore
}

