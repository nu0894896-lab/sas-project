const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let queryFunction;

if (process.env.DATABASE_URL) {
  // Production: PostgreSQL
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Render/Heroku
  });

  queryFunction = async (text, params = []) => {
    return await pool.query(text, params);
  };
} else {
  // Development: SQLite
  const dbPath = path.resolve(__dirname, '../../database.sqlite');
  const db = new sqlite3.Database(dbPath);
  db.run("PRAGMA foreign_keys = ON;");

  queryFunction = (text, params = []) => {
    return new Promise((resolve, reject) => {
      let sqliteQuery = text.replace(/\$\d+/g, '?');

      db.all(sqliteQuery, params, (err, rows) => {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            err.code = '23505';
            if (err.message.includes('devices.student_id')) err.constraint = 'devices_student_id_key';
          }
          reject(err);
        } else {
          resolve({ rows: rows || [] });
        }
      });
    });
  };
}

module.exports = {
  query: queryFunction
};
