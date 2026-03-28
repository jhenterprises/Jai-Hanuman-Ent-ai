import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import firebaseConfig from './firebase-applet-config.json';

const exportPath = './data/database_export.json';

async function importJsonToFirestore() {
  if (!fs.existsSync(exportPath)) {
    console.error(`Export file not found at ${exportPath}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

  for (const tableName in data) {
    console.log(`Importing table: ${tableName}`);
    const rows = data[tableName];

    for (const row of rows) {
      // Use the table name as the collection name
      // Use the 'id' field as the document ID if it exists, otherwise let Firestore generate one
      const docId = row.id ? String(row.id) : undefined;
      const docRef = docId ? doc(collection(db, tableName), docId) : doc(collection(db, tableName));
      
      try {
        await setDoc(docRef, row);
      } catch (e) {
        console.error(`Error importing document ${docId} to ${tableName}:`, e);
      }
    }
  }

  console.log('Successfully imported database to Firestore');
}

importJsonToFirestore();
