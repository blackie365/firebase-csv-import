// Trust proxy for correct client IP addresses behind Cloud Functions
app.set('trust proxy', true);

// Update the members endpoint with error handling and logging
app.get("/api/members", async (req, res, next) => {
try {
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

    try {
    // Test if collection exists
    const collections = await db.listCollections();
    const collectionNames = (await collections.get()).map(col => col.id);
    logger.info("Available collections:", collectionNames);
    } catch (error) {
    logger.error("Error listing collections:", error);
    }

    if (active !== undefined) {
    query = query.where("Active", "==", active === "true");
    logger.info("Active filter applied:", active);
    }

    if (search) {
    query = query.where("searchName", ">=", search.toLowerCase())
        .where(
        "searchName",
        "<=",
        search.toLowerCase() + "\\uf8ff"
        );
    logger.info("Search filter applied:", search);
    }

    try {
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;
    logger.info("Total count:", total);

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
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + members.length,
        },
    });
    } catch (error) {
    logger.error("Firestore query error:", error);
    throw error;
    }
} catch (error) {
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
        const validSortOrder = ["asc", "desc"].includes(sortOrder) 
        ? sortOrder 
        : "desc";
try {
const collectionsSnapshot = await db.listCollections();
const collectionIds = [];
for (const collection of collectionsSnapshot) {
    collectionIds.push(collection.id);
}
logger.info("Available collections:", collectionIds);

if (!collectionIds.includes('members')) {
    logger.error("Members collection not found");
    return res.status(404).json({
    error: "Collection not found",
    availableCollections: collectionIds
    });
}
} catch (error) {
logger.error("Error listing collections:", error);
// Continue execution even if collection listing fails
}
