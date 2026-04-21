const express = require('express');
const { Pool } = require('pg');
const admin = require('firebase-admin');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

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
    // We don't exit(1) immediately to allow the health checks to potentially run or 
    // to keep the port open for debugging, but the app will be in a degraded state.
}

// --- PostgreSQL Connection (Aiven) ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: fs.existsSync('./ca.pem') ? {
    ca: fs.readFileSync('./ca.pem').toString(),
    rejectUnauthorized: true 
  } : {
    rejectUnauthorized: false // Fallback for easier setup
  }
});

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Auth Middleware ---
// Verifies the Firebase ID Token sent from the frontend
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

// 1. Get all notes for the authenticated user
app.get('/api/notes', authenticateUser, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.uid]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Create a new note
app.post('/api/notes', authenticateUser, async (req, res) => {
  const { title, content, category } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    const result = await pool.query(
      'INSERT INTO notes (user_id, title, content, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.uid, title, content, category]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. Update an existing note
app.put('/api/notes/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const { title, content, category } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE notes SET title = $1, content = $2, category = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
      [title, content, category, id, req.user.uid]
    );
    
    if (result.rowCount === 0) {
       return res.status(404).json({ error: 'Note not found or unauthorized' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. Delete a note
app.delete('/api/notes/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2',
      [id, req.user.uid]
    );
    
    if (result.rowCount === 0) {
       return res.status(404).json({ error: 'Note not found or unauthorized' });
    }
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. Delete ALL notes (Wipe Data)
app.delete('/api/notes', authenticateUser, async (req, res) => {
    try {
      await pool.query('DELETE FROM notes WHERE user_id = $1', [req.user.uid]);
      res.json({ message: 'All data cleared' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 6. Submit feedback
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

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok', database: 'connected' }));

app.listen(port, () => {
  console.log(`Talaga Backend running at http://localhost:${port}`);
});
