const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteAllMembers() {
try {
    console.log('Fetching all members...');
    const snapshot = await db.collection('members').get();
    console.log(`Found ${snapshot.size} documents to delete`);

    const batch = db.batch();
    let count = 0;
    const batchSize = 500;
    const batches = [];

    snapshot.forEach((doc) => {
    batch.delete(doc.ref);
    count++;

    if (count >= batchSize) {
        batches.push(batch.commit());
        count = 0;
    }
    });

    if (count > 0) {
    batches.push(batch.commit());
    }

    await Promise.all(batches);
    console.log('Successfully deleted all members');
} catch (error) {
    console.error('Error deleting members:', error);
} finally {
    process.exit(0);
}
}

deleteAllMembers();

