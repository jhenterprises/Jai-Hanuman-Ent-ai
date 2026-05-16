import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { env } from './env.js';

let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (existsSync(configPath)) {
    firebaseConfig = JSON.parse(readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn('Could not load firebase-applet-config.json');
}

if (!admin.apps.length) {
  let credential;
  const privateKey = env.FIREBASE_PRIVATE_KEY 
    ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '') 
    : undefined;

  if (privateKey && env.FIREBASE_CLIENT_EMAIL) {
    credential = admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    });
  } else {
    credential = admin.credential.applicationDefault();
  }

  admin.initializeApp({
    credential,
    projectId: env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  }, 'admin-app');
}

export const firebaseAdmin = admin.app('admin-app');
export const db = getFirestore(firebaseAdmin, env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId);
export const auth = admin.auth(firebaseAdmin);
