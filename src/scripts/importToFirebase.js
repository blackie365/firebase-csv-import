/**
* @fileoverview Import members data from JSON to Firebase
*/

const admin = require('firebase-admin');
const fs = require('fs');
const { initializeFirebase } = require('../services/firebase');

// Initialize Firebase Admin
admin.initializeApp({
credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function importData() {
try {
    console.log('Reading JSON file...');
    const jsonData = fs.readFileSync('members_export_2025-01-14T16-05-34-982Z.json', 'utf8');
    const data = JSON.parse(jsonData);
    console.log(`Found ${Object.keys(data).length} records to import`);

    // Create batches for importing
    const batchSize = 500;
    let count = 0;
    let batch = db.batch();
    const totalRecords = Object.keys(data).length;

    for (const [id, member] of Object.entries(data)) {
    // Add searchName field for case-insensitive search
    member.searchName = `${member.FirstName} ${member.LastName}`.toLowerCase();
    
    const docRef = db.collection('members').doc(id);
    batch.set(docRef, member);
    count++;

    if (count % batchSize === 0 || count === totalRecords) {
        console.log(`Committing batch of ${count % batchSize || batchSize} documents (${count}/${totalRecords})`);
        await batch.commit();
        batch = db.batch();
    }
    }

    console.log('Import completed successfully');
    return count;
} catch (error) {
    console.error('Error importing data:', error);
    throw error;
}
}

// Run the import
importData()
.then((count) => {
    console.log(`Successfully imported ${count} documents`);
    process.exit(0);
})
.catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
});
