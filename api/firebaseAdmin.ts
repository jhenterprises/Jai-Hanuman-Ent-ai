import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

let firebaseConfig: any = {};
try {
  firebaseConfig = require('../firebase-applet-config.json');
} catch (e) {
  console.warn('Could not load firebase-applet-config.json in firebaseAdmin.ts');
}

const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
let databaseId = firebaseConfig.firestoreDatabaseId || process.env.FIREBASE_DATABASE_ID || '(default)';

// If the environment variable was used but it matches the project ID, it might be a mistake
// since database IDs are usually (default) or a specific generated ID.
if (databaseId === process.env.FIREBASE_PROJECT_ID && firebaseConfig.firestoreDatabaseId) {
  databaseId = firebaseConfig.firestoreDatabaseId;
}

let app: admin.app.App;

if (!admin.apps.length) {
  try {
    if (projectId && clientEmail && privateKey) {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        } as any),
        projectId,
        databaseURL: `https://${projectId}.firebaseio.com`
      });
      console.log('Firebase Admin initialized with service account');
    } else {
      console.warn('Firebase Admin: Missing service account credentials, falling back to applicationDefault');
      app = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId
      });
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    app = admin.app();
  }
} else {
  app = admin.app();
}

export const adminAuth = admin.auth(app);
export const adminDb = databaseId && databaseId !== '(default)' 
  ? getFirestore(app, databaseId) 
  : getFirestore(app);
export default admin;
export { app };
