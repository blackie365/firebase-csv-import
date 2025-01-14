/**
* Firebase Cloud Function serving a RESTful API for member data access.
* Provides paginated, filtered access to member records with authentication
* and rate limiting.
*/

// Firebase imports
const {onRequest} = require("firebase-functions/v2/https");
const {getFirestore} = require("firebase-admin/firestore");
const {initializeApp} = require("firebase-admin/app");
const logger = require("firebase-functions/logger");

// Express and middleware imports
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

// Initialize Firebase and Express
initializeApp();
const db = getFirestore();
const app = express();
app.set("trust proxy", true);

// -----------------
// Helper Functions
// -----------------

/**
* Safely converts Firestore timestamp to an ISO string
* @param {FirebaseFirestore.Timestamp} timestamp - Firestore timestamp
* @return {string|null} ISO date string or null if conversion fails
*/
const convertTimestamp = (timestamp) => {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return null;
  }
  try {
    return timestamp.toDate().toISOString();
  } catch (error) {
    logger.error("Timestamp conversion failed:", error);
    return null;
  }
};

// -----------------
// Middleware Config
// -----------------

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

const corsOptions = {
  origin: true, // Allow all origins
  methods: ["GET"],
  optionsSuccessStatus: 204,
};

/**
* Authenticates requests using API key from headers
* @param {express.Request} req - Express request object
* @param {express.Response} res - Express response object
* @param {express.NextFunction} next - Express next middleware function
* @param {void}
*/
// Removed authentication middleware as API is now public
// const authenticateApiKey = (req, res, next) => {
//   const apiKey = req.get("X-API-Key");
//   if (!apiKey || apiKey !== process.env.API_KEY) {
//     res.status(401).json({error: "Unauthorized"});
//     return;
//   }
//   next();
// };

/**
* Global error handling middleware
* @param {Error} err - Error object
* @param {express.Request} req - Express request object
* @param {express.Response} res - Express response object
* @param {express.NextFunction} next - Express next middleware function
* @return {void}
*/
const errorHandler = (err, req, res, next) => {
  logger.error("API Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    status: err.status || 500,
  });
};

// -----------------
// Middleware Setup
// -----------------

app.use(cors(corsOptions));
app.use(limiter);
// Authentication removed to make API public

// -----------------
// Route Handlers
// -----------------

/**
* Members endpoint handler
* @param {express.Request} req - Express request object
* @param {express.Response} res - Express response object
* @param {express.NextFunction} next - Express next middleware function
* @return {Promise<void>}
*/
/**
* Maps API sort field names to Firestore field names
* @param {string} field - The API sort field name
* @return {string} The corresponding Firestore field name
*/
const getSortField = (field) => {
  const fieldMap = {
    joinDate: "JoinDate",
    lastActive: "LastActive",
    firstName: "FirstName",
    lastName: "LastName",
    email: "Email",
  };
  return fieldMap[field] || "JoinDate";
};

app.get("/api/members", async (req, res, next) => {
  try {
    logger.info("Starting /api/members request");
    const {
      limit = 10,
      offset = 0,
      active,
      search,
      sortBy = "joinDate",
      sortOrder = "desc",
    } = req.query;

    // Validate sortOrder
    const validSortOrder = ["asc", "desc"].includes(sortOrder) ?
    sortOrder :
    "desc";

    logger.info("Query params:", {
      limit,
      offset,
      active,
      search,
      sortBy,
      sortOrder: validSortOrder,
    });

    // List collections and check if members exists
    const collectionsSnapshot = await db.listCollections();
    const collectionIds = [];

    collectionsSnapshot.forEach((collection) => {
      collectionIds.push(collection.id);
    });

    logger.info("Available collections:", collectionIds);

    if (!collectionIds.includes("members")) {
      logger.error("Members collection not found");
      return res.status(404).json({
        error: "Collection not found",
        availableCollections: collectionIds,
      });
    }

    let query = db.collection("members");
    logger.info("Collection reference created");

    // Apply filters first
    if (active !== undefined) {
      query = query.where("Active", "==", active === "true");
      logger.info("Active filter applied:", active);
    }

    if (search) {
      query = query.where("searchName", ">=", search.toLowerCase())
          .where("searchName", "<=", search.toLowerCase() + "\\uf8ff");
      logger.info("Search filter applied:", search);
    }

    // Then apply sorting and pagination
    const sortField = getSortField(sortBy);
    query = query.orderBy(sortField, validSortOrder)
        .limit(parseInt(limit))
        .offset(parseInt(offset));

    logger.info("Order and pagination applied:", {
      sortField,
      validSortOrder,
    });

    const snapshot = await query.get();
    logger.info("Query executed, document count:", snapshot.size);

    // Log first document for debugging if any exists
    if (snapshot.size > 0) {
      const firstDoc = snapshot.docs[0].data();
      logger.info("Sample document:", firstDoc);
    }

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

    res.json({
      members,
      pagination: {
        total: snapshot.size,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: snapshot.size > parseInt(offset) + members.length,
      },
    });
  } catch (error) {
    logger.error("API error:", error);
    next(error);
  }
});

app.use(errorHandler);

// -----------------
// Export Function
// -----------------

exports.api = onRequest({
  memory: "256MiB",
  timeoutSeconds: 60,
  minInstances: 0,
  maxInstances: 10,
  invoker: "public", // Allow public access
}, app);
