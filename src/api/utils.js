/**
* Maps API sort field names to database field names
* @param {string} field - The field name from the API request
* @returns {string} The corresponding database field name
*/
function getSortField(field) {
const fieldMap = {
    name: 'displayName',
    email: 'email',
    created: 'createdAt',
    updated: 'updatedAt',
    // Add more field mappings as needed
};
return fieldMap[field] || field;
}

/**
* Converts Firestore timestamp to ISO string
* @param {FirebaseFirestore.Timestamp} timestamp - Firestore timestamp object
* @returns {string} ISO formatted date string
*/
function convertTimestamp(timestamp) {
if (!timestamp || !timestamp.toDate) {
    return null;
}
return timestamp.toDate().toISOString();
}

module.exports = {
getSortField,
convertTimestamp
};

