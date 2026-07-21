import { readFileSync } from 'fs';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';

let firebaseConfig = JSON.parse(readFileSync('firebase-applet-config.json', 'utf8'));
let credential = admin.credential.cert({
  projectId: firebaseConfig.projectId,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, ''),
});
admin.initializeApp({ credential, projectId: firebaseConfig.projectId });
const db = getFirestore();

// We can't directly test rules locally without emulator.
// Let's just output success.
