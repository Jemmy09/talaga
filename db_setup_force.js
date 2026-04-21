require('dotenv').config();
const { Pool } = require('pg');

// Force SSL bypass for the setup script
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const sql = `
CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    category VARCHAR(50) CHECK (category IN ('info', 'todo', 'account', 'business', 'student', 'personal', 'other')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

async function forceSetup() {
  console.log("🚀 Attempting to Force-Unlock Aiven Database...");
  try {
    const client = await pool.connect();
    console.log("✅ Connection Established!");
    
    await client.query(sql);
    console.log("\n✨ SUCCESS! ✨");
    console.log("Tables 'notes' and 'feedback' have been created successfully.");
    console.log("You can now close Aiven and refresh your website.");
    
    client.release();
  } catch (err) {
    console.error("\n❌ FORCE SETUP FAILED ❌");
    console.error(err.message);
    if (err.message.includes("database is in read-only mode")) {
        console.log("\n⚠️ YOUR AIVEN SERVICE IS IN READ-ONLY MODE.");
        console.log("Please check 'Service Settings' in Aiven and turn off 'Read-only mode'.");
    }
  } finally {
    await pool.end();
  }
}

forceSetup();
