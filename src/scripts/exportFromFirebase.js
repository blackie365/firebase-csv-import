/**
* @fileoverview Export collection data from Firebase to JSON/CSV
*/

const admin = require('firebase-admin');
const fs = require('fs');
const { Parser } = require('json2csv');

// Use the YBW app service account key so exports come from the same project
const serviceAccount = require('../../../squarebaseApp/serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps || !admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Error initializing Firebase:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

// Check command line arguments
if (process.argv.length < 3) {
  console.error('Usage: node exportFromFirebase.js <collection-name>');
  process.exit(1);
}

const collectionName = process.argv[2];

// Convert Firestore timestamp to date string
function convertTimestamp(timestamp) {
    return timestamp && timestamp.toDate ? timestamp.toDate().toISOString() : timestamp;
}

// Convert array to comma-separated string
function convertArray(arr) {
    return Array.isArray(arr) ? arr.join(', ') : arr;
}

// Process document data
function processDocument(doc) {
    const data = doc.data();
    const processed = {};
    
    for (const [key, value] of Object.entries(data)) {
        // Convert timestamps
        if (value && value.toDate) {
            processed[key] = convertTimestamp(value);
        }
        // Convert arrays
        else if (Array.isArray(value)) {
            processed[key] = convertArray(value);
        }
        // Keep other values as is
        else {
            processed[key] = value;
        }
    }
    
    return {
        id: doc.id,
        ...processed
    };
}

async function exportCollection() {
    console.log(`Starting export of collection: ${collectionName}`);
    
    try {
        // Fetch all documents from the collection
        const snapshot = await db.collection(collectionName).get();
        
        if (snapshot.empty) {
            console.log('No documents found in collection');
            process.exit(0);
        }

        console.log(`Found ${snapshot.size} documents. Processing...`);

        // Process all documents
        const documents = snapshot.docs.map(processDocument);

        // Generate timestamp for filenames
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // Save as JSON
        const jsonFileName = `${collectionName}_export_${timestamp}.json`;
        fs.writeFileSync(jsonFileName, JSON.stringify(documents, null, 2));
        console.log(`JSON export saved to ${jsonFileName}`);

        // Save as CSV
        const parser = new Parser();
        const csv = parser.parse(documents);
        const csvFileName = `${collectionName}_export_${timestamp}.csv`;
        fs.writeFileSync(csvFileName, csv);
        console.log(`CSV export saved to ${csvFileName}`);

        console.log('Export completed successfully');
    } catch (error) {
        console.error('Error during export:', error.message);
        process.exit(1);
    } finally {
        // Close Firebase connection
        admin.app().delete();
    }
}

// Run the export
exportCollection();

