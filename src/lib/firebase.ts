import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { GoogleAuthProvider } from 'firebase/auth';
import { 
  getDocFromServer, 
  doc, 
  setDoc, 
  serverTimestamp, 
  initializeFirestore,
  getFirestore,
  enableNetwork
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const firebaseConfigEnv = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID
};

// Merge config from environment variables with the fallback from the generated config file
const finalConfig = { ...firebaseConfig };

// Fix storageBucket to appspot.com if it's the newer format, as requested
if (finalConfig.storageBucket && finalConfig.storageBucket.includes('firebasestorage.app')) {
  finalConfig.storageBucket = finalConfig.projectId + '.appspot.com';
}

const isSet = (val: any) => typeof val === 'string' && val.trim() !== '' && !val.includes('YOUR_');

// Only override if env var is present and valid
if (isSet(firebaseConfigEnv.apiKey)) finalConfig.apiKey = firebaseConfigEnv.apiKey!.trim();
if (isSet(firebaseConfigEnv.authDomain)) finalConfig.authDomain = firebaseConfigEnv.authDomain!.trim();
if (isSet(firebaseConfigEnv.projectId)) finalConfig.projectId = firebaseConfigEnv.projectId!.trim();
if (isSet(firebaseConfigEnv.storageBucket)) finalConfig.storageBucket = firebaseConfigEnv.storageBucket!.trim();
if (isSet(firebaseConfigEnv.messagingSenderId)) finalConfig.messagingSenderId = firebaseConfigEnv.messagingSenderId!.trim();
if (isSet(firebaseConfigEnv.appId)) finalConfig.appId = firebaseConfigEnv.appId!.trim();
if (isSet(firebaseConfigEnv.measurementId)) finalConfig.measurementId = firebaseConfigEnv.measurementId!.trim();

const app = initializeApp(finalConfig);

console.log('--------------------------------------------------');
console.log('FIREBASE DEBUG LOGS');
console.log('Current URL:', window.location.href);
console.log('Project ID:', finalConfig.projectId);
console.log('Storage Bucket:', finalConfig.storageBucket);
console.log('Sanitized Config:', {
  apiKey: finalConfig.apiKey ? finalConfig.apiKey.substring(0, 5) + '...' : 'MISSING',
  authDomain: finalConfig.authDomain,
  projectId: finalConfig.projectId
});
const dbId = (firebaseConfigEnv.firestoreDatabaseId && firebaseConfigEnv.firestoreDatabaseId !== '') 
  ? firebaseConfigEnv.firestoreDatabaseId 
  : (finalConfig.firestoreDatabaseId || '(default)');
console.log('Firestore Database ID:', dbId);
console.log('Sources:', {
  apiKey: firebaseConfigEnv.apiKey ? 'ENV' : 'JSON',
  projectId: firebaseConfigEnv.projectId ? 'ENV' : 'JSON',
  dbId: firebaseConfigEnv.firestoreDatabaseId ? 'ENV' : 'JSON'
});
console.log('--------------------------------------------------');

// Use initializeFirestore with settings for better connectivity
const firestoreSettings: any = {
  // Use experimentalForceLongPolling to fix connection issues in restricted environments
  experimentalForceLongPolling: true,
  // Ensure we don't use fetch streams which can be problematic
  useFetchStreams: false
};
console.log('Firestore Settings being applied:', firestoreSettings);
console.log('Target Database ID:', dbId);

let dbInstance;
try {
  dbInstance = (dbId && dbId !== '(default)' && dbId !== '')
    ? initializeFirestore(app, firestoreSettings, dbId)
    : initializeFirestore(app, firestoreSettings);
} catch (e) {
  console.warn('Firestore already initialized or error during init, falling back to getFirestore');
  // Fallback to getFirestore if it fails
  dbInstance = (dbId && dbId !== '(default)' && dbId !== '') ? getFirestore(app, dbId) : getFirestore(app);
}

// Proactively enable network to prevent "offline" errors
enableNetwork(dbInstance).catch(err => console.error('Failed to enable network explicitly:', err));

export const db = dbInstance;

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
export default app;
storage.maxOperationRetryTime = 15000; // 15 seconds
storage.maxUploadRetryTime = 15000; // 15 seconds

// Test connection - calling manually if needed to diagnose
export async function testConnection() {
  try {
    // Use getDocFromServer to bypass cache and test real connection
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test successful");
    
    // Perform a test write as requested
    await setDoc(doc(db, 'test', 'connection'), {
      lastTest: serverTimestamp(),
      status: 'working'
    }, { merge: true });
    console.log("Firestore test write successful");
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    } else {
      console.error("Firestore connection test failed:", error);
    }
  }
}
// testConnection();
