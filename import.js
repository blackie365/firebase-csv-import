const admin = require('firebase-admin');
const fs = require('fs');
const { parse } = require('csv-parse');

// TODO: Replace with your Firebase service account key path
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase
admin.initializeApp({
credential: admin.credential.cert(serviceAccount)
});

// Get Firestore instance
const db = admin.firestore();

/**
* Reads and parses a CSV file
* @param {string} filePath - Path to the CSV file
* @returns {Promise<Array>} - Parsed CSV data as array of objects
*/
async function readCSV(filePath) {
const records = [];
const parser = fs
    .createReadStream(filePath)
    .pipe(parse({
    columns: true,
    skip_empty_lines: true
    }));

for await (const record of parser) {
    records.push(record);
}

return records;
}

/**
* Uploads data to Firebase Firestore
* @param {Array} data - Array of objects to upload
* @param {string} collection - Firestore collection name
*/
async function uploadToFirebase(data, collection) {
const batch = db.batch();

data.forEach((record, index) => {
    const docRef = db.collection(collection).doc();
    batch.set(docRef, record);
    
    // Firestore batches are limited to 500 operations
    if ((index + 1) % 500 === 0) {
    batch.commit();
    }
});

// Commit any remaining records
await batch.commit();
console.log(`Uploaded ${data.length} records to ${collection}`);
}

/**
* Main function to process CSV and upload to Firebase
* @param {string} csvPath - Path to CSV file
* @param {string} collection - Firestore collection name
*/
async function importCSVToFirebase(csvPath, collection) {
try {
    console.log('Starting import process...');
    
    // Read and parse CSV
    const data = await readCSV(csvPath);
    console.log(`Parsed ${data.length} records from CSV`);
    
    // Upload to Firebase
    await uploadToFirebase(data, collection);
    
    console.log('Import completed successfully');
} catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
}
}

// Import members data
importCSVToFirebase('members.csv', 'members');
