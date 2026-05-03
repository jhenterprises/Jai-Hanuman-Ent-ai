import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config manually to avoid import attribute issues
const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(readFileSync(firebaseConfigPath, 'utf8'));

// Initialize Firebase Admin
let credential;
try {
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    privateKey = privateKey.replace(/^"|"$/g, '');
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    });
  } else {
    // If we're in AI Studio, it might not have application default credentials set up correctly for local dev
    // but initializeApp might still work if it's already been set up by the environment.
    credential = admin.credential.applicationDefault();
  }
} catch (e) {
  console.error('Error setting up Firebase credential:', e);
}

const firebaseApp = admin.initializeApp({
  credential,
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
}, 'admin-app'); 

const dbId = firebaseConfig.firestoreDatabaseId || process.env.FIREBASE_DATABASE_ID;
const db = getFirestore(firebaseApp, dbId);
const auth = admin.auth(firebaseApp);

const expressApp = express();
expressApp.use(express.json());

// Global logging middleware
expressApp.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// API health check
expressApp.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV, vercel: !!process.env.VERCEL });
});

// Middleware to check Admin role from Firestore
const isAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = await auth.verifyIdToken(token);
    
    // Check role in Firestore
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    const userData = userDoc.data();
    const role = userData?.role;
    const email = decoded.email?.toLowerCase();

    // Hardcoded Admin Emails (from AuthContext.tsx)
    const adminEmails = ['pancardjhc2018@gmail.com', 'pavan.tr16@gmail.com', 'admin@jh.com'];

    if (role === 'admin' || (email && adminEmails.includes(email))) {
      return next();
    }
    
    console.warn(`User ${decoded.uid} (${email}) attempted admin action but has role ${role}`);
    return res.status(403).json({ error: 'Permission denied: Admin role required' });
    
  } catch (e: any) {
    console.error('Admin middleware error:', e.message);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// API route to reset user password
expressApp.post("/api/reset-password", isAdmin, async (req, res) => {
  const { uid, newPassword } = req.body;
  if (!uid || !newPassword) return res.status(400).json({ error: 'User ID and password are required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  
  try {
    // Attempt to update user. Note: uid must be the Firebase Auth UID.
    await auth.updateUser(uid, { password: newPassword });
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (e: any) {
    console.error('Password reset error:', e);
    
    // If UID not found, try to find by email if this is a manually added user
    if (e.code === 'auth/user-not-found') {
      try {
        const userDoc = await db.collection('users').doc(uid).get();
        const email = userDoc.data()?.email;
        if (email) {
          const userRecord = await auth.getUserByEmail(email);
          await auth.updateUser(userRecord.uid, { password: newPassword });
          return res.status(200).json({ message: 'Password updated via email lookup' });
        }
      } catch (innerError: any) {
        console.error('Secondary password reset attempt failed:', innerError);
      }
      return res.status(404).json({ error: 'Firebase Auth user not found. User must register first if added manually.' });
    }
    
    res.status(500).json({ error: 'Internal server error while resetting password' });
  }
});

// Global Error Handler
expressApp.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
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
