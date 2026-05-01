import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

let credential = admin.credential.applicationDefault();
if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  privateKey = privateKey.replace(/^"|"$/g, '');
  credential = admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  });
}

const app = admin.initializeApp({
  credential,
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
});

const dbId = firebaseConfig.firestoreDatabaseId || process.env.FIREBASE_DATABASE_ID;
const db = getFirestore(app, dbId);

async function run() {
  try {
    const doc = await db.collection('users').doc('some-uid').get();
    console.log('Doc exists?', doc.exists);
  } catch (e) {
    console.error('Error fetching doc:', e);
  }
}
run();
