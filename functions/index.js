const {onRequest} = require("firebase-functions/v2/https");
const {getFirestore} = require("firebase-admin/firestore");
const {initializeApp} = require("firebase-admin/app");
const logger = require("firebase-functions/logger");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

// Initialize Firebase and Express
initializeApp();
const db = getFirestore();
const app = express();

// Configure Express
app.set("trust proxy", true);

const corsOptions = {
  origin: true,
  methods: ["GET"],
  optionsSuccessStatus: 204,
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(cors(corsOptions));
app.use(limiter);

// Helper Functions
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

const getSortField = (field) => {
  const fieldMap = {
    joinDate: "Join Date",
    lastActive: "Last Active",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
  };
  return fieldMap[field] || "Join Date";
};

// Error Handler
const errorHandler = (err, req, res, next) => {
  logger.error("API Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    status: err.status || 500,
  });
};

// API Endpoints
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

    // First, get a count of all documents in the collection
    const countSnapshot = await db.collection("members").count().get();
    const totalCount = countSnapshot.data().count;
    logger.info("Total documents in collection:", totalCount);

    let query = db.collection("members");
    logger.info("Collection reference created");

    // Apply filters first
    if (active !== undefined) {
      query = query.where("Active (Signed In Last 30 Days)", "==",
            active === "true" ? "Yes" : "No");
      logger.info("Active filter applied:", active);
    }

    if (search) {
      query = query.where("searchName", ">=", search.toLowerCase())
          .where("searchName", "<=", search.toLowerCase() + "\\uf8ff");
      logger.info("Search filter applied:", search);
    }

    // Then apply sorting
    const sortField = getSortField(sortBy);
    query = query.orderBy(sortField, validSortOrder)
        .limit(parseInt(limit))
        .offset(parseInt(offset));

    logger.info("Order and pagination applied:", {
      sortField,
      validSortOrder,
      limit,
      offset,
    });

    const snapshot = await query.get();
    logger.info("Query executed, document count:", snapshot.size);

    const members = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      members.push({
        id: doc.id,
        firstName: data["First Name"] || "",
        lastName: data["Last Name"] || "",
        email: data["Email"] || "",
        bio: data["Bio"] || "",
        headline: data["Headline"] || "",
        location: data["Location"] || "",
        tags: data["Tags"] || [],
        joinDate: convertTimestamp(data["Join Date"]),
        lastActive: convertTimestamp(data["Last Active"]),
        invitationDate: convertTimestamp(data["Invitation date"]),
        active: (data["Active (Signed In Last 30 Days)"] || "").toLowerCase() === "yes",
        emailMarketing: data["Email marketing"] === "subscribed",
        member: (data["Member [y/N]"] || "").toLowerCase() === "yes",
        profileUrl: data["Profile URL"] || "",
        websiteUrl: data["Website"] || "",
        twitterUrl: data["Twitter URL"] || "",
        facebookUrl: data["Facebook URL"] || "",
        linkedinUrl: data["LinkedIn URL"] || "",
        instagramUrl: data["Instagram URL"] || "",
        posts: parseInt(data["No. of Posts"]) || 0,
        comments: parseInt(data["No. of Comments"]) || 0,
        likesReceived: parseInt(data["No. of Likes Received"]) || 0,
        avatarUrl: data["Avatar URL"] || "",
      });
    });

    res.json({
      members,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: totalCount > parseInt(offset) + members.length,
      },
    });
  } catch (error) {
    logger.error("API error:", error);
    next(error);
  }
});

app.use(errorHandler);

// Export the function
exports.api = onRequest({
  memory: "256MiB",
  timeoutSeconds: 60,
  minInstances: 0,
  maxInstances: 10,
  invoker: "public",
}, app);
