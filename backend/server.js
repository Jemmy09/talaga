const express = require('express');
const { Pool } = require('pg');
const admin = require('firebase-admin');
const cors = require('cors');
const fs = require('fs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

// Global SSL Bypass for Aiven/Render connectivity
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// --- Email Transporter Setup ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

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
          owner_name VARCHAR(255),
          last_editor_name VARCHAR(255),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          content TEXT,
          attachments JSONB DEFAULT '[]',
          sharing_config JSONB DEFAULT '{"access_type": "restricted", "public_role": "viewer", "share_token": null}',
          category VARCHAR(50) CHECK (category IN ('info', 'todo', 'account', 'business', 'student', 'personal', 'other')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Auto-migrate: Add columns if they are missing
    try { await pool.query('ALTER TABLE notes ADD COLUMN owner_name VARCHAR(255);'); } catch (e) {}
    try { await pool.query('ALTER TABLE notes ADD COLUMN last_editor_name VARCHAR(255);'); } catch (e) {}
    try { await pool.query('ALTER TABLE notes ADD COLUMN attachments JSONB DEFAULT \'[]\';'); } catch (e) {}
    try { await pool.query('ALTER TABLE notes ADD COLUMN sharing_config JSONB DEFAULT \'{"access_type": "restricted", "public_role": "viewer", "share_token": null}\';'); } catch (e) {}
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS note_collaborators (
          note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
          user_email VARCHAR(255) NOT NULL,
          can_edit BOOLEAN DEFAULT TRUE,
          status VARCHAR(20) DEFAULT 'accepted',
          PRIMARY KEY (note_id, user_email)
      );
    `);
    
    // Auto-migrate: Add status column if missing
    try { await pool.query("ALTER TABLE note_collaborators ADD COLUMN status VARCHAR(20) DEFAULT 'accepted';"); } catch (e) {}
    try { await pool.query("UPDATE note_collaborators SET status = 'accepted' WHERE status IS NULL;"); } catch (e) {}
    try { await pool.query("UPDATE note_collaborators SET user_email = LOWER(user_email);"); } catch (e) {}
    try { await pool.query('ALTER TABLE note_collaborators ADD COLUMN can_edit BOOLEAN DEFAULT TRUE;'); } catch (e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS note_history (
          id SERIAL PRIMARY KEY,
          note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
          user_name VARCHAR(255) NOT NULL,
          action TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
const port = process.env.PORT || 3010;

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

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
    res.status(500).json({ error: 'Database error' });
  }
});

// 1.4 Get notifications (invitations + collaborator edits)
app.get('/api/notifications', authenticateUser, async (req, res) => {
  const userEmail = req.user.email.toLowerCase();
  try {
    // 1. Pending Invitations
    const invites = await pool.query(
      `SELECT n.id, n.title, n.owner_name, c.can_edit, 'invite' as type, n.created_at as time
       FROM notes n
       JOIN note_collaborators c ON n.id = c.note_id
       WHERE LOWER(c.user_email) = $1 AND c.status = 'pending'`,
      [userEmail]
    );

    // 2. Collaborator Activity on User's Notes (Last 20 edits by others)
    const activities = await pool.query(
      `SELECT h.*, n.title as note_title, 'activity' as type, h.created_at as time
       FROM note_history h
       JOIN notes n ON h.note_id = n.id
       WHERE n.user_id = $1 AND h.user_name != $2
       ORDER BY h.created_at DESC LIMIT 20`,
      [req.user.uid, req.user.name || req.user.email]
    );

    res.json({
      invites: invites.rows,
      activities: activities.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 1.2 Accept/Reject invitation
app.post('/api/invitations/:id/:action', authenticateUser, async (req, res) => {
  const { id, action } = req.params;
  const userEmail = req.user.email.toLowerCase();
  try {
    if (action === 'accept') {
      await pool.query(
        "UPDATE note_collaborators SET status = 'accepted' WHERE note_id = $1 AND LOWER(user_email) = $2",
        [id, userEmail]
      );
    } else {
      await pool.query(
        "DELETE FROM note_collaborators WHERE note_id = $1 AND LOWER(user_email) = $2",
        [id, userEmail]
      );
    }
    res.json({ message: 'Success' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 1.3 Get all notes (only accepted ones)
app.get('/api/notes', authenticateUser, async (req, res) => {
  const userEmail = req.user.email.toLowerCase();
  try {
    const result = await pool.query(
      `SELECT DISTINCT n.*, 
       (n.user_id = $1) as is_owner,
       CASE WHEN n.user_id = $1 THEN true ELSE COALESCE(c.can_edit, false) END as can_edit
       FROM notes n
       LEFT JOIN note_collaborators c ON n.id = c.note_id AND LOWER(c.user_email) = $2
       WHERE n.user_id = $1 OR (LOWER(c.user_email) = $2 AND c.status = 'accepted')
       ORDER BY n.updated_at DESC`,
      [req.user.uid, userEmail]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 1.5 Get a public note by token
app.get('/api/public/notes/:token', async (req, res) => {
  const { token } = req.params;
  try {
    // Query using JSONB arrow operator for robustness
    const result = await pool.query(
      "SELECT * FROM notes WHERE sharing_config->>'share_token' = $1",
      [token]
    );
    
    if (result.rowCount === 0) return res.status(404).json({ error: 'Link invalid or note deleted' });
    
    const note = result.rows[0];
    const config = note.sharing_config || {};
    
    // Check if it's actually public
    if (config.access_type !== 'public') {
      return res.status(403).json({ error: 'This link is currently private' });
    }
    
    // Public notes are never "owned" by the viewer
    // But they can have 'editor' role if public_role is 'editor'
    res.json({ 
      ...note, 
      is_owner: false, 
      is_public: true, 
      can_edit: config.public_role === 'editor' 
    });
  } catch (err) {
    console.error('Public Fetch Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Create a new note
app.post('/api/notes', authenticateUser, async (req, res) => {
  const { title, description, content, category, attachments } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    const userName = req.user.name || req.user.email || 'Anonymous';
    const result = await pool.query(
      'INSERT INTO notes (user_id, owner_name, last_editor_name, title, description, content, category, attachments) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [req.user.uid, userName, userName, title || null, description || null, content || null, category || 'info', JSON.stringify(attachments || [])]
    );
    const note = result.rows[0];
    
    // Log history
    await pool.query('INSERT INTO note_history (note_id, user_name, action) VALUES ($1, $2, $3)', [note.id, userName, 'Created the note']);
    
    res.status(201).json(note);
  } catch (err) {
    console.error('❌ Database Insert Error:', err.message);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// 3. Update an existing note
app.post('/api/notes/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const { title, content, category, attachments } = req.body;
  const userEmail = req.user.email;
  const userName = req.user.name || req.user.email || 'Anonymous';
  
  try {
    const noteId = parseInt(id);
    if (isNaN(noteId)) return res.status(400).json({ error: 'Invalid Note ID' });

    // Check if user is owner, explicit collaborator, or has public access
    const accessCheck = await pool.query(
      `SELECT n.user_id, n.sharing_config, c.can_edit 
       FROM notes n
       LEFT JOIN note_collaborators c ON n.id = c.note_id AND LOWER(c.user_email) = LOWER($2)
       WHERE n.id = $1`,
      [noteId, userEmail]
    );

    if (accessCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const row = accessCheck.rows[0];
    const config = row.sharing_config || {};
    const isOwner = row.user_id === req.user.uid;
    const isCollaboratorEditor = row.can_edit === true;
    const isPublicEditor = config.access_type === 'public' && config.public_role === 'editor';

    if (!isOwner && !isCollaboratorEditor && !isPublicEditor) {
       console.log(`🚫 [ACCESS] Update denied for user ${userEmail} on note ${noteId}`);
       return res.status(403).json({ error: 'You do not have permission to edit this note' });
    }

    console.log(`📝 [ACCESS] Updating note ${noteId} by ${userEmail} (Role: ${isOwner?'Owner':(isCollaboratorEditor?'Collab':'Public')})`);

    const result = await pool.query(
      'UPDATE notes SET title = $1, content = $2, category = $3, attachments = $4, last_editor_name = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [title || 'Untitled', content || '', category || 'info', JSON.stringify(attachments || []), userName, noteId]
    );

    // Log history
    await pool.query('INSERT INTO note_history (note_id, user_name, action) VALUES ($1, $2, $3)', [noteId, userName, 'Updated the note content']);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ [UPDATE ERROR]:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
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

// 5. Update sharing/access level
app.post('/api/notes/:id/access', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const { access_type, public_role } = req.body;
  const userName = req.user.name || req.user.email || 'Anonymous';

  try {
    const noteId = parseInt(id);
    if (isNaN(noteId)) return res.status(400).json({ error: 'Invalid Note ID' });

    const ownerCheck = await pool.query('SELECT sharing_config FROM notes WHERE id = $1 AND user_id = $2', [noteId, req.user.uid]);
    if (ownerCheck.rowCount === 0) return res.status(403).json({ error: 'Only owner can change access' });

    let config = ownerCheck.rows[0].sharing_config;
    if (!config || typeof config !== 'object') {
      config = { access_type: 'restricted', public_role: 'viewer', share_token: null };
    }

    if (access_type) config.access_type = access_type;
    if (public_role) config.public_role = public_role;
    
    if (config.access_type === 'public' && !config.share_token) {
      config.share_token = crypto.randomBytes(16).toString('hex');
    }

    console.log(`📡 [ACCESS] Updating note ${noteId}. Access: ${access_type}, Role: ${public_role}`);
    
    const updateRes = await pool.query(
      'UPDATE notes SET sharing_config = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING sharing_config', 
      [JSON.stringify(config), noteId]
    );
    
    if (!updateRes.rows[0]) {
       console.error(`❌ [ACCESS] Note ${noteId} not found during update`);
       return res.status(404).json({ error: 'Note disappeared during update' });
    }

    const newConfig = updateRes.rows[0].sharing_config;
    
    // History log
    await pool.query('INSERT INTO note_history (note_id, user_name, action) VALUES ($1, $2, $3)', 
      [noteId, userName, `Changed access to ${newConfig.access_type} (${newConfig.public_role || 'viewer'})`]);

    console.log(`✅ [ACCESS] Successfully updated note ${noteId}`);
    res.json(newConfig);
  } catch (err) {
    console.error('❌ [ACCESS] CRITICAL ERROR:', err);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: err.message
    });
  }
});

// 6. Share with a specific user (Invite)
app.post('/api/notes/:id/share', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const { email, can_edit } = req.body;
  const userName = req.user.name || req.user.email || 'Anonymous';
  
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const targetEmail = email.toLowerCase();

  try {
    const ownerCheck = await pool.query('SELECT user_id FROM notes WHERE id = $1 AND user_id = $2', [id, req.user.uid]);
    if (ownerCheck.rowCount === 0) return res.status(403).json({ error: 'Only owner can share' });

    // Set status to 'pending' for invitations, and normalized email
    await pool.query(
      'INSERT INTO note_collaborators (note_id, user_email, can_edit, status) VALUES ($1, $2, $3, $4) ON CONFLICT (note_id, user_email) DO UPDATE SET can_edit = $3, status = EXCLUDED.status',
      [id, targetEmail, can_edit, 'pending']
    );

    await pool.query('INSERT INTO note_history (note_id, user_name, action) VALUES ($1, $2, $3)', [id, userName, `Invited ${targetEmail} (${can_edit ? 'Editor' : 'Viewer'})`]);
    res.json({ message: 'Success' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 7. Remove a collaborator
app.delete('/api/notes/:id/collaborators/:email', authenticateUser, async (req, res) => {
  const { id, email } = req.params;
  const userName = req.user.name || req.user.email || 'Anonymous';
  try {
    const ownerCheck = await pool.query('SELECT user_id FROM notes WHERE id = $1 AND user_id = $2', [id, req.user.uid]);
    if (ownerCheck.rowCount === 0) return res.status(403).json({ error: 'Only owner can remove users' });

    await pool.query('DELETE FROM note_collaborators WHERE note_id = $1 AND user_email = $2', [id, email]);
    await pool.query('INSERT INTO note_history (note_id, user_name, action) VALUES ($1, $2, $3)', [id, userName, `Removed ${email} from collaborators`]);
    res.json({ message: 'Removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 8. Get collaborators & history
app.get('/api/notes/:id/collaborators', authenticateUser, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT user_email, can_edit, status FROM note_collaborators WHERE note_id = $1', [id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/notes/:id/history', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const userEmail = req.user.email;

  try {
    const noteId = parseInt(id);
    if (isNaN(noteId)) return res.status(400).json({ error: 'Invalid Note ID' });

    // Access Check: Owner, Collaborator, or Public
    const accessCheck = await pool.query(
      `SELECT n.user_id, n.sharing_config, EXISTS(SELECT 1 FROM note_collaborators WHERE note_id = $1 AND user_email = $2) as is_collab
       FROM notes n WHERE n.id = $1`,
      [noteId, userEmail]
    );

    if (accessCheck.rowCount === 0) {
        console.warn(`⚠️ [HISTORY] Note ${noteId} not found`);
        return res.status(404).json({ error: 'Note not found' });
    }
    
    const row = accessCheck.rows[0];
    const isOwner = row.user_id === req.user.uid;
    const isPublic = row.sharing_config?.access_type === 'public';
    
    if (!isOwner && !row.is_collab && !isPublic) {
      console.log(`🚫 [HISTORY] Access denied for ${userEmail} on note ${noteId}`);
      return res.status(403).json({ error: 'Access denied to history' });
    }

    const result = await pool.query('SELECT * FROM note_history WHERE note_id = $1 ORDER BY created_at DESC LIMIT 30', [noteId]);
    res.json(result.rows);
  } catch (err) { 
    console.error('❌ [HISTORY ERROR]:', err);
    res.status(500).json({ error: 'Server error loading history', message: err.message }); 
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

    // 2. Email Notification (Optional/Conditional)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await transporter.sendMail({
          from: `"Talaga Workspace" <${process.env.EMAIL_USER}>`,
          to: 'Jemmyfrancisco30@gmail.com',
          replyTo: req.user.email, // Allows owner to reply directly to user
          subject: `✨ New Feedback from ${req.user.name || 'a User'}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333; background: #f9f9f9; border-radius: 10px;">
              <h2 style="color: #6366f1;">New Feedback Received!</h2>
              <p><strong>From:</strong> ${req.user.name || 'Anonymous'} (<a href="mailto:${req.user.email}">${req.user.email}</a>)</p>
              <div style="background: white; padding: 15px; border-left: 4px solid #6366f1; margin: 20px 0; font-size: 1.1rem; line-height: 1.6;">
                "${text}"
              </div>
              <p style="font-size: 0.85rem; color: #777; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
                💡 <strong>Tip:</strong> You can click "Reply" in your email app to message this user back directly.
              </p>
            </div>
          `
        });
        console.log('📧 [MAIL] Feedback email sent to owner');
      } catch (mailErr) {
        console.error('❌ [MAIL ERROR]:', mailErr.message);
      }
    }

    res.json({ message: 'Feedback stored successfully' });
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
