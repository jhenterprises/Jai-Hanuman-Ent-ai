import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import firebaseConfig from './firebase-applet-config.json' with { type: "json" };

import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let credential;
if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  // Replace escaped newlines if they are passed as literal strings and remove surrounding quotes
  let privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  privateKey = privateKey.replace(/^"|"$/g, '');
  credential = admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  });
} else {
  credential = admin.credential.applicationDefault();
}

const app = admin.initializeApp({
  credential,
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
});

const dbId = firebaseConfig.firestoreDatabaseId || process.env.FIREBASE_DATABASE_ID;
const db = getFirestore(app, dbId);

const expressApp = express();

async function startServer() {
  expressApp.use(express.json());
  
  const PORT = 3000;

  // Middleware to check Admin role from Firestore
  const isAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      
      const userDoc = await db.collection('users').doc(decoded.uid).get();
      if (userDoc.data()?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      next();
    } catch (e) {
      console.error('Admin middleware error:', e);
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  // API route to reset user password
  expressApp.post("/api/reset-password", isAdmin, async (req, res) => {
    const { uid, newPassword } = req.body;
    if (!uid || !newPassword) return res.status(400).json({ error: 'Missing params' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    
    try {
      await admin.auth().updateUser(uid, { password: newPassword });
      res.status(200).json({ message: 'Password updated' });
    } catch (e) {
      console.error('Password reset error:', e);
      res.status(500).json({ error: 'Failed to update password' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    expressApp.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    expressApp.use(express.static(distPath));
    expressApp.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    expressApp.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default expressApp;
