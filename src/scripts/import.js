/**
* @fileoverview Generic CSV import script for Firebase
*/

const admin = require('firebase-admin');
const fs = require('fs');
const { parse } = require('csv-parse');
// Use the YBW app service account key (ybw-app-270325 project)
// so imports go to the same Firestore project used by the live directory API
const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || '../../../squarebaseApp/serviceAccountKey.json');

// Initialize Firebase
if (!admin.apps || !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

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
  const batchSize = 500;
  let processed = 0;

  while (processed < data.length) {
    const batch = db.batch();
    const chunk = data.slice(processed, processed + batchSize);

    chunk.forEach((record) => {
      const docRef = db.collection(collection).doc();
      batch.set(docRef, record);
    });

    await batch.commit();
    processed += chunk.length;
    console.log(`Uploaded ${processed}/${data.length} records to ${collection}`);
  }
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

    // Filter to only members with avatar image AND at least some profile text
    const filtered = data.filter((record) => {
      const avatar = (record['Avatar URL'] || record['AvatarURL'] || '').trim();
      const bio = (record['Bio'] || '').trim();
      const headline = (record['Headline'] || '').trim();
      // Require an image and either a bio or a headline
      return !!avatar && (!!bio || !!headline);
    });

    console.log(`Filtered down to ${filtered.length} records with image and profile`);

    // Add searchName and trim key fields
    const transformed = filtered.map((record) => {
      const first = (record['First Name'] || record['FirstName'] || '').trim();
      const last = (record['Last Name'] || record['LastName'] || '').trim();
      const email = (record['Email'] || '').trim();
      const fullName = `${first} ${last}`.trim();

      return {
        ...record,
        'First Name': first || record['First Name'],
        'Last Name': last || record['Last Name'],
        Email: email || record['Email'],
        searchName: (fullName || email).toLowerCase(),
      };
    });

    // Upload to Firebase
    await uploadToFirebase(transformed, collection);

    console.log('Import completed successfully');
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  }
}

// Allow running from the command line
if (require.main === module) {
  const csvPath = process.argv[2] || 'members.csv';
  const collection = process.argv[3] || 'members';

  console.log(`Importing CSV "${csvPath}" into collection "${collection}"...`);
  importCSVToFirebase(csvPath, collection);
}

module.exports = { importCSVToFirebase };
