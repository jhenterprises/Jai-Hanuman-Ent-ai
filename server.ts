import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-jai-hanuman';

// Razorpay Setup
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret'
});

// Middleware
app.use(express.json());
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Database Setup
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}
const db = new Database(path.join(dbDir, 'database.sqlite'));

// Initialize Database Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name TEXT NOT NULL,
    description TEXT,
    service_url TEXT,
    is_visible BOOLEAN DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    service_name TEXT NOT NULL,
    amount REAL NOT NULL,
    staff_id INTEGER,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(staff_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_number TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    service_type TEXT NOT NULL,
    form_data TEXT,
    status TEXT DEFAULT 'Submitted',
    assigned_staff INTEGER,
    created_by TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(assigned_staff) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS application_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT,
    uploaded_by INTEGER,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(application_id) REFERENCES applications(id)
  );

  CREATE TABLE IF NOT EXISTS application_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    comment TEXT,
    updated_by INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(application_id) REFERENCES applications(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS service_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_type TEXT UNIQUE NOT NULL,
    process_url TEXT NOT NULL,
    apply_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'Open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    application_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(application_id) REFERENCES applications(id)
  );

  CREATE TABLE IF NOT EXISTS service_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(staff_id) REFERENCES users(id),
    FOREIGN KEY(service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS service_inputs (
    input_id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    input_label TEXT NOT NULL,
    input_type TEXT NOT NULL,
    required BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS service_form_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    type TEXT NOT NULL,
    required BOOLEAN DEFAULT 0,
    placeholder TEXT,
    section_name TEXT,
    field_order INTEGER DEFAULT 0,
    options TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS service_document_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    document_name TEXT NOT NULL,
    document_type TEXT DEFAULT 'file_upload',
    required BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS service_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    role TEXT NOT NULL,
    balance REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS wallet_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'credit' or 'debit'
    amount REAL NOT NULL,
    description TEXT,
    reference_id TEXT,
    status TEXT DEFAULT 'success', -- 'success', 'pending', 'failed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS application_drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    service_type TEXT NOT NULL,
    form_data TEXT,
    documents TEXT, -- JSON array of { path, originalname }
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS portal_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    config_data TEXT NOT NULL
  );
`);

// --- Database Migrations (Add missing columns to existing tables) ---
const migrate = () => {
  const migrations = [
    { table: 'applications', column: 'reference_number', type: 'TEXT UNIQUE' },
    { table: 'applications', column: 'assigned_staff', type: 'INTEGER' },
    { table: 'applications', column: 'created_by', type: "TEXT DEFAULT 'user'" },
    { table: 'users', column: 'phone', type: 'TEXT' },
    { table: 'application_documents', column: 'file_name', type: 'TEXT' },
    { table: 'services', column: 'is_active', type: 'BOOLEAN DEFAULT 1' },
    { table: 'services', column: 'application_type', type: "TEXT DEFAULT 'internal'" },
    { table: 'services', column: 'icon', type: 'TEXT' },
    { table: 'services', column: 'application_id', type: 'TEXT' },
    { table: 'services', column: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { table: 'services', column: 'fee', type: 'REAL DEFAULT 0' },
    { table: 'services', column: 'staff_commission', type: 'REAL DEFAULT 0' },
    { table: 'service_links', column: 'is_active', type: 'BOOLEAN DEFAULT 1' },
    { table: 'users', column: 'deleted_at', type: 'DATETIME' },
    { table: 'users', column: 'reset_token', type: 'TEXT' },
    { table: 'users', column: 'reset_token_expiry', type: 'DATETIME' },
    { table: 'services', column: 'deleted_at', type: 'DATETIME' },
    { table: 'applications', column: 'deleted_at', type: 'DATETIME' },
    { table: 'services', column: 'service_price', type: 'REAL DEFAULT 0' },
    { table: 'services', column: 'payment_required', type: 'BOOLEAN DEFAULT 0' },
    { table: 'applications', column: 'payment_id', type: 'INTEGER' },
    { table: 'applications', column: 'service_id', type: 'INTEGER' },
    { table: 'applications', column: 'payment_mode', type: "TEXT DEFAULT 'gateway'" },
    { table: 'service_payments', column: 'payment_mode', type: "TEXT DEFAULT 'gateway'" },
    { table: 'application_documents', column: 'document_type', type: 'TEXT' },
    { table: 'applications', column: 'payment_status', type: "TEXT DEFAULT 'Pending'" },
    { table: 'services', column: 'service_form_schema', type: 'TEXT' }
  ];

  for (const m of migrations) {
    try {
      const info = db.prepare(`PRAGMA table_info(${m.table})`).all() as any[];
      const exists = info.some(c => c.name === m.column);
      if (!exists) {
        try {
          db.prepare(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`).run();
          console.log(`Migration: Added column ${m.column} to ${m.table}`);
        } catch (e) {
          // Fallback if UNIQUE or DEFAULT causes issues on some SQLite versions
          const simpleType = m.type.split(' ')[0];
          db.prepare(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${simpleType}`).run();
          console.log(`Migration: Added column ${m.column} to ${m.table} (simple type)`);
        }
      }
    } catch (err) {
      console.error(`Migration check failed for ${m.table}:`, err);
    }
  }

  // Ensure all users have wallets
  try {
    const usersWithoutWallets = db.prepare('SELECT id, role FROM users WHERE id NOT IN (SELECT user_id FROM wallets)').all() as any[];
    if (usersWithoutWallets.length > 0) {
      const insertWallet = db.prepare('INSERT INTO wallets (user_id, role, balance) VALUES (?, ?, 0)');
      db.transaction(() => {
        usersWithoutWallets.forEach((u: any) => {
          insertWallet.run(u.id, u.role);
        });
      })();
      console.log(`Migration: Created wallets for ${usersWithoutWallets.length} existing users`);
    }
  } catch (err) {
    console.error('Migration: Failed to create missing wallets:', err);
  }
};
migrate();

// Seed Admin, Staff, and User
const seedUsers = () => {
  const usersToSeed = [
    { name: 'Super Admin', email: 'admin@jh.com', phone: '9999999999', password: 'admin', role: 'admin' },
    { name: 'Demo Staff', email: 'staff@jh.com', phone: '8888888888', password: 'staff', role: 'staff' },
    { name: 'Demo User', email: 'user@jh.com', phone: '7777777777', password: 'user', role: 'user' }
  ];

  const insert = db.prepare('INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)');
  const check = db.prepare('SELECT * FROM users WHERE email = ?');

  usersToSeed.forEach(u => {
    if (!check.get(u.email)) {
      const hashedPassword = bcrypt.hashSync(u.password, 10);
      const result = insert.run(u.name, u.email, u.phone, hashedPassword, u.role);
      const userId = result.lastInsertRowid;
      
      // Create wallet for seeded users
      db.prepare('INSERT INTO wallets (user_id, role, balance) VALUES (?, ?, 0)').run(userId, u.role);
    }
  });
};
seedUsers();

// Seed Initial Services
const seedServices = () => {
  const count = db.prepare('SELECT COUNT(*) as count FROM services').get() as any;
  if (count.count === 0) {
    const initialServices = [
      ['Aadhaar', 'Aadhaar Services', 'https://myaadhaar.uidai.gov.in', 'fa-fingerprint'],
      ['PAN Card', 'PAN Card Services', 'https://ruraleservices.com/agent/login', 'fa-id-card'],
      ['Voter ID', 'Voter ID Services', 'https://voters.eci.gov.in', 'fa-id-badge'],
      ['Airtel Payments', 'Airtel Payments Bank', 'https://portal.airtelbank.com/RetailerPortal', 'fa-money-bill-wave'],
      ['CSC Portal', 'Digital Seva Portal', 'https://digitalseva.csc.gov.in', 'fa-laptop'],
      ['Seva Sindhu', 'Karnataka Seva Sindhu', 'https://sevasindhuservices.karnataka.gov.in', 'fa-building'],
      ['Gruha Jyothi', 'Gruha Jyothi Scheme', 'https://sevasindhugs.karnataka.gov.in', 'fa-lightbulb'],
      ['Gruha Lakshmi', 'Gruha Lakshmi Scheme', 'https://sevasindhugs1.karnataka.gov.in/gl-sp', 'fa-female'],
      ['CSC Tickets', 'CSC Safar Tickets', 'https://cscsafar.in', 'fa-ticket-alt'],
      ['Bhoomi Land Records', 'Karnataka Land Records', 'https://landrecords.karnataka.gov.in', 'fa-map'],
      ['Passport', 'Passport Seva', 'https://passportindia.gov.in', 'fa-passport'],
      ['Swift Money', 'Swift Money Portal', 'https://swift.quicksekure.com/Login.aspx', 'fa-rupee-sign'],
      ['SSP Post Matric', 'Post Matric Scholarship', 'https://ssp.postmatric.karnataka.gov.in/homepage.aspx', 'fa-graduation-cap'],
      ['SSP Pre Matric', 'Pre Matric Scholarship', 'https://ssp.karnataka.gov.in/ssppre/PreHome', 'fa-school'],
      ['ABHA Card', 'Ayushman Bharat Health Account', 'https://abha.abdm.gov.in/abha/v3/register', 'fa-heartbeat'],
      ['Ayushman Card', 'PMJAY Beneficiary Portal', 'https://beneficiary.nha.gov.in', 'fa-hospital'],
      ['Ration Card', 'Karnataka Ration Card', 'https://ahara.karnataka.gov.in', 'fa-shopping-basket'],
      ['E-Khata', 'BBMP E-Khata', 'https://bbmpeaasthi.karnataka.gov.in', 'fa-file-invoice'],
      ['MSME / UDYAM', 'Udyam Registration', 'https://udyamregistration.gov.in', 'fa-industry'],
      ['Income Tax', 'Income Tax E-Filing', 'https://www.incometax.gov.in/iec/foportal', 'fa-file-invoice-dollar'],
      ['KVS Admission', 'Kendriya Vidyalaya Admission', 'https://kvsonlineadmission.kvs.gov.in', 'fa-child'],
      ['RTE Education', 'Right to Education Karnataka', 'https://schooleducation.karnataka.gov.in/en', 'fa-book-reader'],
      ['BBMP Tax', 'BBMP Property Tax', 'https://bbmptax.karnataka.gov.in/Default.aspx', 'fa-landmark'],
      ['Food License', 'FSSAI Food License', 'https://foscos.fssai.gov.in', 'fa-utensils'],
      ['Sun Direct', 'Sun Direct Portal', 'https://www.sundirect.in', 'fa-tv'],
      ['Railway Pass', 'Divyangjan Railway ID', 'https://divyangjanid.indianrail.gov.in', 'fa-train'],
      ['EPFO Member Login', 'EPFO Member Portal', 'https://unifiedportal-mem.epfindia.gov.in/memberinterface/', 'fa-briefcase'],
      ['EPFO Member Passbook', 'EPFO Passbook Portal', 'https://passbook.epfindia.gov.in/MemberPassBook/login', 'fa-book'],
      ['TTD Tirupati', 'TTD Darshan Booking', 'https://ttdevasthanams.ap.gov.in/home/dashboard', 'fa-om']
    ];
    const insert = db.prepare('INSERT INTO services (service_name, description, service_url, icon, is_visible, is_active) VALUES (?, ?, ?, ?, 1, 1)');
    initialServices.forEach(s => insert.run(s[0], s[1], s[2], s[3]));
  }
};
seedServices();

// Seed Service Links
const seedServiceLinks = () => {
  const count = db.prepare('SELECT COUNT(*) as count FROM service_links').get() as { count: number };
  if (count.count === 0) {
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
    const insert = db.prepare('INSERT INTO service_links (service_type, process_url, apply_url, is_active) VALUES (?, ?, ?, 1)');
    initialLinks.forEach(s => insert.run(s[0], s[1], s[2]));
  }
};
seedServiceLinks();

// Seed Portal Config
const seedPortalConfig = () => {
  const count = db.prepare('SELECT COUNT(*) as count FROM portal_config').get() as { count: number };
  if (count.count === 0) {
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
    db.prepare('INSERT INTO portal_config (id, config_data) VALUES (1, ?)').run(JSON.stringify(defaultConfig));
  }
};
seedPortalConfig();

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const optionalAuthenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = { role: 'guest' };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      req.user = { role: 'guest' };
      return next();
    }
    req.user = user;
    next();
  });
};

const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

// --- API Routes ---

// Portal Config
app.get('/api/portal-config', (req, res) => {
  const row = db.prepare('SELECT config_data FROM portal_config WHERE id = 1').get() as { config_data: string };
  if (row) {
    try {
      res.json(JSON.parse(row.config_data));
    } catch (e) {
      console.error('Error parsing portal config:', e);
      res.json({});
    }
  } else {
    res.status(404).json({ error: 'Configuration not found' });
  }
});

app.put('/api/portal-config', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    db.prepare('UPDATE portal_config SET config_data = ? WHERE id = 1').run(JSON.stringify(req.body));
    res.json({ message: 'Configuration updated successfully' });
  } catch (err) {
    console.error('Error updating portal config:', err);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Auth
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, phone, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)').run(
      name, email, phone, hashedPassword, 'user'
    );
    const userId = result.lastInsertRowid;
    
    // Create wallet for new user
    db.prepare('INSERT INTO wallets (user_id, role, balance) VALUES (?, ?, 0)').run(userId, 'user');

    const token = jwt.sign({ id: userId, role: 'user', name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ 
      token, 
      user: { id: userId, name, email, role: 'user' },
      message: 'User registered successfully' 
    });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Database error' });
    }
  }
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ? OR phone = ?').get(email, email) as any;
  
  if (!user) {
    // For security, don't reveal if user exists
    return res.json({ message: 'If an account exists with this email/phone, a reset link has been sent.' });
  }

  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins

  db.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?').run(token, expiry, user.id);

  // In a real app, send email here. For now, we'll log it and simulate.
  const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
  console.log(`Password reset link for ${user.email}: ${resetLink}`);

  res.json({ 
    message: 'If an account exists with this email/phone, a reset link has been sent.',
    // In dev mode, we might want to return the link for testing, but let's stick to the prompt's "send to email"
    debug_link: process.env.NODE_ENV !== 'production' ? resetLink : undefined
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { token, password } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > CURRENT_TIMESTAMP').get(token) as any;
  
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?').run(hashedPassword, user.id);

  res.json({ message: 'Password has been reset successfully' });
});

// --- Wallet Endpoints ---

app.get('/api/wallet/balance', authenticateToken, (req: any, res) => {
  let wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id) as any;
  if (!wallet) {
    // Create wallet if it doesn't exist (for older users)
    db.prepare('INSERT INTO wallets (user_id, role, balance) VALUES (?, ?, 0)').run(req.user.id, req.user.role);
    wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id) as any;
  }
  res.json(wallet);
});

app.get('/api/wallet/transactions', authenticateToken, (req: any, res) => {
  const transactions = db.prepare('SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(transactions);
});

app.post('/api/wallet/add-money', authenticateToken, async (req: any, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  // Check if Razorpay keys are configured
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_ID === 'rzp_test_dummy_key') {
    return res.status(500).json({ error: 'Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.' });
  }

  try {
    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };

    console.log('Creating Razorpay order with options:', options);
    const order = await razorpay.orders.create(options);
    console.log('Razorpay order created successfully:', order.id);
    res.json(order);
  } catch (err: any) {
    console.error('Razorpay Order Error Details:', {
      message: err.message,
      description: err.error?.description,
      code: err.error?.code,
      metadata: err.error?.metadata
    });
    res.status(500).json({ 
      error: 'Failed to create payment order',
      details: err.error?.description || err.message
    });
  }
});

app.post('/api/wallet/verify-payment', authenticateToken, (req: any, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
  
  const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generated_signature = hmac.digest('hex');

  if (generated_signature !== razorpay_signature && secret !== 'dummy_secret') {
    return res.status(400).json({ error: 'Invalid payment signature' });
  }
  
  if (!razorpay_payment_id) {
    return res.status(400).json({ error: 'Payment verification failed' });
  }

  try {
    db.transaction(() => {
      // Update wallet balance
      db.prepare('UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
        .run(amount, req.user.id);
      
      // Record transaction
      db.prepare('INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status) VALUES (?, ?, ?, ?, ?, ?)')
        .run(req.user.id, 'credit', amount, 'Added money to wallet', razorpay_payment_id, 'success');
    })();

    res.json({ message: 'Wallet credited successfully' });
  } catch (err) {
    console.error('Payment Verification DB Error:', err);
    res.status(500).json({ error: 'Failed to update wallet' });
  }
});

app.post('/api/wallet/pay-service', authenticateToken, (req: any, res) => {
  const { serviceId, applicationId } = req.body;
  
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId) as any;
  if (!service || !service.fee) {
    return res.status(400).json({ error: 'Invalid service or no fee required' });
  }

  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id) as any;
  if (!wallet || wallet.balance < service.fee) {
    return res.status(400).json({ error: 'Insufficient wallet balance' });
  }

  try {
    db.transaction(() => {
      // Deduct from wallet
      db.prepare('UPDATE wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
        .run(service.fee, req.user.id);
      
      // Record transaction
      db.prepare('INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status) VALUES (?, ?, ?, ?, ?, ?)')
        .run(req.user.id, 'debit', service.fee, `Payment for service: ${service.service_name}`, applicationId, 'success');
    })();

    res.json({ message: 'Payment successful' });
  } catch (err) {
    console.error('Service Payment Error:', err);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// --- Admin Wallet Endpoints ---

app.get('/api/admin/wallets', authenticateToken, requireRole(['admin']), (req: any, res) => {
  const wallets = db.prepare(`
    SELECT u.id as user_id, u.name, u.email, COALESCE(w.balance, 0) as balance, w.id as wallet_id, u.role
    FROM users u
    LEFT JOIN wallets w ON u.id = w.user_id
  `).all();
  res.json(wallets);
});

app.get('/api/admin/wallet/transactions', authenticateToken, requireRole(['admin']), (req: any, res) => {
  const transactions = db.prepare(`
    SELECT wt.*, u.name, u.email 
    FROM wallet_transactions wt 
    JOIN users u ON wt.user_id = u.id 
    ORDER BY wt.created_at DESC
  `).all();
  res.json(transactions);
});

app.post('/api/admin/wallet/adjust', authenticateToken, requireRole(['admin']), (req: any, res) => {
  const { wallet_id, type, amount, description } = req.body;
  
  if (!wallet_id || !type || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid adjustment data' });
  }

  const wallet = db.prepare('SELECT user_id FROM wallets WHERE id = ?').get(wallet_id) as any;
  if (!wallet) {
    return res.status(404).json({ error: 'Wallet not found' });
  }

  const userId = wallet.user_id;

  try {
    db.transaction(() => {
      if (type === 'credit') {
        db.prepare('UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
          .run(amount, userId);
      } else {
        db.prepare('UPDATE wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
          .run(amount, userId);
      }
      
      db.prepare('INSERT INTO wallet_transactions (user_id, type, amount, description, status) VALUES (?, ?, ?, ?, ?)')
        .run(userId, type, amount, description || `Admin ${type} adjustment`, 'success');
    })();

    res.json({ message: 'Wallet adjusted successfully' });
  } catch (err) {
    console.error('Admin Wallet Adjustment Error:', err);
    res.status(500).json({ error: 'Failed to adjust wallet' });
  }
});

app.get('/api/admin/wallet/analytics', authenticateToken, requireRole(['admin']), (req: any, res) => {
  const totalRevenue = db.prepare("SELECT SUM(amount) as total FROM wallet_transactions WHERE type = 'debit' AND status = 'success'").get() as any;
  const totalBalance = db.prepare("SELECT SUM(balance) as total FROM wallets").get() as any;
  const dailyTransactions = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count, SUM(amount) as total 
    FROM wallet_transactions 
    GROUP BY DATE(created_at) 
    ORDER BY date DESC 
    LIMIT 30
  `).all();
  const topUsers = db.prepare(`
    SELECT u.name, u.email, SUM(wt.amount) as total_spent 
    FROM wallet_transactions wt 
    JOIN users u ON wt.user_id = u.id 
    WHERE wt.type = 'debit' AND wt.status = 'success' 
    GROUP BY wt.user_id 
    ORDER BY total_spent DESC 
    LIMIT 5
  `).all();

  res.json({
    totalRevenue: totalRevenue.total || 0,
    totalBalance: totalBalance.total || 0,
    dailyTransactions,
    topUsers
  });
});

// --- Application Drafts Endpoints ---

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
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

app.post('/api/application-drafts', authenticateToken, upload.array('documents', 20), (req: any, res) => {
  try {
    const { service_id, service_type, form_data, draft_id } = req.body;
    const files = req.files as Express.Multer.File[];
    
    const documents = files ? files.map(f => ({ path: f.path, originalname: f.originalname })) : [];
    
    if (draft_id) {
      // Update existing draft
      // For simplicity, we'll replace the documents if new ones are uploaded, or keep old ones if not.
      // In a real app, you'd merge them.
      const existingDraft = db.prepare('SELECT documents FROM application_drafts WHERE id = ? AND user_id = ?').get(draft_id, req.user.id) as any;
      if (!existingDraft) return res.status(404).json({ error: 'Draft not found' });
      
      const finalDocs = documents.length > 0 ? JSON.stringify(documents) : existingDraft.documents;
      
      db.prepare('UPDATE application_drafts SET form_data = ?, documents = ? WHERE id = ?').run(
        form_data, finalDocs, draft_id
      );
      res.json({ id: draft_id, message: 'Draft updated successfully' });
    } else {
      // Create new draft
      const result = db.prepare('INSERT INTO application_drafts (user_id, service_id, service_type, form_data, documents) VALUES (?, ?, ?, ?, ?)').run(
        req.user.id, service_id, service_type, form_data, JSON.stringify(documents)
      );
      res.json({ id: result.lastInsertRowid, message: 'Draft saved successfully' });
    }
  } catch (err: any) {
    console.error('Draft save error:', err);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

app.get('/api/application-drafts', authenticateToken, (req: any, res) => {
  try {
    const drafts = db.prepare(`
      SELECT d.*, s.service_name 
      FROM application_drafts d 
      JOIN services s ON d.service_id = s.id 
      WHERE d.user_id = ? 
      ORDER BY d.created_at DESC
    `).all(req.user.id);
    res.json(drafts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

app.get('/api/application-drafts/:id', authenticateToken, (req: any, res) => {
  try {
    const draft = db.prepare('SELECT * FROM application_drafts WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!draft) return res.status(404).json({ error: 'Draft not found' });
    res.json(draft);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
});

app.delete('/api/application-drafts/:id', authenticateToken, (req: any, res) => {
  try {
    db.prepare('DELETE FROM application_drafts WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Draft deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});


// Users
app.get('/api/users', authenticateToken, requireRole(['admin']), (req, res) => {
  const users = db.prepare('SELECT id, name, email, phone, role, created_at FROM users').all();
  res.json(users);
});

app.post('/api/users', authenticateToken, requireRole(['admin']), (req, res) => {
  const { name, email, phone, password, role } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)').run(
      name, email, phone, hashedPassword, role
    );
    res.json({ id: result.lastInsertRowid, message: 'User created successfully' });
  } catch (err: any) {
    res.status(400).json({ error: 'Error creating user' });
  }
});

app.delete('/api/users/:id', authenticateToken, requireRole(['admin']), (req: any, res) => {
  if (req.user.id === parseInt(req.params.id)) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }

  try {
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.params.id) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.prepare('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
    db.prepare('INSERT INTO activity_logs (user_id, action) VALUES (?, ?)').run(req.user.id, `Moved user to Recycle Bin: ${user.name}`);
    res.json({ message: 'User moved to Recycle Bin' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.put('/api/users/:id/role', authenticateToken, requireRole(['admin']), (req, res) => {
  const { role } = req.body;
  if (!['admin', 'staff', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ message: 'User role updated' });
});

// Services
app.get('/api/services/:name', optionalAuthenticateToken, (req, res) => {
  try {
    const service = db.prepare('SELECT *, id as service_id, application_type as type, service_url as url, is_active as active_status, is_visible as visible_status FROM services WHERE LOWER(service_name) = LOWER(?) AND deleted_at IS NULL').get(req.params.name);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch service details' });
  }
});

app.get('/api/services', optionalAuthenticateToken, (req: any, res) => {
  let query = 'SELECT id as service_id, service_name, application_type as type, service_url as url, is_active as active_status, is_visible as visible_status, description, icon, created_at, fee, staff_commission, service_price, payment_required FROM services WHERE deleted_at IS NULL';
  
  if (!req.user || req.user.role === 'user' || req.user.role === 'guest') {
    // Users and guests should not see url
    query = 'SELECT id as service_id, service_name, application_type as type, is_active as active_status, is_visible as visible_status, description, icon, created_at, service_price, payment_required FROM services WHERE is_active = 1 AND is_visible = 1 AND deleted_at IS NULL';
  } else if (req.user.role === 'staff') {
    // Staff can see all active services including url
    query = 'SELECT id as service_id, service_name, application_type as type, service_url as url, is_active as active_status, is_visible as visible_status, description, icon, created_at, fee, staff_commission, service_price, payment_required FROM services WHERE is_active = 1 AND deleted_at IS NULL';
  }
  
  const services = db.prepare(query).all();
  res.json(services);
});

app.post('/api/services/:id/log-access', authenticateToken, requireRole(['staff', 'admin']), (req: any, res) => {
  const { id } = req.params;
  const { action } = req.body;
  
  db.prepare('INSERT INTO service_logs (staff_id, service_id, action) VALUES (?, ?, ?)')
    .run(req.user.id, id, action || 'Opened Service URL');
    
  res.json({ success: true });
});

app.post('/api/services', authenticateToken, requireRole(['admin']), (req, res) => {
  const { service_name, description, active_status, visible_status, type, url, icon, application_id, service_price, payment_required, fee, staff_commission } = req.body;
  const result = db.prepare('INSERT INTO services (service_name, description, is_active, is_visible, application_type, service_url, icon, application_id, service_price, payment_required, fee, staff_commission) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    service_name, description, active_status ?? 1, visible_status ?? 1, type || 'internal', url || '', icon || '', application_id || '', service_price || 0, payment_required ? 1 : 0, fee || 0, staff_commission || 0
  );
  res.json({ id: result.lastInsertRowid, message: 'Service added' });
});

app.put('/api/services/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const { service_name, description, active_status, visible_status, type, url, icon, application_id, service_price, payment_required, fee, staff_commission } = req.body;
  db.prepare('UPDATE services SET service_name = ?, description = ?, is_active = ?, is_visible = ?, application_type = ?, service_url = ?, icon = ?, application_id = ?, service_price = ?, payment_required = ?, fee = ?, staff_commission = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    service_name, description, active_status, visible_status, type, url, icon, application_id || '', service_price || 0, payment_required ? 1 : 0, fee || 0, staff_commission || 0, req.params.id
  );
  res.json({ message: 'Service updated' });
});

app.patch('/api/services/:id/status', authenticateToken, requireRole(['admin']), (req, res) => {
  const service = db.prepare('SELECT is_active FROM services WHERE id = ?').get(req.params.id) as any;
  if (!service) return res.status(404).json({ error: 'Service not found' });
  const newStatus = service.is_active ? 0 : 1;
  db.prepare('UPDATE services SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, req.params.id);
  res.json({ message: 'Status toggled', is_active: newStatus });
});

app.patch('/api/services/:id/visibility', authenticateToken, requireRole(['admin']), (req, res) => {
  const service = db.prepare('SELECT is_visible FROM services WHERE id = ?').get(req.params.id) as any;
  if (!service) return res.status(404).json({ error: 'Service not found' });
  const newVisibility = service.is_visible ? 0 : 1;
  db.prepare('UPDATE services SET is_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newVisibility, req.params.id);
  res.json({ message: 'Visibility toggled', is_visible: newVisibility });
});

app.delete('/api/services/:id', authenticateToken, requireRole(['admin']), (req: any, res) => {
  const service = db.prepare('SELECT service_name FROM services WHERE id = ?').get(req.params.id) as any;
  if (!service) return res.status(404).json({ error: 'Service not found' });

  try {
    db.prepare('UPDATE services SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
    db.prepare('INSERT INTO activity_logs (user_id, action) VALUES (?, ?)').run(req.user.id, `Moved service to Recycle Bin: ${service.service_name}`);
    res.json({ message: 'Service moved to Recycle Bin' });
  } catch (err) {
    console.error('Error deleting service:', err);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// Service Form Schema
app.get('/api/services/:service_id/form-schema', optionalAuthenticateToken, (req, res) => {
  try {
    const service = db.prepare('SELECT service_form_schema FROM services WHERE id = ?').get(req.params.service_id) as any;
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service.service_form_schema ? JSON.parse(service.service_form_schema) : null);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch form schema' });
  }
});

app.post('/api/services/:service_id/form-schema', authenticateToken, requireRole(['admin']), (req, res) => {
  const { schema } = req.body;
  try {
    db.prepare('UPDATE services SET service_form_schema = ? WHERE id = ?').run(JSON.stringify(schema), req.params.service_id);
    res.json({ message: 'Form schema updated successfully' });
  } catch (err) {
    console.error('Update Form Schema Error:', err);
    res.status(500).json({ error: 'Failed to update form schema' });
  }
});

// Service Form Fields
app.get('/api/services/:service_id/form-fields', optionalAuthenticateToken, (req, res) => {
  try {
    const fields = db.prepare('SELECT * FROM service_form_fields WHERE service_id = ? ORDER BY field_order ASC').all(req.params.service_id);
    res.json(fields);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch form fields' });
  }
});

app.post('/api/services/:service_id/form-fields', authenticateToken, requireRole(['admin']), (req, res) => {
  const { fields } = req.body;
  const service_id = req.params.service_id;

  try {
    db.transaction(() => {
      db.prepare('DELETE FROM service_form_fields WHERE service_id = ?').run(service_id);
      const insert = db.prepare('INSERT INTO service_form_fields (service_id, label, type, required, placeholder, section_name, field_order, options) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      fields.forEach((f: any, index: number) => {
        insert.run(service_id, f.label, f.type, f.required ? 1 : 0, f.placeholder || '', f.section_name || 'Personal', f.field_order || index, f.options ? JSON.stringify(f.options) : null);
      });
    })();
    res.json({ message: 'Form fields updated successfully' });
  } catch (err) {
    console.error('Update Form Fields Error:', err);
    res.status(500).json({ error: 'Failed to update form fields' });
  }
});

// Service Document Requirements
app.get('/api/services/:service_id/document-requirements', optionalAuthenticateToken, (req, res) => {
  try {
    const requirements = db.prepare('SELECT * FROM service_document_requirements WHERE service_id = ?').all(req.params.service_id);
    res.json(requirements);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document requirements' });
  }
});

app.post('/api/services/:service_id/document-requirements', authenticateToken, requireRole(['admin']), (req, res) => {
  const { requirements } = req.body;
  const service_id = req.params.service_id;

  try {
    db.transaction(() => {
      db.prepare('DELETE FROM service_document_requirements WHERE service_id = ?').run(service_id);
      const insert = db.prepare('INSERT INTO service_document_requirements (service_id, document_name, document_type, required) VALUES (?, ?, ?, ?)');
      requirements.forEach((r: any) => {
        insert.run(service_id, r.document_name, r.document_type || 'file_upload', r.required ? 1 : 0);
      });
    })();
    res.json({ message: 'Document requirements updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update document requirements' });
  }
});

// Service Inputs
app.get('/api/service-inputs/:service_id', optionalAuthenticateToken, (req, res) => {
  const inputs = db.prepare('SELECT * FROM service_inputs WHERE service_id = ?').all(req.params.service_id);
  res.json(inputs);
});

app.post('/api/service-inputs', authenticateToken, requireRole(['admin']), (req, res) => {
  const { service_id, input_label, input_type, required } = req.body;
  const result = db.prepare('INSERT INTO service_inputs (service_id, input_label, input_type, required) VALUES (?, ?, ?, ?)').run(
    service_id, input_label, input_type, required ? 1 : 0
  );
  res.json({ id: result.lastInsertRowid, message: 'Input field added successfully' });
});

app.delete('/api/service-inputs/:input_id', authenticateToken, requireRole(['admin']), (req: any, res) => {
  try {
    const input = db.prepare('SELECT * FROM service_inputs WHERE input_id = ?').get(req.params.input_id) as any;
    if (!input) {
      return res.status(404).json({ error: 'Input field not found' });
    }
    
    db.prepare('DELETE FROM service_inputs WHERE input_id = ?').run(req.params.input_id);
    
    db.prepare('INSERT INTO activity_logs (user_id, action, timestamp) VALUES (?, ?, CURRENT_TIMESTAMP)')
      .run(req.user.id, `Admin deleted input field: ${input.input_label} for service_id: ${input.service_id}`);
      
    res.json({ success: true, message: 'Input field deleted successfully' });
  } catch (err) {
    console.error('Error deleting input field:', err);
    res.status(500).json({ error: 'Unable to delete input field. Please try again.' });
  }
});

// Service Links
app.get('/api/service-links', authenticateToken, requireRole(['admin', 'staff']), (req, res) => {
  const links = db.prepare('SELECT * FROM service_links').all();
  res.json(links);
});

app.put('/api/service-links/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const { service_type, process_url, apply_url, is_active } = req.body;
  db.prepare('UPDATE service_links SET service_type = ?, process_url = ?, apply_url = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    service_type, process_url, apply_url, is_active, req.params.id
  );
  res.json({ message: 'Service link updated' });
});

app.patch('/api/service-links/:id/status', authenticateToken, requireRole(['admin']), (req, res) => {
  const link = db.prepare('SELECT is_active FROM service_links WHERE id = ?').get(req.params.id) as any;
  if (!link) return res.status(404).json({ error: 'Link not found' });
  const newStatus = link.is_active ? 0 : 1;
  db.prepare('UPDATE service_links SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, req.params.id);
  res.json({ message: 'Link status toggled', is_active: newStatus });
});

// Ledger
app.get('/api/ledger', authenticateToken, requireRole(['admin', 'staff']), (req: any, res) => {
  let query = 'SELECT l.*, u.name as staff_name FROM ledger l LEFT JOIN users u ON l.staff_id = u.id';
  const params: any[] = [];
  
  if (req.user.role === 'staff') {
    query += ' WHERE l.staff_id = ?';
    params.push(req.user.id);
  }
  query += ' ORDER BY l.created_at DESC';
  
  const ledger = db.prepare(query).all(...params);
  res.json(ledger);
});

app.post('/api/ledger', authenticateToken, requireRole(['admin', 'staff']), (req: any, res) => {
  const { customer_name, service_name, amount, date } = req.body;
  const result = db.prepare('INSERT INTO ledger (customer_name, service_name, amount, staff_id, date) VALUES (?, ?, ?, ?, ?)').run(
    customer_name, service_name, amount, req.user.id, date || new Date().toISOString().split('T')[0]
  );
  res.json({ id: result.lastInsertRowid, message: 'Ledger entry added' });
});

// Analytics
app.get('/api/analytics', authenticateToken, requireRole(['admin']), (req, res) => {
  const totalRevenue = db.prepare('SELECT SUM(amount) as total FROM ledger').get() as any;
  const totalTransactions = db.prepare('SELECT COUNT(*) as count FROM ledger').get() as any;
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = \'user\'').get() as any;
  const totalStaff = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = \'staff\'').get() as any;
  
  const monthlyRevenue = db.prepare('SELECT strftime(\'%Y-%m\', date) as month, SUM(amount) as revenue FROM ledger GROUP BY month ORDER BY month DESC LIMIT 6').all();
  const topServices = db.prepare('SELECT service_name, COUNT(*) as count FROM ledger GROUP BY service_name ORDER BY count DESC LIMIT 5').all();

  // Application Analytics
  const totalApplications = db.prepare('SELECT COUNT(*) as count FROM applications').get() as any;
  const pendingApplications = db.prepare('SELECT COUNT(*) as count FROM applications WHERE status = \'Pending\'').get() as any;
  const approvedApplications = db.prepare('SELECT COUNT(*) as count FROM applications WHERE status = \'Approved\'').get() as any;
  const rejectedApplications = db.prepare('SELECT COUNT(*) as count FROM applications WHERE status = \'Rejected\'').get() as any;
  const serviceApplications = db.prepare('SELECT service_type, COUNT(*) as count FROM applications GROUP BY service_type').all();
  const staffPerformance = db.prepare('SELECT u.name, COUNT(a.id) as processed FROM applications a JOIN users u ON a.assigned_staff = u.id WHERE a.status != \'Pending\' GROUP BY u.id').all();

  const todayRevenue = db.prepare('SELECT SUM(amount) as total FROM ledger WHERE date = date(\'now\')').get() as any;
  const recentActivity = db.prepare('SELECT l.*, u.name as user_name, a.service_type FROM activity_logs l JOIN users u ON l.user_id = u.id LEFT JOIN applications a ON l.application_id = a.id ORDER BY l.timestamp DESC LIMIT 10').all();

  res.json({
    totalRevenue: totalRevenue.total || 0,
    todayRevenue: todayRevenue.total || 0,
    totalTransactions: totalTransactions.count || 0,
    totalUsers: totalUsers.count || 0,
    totalStaff: totalStaff.count || 0,
    monthlyRevenue,
    topServices,
    totalApplications: totalApplications.count || 0,
    pendingApplications: pendingApplications.count || 0,
    approvedApplications: approvedApplications.count || 0,
    rejectedApplications: rejectedApplications.count || 0,
    approvalRate: totalApplications.count > 0 ? Math.round((approvedApplications.count / totalApplications.count) * 100) : 0,
    serviceApplications,
    staffPerformance,
    recentActivity
  });
});

// File Uploads Setup
// Secure Document Access API
app.get('/api/admin/documents/:id', authenticateToken, requireRole(['admin', 'staff']), (req: any, res) => {
  try {
    const doc = db.prepare('SELECT file_path, file_name FROM application_documents WHERE id = ?').get(req.params.id) as any;
    if (!doc) {
      return res.status(404).send('Document not found');
    }
    
    const absolutePath = path.join(__dirname, doc.file_path);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).send('File not found on server');
    }
    
    // Log access
    db.prepare('INSERT INTO activity_logs (user_id, action, timestamp) VALUES (?, ?, CURRENT_TIMESTAMP)')
      .run(req.user.id, `Accessed document: ${doc.file_name}`);
      
    res.sendFile(absolutePath);
  } catch (err) {
    console.error('Error serving document:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Helper to generate Reference Number
const generateReferenceNumber = () => {
  const year = new Date().getFullYear();
  const count = db.prepare('SELECT COUNT(*) as total FROM applications').get() as any;
  const nextId = (count?.total || 0) + 1;
  return `APP-${year}-${String(nextId).padStart(5, '0')}`;
};

// Helper to get enriched application
const getEnrichedApplication = (applicationId: number | bigint) => {
  const application = db.prepare(`
    SELECT a.*, u.name as user_name, u.email as user_email, u.phone as user_phone, 
           s.name as staff_name, serv.service_name 
    FROM applications a 
    JOIN users u ON a.user_id = u.id 
    LEFT JOIN users s ON a.assigned_staff = s.id 
    LEFT JOIN services serv ON a.service_id = serv.id
    WHERE a.id = ?
  `).get(applicationId) as any;
  
  if (!application) return null;
  
  const documents = db.prepare('SELECT * FROM application_documents WHERE application_id = ?').all(application.id);
  const updates = db.prepare('SELECT au.*, u.name as updated_by_name FROM application_updates au JOIN users u ON au.updated_by = u.id WHERE application_id = ? ORDER BY au.updated_at DESC').all(application.id);

  let formData = {};
  try {
    if (application.form_data && application.form_data !== 'undefined' && application.form_data !== 'null') {
      formData = JSON.parse(application.form_data) || {};
    }
  } catch (e) {
    console.error('Error parsing form_data:', e);
  }

  return {
    ...application,
    form_data: formData,
    documents,
    updates
  };
};

// Admin Dashboard Stats
app.get('/api/admin/dashboard-stats', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user' AND deleted_at IS NULL").get() as any;
    const totalStaff = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'staff' AND deleted_at IS NULL").get() as any;
    const totalApplications = db.prepare("SELECT COUNT(*) as count FROM applications WHERE deleted_at IS NULL").get() as any;
    const pendingApplications = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status IN ('Submitted', 'Under Review', 'Processing', 'Documents Required') AND deleted_at IS NULL").get() as any;
    const approvedApplications = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status IN ('Approved', 'Completed') AND deleted_at IS NULL").get() as any;
    const rejectedApplications = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'Rejected' AND deleted_at IS NULL").get() as any;
    
    // Revenue from ledger
    const ledgerRevenue = db.prepare("SELECT SUM(amount) as total FROM ledger").get() as any;
    
    // Revenue from service payments (wallet + gateway)
    const serviceRevenue = db.prepare("SELECT SUM(amount) as total FROM service_payments WHERE status = 'success'").get() as any;

    const totalRevenue = (ledgerRevenue?.total || 0) + (serviceRevenue?.total || 0);

    // Applications by Status
    const appsByStatus = db.prepare('SELECT status as name, COUNT(*) as value FROM applications WHERE deleted_at IS NULL GROUP BY status').all();

    // Daily Applications (last 7 days)
    const dailyApps = db.prepare(`
      SELECT date(created_at) as date, COUNT(*) as count 
      FROM applications 
      WHERE created_at >= date('now', '-7 days') AND deleted_at IS NULL 
      GROUP BY date(created_at) 
      ORDER BY date(created_at) ASC
    `).all();

    // Recent Applications
    const recentApplications = db.prepare(`
      SELECT a.id, a.reference_number, a.service_type as service_name, a.status, a.created_at, u.name as user_name
      FROM applications a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.deleted_at IS NULL
      ORDER BY a.created_at DESC
      LIMIT 5
    `).all();

    // Service Usage (Top 5)
    const topServices = db.prepare(`
      SELECT service_type as name, COUNT(*) as value 
      FROM applications 
      WHERE deleted_at IS NULL 
      GROUP BY service_type 
      ORDER BY value DESC 
      LIMIT 5
    `).all();

    // Staff Performance
    const staffPerformance = db.prepare(`
      SELECT 
        u.name as staff_name,
        COUNT(a.id) as assigned,
        SUM(CASE WHEN a.status IN ('Approved', 'Completed', 'Rejected') THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN a.status NOT IN ('Approved', 'Completed', 'Rejected') THEN 1 ELSE 0 END) as pending
      FROM users u
      LEFT JOIN applications a ON u.id = a.assigned_staff AND a.deleted_at IS NULL
      WHERE u.role = 'staff' AND u.deleted_at IS NULL
      GROUP BY u.id
    `).all();

    // Admin Activity Logs
    const adminLogs = db.prepare(`
      SELECT al.action, al.timestamp, u.name as admin_name
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      WHERE u.role = 'admin'
      ORDER BY al.timestamp DESC
      LIMIT 10
    `).all();

    // System Notifications
    const systemNotifications = db.prepare(`
      SELECT id, message, created_at, is_read
      FROM notifications
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    res.json({
      overview: {
        totalUsers: totalUsers.count,
        totalStaff: totalStaff.count,
        totalApplications: totalApplications.count,
        pendingApplications: pendingApplications.count,
        approvedApplications: approvedApplications.count,
        rejectedApplications: rejectedApplications.count,
        serviceRevenue: serviceRevenue?.total || 0,
        totalRevenue: totalRevenue
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
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(service_id) as any;
  
  if (!service) return res.status(404).json({ error: 'Service not found' });
  if (!service.payment_required) return res.status(400).json({ error: 'Payment not required for this service' });

  const amount = Math.round(service.service_price * 100); // in paise
  
  try {
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `receipt_service_${service_id}_${req.user.id}_${Date.now()}`
    });
    
    // Create a pending payment record
    db.prepare('INSERT INTO service_payments (user_id, service_id, amount, razorpay_order_id, status) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, service_id, service.service_price, order.id, 'pending');
      
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

  if (generated_signature === razorpay_signature) {
    db.prepare('UPDATE service_payments SET razorpay_payment_id = ?, razorpay_signature = ?, status = ?, payment_mode = ? WHERE razorpay_order_id = ?')
      .run(razorpay_payment_id, razorpay_signature, 'success', 'gateway', razorpay_order_id);
      
    const payment = db.prepare('SELECT id FROM service_payments WHERE razorpay_order_id = ?').get(razorpay_order_id) as any;
    res.json({ success: true, payment_id: payment?.id, message: 'Payment verified successfully' });
  } else {
    db.prepare('UPDATE service_payments SET status = ? WHERE razorpay_order_id = ?')
      .run('failed', razorpay_order_id);
    res.status(400).json({ error: 'Invalid payment signature' });
  }
});

app.post('/api/payments/wallet-pay', authenticateToken, (req: any, res) => {
  const { serviceId, service_id } = req.body;
  const sId = serviceId || service_id;
  const userId = req.user.id;

  try {
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(sId) as any;
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (!service.payment_required) {
      return res.status(400).json({ error: 'Payment not required for this service' });
    }

    const price = service.service_price || 0;
    
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId) as any;
    if (!wallet || wallet.balance < price) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    let paymentId: number | bigint = 0;
    db.transaction(() => {
      // Deduct from wallet
      db.prepare('UPDATE wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
        .run(price, userId);
      
      // Record wallet transaction
      db.prepare('INSERT INTO wallet_transactions (user_id, type, amount, description, status) VALUES (?, ?, ?, ?, ?)')
        .run(userId, 'debit', price, `Service Payment - ${service.service_name}`, 'success');

      // Record service payment
      const result = db.prepare(`
        INSERT INTO service_payments (user_id, service_id, amount, status, payment_mode) 
        VALUES (?, ?, ?, 'success', 'wallet')
      `).run(userId, sId, price);
      
      paymentId = result.lastInsertRowid;
    })();

    res.json({ success: true, payment_id: Number(paymentId), message: 'Payment successful via Wallet' });
  } catch (err) {
    console.error('Wallet Payment Error:', err);
    res.status(500).json({ error: 'Failed to process wallet payment' });
  }
});

app.get('/api/payments/status/:serviceId', authenticateToken, (req: any, res) => {
  const { serviceId } = req.params;
  // Check if user has a successful payment for this service that hasn't been used for an application yet
  const payment = db.prepare(`
    SELECT * FROM service_payments 
    WHERE user_id = ? AND service_id = ? AND status = 'success'
    AND id NOT IN (SELECT payment_id FROM applications WHERE payment_id IS NOT NULL)
    ORDER BY created_at DESC LIMIT 1
  `).get(req.user.id, serviceId) as any;
  
  res.json({ paid: !!payment, payment_id: payment ? payment.id : null });
});

app.get('/api/admin/payments', authenticateToken, requireRole(['admin']), (req, res) => {
  const payments = db.prepare(`
    SELECT sp.*, u.name as user_name, u.email as user_email, s.service_name 
    FROM service_payments sp
    JOIN users u ON sp.user_id = u.id
    JOIN services s ON sp.service_id = s.id
    ORDER BY sp.created_at DESC
  `).all();
  res.json(payments);
});

app.get('/api/admin/revenue', authenticateToken, requireRole(['admin']), (req, res) => {
  const stats = db.prepare(`
    SELECT 
      SUM(amount) as total_revenue,
      COUNT(*) as total_payments
    FROM service_payments 
    WHERE status = 'success'
  `).get() as any;
  
  const byService = db.prepare(`
    SELECT s.service_name, SUM(sp.amount) as revenue, COUNT(*) as count
    FROM service_payments sp
    JOIN services s ON sp.service_id = s.id
    WHERE sp.status = 'success'
    GROUP BY s.id
  `).all();
  
  res.json({ ...stats, byService });
});

// Applications
app.post('/api/applications', authenticateToken, upload.array('documents', 20), async (req: any, res) => {
  try {
    const { service_type, form_data, payment_id } = req.body;
    const reference_number = generateReferenceNumber();
    
    // Check for service
    const service = db.prepare('SELECT id, service_name, fee, payment_required, service_price FROM services WHERE service_name = ? OR id = ?').get(service_type, service_type) as any;
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Check payment requirement for users
    if (service.payment_required && req.user.role === 'user') {
      if (!payment_id) {
        return res.status(400).json({ error: 'Payment is required for this service' });
      }
      
      const payment = db.prepare('SELECT * FROM service_payments WHERE id = ? AND user_id = ? AND service_id = ? AND status = ?').get(payment_id, req.user.id, service.id, 'success') as any;
      
      if (!payment) {
        return res.status(400).json({ error: 'Invalid or unsuccessful payment' });
      }
      
      const existingApp = db.prepare('SELECT id FROM applications WHERE payment_id = ?').get(payment_id);
      if (existingApp) {
        return res.status(400).json({ error: 'This payment has already been used for an application' });
      }
    }

    // Check for service fee (wallet deduction for staff/admin or additional fee)
    if (service.fee > 0 && (req.user.role === 'staff' || req.user.role === 'admin')) {
      const wallet = db.prepare('SELECT balance FROM wallets WHERE user_id = ?').get(req.user.id) as any;
      if (!wallet || wallet.balance < service.fee) {
        return res.status(400).json({ error: 'Insufficient wallet balance. Please add money to your wallet.' });
      }
    }

    let userId = req.user.id;
    let createdBy = req.user.role;

    // If staff/admin is applying for a customer
    if ((req.user.role === 'staff' || req.user.role === 'admin') && form_data) {
      try {
        const parsedData = JSON.parse(form_data);
        const customerEmail = parsedData.customerEmail || parsedData.email;
        const customerPhone = parsedData.customerPhone || parsedData.mobile || parsedData.phone;

        if (customerEmail || customerPhone) {
          const customer = db.prepare('SELECT id FROM users WHERE email = ? OR phone = ?').get(customerEmail, customerPhone) as any;
          if (customer) {
            userId = customer.id;
          }
        }
      } catch (e) {
        console.error('Error parsing form_data for customer lookup:', e);
      }
    }

    db.transaction(() => {
      const payment = payment_id ? db.prepare('SELECT payment_mode FROM service_payments WHERE id = ?').get(payment_id) as any : null;
      const payment_mode = payment ? payment.payment_mode : 'none';

      const result = db.prepare('INSERT INTO applications (reference_number, user_id, service_type, service_id, form_data, status, payment_status, created_by, assigned_staff, payment_id, payment_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        reference_number, userId, service.service_name, service.id, form_data, 'Submitted', (payment_id ? 'Paid' : 'Pending'), createdBy, (req.user.role === 'staff' ? req.user.id : null), payment_id || null, payment_mode
      );
      const applicationId = result.lastInsertRowid;

      // Deduct from wallet if fee exists (for staff/admin)
      if (service.fee > 0 && (req.user.role === 'staff' || req.user.role === 'admin')) {
        db.prepare('UPDATE wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
          .run(service.fee, req.user.id);
        
        db.prepare('INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status) VALUES (?, ?, ?, ?, ?, ?)')
          .run(req.user.id, 'debit', service.fee, `Payment for service: ${service.service_name}`, applicationId, 'success');
      }

      const files = req.files as Express.Multer.File[];
      if (files) {
        const insertDoc = db.prepare('INSERT INTO application_documents (application_id, file_path, file_name, uploaded_by) VALUES (?, ?, ?, ?)');
        files.forEach(f => {
          insertDoc.run(applicationId, f.path, f.originalname, req.user.id);
        });
      }

      // Initial update
      db.prepare('INSERT INTO application_updates (application_id, status, comment, updated_by) VALUES (?, ?, ?, ?)').run(
        applicationId, 'Submitted', 'Application submitted successfully.', req.user.id
      );

      db.prepare('INSERT INTO activity_logs (user_id, action, application_id) VALUES (?, ?, ?)').run(
        req.user.id, `Submitted new ${service.service_name} application (${reference_number})`, applicationId
      );

      const enrichedApp = getEnrichedApplication(applicationId);
      res.json(enrichedApp);
    })();
  } catch (err: any) {
    console.error('Submission error:', err);
    res.status(400).json({ error: err.message || 'Failed to submit application' });
  }
});

app.post('/api/applications/finalize', authenticateToken, async (req: any, res) => {
  const { draft_id, payment_id } = req.body;
  const userId = req.user.id;

  try {
    const draft = db.prepare('SELECT * FROM application_drafts WHERE id = ? AND user_id = ?').get(draft_id, userId) as any;
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(draft.service_id) as any;
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Verify payment
    const payment = db.prepare('SELECT * FROM service_payments WHERE id = ? AND user_id = ? AND service_id = ? AND status = ?').get(payment_id, userId, draft.service_id, 'success') as any;
    if (!payment) {
      return res.status(400).json({ error: 'Invalid or unsuccessful payment' });
    }

    const reference_number = generateReferenceNumber();
    
    let applicationId: number | bigint = 0;
    db.transaction(() => {
      // 1. Create application
      const result = db.prepare('INSERT INTO applications (reference_number, user_id, service_type, service_id, form_data, status, payment_status, created_by, payment_id, payment_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        reference_number, userId, service.service_name, service.id, draft.form_data, 'Submitted', 'Paid', 'user', payment_id, payment.payment_mode
      );
      applicationId = result.lastInsertRowid;

      // 2. Move documents from draft to application_documents
      const draftDocs = JSON.parse(draft.documents || '[]');
      draftDocs.forEach((doc: any) => {
        db.prepare('INSERT INTO application_documents (application_id, document_type, file_name, file_path, uploaded_by) VALUES (?, ?, ?, ?, ?)').run(
          applicationId, doc.type || 'Document', doc.originalname || 'Document', doc.path, userId
        );
      });

      // 3. Delete draft
      db.prepare('DELETE FROM application_drafts WHERE id = ?').run(draft_id);

      // 4. Initial update
      db.prepare('INSERT INTO application_updates (application_id, status, comment, updated_by) VALUES (?, ?, ?, ?)').run(
        applicationId, 'Submitted', 'Application submitted successfully from draft.', userId
      );

      // 5. Activity log
      db.prepare('INSERT INTO activity_logs (user_id, action, application_id) VALUES (?, ?, ?)').run(
        userId, `Finalized ${service.service_name} application (${reference_number})`, applicationId
      );
    })();

    const enrichedApp = getEnrichedApplication(applicationId);
    res.json(enrichedApp);
  } catch (err) {
    console.error('Finalization Error:', err);
    res.status(500).json({ error: 'Failed to finalize application' });
  }
});

app.get('/api/applications', authenticateToken, (req: any, res) => {
  const { service_id, user_name, mobile, reference_number, status, payment_status, start_date, end_date, search } = req.query;

  let query = `
    SELECT a.*, u.name as user_name, u.email as user_email, u.phone as user_phone, 
           s.name as staff_name, s_orig.payment_required, s_orig.service_name
    FROM applications a 
    JOIN users u ON a.user_id = u.id 
    LEFT JOIN users s ON a.assigned_staff = s.id 
    LEFT JOIN services s_orig ON a.service_id = s_orig.id 
    WHERE a.deleted_at IS NULL
  `;
  const params: any[] = [];
  
  if (req.user.role === 'user') {
    query += ' AND a.user_id = ?';
    params.push(req.user.id);
  } else if (req.user.role === 'staff') {
    // Staff can only see paid applications if service requires payment
    query += ' AND (a.assigned_staff = ? OR a.assigned_staff IS NULL) AND (s_orig.payment_required = 0 OR a.payment_id IS NOT NULL)';
    params.push(req.user.id);
  } else if (req.user.role === 'admin') {
    // Admin can only see paid applications if service requires payment
    query += ' AND (s_orig.payment_required = 0 OR a.payment_id IS NOT NULL)';
  }

  if (service_id) {
    query += ' AND a.service_id = ?';
    params.push(service_id);
  }
  if (user_name) {
    query += ' AND u.name LIKE ?';
    params.push(`%${user_name}%`);
  }
  if (mobile) {
    query += ' AND u.phone LIKE ?';
    params.push(`%${mobile}%`);
  }
  if (reference_number) {
    query += ' AND a.reference_number LIKE ?';
    params.push(`%${reference_number}%`);
  }
  if (status) {
    query += ' AND a.status = ?';
    params.push(status);
  }
  if (payment_status) {
    query += ' AND a.payment_status = ?';
    params.push(payment_status);
  }
  if (start_date) {
    query += ' AND a.created_at >= ?';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND a.created_at <= ?';
    params.push(end_date);
  }
  if (search) {
    query += ' AND (a.reference_number LIKE ? OR u.name LIKE ? OR u.phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY a.created_at DESC';
  
  try {
    const applications = db.prepare(query).all(...params);
    
    // Enrich with documents and updates
    const enrichedApps = applications.map((app: any) => {
      const documents = db.prepare('SELECT * FROM application_documents WHERE application_id = ?').all(app.id);
      const updates = db.prepare('SELECT au.*, u.name as updated_by_name FROM application_updates au JOIN users u ON au.updated_by = u.id WHERE application_id = ? ORDER BY au.updated_at DESC').all(app.id);
      
      let formData = {};
      try {
        if (app.form_data && app.form_data !== 'undefined') {
          formData = JSON.parse(app.form_data);
        }
      } catch (e) {
        console.error('Error parsing form_data:', e);
      }
      
      return {
        ...app,
        form_data: formData,
        documents,
        updates
      };
    });
    
    res.json(enrichedApps);
  } catch (err) {
    console.error('Fetch Applications Error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

app.get('/api/applications/:id', authenticateToken, (req: any, res) => {
  const application = db.prepare('SELECT a.*, u.name as user_name, u.email as user_email, s.name as staff_name FROM applications a JOIN users u ON a.user_id = u.id LEFT JOIN users s ON a.assigned_staff = s.id WHERE a.id = ?').get(req.params.id) as any;
  
  if (!application) return res.status(404).json({ error: 'Application not found' });
  
  // Check permission
  if (req.user.role === 'user' && application.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const documents = db.prepare('SELECT * FROM application_documents WHERE application_id = ?').all(application.id);
  const updates = db.prepare('SELECT au.*, u.name as updated_by_name FROM application_updates au JOIN users u ON au.updated_by = u.id WHERE application_id = ? ORDER BY au.updated_at DESC').all(application.id);

  let formData = {};
  try {
    if (application.form_data && application.form_data !== 'undefined') {
      formData = JSON.parse(application.form_data);
    }
  } catch (e) {
    console.error('Error parsing form_data:', e);
  }

  res.json({
    ...application,
    form_data: formData,
    documents,
    updates
  });
});

app.get('/api/applications/track/:ref', (req, res) => {
  const ref = req.params.ref;
  const application = db.prepare('SELECT a.*, s.name as staff_name FROM applications a LEFT JOIN users s ON a.assigned_staff = s.id WHERE a.reference_number = ? OR (SELECT phone FROM users WHERE id = a.user_id) = ?').get(ref, ref) as any;
  
  if (!application) return res.status(404).json({ error: 'Application not found' });
  
  const documents = db.prepare('SELECT * FROM application_documents WHERE application_id = ?').all(application.id);
  const updates = db.prepare('SELECT au.*, u.name as updated_by_name FROM application_updates au JOIN users u ON au.updated_by = u.id WHERE application_id = ? ORDER BY au.updated_at ASC').all(application.id);

  res.json({
    ...application,
    documents,
    updates
  });
});

app.patch('/api/applications/:id/assign', authenticateToken, requireRole(['admin']), (req: any, res) => {
  const { staff_id } = req.body;
  const applicationId = req.params.id;

  try {
    db.prepare('UPDATE applications SET assigned_staff = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      staff_id || null, applicationId
    );

    // Add to timeline
    const staffName = staff_id ? (db.prepare('SELECT name FROM users WHERE id = ?').get(staff_id) as any)?.name : 'Unassigned';
    db.prepare('INSERT INTO application_updates (application_id, status, comment, updated_by) VALUES (?, ?, ?, ?)').run(
      applicationId, 
      'Staff Assigned', 
      `Application assigned to ${staffName || 'Unknown'}`, 
      req.user.id
    );

    res.json({ message: 'Staff assigned successfully' });
  } catch (err) {
    console.error('Assign Staff Error:', err);
    res.status(500).json({ error: 'Failed to assign staff' });
  }
});

app.patch('/api/applications/:id/status', authenticateToken, requireRole(['admin', 'staff']), upload.array('documents', 20), (req: any, res) => {
  const { status, comment } = req.body;
  const applicationId = req.params.id;

  db.prepare('UPDATE applications SET status = ?, assigned_staff = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    status, req.user.id, applicationId
  );

  // Add to timeline
  db.prepare('INSERT INTO application_updates (application_id, status, comment, updated_by) VALUES (?, ?, ?, ?)').run(
    applicationId, status, comment || `Status updated to ${status}`, req.user.id
  );

  // Handle new documents from staff/admin
  const files = req.files as Express.Multer.File[];
  if (files) {
    const app = db.prepare('SELECT service_type, user_id FROM applications WHERE id = ?').get(applicationId) as any;
    const insertDoc = db.prepare('INSERT INTO application_documents (application_id, file_path, file_name, uploaded_by) VALUES (?, ?, ?, ?)');
    files.forEach(f => {
      const filePath = `/uploads/${app.service_type}/${app.user_id}/${f.filename}`;
      insertDoc.run(applicationId, filePath, f.originalname, req.user.id);
    });
  }

  // Notify User
  const appData = db.prepare('SELECT user_id, reference_number FROM applications WHERE id = ?').get(applicationId) as any;
  db.prepare('INSERT INTO notifications (user_id, message) VALUES (?, ?)').run(
    appData.user_id, `Your application ${appData.reference_number} status updated to ${status}.`
  );

  db.prepare('INSERT INTO activity_logs (user_id, action, application_id) VALUES (?, ?, ?)').run(
    req.user.id, `Updated status to ${status} for ${appData.reference_number}`, applicationId
  );

  // Credit commission to staff if status is 'Completed'
  if (status === 'Completed' && req.user.role === 'staff') {
    // Check if commission already credited
    const existingTx = db.prepare('SELECT id FROM wallet_transactions WHERE user_id = ? AND reference_id = ? AND type = ?').get(req.user.id, applicationId, 'credit');
    
    if (!existingTx) {
      const app = db.prepare('SELECT service_type FROM applications WHERE id = ?').get(applicationId) as any;
      const service = db.prepare('SELECT staff_commission FROM services WHERE service_name = ?').get(app.service_type) as any;
      
      if (service && service.staff_commission > 0) {
        db.transaction(() => {
          db.prepare('UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
            .run(service.staff_commission, req.user.id);
          
          db.prepare('INSERT INTO wallet_transactions (user_id, type, amount, description, reference_id, status) VALUES (?, ?, ?, ?, ?, ?)')
            .run(req.user.id, 'credit', service.staff_commission, `Commission for processing application: ${appData.reference_number}`, applicationId, 'success');
        })();
      }
    }
  }

  res.json({ message: 'Status updated and user notified' });
});

// Notifications
app.get('/api/notifications', authenticateToken, (req: any, res) => {
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(req.user.id);
  res.json(notifications);
});

app.patch('/api/notifications/:id/read', authenticateToken, (req: any, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Notification marked as read' });
});

// Activity Logs
app.get('/api/activity-logs', authenticateToken, requireRole(['admin']), (req, res) => {
  const logs = db.prepare('SELECT l.*, u.name as user_name, a.service_type FROM activity_logs l JOIN users u ON l.user_id = u.id LEFT JOIN applications a ON l.application_id = a.id ORDER BY l.timestamp DESC LIMIT 50').all();
  res.json(logs);
});

// Service Links
app.get('/api/service-links', authenticateToken, requireRole(['admin', 'staff']), (req, res) => {
  const links = db.prepare('SELECT * FROM service_links WHERE is_active = 1').all();
  res.json(links);
});

// Support Tickets
app.post('/api/support', authenticateToken, (req: any, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required' });
  }
  const result = db.prepare('INSERT INTO support_tickets (user_id, subject, message) VALUES (?, ?, ?)').run(
    req.user.id, subject, message
  );
  res.json({ id: result.lastInsertRowid, message: 'Support ticket submitted successfully' });
});

app.get('/api/support', authenticateToken, (req: any, res) => {
  let query = 'SELECT s.*, u.name as user_name, u.email as user_email FROM support_tickets s JOIN users u ON s.user_id = u.id';
  const params: any[] = [];
  
  if (req.user.role === 'user') {
    query += ' WHERE s.user_id = ?';
    params.push(req.user.id);
  }
  query += ' ORDER BY s.created_at DESC';
  
  const tickets = db.prepare(query).all(...params);
  res.json(tickets);
});

app.put('/api/support/:id/status', authenticateToken, requireRole(['admin', 'staff']), (req: any, res) => {
  const { status } = req.body;
  db.prepare('UPDATE support_tickets SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: 'Status updated' });
});

// Recycle Bin Routes
app.get('/api/recycle-bin', authenticateToken, requireRole(['admin']), (req, res) => {
  const services = db.prepare("SELECT id, service_name as name, 'service' as type, deleted_at FROM services WHERE deleted_at IS NOT NULL").all();
  const users = db.prepare("SELECT id, name, 'user' as type, deleted_at FROM users WHERE deleted_at IS NOT NULL").all();
  const applications = db.prepare("SELECT id, reference_number as name, 'application' as type, deleted_at FROM applications WHERE deleted_at IS NOT NULL").all();
  
  res.json([...services, ...users, ...applications]);
});

app.post('/api/recycle-bin/restore', authenticateToken, requireRole(['admin']), (req, res) => {
  const { id, type } = req.body;
  let table = '';
  if (type === 'service') table = 'services';
  else if (type === 'user') table = 'users';
  else if (type === 'application') table = 'applications';
  
  if (!table) return res.status(400).json({ error: 'Invalid type' });
  
  db.prepare(`UPDATE ${table} SET deleted_at = NULL WHERE id = ?`).run(id);
  res.json({ success: true, message: 'Item restored successfully' });
});

app.delete('/api/recycle-bin/permanent/:type/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const { id, type } = req.params;
  let table = '';
  if (type === 'service') table = 'services';
  else if (type === 'user') table = 'users';
  else if (type === 'application') table = 'applications';
  
  if (!table) return res.status(400).json({ error: 'Invalid type' });
  
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  res.json({ success: true, message: 'Item permanently deleted' });
});

// Portal Config Update
app.put('/api/portal-config', authenticateToken, requireRole(['admin']), (req, res) => {
  const configData = JSON.stringify(req.body);
  db.prepare('UPDATE portal_config SET config_data = ? WHERE id = 1').run(configData);
  res.json({ success: true, message: 'Configuration updated successfully' });
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
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
