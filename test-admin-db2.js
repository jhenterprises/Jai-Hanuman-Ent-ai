import admin from 'firebase-admin';
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

// In Node.js admin SDK, one way to specify a databaseId is when calling firestore() on the app
// wait, firestore() doesn't take arguments in some older versions? Oh wait, getFirestore(app, dbId) was added.
// let's try just initializing with databaseId in options maybe?
const app = admin.initializeApp({
  credential,
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
});

const dbId = process.env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;
console.log('dbId used:', dbId);
// In newer firebase-admin, you can use app.firestore(dbId) ? No, app.firestore() doesn't take args for databaseId in some typings?
// Let's try:
import { getFirestore } from 'firebase-admin/firestore';
const db = getFirestore(app, dbId); 
// We saw this failed. Is it possible dbId format is wrong? 

async function run() {
  try {
    const doc = await db.collection('users').doc('some-uid').get();
    console.log('Doc exists?', doc.exists);
  } catch (e) {
    console.error('Error fetching doc:', e);
  }
}
run();
