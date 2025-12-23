const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { query, validationResult } = require('express-validator');
const logger = require("firebase-functions/logger");

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX || 100, // limit each IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

// CORS configuration
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS ? 
        process.env.ALLOWED_ORIGINS.split(',') : 
        ['http://localhost:3000'],
    methods: ['GET'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 204
};

// Helmet security headers configuration
const helmetConfig = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
};
// Input validation middleware
const validateQueryParams = [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('active').optional().isBoolean(),
    query('search').optional().trim().escape(),
    query('sortBy').optional().isIn(['joinDate', 'lastActive', 'firstName', 'lastName', 'email']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
];

// Input sanitization function
const sanitizeInput = (input) => {
    if (!input) return '';
    return input
        .toString()
        .replace(/[^a-zA-Z0-9\s-_]/g, '')
        .trim();
};

// Validation error checking middleware
const checkValidationResult = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            errors: errors.array(),
            status: 400 
        });
    }
    next();
};
// Custom error handler middleware
const errorHandler = (err, req, res, next) => {
    logger.error('API Error:', err);
    
    // Don't expose internal error details in production
    const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message;
    
    res.status(err.status || 500).json({
        error: errorMessage,
        status: err.status || 500
    });
};

module.exports = {
    limiter,
    corsOptions,
    helmetConfig,
    validateQueryParams,
    sanitizeInput,
    errorHandler,
    checkValidationResult
};

