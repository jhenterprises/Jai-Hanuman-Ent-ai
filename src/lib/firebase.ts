import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  memoryLocalCache, 
  enableNetwork 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfigEnv = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID
};

const finalConfig = { ...firebaseConfigJson };

const isSet = (val: any) => typeof val === 'string' && val.trim() !== '' && !val.includes('YOUR_');

if (isSet(firebaseConfigEnv.apiKey)) finalConfig.apiKey = firebaseConfigEnv.apiKey!.trim();
if (isSet(firebaseConfigEnv.authDomain)) finalConfig.authDomain = firebaseConfigEnv.authDomain!.trim();
if (isSet(firebaseConfigEnv.projectId)) finalConfig.projectId = firebaseConfigEnv.projectId!.trim();
if (isSet(firebaseConfigEnv.storageBucket)) finalConfig.storageBucket = firebaseConfigEnv.storageBucket!.trim();
if (isSet(firebaseConfigEnv.messagingSenderId)) finalConfig.messagingSenderId = firebaseConfigEnv.messagingSenderId!.trim();
if (isSet(firebaseConfigEnv.appId)) finalConfig.appId = firebaseConfigEnv.appId!.trim();
if (isSet(firebaseConfigEnv.measurementId)) finalConfig.measurementId = firebaseConfigEnv.measurementId!.trim();

const app = initializeApp(finalConfig);

let dbId = (finalConfig.firestoreDatabaseId && finalConfig.firestoreDatabaseId !== '(default)' && finalConfig.firestoreDatabaseId !== '')
  ? finalConfig.firestoreDatabaseId
  : ((firebaseConfigEnv.firestoreDatabaseId && firebaseConfigEnv.firestoreDatabaseId !== '(default)' && firebaseConfigEnv.firestoreDatabaseId !== '')
      ? firebaseConfigEnv.firestoreDatabaseId
      : undefined);

console.log('Final Firestore Database ID:', dbId || '(default)');

const firestoreSettings = {
  experimentalForceLongPolling: true,
};

let dbInstance;
try {
  dbInstance = initializeFirestore(app, firestoreSettings, dbId);
} catch (e: any) {
  dbInstance = getFirestore(app, dbId);
}

export const db = dbInstance;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);

// Connectivity Warmup removed

export default app;

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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
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
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
