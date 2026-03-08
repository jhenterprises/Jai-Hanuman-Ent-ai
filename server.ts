import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-jai-hanuman';

// Middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
`);

// --- Database Migrations (Add missing columns to existing tables) ---
const migrate = () => {
  const migrations = [
    { table: 'applications', column: 'reference_number', type: 'TEXT UNIQUE' },
    { table: 'applications', column: 'assigned_staff', type: 'INTEGER' },
    { table: 'applications', column: 'created_by', type: 'TEXT DEFAULT "user"' },
    { table: 'users', column: 'phone', type: 'TEXT' },
    { table: 'application_documents', column: 'file_name', type: 'TEXT' },
    { table: 'services', column: 'is_active', type: 'BOOLEAN DEFAULT 1' },
    { table: 'services', column: 'application_type', type: 'TEXT DEFAULT "internal"' },
    { table: 'services', column: 'icon', type: 'TEXT' },
    { table: 'services', column: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { table: 'service_links', column: 'is_active', type: 'BOOLEAN DEFAULT 1' }
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
      insert.run(u.name, u.email, u.phone, hashedPassword, u.role);
    }
  });
};
seedUsers();

// Seed Initial Services
const seedServices = () => {
  db.prepare('DELETE FROM services').run();
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

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
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
    res.json({ id: result.lastInsertRowid, message: 'User registered successfully' });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Database error' });
    }
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

app.delete('/api/users/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deleted' });
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
app.get('/api/services', authenticateToken, (req: any, res) => {
  let query = 'SELECT id as service_id, service_name, application_type as type, service_url as url, is_active as active_status, is_visible as visible_status, description, icon, created_at FROM services';
  
  if (req.user.role === 'user') {
    // Users should not see url
    query = 'SELECT id as service_id, service_name, application_type as type, is_active as active_status, is_visible as visible_status, description, icon, created_at FROM services WHERE is_active = 1 AND is_visible = 1';
  } else if (req.user.role === 'staff') {
    // Staff can see all active services including url
    query = 'SELECT id as service_id, service_name, application_type as type, service_url as url, is_active as active_status, is_visible as visible_status, description, icon, created_at FROM services WHERE is_active = 1';
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
  const { service_name, description, active_status, visible_status, type, url, icon } = req.body;
  const result = db.prepare('INSERT INTO services (service_name, description, is_active, is_visible, application_type, service_url, icon) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    service_name, description, active_status ?? 1, visible_status ?? 1, type || 'internal', url || '', icon || ''
  );
  res.json({ id: result.lastInsertRowid, message: 'Service added' });
});

app.put('/api/services/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const { service_name, description, active_status, visible_status, type, url, icon } = req.body;
  db.prepare('UPDATE services SET service_name = ?, description = ?, is_active = ?, is_visible = ?, application_type = ?, service_url = ?, icon = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    service_name, description, active_status, visible_status, type, url, icon, req.params.id
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

  const applications = db.prepare('SELECT COUNT(*) as count FROM applications WHERE service_type = ?').get(service.service_name) as any;
  if (applications.count > 0) {
    return res.status(400).json({ error: "This service cannot be deleted because applications already exist. You can deactivate it instead." });
  }

  db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
  
  db.prepare('INSERT INTO service_logs (staff_id, service_id, action) VALUES (?, ?, ?)')
    .run(req.user.id, req.params.id, 'service_deleted');

  res.json({ message: 'Service deleted successfully' });
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
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
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

// Helper to generate Reference Number
const generateReferenceNumber = () => {
  const date = new Date();
  const yyyymmdd = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000); // 4 digit random
  return `JHDSK-${yyyymmdd}-${random}`;
};

// Applications
app.post('/api/applications', authenticateToken, upload.array('documents', 5), (req: any, res) => {
  try {
    const { service_type, form_data } = req.body;
    const reference_number = generateReferenceNumber();
    
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
    
    const result = db.prepare('INSERT INTO applications (reference_number, user_id, service_type, form_data, status, created_by, assigned_staff) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      reference_number, userId, service_type, form_data, 'Submitted', createdBy, (req.user.role === 'staff' ? req.user.id : null)
    );
    const applicationId = result.lastInsertRowid;

    const files = req.files as Express.Multer.File[];
    if (files) {
      const insertDoc = db.prepare('INSERT INTO application_documents (application_id, file_path, file_name, uploaded_by) VALUES (?, ?, ?, ?)');
      files.forEach(f => {
        const filePath = `/uploads/${service_type}/${req.user.id}/${f.filename}`;
        insertDoc.run(applicationId, filePath, f.originalname, req.user.id);
      });
    }

    // Initial update
    db.prepare('INSERT INTO application_updates (application_id, status, comment, updated_by) VALUES (?, ?, ?, ?)').run(
      applicationId, 'Submitted', 'Application submitted successfully.', req.user.id
    );

    db.prepare('INSERT INTO activity_logs (user_id, action, application_id) VALUES (?, ?, ?)').run(
      req.user.id, `Submitted new ${service_type} application (${reference_number})`, applicationId
    );

    res.json({ id: applicationId, reference_number, message: 'Application submitted successfully' });
  } catch (error: any) {
    console.error('Submission error:', error);
    res.status(400).json({ error: error.message || 'Failed to submit application' });
  }
});

app.get('/api/applications', authenticateToken, (req: any, res) => {
  let query = 'SELECT a.*, u.name as user_name, u.email as user_email, s.name as staff_name FROM applications a JOIN users u ON a.user_id = u.id LEFT JOIN users s ON a.assigned_staff = s.id';
  const params: any[] = [];
  
  if (req.user.role === 'user') {
    query += ' WHERE a.user_id = ?';
    params.push(req.user.id);
  } else if (req.user.role === 'staff') {
    query += ' WHERE a.assigned_staff = ? OR a.assigned_staff IS NULL';
    params.push(req.user.id);
  }
  query += ' ORDER BY a.created_at DESC';
  
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

app.patch('/api/applications/:id/status', authenticateToken, requireRole(['admin', 'staff']), upload.array('documents', 5), (req: any, res) => {
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
