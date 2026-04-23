const express = require('express');
const { Pool } = require('pg');
const admin = require('firebase-admin');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

// Global SSL Bypass for Aiven/Render connectivity
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// --- PostgreSQL Connection (Aiven) ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Aiven/Render cross-service security
  }
});

// --- HEAVY-DUTY DATABASE INITIALIZER ---
// Move this here so 'pool' is defined before it runs!
(async () => {
  console.log("🛠️  INITIATING DATABASE FORCE-BUILD...");
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          content TEXT,
          image_url TEXT,
          category VARCHAR(50) CHECK (category IN ('info', 'todo', 'account', 'business', 'student', 'personal', 'other')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Auto-migrate: Add columns if they are missing from an older schema version
    try { await pool.query('ALTER TABLE notes ADD COLUMN description TEXT;'); } catch (e) { /* Ignore if exists */ }
    try { await pool.query('ALTER TABLE notes ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;'); } catch (e) { /* Ignore if exists */ }
    try { await pool.query('ALTER TABLE notes ADD COLUMN category VARCHAR(50) DEFAULT \'info\';'); } catch (e) { /* Ignore if exists */ }
    try { await pool.query('ALTER TABLE notes ADD COLUMN image_url TEXT;'); } catch (e) { /* Ignore if exists */ }
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS note_collaborators (
          note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
          user_email VARCHAR(255) NOT NULL,
          PRIMARY KEY (note_id, user_email)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          user_name VARCHAR(255),
          message TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("✨ DATABASE IS ARMED AND READY!");
  } catch (err) {
    console.error("❌ DATABASE INITIALIZER FAILED:", err.message);
  }
})();

const app = express();
const port = process.env.PORT || 3010; // Standard professional port

// --- Pre-flight Checks (Professional Security) ---
if (!process.env.DATABASE_URL) {
    console.warn('⚠️ WARNING: DATABASE_URL is not set. Database operations will fail.');
}

let serviceAccount;
try {
    serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
        ? JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString())
        : require('./serviceAccountKey.json');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized successfully.');
} catch (error) {
    console.error('❌ CRITICAL ERROR: Firebase Service Account missing or invalid.');
    console.error('Ensure FIREBASE_SERVICE_ACCOUNT environment variable is set in Render.');
}

// --- Middleware ---
app.use(cors({
  origin: '*', // Allows all for maximum accessibility, but explicit headers are added below
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// --- Authentication Middleware (Professional Security) ---
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// --- API Endpoints ---

// 0. Wipe All Data (Elite Account Management)
app.delete('/api/notes/wipe', authenticateUser, async (req, res) => {
    try {
        await pool.query('DELETE FROM notes WHERE user_id = $1', [req.user.uid]);
        res.json({ message: 'All notes wiped successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to wipe notes' });
    }
});

// 1. Get all notes for the authenticated user (including shared ones)
app.get('/api/notes', authenticateUser, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const result = await pool.query(
      `SELECT n.*, (n.user_id = $1) as is_owner 
       FROM notes n
       LEFT JOIN note_collaborators c ON n.id = c.note_id
       WHERE n.user_id = $1 OR c.user_email = $2
       ORDER BY n.created_at DESC`,
      [req.user.uid, userEmail]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Database Query Error:', err.message);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// 2. Create a new note
app.post('/api/notes', authenticateUser, async (req, res) => {
  const { title, description, content, category, image_url } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    const result = await pool.query(
      'INSERT INTO notes (user_id, title, description, content, category, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.uid, title || null, description || null, content || null, category || 'info', image_url || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Database Insert Error:', err.message);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// 3. Update an existing note
app.put('/api/notes/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const { title, description, content, category, image_url } = req.body;
  const userEmail = req.user.email;
  
  try {
    // Check if user is owner or collaborator
    const accessCheck = await pool.query(
      `SELECT n.user_id FROM notes n
       LEFT JOIN note_collaborators c ON n.id = c.note_id
       WHERE n.id = $1 AND (n.user_id = $2 OR c.user_email = $3)`,
      [id, req.user.uid, userEmail]
    );

    if (accessCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Note not found or unauthorized' });
    }

    const result = await pool.query(
      'UPDATE notes SET title = $1, description = $2, content = $3, category = $4, image_url = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [title || null, description || null, content || null, category || 'info', image_url || null, id]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// 4. Delete a note (Only owner)
app.delete('/api/notes/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2',
      [id, req.user.uid]
    );
    
    if (result.rowCount === 0) {
       return res.status(404).json({ error: 'Note not found or you are not the owner' });
    }
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. Share a note
app.post('/api/notes/:id/share', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;
  
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    // Only owner can share
    const ownerCheck = await pool.query('SELECT user_id FROM notes WHERE id = $1 AND user_id = $2', [id, req.user.uid]);
    if (ownerCheck.rowCount === 0) {
      return res.status(403).json({ error: 'Only the owner can share this note' });
    }

    await pool.query(
      'INSERT INTO note_collaborators (note_id, user_email) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, email]
    );
    res.json({ message: `Note shared with ${email}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 6. Get collaborators for a note
app.get('/api/notes/:id/collaborators', authenticateUser, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT user_email FROM note_collaborators WHERE note_id = $1', [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 7. Submit feedback
app.post('/api/feedback', authenticateUser, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Feedback text is required' });

  try {
    await pool.query(
      'INSERT INTO feedback (user_id, user_name, message) VALUES ($1, $2, $3)',
      [req.user.uid, req.user.name || 'Anonymous', text]
    );
    res.status(201).json({ message: 'Feedback received' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Root Landing Page (Professional Confirmation)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Talaga API | Professional Workspace</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Outfit', sans-serif; background: #0b0f1a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            .container { padding: 3rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 32px; backdrop-filter: blur(20px); }
            h1 { color: #6366f1; margin-bottom: 1rem; }
            p { color: #94a3b8; margin: 0; }
            .badge { display: inline-block; padding: 6px 16px; background: rgba(16, 185, 129, 0.1); color: #10b981; border-radius: 100px; font-size: 0.85rem; font-weight: bold; margin-top: 1.5rem; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Talaga Backend Server</h1>
            <p>Your premium personal dashboard API is fully operational.</p>
            <div class="badge">● SYSTEM LIVE</div>
        </div>
    </body>
    </html>
  `);
});

// Health Check (Deep Verification)
app.get('/health', async (req, res) => {
  try {
    const dbCheck = await pool.query('SELECT 1');
    res.json({ 
        status: 'ok', 
        database: 'connected', 
        ping: 'success',
        timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Health Check Failed:', err.message);
    res.status(500).json({ status: 'error', database: 'disconnected', details: err.message });
  }
});

app.listen(port, () => {
  console.log(`Talaga Backend running at http://localhost:${port}`);
});
