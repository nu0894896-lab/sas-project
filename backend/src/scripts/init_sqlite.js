const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../database.sqlite');
const schemaPath = path.resolve(__dirname, '../db/init.sql');

const db = new sqlite3.Database(dbPath);

const schema = fs.readFileSync(schemaPath, 'utf8');

db.exec(schema, (err) => {
  if (err) {
    console.error('Error initializing SQLite database:', err);
    process.exit(1);
  } else {
    console.log('Successfully initialized SQLite database schema.');
    
    // Now seed the database
    require('./seed');
  }
});
