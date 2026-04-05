const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'onboarding.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name TEXT NOT NULL,
    industry TEXT,
    contact_name TEXT NOT NULL,
    phone TEXT,
    email TEXT NOT NULL,
    address TEXT,
    description TEXT,
    target_customer TEXT,
    brand_colours TEXT,
    brand_tone TEXT,
    has_logo TEXT,
    admired_brands TEXT,
    current_website TEXT,
    domain_preference TEXT,
    facebook TEXT,
    instagram TEXT,
    goals TEXT,
    competitors TEXT,
    services TEXT,
    anything_else TEXT,
    signature_image TEXT,
    agreed_to_terms INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'new'
  )
`);

module.exports = db;
