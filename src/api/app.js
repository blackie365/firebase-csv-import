// Framework imports
const express = require('express');
const bodyParser = require('body-parser');

// Security imports
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Firebase imports
const admin = require('firebase-admin');

// Database cleanup and shutdown handlers
const cleanup = async (query = null) => {
    try {
        // Close any open queries
        if (query && typeof query.get === 'function') {
            await query.get().catch(() => {});
        }
    } catch (error) {
        logger.error('Query cleanup error:', {
            message: error?.message,
            code: error?.code,
            stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        });
    }
}

// Validation imports
const { body, query, param, validationResult } = require('express-validator');

// Utility imports
const logger = require('./logger');
const { getSortField, convertTimestamp } = require('./utils');

// Initialize logger
if (!logger) {
    throw new Error('Logger initialization failed');
}

// Check if Firebase Admin is already initialized
function initializeFirebaseAdmin() {
    if (!(admin.apps && admin.apps.length)) {
        try {
            if (process.env.NODE_ENV === 'test') {
                admin.initializeApp(); // Simple initialization for tests
            } else {
                const serviceAccount = require('./serviceAccountKey.json');
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://businesswoman-network-default-rtdb.europe-west1.firebasedatabase.app"
                });
            }
        } catch (error) {
            console.error('Failed to initialize Firebase Admin:', error);
            throw new Error('Firebase initialization failed');
        }
    }
    return admin;
}

// Initialize Express app
const app = express();

// Initialize Firebase Admin if not already initialized
initializeFirebaseAdmin();
const db = admin.firestore();

// Trust proxy for correct client IP addresses behind Cloud Functions
app.set('trust proxy', true);

// Security middleware - should be first
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate limiting (disabled in test environment)
if (process.env.NODE_ENV !== 'test') {
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    });
    app.use(limiter);
}

// Input validation middleware
const validateMembersQuery = [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('page').optional().isInt({ min: 1 }).withMessage('Page parameter must be greater than 0').toInt(),
    query('active').optional().isBoolean().toBoolean(),
    query('search').optional().isString().trim().notEmpty().withMessage('Search parameter cannot be empty'),
    query('sortBy').optional().isIn(['joinDate', 'lastName', 'firstName', 'email'])
        .withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),
];

// Response formatter middleware
const formatResponse = (req, res, next) => {
res.success = (data) => {
    res.json({
    success: true,
    data,
    timestamp: new Date().toISOString()
    });
};
next();
};

app.use(formatResponse);

// Members endpoint
app.get("/api/members", validateMembersQuery, async (req, res, next) => {
    let query;

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Invalid request parameters',
                    status: 400,
                    details: errors.array()
                },
                timestamp: new Date().toISOString()
            });
        }

        const {
            limit = 10,
            offset = 0,
            active,
            search,
            sortBy = "joinDate",
            sortOrder = "desc",
        } = req.query;
        
        logger.info("Starting /api/members request");
        
        // Validate sortOrder
        const validSortOrder = ["asc", "desc"].includes(sortOrder) 
            ? sortOrder 
            : "desc";

        logger.info("Query params:", {
            limit,
            offset,
            active,
            search,
            sortBy,
            sortOrder: validSortOrder,
        });

        let query = db.collection("members");
        logger.info("Collection reference created");

        if (active !== undefined) {
            query = query.where("Active", "==", active);
            logger.info("Active filter applied:", active);
        }

        if (search) {
            query = query.where("searchName", ">=", search.toLowerCase())
                .where("searchName", "<=", search.toLowerCase() + "\\uf8ff");
            logger.info("Search filter applied:", search);
        }

        let total;
        try {
            if (typeof query.getCountFromServer === 'function') {
                const snapshot = await query.getCountFromServer();
                total = snapshot.data().count;
            } else {
                const snapshot = await query.get();
                total = snapshot.size;
            }
        } catch (error) {
            logger.error("Failed to get count:", error);
            total = 0;
        }

        logger.info("Total count:", total);

        const sortField = getSortField(sortBy);
        query = query.orderBy(sortField, validSortOrder)
            .limit(parseInt(limit))
            .offset(parseInt(offset));

        logger.info("Query built:", {
            sortField,
            validSortOrder,
            limit,
            offset
        });

        const snapshot = await query.get();
        logger.info("Query executed, document count:", snapshot.size);

        const members = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            members.push({
                id: doc.id,
                firstName: data.FirstName || "",
                lastName: data.LastName || "",
                email: data.Email || "",
                bio: data.Bio || "",
                headline: data.Headline || "",
                location: data.Location || "",
                tags: data.Tags || [],
                joinDate: convertTimestamp(data.JoinDate),
                lastActive: convertTimestamp(data.LastActive),
                invitationDate: convertTimestamp(data.InvitationDate),
                active: data.Active || false,
                emailMarketing: data.EmailMarketing || false,
                member: data.Member || false,
                profileUrl: data.ProfileURL || "",
                websiteUrl: data.WebsiteURL || "",
                twitterUrl: data.TwitterURL || "",
                facebookUrl: data.FacebookURL || "",
                linkedinUrl: data.LinkedInURL || "",
                instagramUrl: data.InstagramURL || "",
                posts: data.Posts || 0,
                comments: data.Comments || 0,
                likesReceived: data.LikesReceived || 0,
                avatarUrl: data.AvatarURL || "",
            });
        });

        // Always return consistent response structure
        return res.json({
            success: true,
            data: {
                members: members,
                pagination: {
                    total: total || 0,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: total > parseInt(offset) + members.length
                }
            },
            timestamp: new Date().toISOString()
        });
        }

        return res.json({
            success: true,
            data: {
                members,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: total > parseInt(offset) + members.length,
                }
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error("Operation failed", { 
            message: error?.message,
            name: error?.name,
            code: error?.code,
            stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        });
        if (error?.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Validation error',
                    details: error.errors
                }
            });
        }
        return next(error);
    } finally {
        await cleanup(query);
    }
});

// Server shutdown handlers
process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
});

process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
});
// Error handling middleware
app.use((err, req, res, next) => {
    // Log error details (except in test)
    const errorInfo = {
        message: err?.message || 'Unknown error',
        code: err?.code,
        name: err?.name,
        stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined
    };
    
    try {
        if (process.env.NODE_ENV !== 'test') {
            logger.error('Error occurred:', errorInfo);
        }
    } catch (logError) {
        console.error('Logging failed:', logError);
    }

    // Handle Firebase/Database errors
    if (err?.name === 'FirebaseError' || (err?.code && err?.code.startsWith('firebase'))) {
        return res.status(503).json({
            success: false,
            error: {
                message: 'Service temporarily unavailable',
                status: 503,
                details: 'Database operation failed'
            }
        });
    }

    // Handle validation errors
    if (err?.name === 'ValidationError' || (err.array && typeof err.array === 'function')) {
        return res.status(400).json({
            success: false,
            error: {
                message: 'Invalid request parameters',
                status: 400,
                details: err.array ? err.array() : err.errors
            }
        });
    }

    // Default error response
    res.status(500).json({
        success: false,
        error: {
            message: err.message || 'Internal server error',
            status: 500,
            details: process.env.NODE_ENV === 'development' ? err.stack : 'An unexpected error occurred'
        },
        timestamp: new Date().toISOString()
    });
});

    // Not found middleware (404 handler)
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            message: `Route ${req.method} ${req.url} not found`,
            status: 404
        }
    });
});

// Export configured express app
module.exports = app;
