/**
 * @fileoverview Delete all documents from a Firestore collection
 */

const admin = require('firebase-admin');
// Use the YBW app service account key (ybw-app-270325)
const serviceAccount = require('../../../squarebaseApp/serviceAccountKey.json');

if (!admin.apps || !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function clearCollection(collectionName) {
  const batchSize = 500;
  let totalDeleted = 0;

  console.log(`Starting delete for collection "${collectionName}"...`);

  while (true) {
    const snapshot = await db.collection(collectionName).limit(batchSize).get();
    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    totalDeleted += snapshot.size;
    console.log(`Deleted ${totalDeleted} documents so far from ${collectionName}...`);
  }

  console.log(`Finished deleting ${totalDeleted} documents from ${collectionName}`);
}

if (require.main === module) {
  const collection = process.argv[2] || 'myCollection';
  clearCollection(collection)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error deleting collection:', err);
      process.exit(1);
    });
}

module.exports = { clearCollection };
