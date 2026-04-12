import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const firebaseConfig = require('./firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function runTest() {
  try {
    console.log('Testing addDoc...');
    const docRef = await addDoc(collection(db, 'test_collection'), {
      message: 'Hello from test script',
      timestamp: new Date()
    });
    console.log('Successfully wrote document with ID:', docRef.id);
  } catch (error: any) {
    console.error('Error writing document:', error.message || error);
  }
}

runTest();
