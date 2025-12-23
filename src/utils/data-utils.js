/**
* @fileoverview Utility functions for data transformation and sorting
*/

const admin = require('firebase-admin');
const SORT_FIELD_MAP = {
    'firstName': 'FirstName',
    'lastName': 'LastName',
    'email': 'Email',
    'joinDate': 'JoinDate', 
    'lastActive': 'LastActive',
    'status': 'Status',
    'role': 'Role'
};

/**
* Maps frontend sort field names to corresponding database field names
* @param {string} sortBy - Frontend sort field name
* @returns {string} Corresponding database field name or original input if no mapping exists
* @throws {Error} If sortBy parameter is null or undefined
*/
function getSortField(sortBy) {
if (sortBy == null) {
    throw new Error('Sort field cannot be null or undefined');
}

return SORT_FIELD_MAP[sortBy] || sortBy;
}

/**
* Converts a Firebase timestamp to ISO string format
* @param {Object|null} timestamp - Firebase timestamp object
* @returns {string|null} ISO formatted date string or null if input is invalid
*/
function convertTimestamp(timestamp) {
if (!timestamp) {
    return null;
}

try {
    // Handle both server timestamp and client timestamp objects
    if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
    }
    
    // Handle cases where timestamp might already be a Date object
    if (timestamp instanceof Date) {
    return timestamp.toISOString();
    }

    return null;
} catch (error) {
    console.error('Error converting timestamp:', error);
    return null;
}
}

module.exports = {
getSortField,
convertTimestamp
};

