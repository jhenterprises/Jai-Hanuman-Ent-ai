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

const app = admin.initializeApp({
  credential,
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
}, 'test_roles_app');

const dbId = "ai-studio-b8d84549-d9f2-4318-8dc6-aa05542d3d3b";
console.log('Using firestore database id:', dbId);
import { getFirestore } from 'firebase-admin/firestore';
const db = getFirestore(app, dbId);

async function run() {
  try {
    const snapshot = await db.collection('users').get();
    console.log(`Total users found: ${snapshot.size}`);
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`UID: ${doc.id} | Email: ${data.email} | Role: ${data.role} | Name: ${data.name}`);
    });
  } catch (e) {
    console.error('Error fetching users:', e);
  }
}
run();
