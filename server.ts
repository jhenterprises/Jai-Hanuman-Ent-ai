import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import admin, { adminDb as db, adminAuth } from './api/firebaseAdmin.ts';
import { getFirestore } from 'firebase-admin/firestore';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const firebaseConfig = require('./firebase-applet-config.json');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-jai-hanuman';

// Admin Configuration
const ADMIN_EMAILS = ['pancardjhc2018@gmail.com', 'pavan.tr16@gmail.com'];

// Helper to format phone number for Firebase Auth (E.164)
const formatPhoneNumber = (phone: any) => {
  if (!phone || typeof phone !== 'string' || phone.trim() === '') return undefined;
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return undefined;
  
  // If it already has +, check if it's valid E.164
  if (cleaned.startsWith('+')) {
    return /^\+\d{7,15}$/.test(cleaned) ? cleaned : undefined;
  }
  
  // If it's 10 digits, assume India (+91)
  if (cleaned.length === 10) return `+91${cleaned}`;
  
  // If it's 12 digits and starts with 91, assume India without +
  if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`;

  // Fallback: if it's between 7 and 15 digits, try adding +
  if (cleaned.length >= 7 && cleaned.length <= 15) return `+${cleaned}`;

  return undefined;
};

// Firebase Admin Setup
// The 'db' and 'admin' are imported from ./api/firebaseAdmin.ts

// Initialize Firestore instance
let firestoreDatabaseId = firebaseConfig.firestoreDatabaseId || '(default)';

// Sanity check for database ID (it should not be a Measurement ID starting with G-)
if (firestoreDatabaseId.startsWith('G-')) {
  console.warn(`WARNING: FIREBASE_DATABASE_ID "${firestoreDatabaseId}" looks like a Measurement ID. Reverting to config value.`);
  firestoreDatabaseId = '(default)';
}

console.log(`Firestore initialized with database: ${firestoreDatabaseId}`);

if (admin.apps.length > 0) {
  try {
    // Test the connection immediately to catch NOT_FOUND errors early
    (async () => {
      try {
        await db.collection('health_check').limit(1).get();
        console.log('Firestore connection verified successfully');
        
        // Run seeding after verification
        await seedUsers();
        await seedServiceLinks();
        await seedServices();
        await seedPortalConfig();
      } catch (err: any) {
        if (err.code === 5 || (err.message && err.message.includes('NOT_FOUND'))) {
          console.error(`\n================================================================`);
          console.error(`CRITICAL ERROR: Firestore database "${firestoreDatabaseId}" not found.`);
          console.error(`This usually means the database ID in your config is incorrect or hasn't been created.`);
          
          if (firestoreDatabaseId !== '(default)') {
            console.warn(`Attempting fallback to (default) database...`);
            try {
              const fallbackDb = getFirestore(admin.app(), '(default)');
              await fallbackDb.collection('health_check').limit(1).get();
              // Fallback handled in firebaseAdmin.ts
              console.log('Successfully fell back to (default) database');
            } catch (fallbackErr) {
              console.error('Fallback to (default) database also failed.');
            }
          }
          console.error(`================================================================\n`);
        } else {
          console.error('Firestore connection test failed with non-404 error:', err);
        }
      }
    })();
  } catch (e) {
    console.error('Failed to get Firestore instance:', e);
  }
}

// --- Health Check ---
// (Consolidated health check is below in API Routes)
// Note: In some environments, you might need to use a specific database ID
// but for now we'll stick to the default or assume the project ID handles it.
// If a specific database is needed, it's usually configured in the project settings.

// Razorpay Setup
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret'
});

// Auth Middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    let decodedToken: any;
    
    // Try Firebase ID Token first
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      const userData = userDoc.data();
      
      let role = userData?.role || 'user';
      const userEmail = (decodedToken.email || '').toLowerCase().trim();
      
      if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
        role = 'admin';
      }
      
      req.user = {
        ...userData,
        id: decodedToken.uid,
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: role
      };
      return next();
    } catch (firebaseErr: any) {
      // If not a Firebase token, try custom JWT
      try {
        decodedToken = jwt.verify(token, JWT_SECRET);
        const userDoc = await db.collection('users').doc(decodedToken.id).get();
        const userData = userDoc.data();
        
        let role = userData?.role || decodedToken.role || 'user';
        const userEmail = (userData?.email || decodedToken.email || '').toLowerCase().trim();
        
        if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
          role = 'admin';
        }
        
        req.user = {
          ...userData,
          id: decodedToken.id,
          role: role
        };
        return next();
      } catch (jwtErr) {
        console.error('Token verification failed (both Firebase and JWT)');
        return res.status(401).json({ error: 'Invalid token' });
      }
    }
  } catch (err: any) {
    console.error('Auth Middleware Error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    const userEmail = (req.user?.email || '').toLowerCase().trim();
    
    // If user is one of the primary admins, they pass any role check
    if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      console.log(`[403 Forbidden] Path: ${req.path}, Required: ${roles}, User: ${userEmail}, Role: ${req.user.role}`);
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

const checkFirestore = (req: any, res: any, next: any) => {
  if (!admin.apps.length) {
    console.error(`Firestore not initialized for ${req.method} ${req.path}`);
    return res.status(503).json({ 
      error: 'Database connection not established. Please check your Firebase environment variables in Vercel.',
      details: 'Firebase Admin initialization failed or is pending.'
    });
  }
  next();
};

// Middleware
app.use(express.json());

// Debug endpoint to check database state
app.get('/api/debug/db-stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const collections = ['users', 'applications', 'services', 'ledger', 'notifications'];
    const stats: any = {};
    
    for (const col of collections) {
      const snapshot = await db.collection(col).get();
      stats[col] = snapshot.size;
    }
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch debug stats' });
  }
});

// Seed initial data
const seedUsers = async () => {
  if (!db) {
    console.warn('Skipping users seeding: Firestore not initialized');
    return;
  }
  console.log('Starting seedUsers...');
  try {
    console.log('Checking if users need to be seeded...');
    const defaultUsers = [
      {
        name: 'Admin User',
        email: 'admin@jh.com',
        password: 'AdminPassword123!',
        phone: '+919999999999',
        role: 'admin'
      },
      {
        name: 'Staff User',
        email: 'staff@jh.com',
        password: 'StaffPassword123!',
        phone: '+918888888888',
        role: 'staff'
      },
      {
        name: 'Primary Admin',
        email: ADMIN_EMAILS[0],
        password: 'AdminPassword123!',
        phone: '+910000000000',
        role: 'admin'
      },
      {
        name: 'Secondary Admin',
        email: ADMIN_EMAILS[1],
        password: 'AdminPassword123!',
        phone: '+911111111111',
        role: 'admin'
      }
    ];

    // Sync existing Firestore users to Firebase Auth if they don't exist there
    console.log('Syncing Firestore users to Firebase Auth...');
    const allUsersSnapshot = await db.collection('users').get();
    for (const doc of allUsersSnapshot.docs) {
      const userData = doc.data();
      if (userData.email && userData.password) {
        try {
          await admin.auth().getUserByEmail(userData.email);
        } catch (authErr: any) {
          if (authErr.code === 'auth/user-not-found') {
            try {
              // Use the same UID as in Firestore if possible, but Firestore IDs are usually random strings
              // while Auth UIDs are also strings. We can't easily change Auth UID after creation.
              // If we create a new Auth user, it will have a NEW UID.
              // This is a problem because Firestore docs are keyed by UID for Auth users.
              
              // If the Firestore doc ID is NOT a valid Auth UID (e.g. it was generated by .add()),
              // we should probably create the Auth user and then update the Firestore doc ID.
              
              const authOptions: any = {
                email: userData.email,
                password: 'ChangeMe123!', // We can't recover the original password from bcrypt
                displayName: userData.name,
              };
              
              const formattedPhone = formatPhoneNumber(userData.phone);
              if (formattedPhone) {
                authOptions.phoneNumber = formattedPhone;
              }

              const newUser = await admin.auth().createUser(authOptions);
              
              console.log(`Synced user ${userData.email} to Firebase Auth. Temporary password: ChangeMe123!`);
              
              // If the current doc ID is not the new UID, we need to migrate the data
              if (doc.id !== newUser.uid) {
                await db.collection('users').doc(newUser.uid).set({
                  ...userData,
                  phone: userData.phone, // Ensure phone is preserved in Firestore
                  synced_from_id: doc.id
                });
                await db.collection('users').doc(doc.id).delete();
                console.log(`Migrated Firestore document for ${userData.email} to new UID ${newUser.uid}`);
              }
            } catch (createErr) {
              console.error(`Failed to sync user ${userData.email}:`, createErr);
            }
          }
        }
      }
    }

    for (const u of defaultUsers) {
      try {
        let userRecord;
        try {
          userRecord = await admin.auth().getUserByEmail(u.email);
          console.log(`User ${u.email} already exists in Firebase Auth.`);
        } catch (authErr: any) {
          if (authErr.code === 'auth/user-not-found') {
            const authOptions: any = {
              email: u.email,
              password: u.password,
              displayName: u.name,
            };
            
            const formattedPhone = formatPhoneNumber(u.phone);
            if (formattedPhone) {
              authOptions.phoneNumber = formattedPhone;
            }

            userRecord = await admin.auth().createUser(authOptions);
            console.log(`Created new user in Firebase Auth: ${u.email}`);
          } else {
            throw authErr;
          }
        }

        if (userRecord) {
          const userDoc = await db.collection('users').doc(userRecord.uid).get();
          // Force update role if it's one of our primary admins
          const isAdminEmail = ADMIN_EMAILS.includes(u.email);
          const targetRole = isAdminEmail ? 'admin' : u.role;

          if (!userDoc.exists || userDoc.data()?.role !== targetRole) {
            await db.collection('users').doc(userRecord.uid).set({
              name: u.name,
              email: u.email,
              phone: u.phone,
              role: targetRole,
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log(`Updated/Added user in Firestore: ${u.email} with role ${targetRole}`);
          }
        }
      } catch (err) {
        console.error(`Error seeding user ${u.email}:`, err);
      }
    }
  } catch (err) {
    console.error('Error in seedUsers:', err);
  }
};
// seedUsers();

// Seed Service Links
const seedServiceLinks = async () => {
  if (!db) {
    console.warn('Skipping service links seeding: Firestore not initialized');
    return;
  }
  try {
    const snapshot = await db.collection('service_links').limit(1).get();
    if (snapshot.empty) {
      const initialLinks = [
        ['aadhaar', 'https://myaadhaar.uidai.gov.in', 'https://resident.uidai.gov.in'],
        ['pan', 'https://www.incometax.gov.in', 'https://www.onlineservices.nsdl.com'],
        ['voterid', 'https://voters.eci.gov.in', 'https://voters.eci.gov.in'],
        ['passport', 'https://portal2.passportindia.gov.in', 'https://passportindia.gov.in'],
        ['airtel', 'https://portal.airtelbank.com/RetailerPortal', 'https://www.airtel.in/bank'],
        ['csc', 'https://digitalseva.csc.gov.in', 'https://register.csc.gov.in'],
        ['sevasindhu', 'https://sevasindhuservices.karnataka.gov.in', 'https://sevasindhu.karnataka.gov.in'],
        ['gruhajyothi', 'https://sevasindhugs.karnataka.gov.in', 'https://sevasindhu.karnataka.gov.in'],
        ['gruhalakshmi', 'https://sevasindhugs1.karnataka.gov.in/gl-sp', 'https://sevasindhu.karnataka.gov.in'],
        ['csctickets', 'https://cscsafar.in', 'https://cscsafar.in'],
        ['bhoomi', 'https://landrecords.karnataka.gov.in', 'https://landrecords.karnataka.gov.in'],
        ['swiftmoney', 'https://swift.quicksekure.com/Login.aspx', 'https://swift.quicksekure.com'],
        ['ssp_post', 'https://ssp.postmatric.karnataka.gov.in/homepage.aspx', 'https://ssp.postmatric.karnataka.gov.in'],
        ['ssp_pre', 'https://ssp.karnataka.gov.in/ssppre/PreHome', 'https://ssp.karnataka.gov.in'],
        ['abha', 'https://abha.abdm.gov.in', 'https://abha.abdm.gov.in/abha/v3/register'],
        ['ayushman', 'https://beneficiary.nha.gov.in', 'https://beneficiary.nha.gov.in'],
        ['ration', 'https://ahara.karnataka.gov.in', 'https://ahara.karnataka.gov.in'],
        ['ekhata', 'https://bbmpeaasthi.karnataka.gov.in', 'https://bbmpeaasthi.karnataka.gov.in'],
        ['msme', 'https://udyamregistration.gov.in', 'https://udyamregistration.gov.in'],
        ['incometax', 'https://www.incometax.gov.in/iec/foportal', 'https://www.incometax.gov.in'],
        ['kvs', 'https://kvsonlineadmission.kvs.gov.in', 'https://kvsonlineadmission.kvs.gov.in'],
        ['rte', 'https://schooleducation.karnataka.gov.in/en', 'https://schooleducation.karnataka.gov.in'],
        ['bbmptax', 'https://bbmptax.karnataka.gov.in/Default.aspx', 'https://bbmptax.karnataka.gov.in'],
        ['fssai', 'https://foscos.fssai.gov.in', 'https://foscos.fssai.gov.in'],
        ['sundirect', 'https://www.sundirect.in', 'https://www.sundirect.in'],
        ['railwaypass', 'https://divyangjanid.indianrail.gov.in', 'https://divyangjanid.indianrail.gov.in'],
        ['epfo_login', 'https://unifiedportal-mem.epfindia.gov.in/memberinterface/', 'https://www.epfindia.gov.in'],
        ['epfo_passbook', 'https://passbook.epfindia.gov.in/MemberPassBook/login', 'https://passbook.epfindia.gov.in'],
        ['ttd', 'https://ttdevasthanams.ap.gov.in/home/dashboard', 'https://ttdevasthanams.ap.gov.in'],
      ];
      
      const batch = db.batch();
      initialLinks.forEach(([type, process, apply]) => {
        const ref = db.collection('service_links').doc();
        batch.set(ref, {
          service_type: type,
          process_url: process,
          apply_url: apply,
          is_active: 1,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();
      console.log('Service links seeded successfully');
    }
  } catch (err) {
    console.error('Error seeding service links:', err);
  }
};
// seedServiceLinks();

// Seed Portal Config
const seedPortalConfig = async () => {
  if (!db) {
    console.warn('Skipping portal config seeding: Firestore not initialized');
    return;
  }
  try {
    const snapshot = await db.collection('settings').doc('portal').get();
    if (!snapshot.exists) {
      const defaultConfig = {
        portal_name: 'JH Digital Seva Kendra',
        tagline: 'Official Digital Seva Portal',
        theme_color: '#2563eb',
        secondary_color: '#06b6d4',
        header_bg_color: '#020617',
        enable_animations: true,
        organization_name: 'JH Digital Services',
        contact_email: 'support@jh.com',
        contact_phone: '+91 9999999999',
        office_address: 'Main Road, Bangalore, Karnataka',
        footer_text: '© 2024 JH Digital Seva Kendra. All rights reserved.',
        banner_title: 'Welcome to JH Digital Seva',
        banner_subtitle: 'Access all government and digital services in one place',
        services_title: 'Our Premium Services',
        about_content: 'We provide a wide range of digital services to help citizens access government portals and applications easily.',
        login_title: 'Portal Login',
        enable_user_registration: true,
        enable_user_login: true,
        enable_staff_login: true,
        enable_admin_login: true,
        enable_service_applications: true,
        enable_track_application: true,
        grid_columns: 4,
        max_file_size: 5,
        allowed_file_types: 'pdf,jpg,png',
        email_notifications: true,
        sms_notifications: false,
        status_alerts: true,
        session_timeout: 30,
        enable_captcha: false,
        enable_otp: false
      };
      await db.collection('settings').doc('portal').set({
        ...defaultConfig,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('Portal config seeded successfully');
    }
  } catch (err) {
    console.error('Error seeding portal config:', err);
  }
};
// seedPortalConfig();

// Seed Services
const seedServices = async () => {
  if (!db) {
    console.warn('Skipping services seeding: Firestore not initialized');
    return;
  }
  try {
    console.log('Checking if services need to be seeded...');
    const snapshot = await db.collection('services').limit(1).get();
    if (snapshot.empty) {
      console.log('No services found in Firestore. Seeding default services...');
      const initialServices = [
        { name: 'Aadhaar Card', description: 'Aadhaar related services including update and download', url: 'https://myaadhaar.uidai.gov.in', icon: 'fa-fingerprint', application_type: 'external' },
        { name: 'PAN Card', description: 'New PAN card application and corrections', url: 'https://www.onlineservices.nsdl.com', icon: 'fa-id-card', application_type: 'external' },
        { name: 'Voter ID', description: 'Voter registration and ID card services', url: 'https://voters.eci.gov.in', icon: 'fa-id-badge', application_type: 'external' },
        { name: 'Passport', description: 'Passport application and renewal services', url: 'https://passportindia.gov.in', icon: 'fa-globe', application_type: 'external' },
        { name: 'Airtel Payments', description: 'Airtel Payments Bank services', url: 'https://portal.airtelbank.com/RetailerPortal', icon: 'fa-university', application_type: 'external' },
        { name: 'CSC Portal', description: 'Common Service Centre services', url: 'https://digitalseva.csc.gov.in', icon: 'fa-laptop', application_type: 'external' },
        { name: 'Seva Sindhu', description: 'Karnataka government services portal', url: 'https://sevasindhuservices.karnataka.gov.in', icon: 'fa-landmark', application_type: 'external' },
        { name: 'Gruha Jyothi', description: 'Free electricity scheme registration', url: 'https://sevasindhugs.karnataka.gov.in', icon: 'fa-lightbulb', application_type: 'external' },
        { name: 'Gruha Lakshmi', description: 'Financial assistance for women heads of households', url: 'https://sevasindhugs1.karnataka.gov.in/gl-sp', icon: 'fa-female', application_type: 'external' },
        { name: 'Bhoomi', description: 'Land records and RTC services', url: 'https://landrecords.karnataka.gov.in', icon: 'fa-map', application_type: 'external' },
        { name: 'Ayushman Card', description: 'Health insurance card registration', url: 'https://beneficiary.nha.gov.in', icon: 'fa-heartbeat', application_type: 'external' },
        { name: 'Ration Card', description: 'Ration card application and status', url: 'https://ahara.karnataka.gov.in', icon: 'fa-shopping-basket', application_type: 'external' }
      ];

      const batch = db.batch();
      initialServices.forEach(s => {
        const serviceId = s.name.toLowerCase().replace(/\s+/g, '_');
        const ref = db.collection('services').doc(serviceId);
        batch.set(ref, {
          ...s,
          enabled: true,
          is_visible: true,
          service_price: 0,
          payment_required: false,
          fee: 0,
          staff_commission: 0,
          visit_count: 0,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });
      await batch.commit();
      console.log('Services seeded successfully');
    }
  } catch (err) {
    console.error('Error seeding services:', err);
  }
};
// seedServices();

const optionalAuthenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = { role: 'guest' };
    return next();
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();

    req.user = {
      id: decodedToken.uid,
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userData?.role || 'user',
      ...userData
    };
    next();
  } catch (err) {
    req.user = { role: 'guest' };
    next();
  }
};

// --- API Routes ---

app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = !!db;
    let servicesCount = 0;
    let dbError = null;
    
    if (dbStatus) {
      try {
        // Use db directly
        const snapshot = await db.collection('services').limit(1).get();
        servicesCount = snapshot.size;
      } catch (dbErr: any) {
        console.error('Health check DB error:', dbErr);
        dbError = dbErr.message;
      }
    }

    res.json({ 
      status: dbStatus && !dbError ? 'ok' : 'degraded', 
      db_initialized: dbStatus,
      firebase_initialized: admin.apps.length > 0,
      services_count: servicesCount,
      db_error: dbError,
      environment: {
        node_env: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL,
        project_id: admin.apps.length > 0 ? admin.app().options.projectId : null
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Portal Config
app.get('/api/portal-config', async (req, res) => {
  try {
    const configDoc = await db.collection('settings').doc('portal').get();
    if (configDoc.exists) {
      res.json(configDoc.data());
    } else {
      res.json({});
    }
  } catch (err: any) {
    console.error('Portal Config Error:', err);
    res.status(500).json({ error: 'Failed to fetch portal config' });
  }
});

app.put('/api/portal-config', authenticateToken, requireRole(['admin']), checkFirestore, async (req, res) => {
  try {
    await db.collection('settings').doc('portal').set({
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    res.json({ message: 'Configuration updated successfully' });
  } catch (err: any) {
    console.error('Portal Config Update Error:', err);
    res.status(500).json({ 
      error: 'Failed to update configuration',
      message: err.message,
      code: err.code
    });
  }
});

// Admin Password Reset (for migration/recovery)
app.post('/api/admin/reset-passwords', async (req, res) => {
  try {
    const usersToReset = [
      { email: 'admin@jh.com', password: 'admin123', role: 'admin', name: 'Admin User' },
      { email: 'staff@jh.com', password: 'staff123', role: 'staff', name: 'Staff Member' },
      { email: 'user@jh.com', password: 'user123', role: 'user', name: 'Test User' },
      { email: 'pavan.tr16@gmail.com', password: 'admin123', role: 'admin', name: 'Pavan' },
      { email: 'pancardjhc2018@gmail.com', password: 'admin123', role: 'admin', name: 'Admin' }
    ];

    const results = [];
    for (const u of usersToReset) {
      try {
        let userRecord;
        try {
          userRecord = await admin.auth().getUserByEmail(u.email);
          await admin.auth().updateUser(userRecord.uid, {
            password: u.password
          });
          results.push({ email: u.email, status: 'reset' });
        } catch (err: any) {
          if (err.code === 'auth/user-not-found') {
            // Create the user if they don't exist
            userRecord = await admin.auth().createUser({
              email: u.email,
              password: u.password,
              displayName: u.name,
            });
            results.push({ email: u.email, status: 'created' });
          } else {
            throw err;
          }
        }

        // Ensure the user exists in Firestore as well
        if (userRecord) {
          const userRef = db.collection('users').doc(userRecord.uid);
          const userDoc = await userRef.get();
          if (!userDoc.exists) {
            await userRef.set({
              name: u.name,
              email: u.email,
              role: u.role,
              created_at: admin.firestore.FieldValue.serverTimestamp()
            });
          } else {
            await userRef.update({
              role: u.role
            });
          }
        }
      } catch (err: any) {
        results.push({ email: u.email, status: 'error', message: err.message });
      }
    }
    res.json({ results });
  } catch (err: any) {
    console.error('Reset Passwords Error:', err);
    res.status(500).json({ error: 'Failed to reset passwords' });
  }
});

// Auth
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email?.toLowerCase();
  console.log('Login attempt:', normalizedEmail);
  try {
    const snapshot = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
    if (snapshot.empty) {
      console.log('Login failed: User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const userDoc = snapshot.docs[0];
    const user = userDoc.data();
    console.log('User found:', user.email);
    const isMatch = bcrypt.compareSync(password, user.password);
    console.log('Password match result:', isMatch);
    if (!isMatch) {
      console.log('Login failed: Password mismatch');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: userDoc.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    console.log('Login successful:', email);
    res.json({ token, user: { id: userDoc.id, name: user.name, email: user.email, role: user.role } });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message,
      code: err.code
    });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  const normalizedEmail = email?.toLowerCase();
  console.log('Registration attempt:', normalizedEmail);
  try {
    const existingUser = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
    if (!existingUser.empty) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Create user in Firebase Auth
    let userRecord;
    try {
      try {
        userRecord = await admin.auth().getUserByEmail(normalizedEmail);
        return res.status(400).json({ error: 'Email already exists in authentication system' });
      } catch (getErr: any) {
        if (getErr.code !== 'auth/user-not-found') throw getErr;
      }

      const authOptions: any = {
        email: normalizedEmail,
        password: password,
        displayName: name,
      };
      
      const formattedPhone = formatPhoneNumber(phone);
      if (formattedPhone) {
        authOptions.phoneNumber = formattedPhone;
        // Check if phone number already exists in Auth
        try {
          await admin.auth().getUserByPhoneNumber(formattedPhone);
          return res.status(400).json({ error: 'Phone number already exists in authentication system' });
        } catch (phoneErr: any) {
          if (phoneErr.code !== 'auth/user-not-found') throw phoneErr;
        }
      }

      userRecord = await admin.auth().createUser(authOptions);
    } catch (authErr: any) {
      console.error('Firebase Auth registration error:', authErr);
      if (authErr.code === 'auth/phone-number-already-exists') {
        return res.status(400).json({ error: 'Phone number is already associated with another account' });
      }
      return res.status(400).json({ error: authErr.message || 'Error creating authentication account' });
    }

    const userId = userRecord.uid;
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    await db.collection('users').doc(userId).set({
      name,
      email: normalizedEmail,
      phone,
      password: hashedPassword, // Keep for legacy/custom login support
      role: 'user',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Create wallet for new user
    await db.collection('wallets').doc(userId).set({
      user_id: userId,
      role: 'user',
      balance: 0,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    const token = jwt.sign({ id: userId, role: 'user', name }, JWT_SECRET, { expiresIn: '24h' });
    console.log('Registration successful:', email);
    res.json({ 
      token, 
      user: { id: userId, name, email, role: 'user' },
      message: 'User registered successfully' 
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      error: 'Database error',
      message: err.message,
      code: err.code
    });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snapshot.empty) {
      return res.json({ message: 'If an account exists with this email/phone, a reset link has been sent.' });
    }
    const userDoc = snapshot.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() } as any;

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins

    await db.collection('users').doc(user.id).update({
      reset_token: token,
      reset_token_expiry: expiry,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // In a real app, send email here. For now, we'll log it and simulate.
    const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
    console.log(`Password reset link for ${user.email}: ${resetLink}`);

    res.json({ 
      message: 'If an account exists with this email/phone, a reset link has been sent.',
      debug_link: process.env.NODE_ENV !== 'production' ? resetLink : undefined
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  
  try {
    const snapshot = await db.collection('users')
      .where('reset_token', '==', token)
      .limit(1)
      .get();
    
    const userDoc = snapshot.docs[0];
    if (!userDoc) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    const user = userDoc.data();
    if (new Date(user.reset_token_expiry) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    await userDoc.ref.update({
      password: hashedPassword,
      reset_token: null,
      reset_token_expiry: null,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (err: any) {
    console.error('Reset password error:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message,
      code: err.code
    });
  }
});

// --- Wallet Endpoints ---

app.get('/api/wallet/balance', authenticateToken, async (req: any, res) => {
  try {
    const walletDoc = await db.collection('wallets').doc(req.user.id).get();
    if (!walletDoc.exists) {
      // Create wallet if it doesn't exist
      const newWallet = {
        user_id: req.user.id,
        role: req.user.role,
        balance: 0,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      await db.collection('wallets').doc(req.user.id).set(newWallet);
      return res.json(newWallet);
    }
    res.json({ id: walletDoc.id, ...walletDoc.data() });
  } catch (err) {
    console.error('Wallet Balance Error:', err);
    res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
});

app.get('/api/wallet/transactions', authenticateToken, async (req: any, res) => {
  try {
    const snapshot = await db.collection('wallet_transactions')
      .where('user_id', '==', req.user.id)
      .orderBy('created_at', 'desc')
      .get();
    const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(transactions);
  } catch (err) {
    console.error('Wallet Transactions Error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/wallet/add-money', authenticateToken, async (req: any, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_ID === 'rzp_test_dummy_key') {
    return res.status(500).json({ error: 'Razorpay is not configured' });
  }

  try {
    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err: any) {
    console.error('Razorpay Order Error:', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

app.post('/api/wallet/verify-payment', authenticateToken, async (req: any, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
  
  const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
  const generated_signature = crypto
    .createHmac('sha256', secret)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest('hex');

  if (generated_signature !== razorpay_signature && secret !== 'dummy_secret') {
    return res.status(400).json({ error: 'Invalid payment signature' });
  }
  
  try {
    const walletRef = db.collection('wallets').doc(req.user.id);
    const transactionRef = db.collection('wallet_transactions').doc();

    await db.runTransaction(async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      const currentBalance = walletDoc.exists ? (walletDoc.data()?.balance || 0) : 0;
      
      transaction.set(walletRef, {
        balance: currentBalance + Number(amount),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      transaction.set(transactionRef, {
        user_id: req.user.id,
        type: 'credit',
        amount: Number(amount),
        description: 'Added money to wallet',
        reference_id: razorpay_payment_id,
        status: 'success',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    res.json({ message: 'Wallet credited successfully' });
  } catch (err) {
    console.error('Payment Verification Error:', err);
    res.status(500).json({ error: 'Failed to update wallet' });
  }
});

app.post('/api/wallet/pay-service', authenticateToken, async (req: any, res) => {
  const { serviceId, applicationId } = req.body;
  
  try {
    const serviceDoc = await db.collection('services').doc(serviceId).get();
    if (!serviceDoc.exists) return res.status(404).json({ error: 'Service not found' });
    const service = serviceDoc.data();
    const fee = service?.fee || 0;

    if (fee <= 0) return res.status(400).json({ error: 'No fee required' });

    const walletRef = db.collection('wallets').doc(req.user.id);
    const transactionRef = db.collection('wallet_transactions').doc();

    await db.runTransaction(async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      if (!walletDoc.exists || (walletDoc.data()?.balance || 0) < fee) {
        throw new Error('Insufficient wallet balance');
      }
      
      transaction.update(walletRef, {
        balance: admin.firestore.FieldValue.increment(-fee),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      transaction.set(transactionRef, {
        user_id: req.user.id,
        type: 'debit',
        amount: fee,
        description: `Payment for service: ${service?.service_name}`,
        reference_id: applicationId,
        status: 'success',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    res.json({ message: 'Payment successful' });
  } catch (err: any) {
    console.error('Service Payment Error:', err);
    res.status(400).json({ error: err.message || 'Failed to process payment' });
  }
});

// --- Admin Wallet Endpoints ---

app.get('/api/admin/wallets', authenticateToken, requireRole(['admin']), async (req: any, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const walletsSnapshot = await db.collection('wallets').get();
    
    const walletsMap = new Map();
    walletsSnapshot.docs.forEach(doc => walletsMap.set(doc.id, doc.data()));

    const wallets = usersSnapshot.docs.map(doc => {
      const userData = doc.data();
      const walletData = walletsMap.get(doc.id);
      return {
        user_id: doc.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        balance: walletData?.balance || 0,
        wallet_id: doc.id
      };
    });
    res.json(wallets);
  } catch (err) {
    console.error('Admin Wallets Error:', err);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

app.get('/api/admin/wallet/transactions', authenticateToken, requireRole(['admin']), async (req: any, res) => {
  try {
    const snapshot = await db.collection('wallet_transactions').orderBy('created_at', 'desc').get();
    const usersSnapshot = await db.collection('users').get();
    const usersMap = new Map();
    usersSnapshot.docs.forEach(doc => usersMap.set(doc.id, doc.data()));

    const transactions = snapshot.docs.map(doc => {
      const data = doc.data();
      const user = usersMap.get(data.user_id);
      return {
        id: doc.id,
        ...data,
        name: user?.name,
        email: user?.email
      };
    });
    res.json(transactions);
  } catch (err) {
    console.error('Admin Wallet Transactions Error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/admin/wallets/adjust-balance', authenticateToken, requireRole(['admin']), async (req: any, res) => {
  const { walletId, type, amount, reason } = req.body;
  
  if (!walletId || !type || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid adjustment data' });
  }

  try {
    const walletRef = db.collection('wallets').doc(walletId);
    const transactionRef = db.collection('wallet_transactions').doc();

    await db.runTransaction(async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      if (!walletDoc.exists) throw new Error('Wallet not found');
      
      const adjustment = type === 'credit' ? Number(amount) : -Number(amount);
      
      transaction.update(walletRef, {
        balance: admin.firestore.FieldValue.increment(adjustment),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      transaction.set(transactionRef, {
        user_id: walletId,
        type: type,
        amount: Number(amount),
        description: reason || `Admin ${type} adjustment`,
        status: 'success',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    res.json({ message: 'Wallet adjusted successfully' });
  } catch (err: any) {
    console.error('Wallet Adjustment Error:', err);
    res.status(500).json({ error: err.message || 'Failed to adjust wallet' });
  }
});

app.get('/api/admin/wallet/analytics', authenticateToken, requireRole(['admin']), async (req: any, res) => {
  try {
    const transactionsSnapshot = await db.collection('wallet_transactions')
      .where('type', '==', 'debit')
      .where('status', '==', 'success')
      .get();
    
    let totalRevenue = 0;
    transactionsSnapshot.forEach(doc => {
      totalRevenue += (doc.data().amount || 0);
    });

    const walletsSnapshot = await db.collection('wallets').get();
    let totalBalance = 0;
    walletsSnapshot.forEach(doc => {
      totalBalance += (doc.data().balance || 0);
    });

    // Daily transactions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailySnapshot = await db.collection('wallet_transactions')
      .where('created_at', '>=', thirtyDaysAgo)
      .get();

    const dailyMap = new Map();
    dailySnapshot.forEach(doc => {
      const data = doc.data();
      const date = data.created_at?.toDate()?.toISOString().split('T')[0] || 'unknown';
      const current = dailyMap.get(date) || { date, count: 0, total: 0 };
      current.count += 1;
      current.total += (data.amount || 0);
      dailyMap.set(date, current);
    });

    const dailyTransactions = Array.from(dailyMap.values())
      .sort((a, b) => b.date.localeCompare(a.date));

    // Top Users
    const userSpending = new Map();
    transactionsSnapshot.forEach(doc => {
      const data = doc.data();
      const current = userSpending.get(data.user_id) || 0;
      userSpending.set(data.user_id, current + (data.amount || 0));
    });

    const sortedUsers = Array.from(userSpending.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const usersSnapshot = await db.collection('users').get();
    const usersMap = new Map();
    usersSnapshot.docs.forEach(doc => usersMap.set(doc.id, doc.data()));

    const topUsers = sortedUsers.map(([userId, totalSpent]) => {
      const user = usersMap.get(userId);
      return {
        name: user?.name,
        email: user?.email,
        total_spent: totalSpent
      };
    });

    res.json({
      totalRevenue,
      totalBalance,
      dailyTransactions,
      topUsers
    });
  } catch (err) {
    console.error('Wallet Analytics Error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// --- Application Drafts Endpoints ---

const uploadDir = process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create upload directory:', err);
  }
}

const storage = multer.diskStorage({
  destination: (req: any, file, cb) => {
    const serviceName = req.body.service_type || 'general';
    const userId = req.user?.id || 'unknown';
    const dir = path.join(uploadDir, serviceName, String(userId));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + (file.originalname || 'file').replace(/\s+/g, '_'));
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'));
  }
};

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

app.post('/api/application-drafts', authenticateToken, upload.array('documents', 20), async (req: any, res) => {
  try {
    const { service_id, service_type, form_data, draft_id } = req.body;
    const files = req.files as Express.Multer.File[];
    
    const documents = files ? files.map(f => ({ path: f.path, originalname: f.originalname })) : [];
    
    if (draft_id) {
      const draftRef = db.collection('application_drafts').doc(draft_id);
      const draftDoc = await draftRef.get();
      
      if (!draftDoc.exists) return res.status(404).json({ error: 'Draft not found' });
      
      const updateData: any = {
        form_data,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      if (documents.length > 0) {
        updateData.documents = documents;
      }
      
      await draftRef.update(updateData);
      res.json({ id: draft_id, message: 'Draft updated successfully' });
    } else {
      const newDraft = {
        user_id: req.user.id,
        service_id,
        service_type,
        form_data,
        documents,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      const result = await db.collection('application_drafts').add(newDraft);
      res.json({ id: result.id, message: 'Draft saved successfully' });
    }
  } catch (err: any) {
    console.error('Draft save error:', err);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

app.get('/api/application-drafts', authenticateToken, async (req: any, res) => {
  try {
    const snapshot = await db.collection('application_drafts')
      .where('user_id', '==', req.user.id)
      .get();
    
    if (snapshot.empty) {
      return res.json([]);
    }

    // Get unique service IDs from drafts
    const serviceIds = [...new Set(snapshot.docs.map(doc => doc.data().service_id).filter(Boolean))];
    
    const servicesMap = new Map();
    if (serviceIds.length > 0) {
      // Fetch only the services that are referenced in the drafts
      // Firestore 'in' query supports up to 10 items. If more, we might need a different approach
      // but usually a user won't have drafts for more than 10 different services at once.
      // For safety, if there are many, we can fetch all or chunk it.
      if (serviceIds.length <= 10) {
        const servicesSnapshot = await db.collection('services')
          .where(admin.firestore.FieldPath.documentId(), 'in', serviceIds)
          .get();
        servicesSnapshot.docs.forEach(doc => servicesMap.set(doc.id, doc.data()));
      } else {
        // Fallback to fetching all if there are too many unique services (rare for drafts)
        const servicesSnapshot = await db.collection('services').get();
        servicesSnapshot.docs.forEach(doc => servicesMap.set(doc.id, doc.data()));
      }
    }

    const drafts = snapshot.docs.map(doc => {
      const data = doc.data();
      const service = servicesMap.get(data.service_id);
      return {
        id: doc.id,
        ...data,
        service_name: service?.service_name || data.service_type || 'Unknown Service'
      };
    }).sort((a: any, b: any) => {
      const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at || 0);
      const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at || 0);
      return dateB.getTime() - dateA.getTime();
    });
    res.json(drafts);
  } catch (err) {
    console.error('Fetch Drafts Error:', err);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

app.get('/api/application-drafts/:id', authenticateToken, async (req: any, res) => {
  try {
    const draftDoc = await db.collection('application_drafts').doc(req.params.id).get();
    if (!draftDoc.exists || draftDoc.data()?.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    res.json({ id: draftDoc.id, ...draftDoc.data() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
});

app.delete('/api/application-drafts/:id', authenticateToken, async (req: any, res) => {
  try {
    const draftRef = db.collection('application_drafts').doc(req.params.id);
    const draftDoc = await draftRef.get();
    if (!draftDoc.exists || draftDoc.data()?.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    await draftRef.delete();
    res.json({ message: 'Draft deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});


// Users
app.get('/api/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { role } = req.query;
    let query: any = db.collection('users');
    
    if (role) {
      query = query.where('role', '==', role);
    }
    
    const snapshot = await query.get();
    console.log(`Fetching users: role=${role || 'all'}, total_count=${snapshot.size}`);
    
    const users = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unknown',
          email: data.email || '',
          phone: data.phone || '',
          role: data.role || 'user',
          status: data.status || 'active',
          created_at: data.created_at,
          deleted_at: data.deleted_at
        };
      })
      .filter(u => !u.deleted_at); // Filter out deleted users in memory

    console.log(`Returning ${users.length} non-deleted users`);
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  try {
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('User already exists in Firebase Auth, updating Firestore record.');
    } catch (getErr: any) {
      if (getErr.code === 'auth/user-not-found') {
        const authOptions: any = {
          email,
          password,
          displayName: name,
        };
        
        const formattedPhone = formatPhoneNumber(phone);
        if (formattedPhone) {
          authOptions.phoneNumber = formattedPhone;
          // Check if phone number already exists in Auth
          try {
            await admin.auth().getUserByPhoneNumber(formattedPhone);
            return res.status(400).json({ error: 'Phone number already exists in authentication system' });
          } catch (phoneErr: any) {
            if (phoneErr.code !== 'auth/user-not-found') throw phoneErr;
          }
        }

        userRecord = await admin.auth().createUser(authOptions);
      } else {
        throw getErr;
      }
    }

    await db.collection('users').doc(userRecord.uid).set({
      name,
      email,
      phone,
      role,
      status: 'active',
      deleted_at: null,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ id: userRecord.uid, message: 'User created successfully' });
  } catch (err: any) {
    console.error('Create User Error:', err);
    if (err.code === 'auth/phone-number-already-exists') {
      return res.status(400).json({ error: 'Phone number is already associated with another account' });
    }
    res.status(400).json({ error: err.message || 'Error creating user' });
  }
});

app.delete('/api/users/:id', authenticateToken, requireRole(['admin']), async (req: any, res) => {
  if (req.user.id === req.params.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }

  try {
    const userRef = db.collection('users').doc(req.params.id);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      console.log(`[Delete User] User not found: ${req.params.id}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[Delete User] Moving user to Recycle Bin: ${req.params.id} (${userDoc.data()?.email})`);
    await userRef.update({ 
      deleted_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await db.collection('activity_logs').add({
      user_id: req.user.id,
      action: `Moved user to Recycle Bin: ${userDoc.data()?.name} (${userDoc.data()?.email})`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ message: 'User moved to Recycle Bin' });
  } catch (err: any) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user', details: err.message });
  }
});

app.put('/api/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { name, email, phone, role } = req.body;
  const { id } = req.params;

  try {
    const userRef = db.collection('users').doc(id);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const updateData: any = {
      name,
      email,
      phone,
      role,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    // Update Auth if email changed
    if (email && email !== userDoc.data()?.email) {
      await admin.auth().updateUser(id, { email });
    }

    await userRef.update(updateData);
    res.json({ message: 'User updated successfully' });
  } catch (err: any) {
    console.error('Update user error:', err);
    res.status(500).json({ error: err.message || 'Failed to update user' });
  }
});

app.patch('/api/users/:id/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  if (!['active', 'disabled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    await db.collection('users').doc(id).update({ 
      status,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Disable in Auth as well
    await admin.auth().updateUser(id, { disabled: status === 'disabled' });

    res.json({ message: `User ${status === 'active' ? 'enabled' : 'disabled'} successfully` });
  } catch (err: any) {
    console.error('Toggle status error:', err);
    res.status(500).json({ error: err.message || 'Failed to update status' });
  }
});

app.put('/api/users/:id/role', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'staff', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  try {
    await db.collection('users').doc(req.params.id).update({ role });
    res.json({ message: 'User role updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

app.post('/api/users/:id/set-password', authenticateToken, requireRole(['admin']), async (req: any, res) => {
  const { id } = req.params;
  const { password } = req.body;
  
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    await admin.auth().updateUser(id, { password });
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    await db.collection('users').doc(id).update({ 
      password: hashedPassword,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err: any) {
    console.error('Set password error:', err);
    res.status(500).json({ error: err.message || 'Failed to set password' });
  }
});

app.post('/api/users/:id/reset-password', authenticateToken, requireRole(['admin']), async (req: any, res) => {
  const { id } = req.params;
  try {
    const userRecord = await admin.auth().getUser(id);
    if (!userRecord.email) {
      return res.status(400).json({ error: 'User has no email address' });
    }
    
    const tempPassword = Math.random().toString(36).slice(-8) + '123!';
    await admin.auth().updateUser(id, { password: tempPassword });
    
    const hashedPassword = bcrypt.hashSync(tempPassword, 10);
    await db.collection('users').doc(id).update({ 
      password: hashedPassword,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ message: 'Password reset successfully', tempPassword });
  } catch (err: any) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: err.message || 'Failed to reset password' });
  }
});

// Services
app.get('/api/services/:name', optionalAuthenticateToken, async (req, res) => {
  try {
    const snapshot = await db.collection('services').where('service_name', '==', req.params.name).limit(1).get();
    if (snapshot.empty) {
      return res.status(404).json({ error: 'Service not found' });
    }
    const service = snapshot.docs[0].data();
    res.json({ service_id: snapshot.docs[0].id, ...service });
  } catch (err: any) {
    console.error('Service Detail Error:', err);
    res.status(500).json({ error: 'Failed to fetch service details' });
  }
});

app.get('/api/services', optionalAuthenticateToken, async (req: any, res) => {
  try {
    const snapshot = await db.collection('services').get();
    let services = snapshot.docs
      .map(doc => ({ service_id: doc.id, ...doc.data() }))
      .filter((s: any) => !s.deleted_at);
    
    if (!req.user || req.user.role === 'user' || req.user.role === 'guest') {
      // Users and guests should only see active and visible services
      // Filter in memory to avoid composite index requirements and handle potential type mismatches (1 vs true)
      services = services.filter((s: any) => 
        (s.is_active === true || s.is_active === 1) && 
        (s.is_visible === true || s.is_visible === 1)
      ).map((s: any) => {
        const { service_url, fee, staff_commission, ...rest } = s; // Hide sensitive fields
        return rest;
      });
      return res.json(services);
    } else if (req.user.role === 'staff') {
      // Staff can see all active services
      services = services.filter((s: any) => (s.is_active === true || s.is_active === 1));
      return res.json(services);
    } else {
      // Admin can see all
      return res.json(services);
    }
  } catch (err: any) {
    console.error('Services Error:', err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

app.post('/api/services/:id/log-access', authenticateToken, requireRole(['staff', 'admin']), async (req: any, res) => {
  const { id } = req.params;
  const { action } = req.body;
  
  try {
    // Log the access
    await db.collection('service_logs').add({
      staff_id: req.user.id,
      service_id: id,
      action: action || 'Opened Service URL',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Increment visit count
    await db.collection('services').doc(id).update({
      visit_count: admin.firestore.FieldValue.increment(1)
    }).catch(err => {
      // If document doesn't exist or field missing, we can ignore or handle
      console.error('Error incrementing visit count:', err);
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log access' });
  }
});

// Public endpoint to increment visit count (for users)
app.post('/api/services/:id/visit', async (req, res) => {
  const { id } = req.params;
  try {
    await db.collection('services').doc(id).update({
      visit_count: admin.firestore.FieldValue.increment(1)
    });
    res.json({ success: true });
  } catch (err) {
    // If it fails (e.g. doc doesn't exist), just return success anyway to not break UI
    res.json({ success: false });
  }
});

app.post('/api/services', authenticateToken, requireRole(['admin']), checkFirestore, async (req, res) => {
  const { name, service_name, description, enabled, active_status, visible_status, type, url, service_url, icon, application_id, service_price, payment_required, fee, staff_commission } = req.body;
  
  // Validate data to prevent undefined values
  const finalName = name || service_name;
  const finalUrl = url || service_url || '';
  const finalEnabled = enabled !== undefined ? enabled : (active_status !== undefined ? (active_status === 1 || active_status === true) : true);
  
  if (!finalName) {
    return res.status(400).json({ error: 'Service name is required' });
  }

  try {
    const serviceData = {
      name: finalName,
      description: description || '',
      enabled: finalEnabled,
      is_visible: visible_status === 1 || visible_status === true || visible_status === undefined,
      application_type: type || 'internal',
      url: finalUrl,
      icon: icon || 'fa-file',
      application_id: application_id || '',
      service_price: Number(service_price) || 0,
      payment_required: !!payment_required,
      fee: Number(fee) || 0,
      staff_commission: Number(staff_commission) || 0,
      visit_count: 0,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    // Remove any undefined fields just in case
    Object.keys(serviceData).forEach(key => (serviceData as any)[key] === undefined && delete (serviceData as any)[key]);

    const result = await db.collection('services').add(serviceData);
    console.log(`[POST] Service added: ${finalName} (ID: ${result.id})`);
    res.json({ id: result.id, message: 'Service added' });
  } catch (err) {
    console.error('[POST] Add Service Error:', err);
    res.status(500).json({ error: 'Failed to add service' });
  }
});

app.put('/api/services/:id', authenticateToken, requireRole(['admin']), checkFirestore, async (req, res) => {
  const { name, service_name, description, enabled, active_status, visible_status, type, url, service_url, icon, application_id, service_price, payment_required, fee, staff_commission } = req.body;
  
  try {
    const finalName = name || service_name;
    const finalUrl = url || service_url || '';
    const finalEnabled = enabled !== undefined ? enabled : (active_status !== undefined ? (active_status === 1 || active_status === true) : true);

    const updateData = {
      name: finalName,
      description: description || '',
      enabled: finalEnabled,
      is_visible: visible_status === 1 || visible_status === true || visible_status === undefined,
      application_type: type || 'internal',
      url: finalUrl,
      icon: icon || 'fa-file',
      application_id: application_id || '',
      service_price: Number(service_price) || 0,
      payment_required: !!payment_required,
      fee: Number(fee) || 0,
      staff_commission: Number(staff_commission) || 0,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    // Remove any undefined fields
    Object.keys(updateData).forEach(key => (updateData as any)[key] === undefined && delete (updateData as any)[key]);

    await db.collection('services').doc(req.params.id).set(updateData, { merge: true });
    console.log(`[PUT] Service updated: ${finalName} (ID: ${req.params.id})`);
    res.json({ message: 'Service updated' });
  } catch (err: any) {
    console.error('[PUT] Update Service Error:', err);
    res.status(500).json({ 
      error: 'Failed to update service',
      message: err.message
    });
  }
});

app.patch('/api/services/:id/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const serviceRef = db.collection('services').doc(req.params.id);
    const serviceDoc = await serviceRef.get();
    if (!serviceDoc.exists) return res.status(404).json({ error: 'Service not found' });
    
    const newStatus = !serviceDoc.data()?.is_active;
    await serviceRef.update({ is_active: newStatus, updated_at: admin.firestore.FieldValue.serverTimestamp() });
    res.json({ message: 'Status toggled', is_active: newStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle status' });
  }
});

app.patch('/api/services/:id/visibility', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const serviceRef = db.collection('services').doc(req.params.id);
    const serviceDoc = await serviceRef.get();
    if (!serviceDoc.exists) return res.status(404).json({ error: 'Service not found' });
    
    const newVisibility = !serviceDoc.data()?.is_visible;
    await serviceRef.update({ is_visible: newVisibility, updated_at: admin.firestore.FieldValue.serverTimestamp() });
    res.json({ message: 'Visibility toggled', is_visible: newVisibility });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle visibility' });
  }
});

app.delete('/api/services/:id', authenticateToken, requireRole(['admin']), checkFirestore, async (req: any, res) => {
  try {
    const serviceRef = db.collection('services').doc(req.params.id);
    const serviceDoc = await serviceRef.get();
    if (!serviceDoc.exists) return res.status(404).json({ error: 'Service not found' });

    await serviceRef.update({ deleted_at: admin.firestore.FieldValue.serverTimestamp() });
    
    await db.collection('activity_logs').add({
      user_id: req.user.id,
      action: `Moved service to Recycle Bin: ${serviceDoc.data()?.service_name}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ message: 'Service moved to Recycle Bin' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// Service Form Schema
app.get('/api/services/:service_id/form-schema', optionalAuthenticateToken, async (req, res) => {
  try {
    const serviceDoc = await db.collection('services').doc(req.params.service_id).get();
    if (!serviceDoc.exists) return res.status(404).json({ error: 'Service not found' });
    const service = serviceDoc.data();
    res.json(service?.service_form_schema ? JSON.parse(service.service_form_schema) : null);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch form schema' });
  }
});

app.post('/api/services/:service_id/form-schema', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { schema } = req.body;
  try {
    await db.collection('services').doc(req.params.service_id).update({
      service_form_schema: JSON.stringify(schema),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ message: 'Form schema updated successfully' });
  } catch (err) {
    console.error('Update Form Schema Error:', err);
    res.status(500).json({ error: 'Failed to update form schema' });
  }
});

// Service Form Fields
app.get('/api/services/:service_id/form-fields', optionalAuthenticateToken, async (req, res) => {
  try {
    const snapshot = await db.collection('service_form_fields')
      .where('service_id', '==', req.params.service_id)
      .orderBy('field_order', 'asc')
      .get();
    const fields = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(fields);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch form fields' });
  }
});

app.post('/api/services/:service_id/form-fields', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { fields } = req.body;
  const service_id = req.params.service_id;

  try {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(db.collection('service_form_fields').where('service_id', '==', service_id));
      snapshot.docs.forEach(doc => transaction.delete(doc.ref));
      
      fields.forEach((f: any, index: number) => {
        const newDocRef = db.collection('service_form_fields').doc();
        transaction.set(newDocRef, {
          service_id,
          label: f.label,
          type: f.type,
          required: !!f.required,
          placeholder: f.placeholder || '',
          section_name: f.section_name || 'Personal',
          field_order: f.field_order || index,
          options: f.options ? JSON.stringify(f.options) : null,
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
      });
    });
    res.json({ message: 'Form fields updated successfully' });
  } catch (err) {
    console.error('Update Form Fields Error:', err);
    res.status(500).json({ error: 'Failed to update form fields' });
  }
});

// Service Document Requirements
app.get('/api/services/:service_id/document-requirements', optionalAuthenticateToken, async (req, res) => {
  try {
    const snapshot = await db.collection('service_document_requirements')
      .where('service_id', '==', req.params.service_id)
      .get();
    const requirements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(requirements);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document requirements' });
  }
});

app.post('/api/services/:service_id/document-requirements', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { requirements } = req.body;
  const service_id = req.params.service_id;

  try {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(db.collection('service_document_requirements').where('service_id', '==', service_id));
      snapshot.docs.forEach(doc => transaction.delete(doc.ref));
      
      requirements.forEach((r: any) => {
        const newDocRef = db.collection('service_document_requirements').doc();
        transaction.set(newDocRef, {
          service_id,
          document_name: r.document_name,
          document_type: r.document_type || 'file_upload',
          required: !!r.required,
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
      });
    });
    res.json({ message: 'Document requirements updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update document requirements' });
  }
});

// Service Inputs
app.get('/api/service-inputs/:service_id', optionalAuthenticateToken, async (req, res) => {
  try {
    const snapshot = await db.collection('service_inputs').where('service_id', '==', req.params.service_id).get();
    const inputs = snapshot.docs.map(doc => ({ input_id: doc.id, ...doc.data() }));
    res.json(inputs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch service inputs' });
  }
});

app.post('/api/service-inputs', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { service_id, input_label, input_type, required } = req.body;
  try {
    const result = await db.collection('service_inputs').add({
      service_id,
      input_label,
      input_type,
      required: !!required,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ id: result.id, message: 'Input field added successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add input field' });
  }
});

app.delete('/api/service-inputs/:input_id', authenticateToken, requireRole(['admin']), async (req: any, res) => {
  try {
    const inputRef = db.collection('service_inputs').doc(req.params.input_id);
    const inputDoc = await inputRef.get();
    if (!inputDoc.exists) {
      return res.status(404).json({ error: 'Input field not found' });
    }
    
    await inputRef.delete();
    
    await db.collection('activity_logs').add({
      user_id: req.user.id,
      action: `Admin deleted input field: ${inputDoc.data()?.input_label} for service_id: ${inputDoc.data()?.service_id}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ success: true, message: 'Input field deleted successfully' });
  } catch (err) {
    console.error('Error deleting input field:', err);
    res.status(500).json({ error: 'Unable to delete input field. Please try again.' });
  }
});

// Service Links
app.get('/api/service-links', authenticateToken, requireRole(['admin', 'staff']), async (req, res) => {
  try {
    const snapshot = await db.collection('service_links').get();
    const links = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(links);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch service links' });
  }
});

app.put('/api/service-links/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { service_type, process_url, apply_url, is_active } = req.body;
  try {
    await db.collection('service_links').doc(req.params.id).update({
      service_type,
      process_url,
      apply_url,
      is_active: !!is_active,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ message: 'Service link updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update service link' });
  }
});

app.patch('/api/service-links/:id/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const linkRef = db.collection('service_links').doc(req.params.id);
    const linkDoc = await linkRef.get();
    if (!linkDoc.exists) return res.status(404).json({ error: 'Link not found' });
    
    const newStatus = !linkDoc.data()?.is_active;
    await linkRef.update({ is_active: newStatus, updated_at: admin.firestore.FieldValue.serverTimestamp() });
    res.json({ message: 'Link status toggled', is_active: newStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle link status' });
  }
});

// Ledger
app.get('/api/ledger', authenticateToken, requireRole(['admin', 'staff']), async (req: any, res) => {
  try {
    let query: any = db.collection('ledger');
    
    if (req.user.role === 'staff') {
      query = query.where('staff_id', '==', req.user.id);
    }
    
    const snapshot = await query.get();
    const usersSnapshot = await db.collection('users').get();
    const usersMap = new Map();
    usersSnapshot.docs.forEach(doc => usersMap.set(doc.id, doc.data()));

    const ledger = snapshot.docs
      .map(doc => {
        const data = doc.data();
        const staff = usersMap.get(data.staff_id);
        return {
          id: doc.id,
          ...data,
          staff_name: staff?.name
        };
      })
      .filter((item: any) => !item.deleted_at)
      .sort((a: any, b: any) => {
        const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at || 0);
        const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });
    res.json(ledger);
  } catch (err) {
    console.error('Ledger Error:', err);
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
});

app.post('/api/ledger', authenticateToken, requireRole(['admin', 'staff']), async (req: any, res) => {
  const { customer_name, service_name, principle_amount, profit_amount, date } = req.body;
  try {
    const pAmount = Number(principle_amount) || 0;
    const prAmount = Number(profit_amount) || 0;
    const totalAmount = pAmount + prAmount;

    const result = await db.collection('ledger').add({
      customer_name,
      service_name,
      principle_amount: pAmount,
      profit_amount: prAmount,
      amount: totalAmount,
      staff_id: req.user.id,
      date: date || new Date().toISOString().split('T')[0],
      deleted_at: null,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ id: result.id, message: 'Ledger entry added' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add ledger entry' });
  }
});

app.delete('/api/ledger/:id', authenticateToken, requireRole(['admin', 'staff']), async (req: any, res) => {
  const { id } = req.params;
  console.log(`[DELETE] Ledger entry request - ID: ${id}, User: ${req.user?.email}, Role: ${req.user?.role}`);
  
  if (!id || id === 'undefined') {
    console.error('[DELETE] Ledger Error: Invalid ID provided');
    return res.status(400).json({ error: 'Valid Ledger ID is required' });
  }

  try {
    const ledgerRef = db.collection('ledger').doc(id);
    const ledgerDoc = await ledgerRef.get();

    if (!ledgerDoc.exists) {
      console.error(`[DELETE] Ledger Error: Entry not found for ID: ${id}`);
      return res.status(404).json({ error: 'Ledger entry not found' });
    }

    const ledgerData = ledgerDoc.data();
    const userEmail = (req.user?.email || '').toLowerCase().trim();
    const isPrimaryAdmin = ADMIN_EMAILS.includes(userEmail);

    console.log(`[DELETE] Ledger Entry Data - Staff ID: ${ledgerData?.staff_id}, Request User ID: ${req.user.id}`);

    // Only admin or the staff who created the entry can delete it
    if (req.user.role !== 'admin' && !isPrimaryAdmin && ledgerData?.staff_id !== req.user.id) {
      console.warn(`[DELETE] Ledger Unauthorized: User ${userEmail} attempted to delete entry ${id} owned by ${ledgerData?.staff_id}`);
      return res.status(403).json({ error: 'Unauthorized to delete this entry' });
    }

    // Use admin.firestore.FieldValue or fallback to new Date() if needed
    let deletedAtValue;
    try {
      deletedAtValue = admin.firestore.FieldValue.serverTimestamp();
    } catch (e) {
      console.warn('[DELETE] Ledger: admin.firestore.FieldValue.serverTimestamp() failed, falling back to new Date()');
      deletedAtValue = new Date();
    }

    await ledgerRef.update({ 
      deleted_at: deletedAtValue 
    });
    
    console.log(`[DELETE] Ledger Success: Entry ${id} moved to Recycle Bin`);
    res.json({ message: 'Ledger entry moved to Recycle Bin' });
  } catch (err) {
    console.error('[DELETE] Ledger Critical Error:', err);
    res.status(500).json({ error: 'Failed to delete ledger entry' });
  }
});

// Analytics
app.get('/api/analytics', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const ledgerSnapshot = await db.collection('ledger').get();
    const usersSnapshot = await db.collection('users').get();
    const appsSnapshot = await db.collection('applications').get();
    const logsSnapshot = await db.collection('activity_logs').orderBy('timestamp', 'desc').limit(10).get();

    const activeLedger = ledgerSnapshot.docs.filter(doc => !doc.data().deleted_at);
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalTransactions = activeLedger.length;
    activeLedger.forEach(doc => {
      const data = doc.data();
      totalRevenue += (data.amount || 0);
      totalProfit += (data.profit_amount || 0);
    });

    const totalUsers = usersSnapshot.docs.filter(doc => doc.data().role === 'user').length;
    const totalStaff = usersSnapshot.docs.filter(doc => doc.data().role === 'staff').length;

    // Monthly Revenue
    const monthlyMap = new Map();
    ledgerSnapshot.forEach(doc => {
      const data = doc.data();
      const month = data.date?.substring(0, 7) || 'unknown';
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + (data.amount || 0));
    });
    const monthlyRevenue = Array.from(monthlyMap.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 6);

    // Top Services
    const serviceMap = new Map();
    ledgerSnapshot.forEach(doc => {
      const name = doc.data().service_name;
      serviceMap.set(name, (serviceMap.get(name) || 0) + 1);
    });
    const topServices = Array.from(serviceMap.entries())
      .map(([service_name, count]) => ({ service_name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Application Analytics
    const totalApplications = appsSnapshot.size;
    const pendingApplications = appsSnapshot.docs.filter(doc => doc.data().status === 'Pending').length;
    const approvedApplications = appsSnapshot.docs.filter(doc => doc.data().status === 'Approved').length;
    const rejectedApplications = appsSnapshot.docs.filter(doc => doc.data().status === 'Rejected').length;

    const serviceAppsMap = new Map();
    appsSnapshot.forEach(doc => {
      const type = doc.data().service_type;
      serviceAppsMap.set(type, (serviceAppsMap.get(type) || 0) + 1);
    });
    const serviceApplications = Array.from(serviceAppsMap.entries()).map(([service_type, count]) => ({ service_type, count }));

    const staffPerfMap = new Map();
    const usersMap = new Map();
    usersSnapshot.docs.forEach(doc => usersMap.set(doc.id, doc.data()));

    appsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.completed_by) {
        staffPerfMap.set(data.completed_by, (staffPerfMap.get(data.completed_by) || 0) + 1);
      }
    });
    const staffPerformance = Array.from(staffPerfMap.entries()).map(([id, processed]) => ({
      name: usersMap.get(id)?.name || 'Unknown',
      processed
    }));

    const today = new Date().toISOString().split('T')[0];
    let todayRevenue = 0;
    ledgerSnapshot.forEach(doc => {
      if (doc.data().date === today) todayRevenue += (doc.data().amount || 0);
    });

    const recentActivity = logsSnapshot.docs.map(doc => {
      const data = doc.data();
      const user = usersMap.get(data.user_id);
      return {
        id: doc.id,
        ...data,
        user_name: user?.name
      };
    });

    res.json({
      totalRevenue,
      totalProfit,
      todayRevenue,
      totalTransactions,
      totalUsers,
      totalStaff,
      monthlyRevenue,
      topServices,
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      approvalRate: totalApplications > 0 ? Math.round((approvedApplications / totalApplications) * 100) : 0,
      serviceApplications,
      staffPerformance,
      recentActivity
    });
  } catch (err) {
    console.error('Analytics Error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// File Uploads Setup
// Secure Document Access API
app.get('/api/admin/documents/:id', authenticateToken, requireRole(['admin', 'staff']), async (req: any, res) => {
  try {
    const docSnapshot = await db.collection('application_documents').doc(req.params.id).get();
    if (!docSnapshot.exists) {
      return res.status(404).send('Document not found');
    }
    const docData = docSnapshot.data();
    
    const absolutePath = path.join(__dirname, docData?.file_path);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).send('File not found on server');
    }
    
    // Log access
    await db.collection('activity_logs').add({
      user_id: req.user.id,
      action: `Accessed document: ${docData?.file_name}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
      
    res.sendFile(absolutePath);
  } catch (err) {
    console.error('Error serving document:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Helper to generate Reference Number
// Helper to generate Reference Number
const generateReferenceNumber = async () => {
  const year = new Date().getFullYear();
  const snapshot = await db.collection('applications').count().get();
  const nextId = snapshot.data().count + 1;
  return `APP-${year}-${String(nextId).padStart(5, '0')}`;
};

// Helper to get enriched application
const getEnrichedApplication = async (applicationId: string) => {
  if (!applicationId) return null;
  
  const appDoc = await db.collection('applications').doc(applicationId).get();
  if (!appDoc.exists) return null;
  
  const appData = appDoc.data();
  
  let userData = null;
  if (appData?.user_id) {
    const userDoc = await db.collection('users').doc(appData.user_id).get();
    userData = userDoc.data();
  }
  
  let staffData = null;
  if (appData?.assigned_staff) {
    const staffDoc = await db.collection('users').doc(appData.assigned_staff).get();
    staffData = staffDoc.data();
  }

  let completedByData = null;
  if (appData?.completed_by) {
    const completedByDoc = await db.collection('users').doc(appData.completed_by).get();
    completedByData = completedByDoc.data();
  }
  
  let serviceData = null;
  if (appData?.service_id) {
    const serviceDoc = await db.collection('services').doc(appData.service_id).get();
    serviceData = serviceDoc.data();
  }
  
  const documentsSnapshot = await db.collection('application_documents').where('application_id', '==', applicationId).get();
  const documents = documentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  const updatesSnapshot = await db.collection('application_updates').where('application_id', '==', applicationId).orderBy('updated_at', 'desc').get();
  const updates = updatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  let formData = {};
  try {
    if (appData?.form_data && appData.form_data !== 'undefined' && appData.form_data !== 'null') {
      formData = typeof appData.form_data === 'string' ? JSON.parse(appData.form_data) : appData.form_data;
    }
  } catch (e) {
    console.error('Error parsing form_data:', e);
  }

  return {
    id: applicationId,
    ...appData,
    form_data: formData,
    user_name: userData?.name,
    user_email: userData?.email,
    user_phone: userData?.phone,
    staff_name: staffData?.name,
    completed_by_name: completedByData?.name,
    service_name: serviceData?.name || serviceData?.service_name || appData?.service_type || 'Unknown Service',
    documents,
    updates
  };
};

// Admin Dashboard Stats
app.get('/api/admin/dashboard-overview', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').select('role', 'deleted_at', 'name').get();
    
    let totalUsers = 0;
    let totalStaff = 0;
    const staffDocs: any[] = [];
    const usersMap = new Map();
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      usersMap.set(doc.id, data);
      if (!data.deleted_at) {
        if (data.role === 'user') totalUsers++;
        if (data.role === 'staff') {
          totalStaff++;
          staffDocs.push({ id: doc.id, ...data });
        }
      }
    });

    const appsSnapshot = await db.collection('applications').select('status', 'created_at', 'user_id', 'service_type', 'completed_by', 'deleted_at', 'reference_number').get();
    const ledgerSnapshot = await db.collection('ledger').select('amount', 'profit_amount', 'deleted_at').get();
    const servicePaymentsSnapshot = await db.collection('service_payments').where('status', '==', 'success').select('amount').get();
    const logsSnapshot = await db.collection('activity_logs').orderBy('timestamp', 'desc').limit(20).get();
    const notificationsSnapshot = await db.collection('notifications').orderBy('created_at', 'desc').limit(10).get();

    let totalApplications = 0;
    const activeApps: any[] = [];
    
    appsSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.deleted_at) {
        totalApplications++;
        activeApps.push({ id: doc.id, ...data });
      }
    });

    const activeLedger: any[] = [];
    ledgerSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.deleted_at) {
        activeLedger.push(data);
      }
    });
    
    const pendingStatuses = ['Submitted', 'Under Review', 'Processing', 'Documents Required'];
    const approvedStatuses = ['Approved', 'Completed'];
    
    const pendingApplications = activeApps.filter(data => pendingStatuses.includes(data.status)).length;
    const approvedApplications = activeApps.filter(data => approvedStatuses.includes(data.status)).length;
    const rejectedApplications = activeApps.filter(data => data.status === 'Rejected').length;
    
    let ledgerRevenue = 0;
    let ledgerProfit = 0;
    activeLedger.forEach(data => {
      ledgerRevenue += (data.amount || 0);
      ledgerProfit += (data.profit_amount || 0);
    });
    
    let serviceRevenue = 0;
    servicePaymentsSnapshot.forEach(doc => serviceRevenue += (doc.data().amount || 0));

    const totalRevenue = ledgerRevenue + serviceRevenue;
    const totalProfit = ledgerProfit; // Assuming service payments don't have a separate profit field yet

    // Applications by Status
    const statusMap = new Map();
    activeApps.forEach(data => {
      const status = data.status;
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    const appsByStatus = Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));

    // Daily Applications (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyAppsMap = new Map();
    activeApps.forEach(data => {
      const createdAt = data.created_at?.toDate();
      if (createdAt && createdAt >= sevenDaysAgo) {
        const date = createdAt.toISOString().split('T')[0];
        dailyAppsMap.set(date, (dailyAppsMap.get(date) || 0) + 1);
      }
    });
    const dailyApps = Array.from(dailyAppsMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Recent Applications
    const recentApplications = activeApps
      .sort((a, b) => (b.created_at?.toDate() || 0) - (a.created_at?.toDate() || 0))
      .slice(0, 5)
      .map(data => {
        const user = usersMap.get(data.user_id);
        const completedBy = usersMap.get(data.completed_by);
        return {
          id: data.id,
          reference_number: data.reference_number,
          service_name: data.service_type,
          status: data.status,
          created_at: data.created_at,
          user_name: user?.name,
          completed_by_name: completedBy?.name
        };
      });

    // Service Usage (Top 5)
    const serviceUsageMap = new Map();
    activeApps.forEach(data => {
      const type = data.service_type;
      serviceUsageMap.set(type, (serviceUsageMap.get(type) || 0) + 1);
    });
    const topServices = Array.from(serviceUsageMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Staff Performance
    const staffPerfMap = new Map();
    staffDocs.forEach(staff => {
      staffPerfMap.set(staff.id, { staff_name: staff.name, completed: 0 });
    });
    activeApps.forEach(data => {
      if (data.completed_by && staffPerfMap.has(data.completed_by)) {
        const perf = staffPerfMap.get(data.completed_by);
        perf.completed += 1;
      }
    });
    const staffPerformance = Array.from(staffPerfMap.values());

    // Admin Activity Logs
    const adminLogs = logsSnapshot.docs
      .filter(doc => {
        const user = usersMap.get(doc.data().user_id);
        return user?.role === 'admin';
      })
      .slice(0, 10)
      .map(doc => ({
        ...doc.data(),
        admin_name: usersMap.get(doc.data().user_id)?.name
      }));

    // System Notifications
    const systemNotifications = notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      overview: {
        totalUsers,
        totalStaff,
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        serviceRevenue,
        totalRevenue,
        totalProfit
      },
      appsByStatus,
      dailyApps,
      recentApplications,
      topServices,
      staffPerformance,
      adminLogs,
      systemNotifications
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Payments
app.post('/api/payments/create-order', authenticateToken, async (req: any, res) => {
  const { service_id } = req.body;
  if (!service_id) {
    return res.status(400).json({ error: 'Service ID is required' });
  }
  try {
    const serviceDoc = await db.collection('services').doc(service_id).get();
    if (!serviceDoc.exists) return res.status(404).json({ error: 'Service not found' });
    const service = serviceDoc.data();
    
    if (!service?.payment_required) return res.status(400).json({ error: 'Payment not required for this service' });

    const amount = Math.round((service.service_price || 0) * 100); // in paise
    
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `receipt_service_${service_id}_${req.user.id}_${Date.now()}`
    });
    
    // Create a pending payment record
    await db.collection('service_payments').add({
      user_id: req.user.id,
      service_id,
      amount: service.service_price,
      razorpay_order_id: order.id,
      status: 'pending',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
      
    res.json(order);
  } catch (err) {
    console.error('Razorpay Order Error:', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

app.post('/api/payments/verify', authenticateToken, async (req: any, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, service_id } = req.body;
  
  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dummy_secret')
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest('hex');

  try {
    const paymentsSnapshot = await db.collection('service_payments').where('razorpay_order_id', '==', razorpay_order_id).limit(1).get();
    if (paymentsSnapshot.empty) return res.status(404).json({ error: 'Payment record not found' });
    const paymentRef = paymentsSnapshot.docs[0].ref;

    if (generated_signature === razorpay_signature) {
      await paymentRef.update({
        razorpay_payment_id,
        razorpay_signature,
        status: 'success',
        payment_mode: 'gateway',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true, payment_id: paymentRef.id, message: 'Payment verified successfully' });
    } else {
      await paymentRef.update({
        status: 'failed',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      res.status(400).json({ error: 'Invalid payment signature' });
    }
  } catch (err) {
    console.error('Payment Verification Error:', err);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

app.post('/api/payments/wallet-pay', authenticateToken, async (req: any, res) => {
  const { serviceId, service_id } = req.body;
  const sId = serviceId || service_id;
  const userId = req.user.id;

  if (!sId) {
    return res.status(400).json({ error: 'Service ID is required' });
  }

  try {
    const serviceDoc = await db.collection('services').doc(sId).get();
    if (!serviceDoc.exists) return res.status(404).json({ error: 'Service not found' });
    const service = serviceDoc.data();

    if (!service?.payment_required) {
      return res.status(400).json({ error: 'Payment not required for this service' });
    }

    const price = service.service_price || 0;
    const walletRef = db.collection('wallets').doc(userId);
    const transactionRef = db.collection('wallet_transactions').doc();
    const paymentRef = db.collection('service_payments').doc();

    await db.runTransaction(async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      if (!walletDoc.exists || (walletDoc.data()?.balance || 0) < price) {
        throw new Error('Insufficient wallet balance');
      }

      transaction.update(walletRef, {
        balance: admin.firestore.FieldValue.increment(-price),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      transaction.set(transactionRef, {
        user_id: userId,
        type: 'debit',
        amount: price,
        description: `Service Payment - ${service.service_name}`,
        status: 'success',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });

      transaction.set(paymentRef, {
        user_id: userId,
        service_id: sId,
        amount: price,
        status: 'success',
        payment_mode: 'wallet',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    res.json({ success: true, payment_id: paymentRef.id, message: 'Payment successful via Wallet' });
  } catch (err: any) {
    console.error('Wallet Payment Error:', err);
    res.status(500).json({ error: err.message || 'Failed to process wallet payment' });
  }
});

app.get('/api/payments/status/:serviceId', authenticateToken, async (req: any, res) => {
  const { serviceId } = req.params;
  try {
    const paymentsSnapshot = await db.collection('service_payments')
      .where('user_id', '==', req.user.id)
      .where('service_id', '==', serviceId)
      .where('status', '==', 'success')
      .orderBy('created_at', 'desc')
      .get();
    
    // Check if any successful payment hasn't been used for an application yet
    const appsSnapshot = await db.collection('applications').where('user_id', '==', req.user.id).get();
    const usedPaymentIds = new Set(appsSnapshot.docs.map(doc => doc.data().payment_id).filter(Boolean));
    
    const unusedPayment = paymentsSnapshot.docs.find(doc => !usedPaymentIds.has(doc.id));
    
    res.json({ paid: !!unusedPayment, payment_id: unusedPayment ? unusedPayment.id : null });
  } catch (err) {
    console.error('Payment Status Error:', err);
    res.status(500).json({ error: 'Failed to fetch payment status' });
  }
});

app.get('/api/admin/payments', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const paymentsSnapshot = await db.collection('service_payments').orderBy('created_at', 'desc').get();
    const usersSnapshot = await db.collection('users').get();
    const servicesSnapshot = await db.collection('services').get();
    
    const usersMap = new Map();
    usersSnapshot.docs.forEach(doc => usersMap.set(doc.id, doc.data()));
    
    const servicesMap = new Map();
    servicesSnapshot.docs.forEach(doc => servicesMap.set(doc.id, doc.data()));

    const payments = paymentsSnapshot.docs.map(doc => {
      const data = doc.data();
      const user = usersMap.get(data.user_id);
      const service = servicesMap.get(data.service_id);
      return {
        id: doc.id,
        ...data,
        user_name: user?.name,
        user_email: user?.email,
        service_name: service?.service_name
      };
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

app.get('/api/admin/revenue', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const paymentsSnapshot = await db.collection('service_payments').where('status', '==', 'success').get();
    const servicesSnapshot = await db.collection('services').get();
    
    const servicesMap = new Map();
    servicesSnapshot.docs.forEach(doc => servicesMap.set(doc.id, doc.data()));

    let total_revenue = 0;
    const total_payments = paymentsSnapshot.size;
    
    const serviceRevenueMap = new Map();
    paymentsSnapshot.forEach(doc => {
      const data = doc.data();
      total_revenue += (data.amount || 0);
      const serviceId = data.service_id;
      const current = serviceRevenueMap.get(serviceId) || { revenue: 0, count: 0 };
      current.revenue += (data.amount || 0);
      current.count += 1;
      serviceRevenueMap.set(serviceId, current);
    });

    const byService = Array.from(serviceRevenueMap.entries()).map(([id, stats]) => ({
      service_name: servicesMap.get(id)?.service_name || 'Unknown',
      ...stats
    }));
    
    res.json({ total_revenue, total_payments, byService });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch revenue stats' });
  }
});

// Applications
app.post('/api/applications', authenticateToken, upload.array('documents', 20), async (req: any, res) => {
  try {
    const { service_type, form_data, payment_id } = req.body;
    const reference_number = await generateReferenceNumber();
    
    // Check for service
    const servicesSnapshot = await db.collection('services').where('name', '==', service_type).limit(1).get();
    let serviceDoc = servicesSnapshot.docs[0];
    if (!serviceDoc) {
      const servicesSnapshotOld = await db.collection('services').where('service_name', '==', service_type).limit(1).get();
      serviceDoc = servicesSnapshotOld.docs[0];
    }
    if (!serviceDoc) {
      const serviceById = await db.collection('services').doc(service_type).get();
      if (serviceById.exists) serviceDoc = serviceById as any;
    }
    
    if (!serviceDoc) {
      return res.status(404).json({ error: 'Service not found' });
    }
    const service = { id: serviceDoc.id, ...serviceDoc.data() } as any;
    const serviceName = service.name || service.service_name;

    // Check payment requirement for users
    if (service.payment_required && req.user.role === 'user') {
      if (!payment_id) {
        return res.status(400).json({ error: 'Payment is required for this service' });
      }
      
      const paymentDoc = await db.collection('service_payments').doc(payment_id).get();
      const paymentData = paymentDoc.data();
      
      if (!paymentDoc.exists || paymentData?.user_id !== req.user.id || paymentData?.service_id !== service.id || paymentData?.status !== 'success') {
        return res.status(400).json({ error: 'Invalid or unsuccessful payment' });
      }
      
      const existingAppSnapshot = await db.collection('applications').where('payment_id', '==', payment_id).limit(1).get();
      if (!existingAppSnapshot.empty) {
        return res.status(400).json({ error: 'This payment has already been used for an application' });
      }
    }

    // Check for service fee (wallet deduction for staff/admin or additional fee)
    if (service.fee > 0 && (req.user.role === 'staff' || req.user.role === 'admin')) {
      const walletDoc = await db.collection('wallets').doc(req.user.id).get();
      const walletData = walletDoc.data();
      if (!walletDoc.exists || (walletData?.balance || 0) < service.fee) {
        return res.status(400).json({ error: 'Insufficient wallet balance. Please add money to your wallet.' });
      }
    }

    let userId = req.user.id;
    let createdBy = req.user.role;

    // If staff/admin is applying for a customer
    if ((req.user.role === 'staff' || req.user.role === 'admin') && form_data) {
      try {
        const parsedData = typeof form_data === 'string' ? JSON.parse(form_data) : form_data;
        const customerEmail = parsedData.customerEmail || parsedData.email;
        const customerPhone = parsedData.customerPhone || parsedData.mobile || parsedData.phone;

        if (customerEmail || customerPhone) {
          let customerSnapshot = await db.collection('users').where('email', '==', customerEmail).limit(1).get();
          if (customerSnapshot.empty && customerPhone) {
            customerSnapshot = await db.collection('users').where('phone', '==', customerPhone).limit(1).get();
          }
          if (!customerSnapshot.empty) {
            userId = customerSnapshot.docs[0].id;
          }
        }
      } catch (e) {
        console.error('Error parsing form_data for customer lookup:', e);
      }
    }

    const paymentDoc = payment_id ? await db.collection('service_payments').doc(payment_id).get() : null;
    const paymentData = paymentDoc?.data();
    const payment_mode = paymentData ? paymentData.payment_mode : 'none';

    const appRef = db.collection('applications').doc();
    const applicationId = appRef.id;

    const applicationData = {
      reference_number,
      user_id: userId,
      service_type: serviceName,
      service_id: service.id,
      form_data,
      status: 'Submitted',
      payment_status: (payment_id ? 'Paid' : 'Pending'),
      created_by: createdBy,
      assigned_staff: null, // Removed auto-assignment
      payment_id: payment_id || null,
      payment_mode,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await appRef.set(applicationData);

    // Deduct from wallet if fee exists (for staff/admin)
    if (service.fee > 0 && (req.user.role === 'staff' || req.user.role === 'admin')) {
      const walletRef = db.collection('wallets').doc(req.user.id);
      await walletRef.update({
        balance: admin.firestore.FieldValue.increment(-service.fee),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      await db.collection('wallet_transactions').add({
        user_id: req.user.id,
        type: 'debit',
        amount: service.fee,
        description: `Payment for service: ${serviceName}`,
        reference_id: applicationId,
        status: 'success',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    const files = req.files as Express.Multer.File[];
    if (files) {
      for (const f of files) {
        await db.collection('application_documents').add({
          application_id: applicationId,
          file_path: f.path,
          file_name: f.originalname,
          uploaded_by: req.user.id,
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    // Initial update
    await db.collection('application_updates').add({
      application_id: applicationId,
      status: 'Submitted',
      comment: 'Application submitted successfully.',
      updated_by: req.user.id,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('activity_logs').add({
      user_id: req.user.id,
      action: `Submitted new ${service.service_name} application (${reference_number})`,
      application_id: applicationId,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    const enrichedApp = await getEnrichedApplication(applicationId);
    res.json(enrichedApp);
  } catch (err: any) {
    console.error('Submission error:', err);
    res.status(400).json({ error: err.message || 'Failed to submit application' });
  }
});

app.post('/api/applications/finalize', authenticateToken, async (req: any, res) => {
  const { draft_id, payment_id } = req.body;
  const userId = req.user.id;

  if (!draft_id) {
    return res.status(400).json({ error: 'Draft ID is required' });
  }

  try {
    const draftRef = db.collection('application_drafts').doc(draft_id);
    const draftDoc = await draftRef.get();
    if (!draftDoc.exists || draftDoc.data()?.user_id !== userId) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    const draft = draftDoc.data();

    if (!draft?.service_id) {
      return res.status(400).json({ error: 'Invalid draft: missing service ID' });
    }

    const serviceDoc = await db.collection('services').doc(draft.service_id).get();
    if (!serviceDoc.exists) {
      return res.status(404).json({ error: 'Service not found' });
    }
    const service = serviceDoc.data();

    // Verify payment
    if (!payment_id) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }
    const paymentDoc = await db.collection('service_payments').doc(payment_id).get();
    const payment = paymentDoc.data();
    if (!paymentDoc.exists || payment?.user_id !== userId || payment?.service_id !== draft?.service_id || payment?.status !== 'success') {
      return res.status(400).json({ error: 'Invalid or unsuccessful payment' });
    }

    const reference_number = await generateReferenceNumber();
    const appRef = db.collection('applications').doc();
    const applicationId = appRef.id;

    await db.runTransaction(async (transaction) => {
      // 1. Create application
      transaction.set(appRef, {
        reference_number,
        user_id: userId,
        service_type: service?.name || service?.service_name,
        service_id: draft?.service_id,
        form_data: draft?.form_data,
        status: 'Submitted',
        payment_status: 'Paid',
        created_by: 'user',
        assigned_staff: null, // Removed auto-assignment
        payment_id: payment_id,
        payment_mode: payment?.payment_mode,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      // 2. Move documents from draft to application_documents
      const draftDocs = draft?.documents || [];
      draftDocs.forEach((doc: any) => {
        const docRef = db.collection('application_documents').doc();
        transaction.set(docRef, {
          application_id: applicationId,
          document_type: doc.type || 'Document',
          file_name: doc.originalname || 'Document',
          file_path: doc.path,
          uploaded_by: userId,
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      // 3. Delete draft
      transaction.delete(draftRef);

      // 4. Initial update
      const updateRef = db.collection('application_updates').doc();
      transaction.set(updateRef, {
        application_id: applicationId,
        status: 'Submitted',
        comment: 'Application submitted successfully from draft.',
        updated_by: userId,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      // 5. Activity log
      const logRef = db.collection('activity_logs').doc();
      transaction.set(logRef, {
        user_id: userId,
        action: `Finalized ${service?.name || service?.service_name} application (${reference_number})`,
        application_id: applicationId,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    const enrichedApp = await getEnrichedApplication(applicationId);
    res.json(enrichedApp);
  } catch (err: any) {
    console.error('Finalize error:', err);
    res.status(500).json({ error: err.message || 'Failed to finalize application' });
  }
});

app.get('/api/applications', authenticateToken, async (req: any, res) => {
  try {
    let query: any = db.collection('applications');
    
    if (req.user.role === 'user') {
      query = query.where('user_id', '==', req.user.id);
    }
    
    const snapshot = await query.get();
    const applications = await Promise.all(snapshot.docs.map(doc => getEnrichedApplication(doc.id)));
    const sortedApps = applications
      .filter(Boolean)
      .filter((app: any) => !app.deleted_at)
      .sort((a: any, b: any) => {
        const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at || 0);
        const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });
    res.json(sortedApps);
  } catch (err) {
    console.error('Fetch applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

app.get('/api/applications/:id', authenticateToken, async (req: any, res) => {
  try {
    const application = await getEnrichedApplication(req.params.id) as any;
    if (!application) return res.status(404).json({ error: 'Application not found' });
    
    // Check permission
    if (req.user.role === 'user' && application.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    res.json(application);
  } catch (err) {
    console.error('Fetch application error:', err);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

app.delete('/api/applications/:id', authenticateToken, requireRole(['admin']), async (req: any, res) => {
  try {
    const appRef = db.collection('applications').doc(req.params.id);
    const appDoc = await appRef.get();
    if (!appDoc.exists) return res.status(404).json({ error: 'Application not found' });

    await appRef.update({ deleted_at: admin.firestore.FieldValue.serverTimestamp() });
    
    await db.collection('activity_logs').add({
      user_id: req.user.id,
      action: `Moved application to Recycle Bin: ${appDoc.data()?.reference_number}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ message: 'Application moved to Recycle Bin' });
  } catch (err) {
    console.error('Delete application error:', err);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

app.get('/api/applications/track/:ref', async (req, res) => {
  try {
    const ref = req.params.ref;
    const snapshot = await db.collection('applications')
      .where('reference_number', '==', ref)
      .limit(1)
      .get();
    
    let applicationDoc = snapshot.docs[0];
    
    if (!applicationDoc) {
      // Try by phone number if ref is a phone number
      const userSnapshot = await db.collection('users').where('phone', '==', ref).limit(1).get();
      if (!userSnapshot.empty) {
        const userId = userSnapshot.docs[0].id;
        const appSnapshot = await db.collection('applications').where('user_id', '==', userId).orderBy('created_at', 'desc').limit(1).get();
        if (!appSnapshot.empty) {
          applicationDoc = appSnapshot.docs[0];
        }
      }
    }
    
    if (!applicationDoc) return res.status(404).json({ error: 'Application not found' });
    
    const enrichedApp = await getEnrichedApplication(applicationDoc.id);
    res.json(enrichedApp);
  } catch (err) {
    console.error('Track application error:', err);
    res.status(500).json({ error: 'Failed to track application' });
  }
});

// Removed assignment endpoint as per user request


app.patch('/api/applications/:id/status', authenticateToken, requireRole(['admin', 'staff']), upload.array('documents', 20), async (req: any, res) => {
  const { status, comment } = req.body;
  const applicationId = req.params.id;

  try {
    const appRef = db.collection('applications').doc(applicationId);
    const appDoc = await appRef.get();
    if (!appDoc.exists) return res.status(404).json({ error: 'Application not found' });
    const appData = appDoc.data();

    await db.runTransaction(async (transaction) => {
      const updateData: any = {
        status,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      if (status === 'Completed' || status === 'Approved') {
        updateData.completed_by = req.user.id;
        updateData.completed_at = admin.firestore.FieldValue.serverTimestamp();
      }
      
      // Remove undefined properties to prevent Firestore errors
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
      
      transaction.update(appRef, updateData);

      const updateRef = db.collection('application_updates').doc();
      const updateEntry: any = {
        application_id: applicationId,
        status,
        comment: comment || `Status updated to ${status}`,
        updated_by: req.user.id,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      Object.keys(updateEntry).forEach(key => updateEntry[key] === undefined && delete updateEntry[key]);
      transaction.set(updateRef, updateEntry);

      // Handle new documents from staff/admin
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        files.forEach(f => {
          const serviceType = appData?.service_type || 'general';
          const userId = appData?.user_id || appData?.userId || 'unknown';
          const filePath = `/uploads/${serviceType}/${userId}/${f.filename}`;
          const docRef = db.collection('application_documents').doc();
          const docData: any = {
            application_id: applicationId,
            file_path: filePath,
            file_name: f.originalname,
            uploaded_by: req.user.id,
            created_at: admin.firestore.FieldValue.serverTimestamp()
          };
          Object.keys(docData).forEach(key => docData[key] === undefined && delete docData[key]);
          transaction.set(docRef, docData);
        });
      }

      // Notify User
      if (appData?.user_id || appData?.userId) {
        const notifRef = db.collection('notifications').doc();
        const notifData: any = {
          user_id: appData?.user_id || appData?.userId,
          message: `Your application ${appData?.reference_number || 'update'} status updated to ${status}.`,
          is_read: false,
          created_at: admin.firestore.FieldValue.serverTimestamp()
        };
        Object.keys(notifData).forEach(key => notifData[key] === undefined && delete notifData[key]);
        transaction.set(notifRef, notifData);
      }

      // Activity log
      const logRef = db.collection('activity_logs').doc();
      const logData: any = {
        user_id: req.user.id,
        action: `Updated status to ${status} for ${appData?.reference_number || applicationId}`,
        application_id: applicationId,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };
      Object.keys(logData).forEach(key => logData[key] === undefined && delete logData[key]);
      transaction.set(logRef, logData);

      // Credit commission to staff if status is 'Completed'
      if (status === 'Completed' && req.user.role === 'staff') {
        const txSnapshot = await db.collection('wallet_transactions')
          .where('user_id', '==', req.user.id)
          .where('reference_id', '==', applicationId)
          .where('type', '==', 'credit')
          .limit(1)
          .get();
        
        if (txSnapshot.empty) {
          const servicesSnapshot = await db.collection('services')
            .where('service_name', '==', appData?.service_type)
            .limit(1)
            .get();
          
          const service = servicesSnapshot.docs[0]?.data();
          if (service && service.staff_commission > 0) {
            const walletRef = db.collection('wallets').doc(req.user.id);
            const walletDoc = await transaction.get(walletRef);
            const currentBalance = walletDoc.data()?.balance || 0;
            
            transaction.update(walletRef, {
              balance: currentBalance + service.staff_commission,
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            
            const walletTxRef = db.collection('wallet_transactions').doc();
            transaction.set(walletTxRef, {
              user_id: req.user.id,
              type: 'credit',
              amount: service.staff_commission,
              description: `Commission for processing application: ${appData?.reference_number}`,
              reference_id: applicationId,
              status: 'success',
              created_at: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      }
    });

    res.json({ message: 'Status updated and user notified' });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Notifications
app.get('/api/user-alerts', authenticateToken, async (req: any, res) => {
  try {
    const snapshot = await db.collection('notifications')
      .where('user_id', '==', req.user.id)
      .get();
    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => {
        const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at || 0);
        const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 20);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.patch('/api/user-alerts/:id/read', authenticateToken, async (req: any, res) => {
  try {
    await db.collection('notifications').doc(req.params.id).update({ is_read: true });
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Activity Logs
app.get('/api/activity-logs', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const snapshot = await db.collection('activity_logs').orderBy('timestamp', 'desc').limit(50).get();
    const usersSnapshot = await db.collection('users').get();
    const usersMap = new Map();
    usersSnapshot.docs.forEach(doc => usersMap.set(doc.id, doc.data()));

    const logs = snapshot.docs.map(doc => {
      const data = doc.data();
      const user = usersMap.get(data.user_id);
      return {
        id: doc.id,
        ...data,
        user_name: user?.name
      };
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Service Links
app.get('/api/service-links', authenticateToken, requireRole(['admin', 'staff']), async (req, res) => {
  try {
    const snapshot = await db.collection('service_links').where('is_active', '==', true).get();
    const links = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(links);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch service links' });
  }
});

// Support Tickets
app.post('/api/support', authenticateToken, async (req: any, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required' });
  }
  try {
    const result = await db.collection('support_tickets').add({
      user_id: req.user.id,
      subject,
      message,
      status: 'Open',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ id: result.id, message: 'Support ticket submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit ticket' });
  }
});

app.get('/api/support', authenticateToken, async (req: any, res) => {
  try {
    let query: any = db.collection('support_tickets');
    if (req.user.role === 'user') {
      query = query.where('user_id', '==', req.user.id);
    }
    const snapshot = await query.orderBy('created_at', 'desc').get();
    
    const usersSnapshot = await db.collection('users').get();
    const usersMap = new Map();
    usersSnapshot.docs.forEach(doc => usersMap.set(doc.id, doc.data()));

    const tickets = snapshot.docs.map(doc => {
      const data = doc.data();
      const user = usersMap.get(data.user_id);
      return {
        id: doc.id,
        ...data,
        user_name: user?.name,
        user_email: user?.email
      };
    });
    res.json(tickets);
  } catch (err) {
    console.error('Fetch Support Tickets Error:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

app.put('/api/support/:id/status', authenticateToken, requireRole(['admin', 'staff']), async (req: any, res) => {
  const { status } = req.body;
  try {
    await db.collection('support_tickets').doc(req.params.id).update({ status });
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update ticket status' });
  }
});

// Recycle Bin Routes
app.get('/api/recycle-bin', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const servicesSnapshot = await db.collection('services').where('deleted_at', '!=', null).get();
    const usersSnapshot = await db.collection('users').where('deleted_at', '!=', null).get();
    const applicationsSnapshot = await db.collection('applications').where('deleted_at', '!=', null).get();
    const ledgerSnapshot = await db.collection('ledger').where('deleted_at', '!=', null).get();
    
    const services = servicesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().service_name, type: 'service', deleted_at: doc.data().deleted_at }));
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, type: 'user', deleted_at: doc.data().deleted_at }));
    const applications = applicationsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().reference_number, type: 'application', deleted_at: doc.data().deleted_at }));
    const ledger = ledgerSnapshot.docs.map(doc => ({ id: doc.id, name: `${doc.data().customer_name} - ${doc.data().service_name}`, type: 'ledger', deleted_at: doc.data().deleted_at }));
    
    res.json([...services, ...users, ...applications, ...ledger]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recycle bin items' });
  }
});

app.post('/api/recycle-bin/restore', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { id, type } = req.body;
  if (!id) return res.status(400).json({ error: 'ID is required' });
  
  let collection = '';
  if (type === 'service') collection = 'services';
  else if (type === 'user') collection = 'users';
  else if (type === 'application') collection = 'applications';
  else if (type === 'ledger') collection = 'ledger';
  
  if (!collection) return res.status(400).json({ error: 'Invalid type' });
  
  try {
    await db.collection(collection).doc(id).update({ deleted_at: null });
    res.json({ success: true, message: 'Item restored successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore item' });
  }
});

app.delete('/api/recycle-bin/permanent/:type/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { id, type } = req.params;
  let collection = '';
  if (type === 'service') collection = 'services';
  else if (type === 'user') collection = 'users';
  else if (type === 'application') collection = 'applications';
  else if (type === 'ledger') collection = 'ledger';
  
  if (!collection) return res.status(400).json({ error: 'Invalid type' });
  
  try {
    await db.collection(collection).doc(id).delete();
    res.json({ success: true, message: 'Item permanently deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Global Error Handler to ensure JSON responses
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Global Error Handler:', err);
  
  // If headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// Start Server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      // If it's an API request that wasn't handled, return 404 JSON
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  if (process.env.VERCEL) {
    console.log('Running in Vercel environment, skipping app.listen()');
    return;
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
