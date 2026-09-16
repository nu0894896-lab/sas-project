const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const fs = require('fs');

let queryFunction;
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (dbUrl) {
  // Production: PostgreSQL (Render, Neon, Supabase, Vercel Postgres)
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  queryFunction = async (text, params = []) => {
    return await pool.query(text, params);
  };
} else {
  // SQLite: Local or Vercel Serverless
  let dbPath = path.resolve(__dirname, '../../database.sqlite');

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDb = path.join('/tmp', 'database.sqlite');
    const localDb = path.resolve(__dirname, '../../database.sqlite');
    if (!fs.existsSync(tmpDb)) {
      if (fs.existsSync(localDb)) {
        try {
          fs.copyFileSync(localDb, tmpDb);
        } catch (e) {
          console.error('Error copying sqlite db to /tmp:', e);
        }
      } else {
        const tempConn = new sqlite3.Database(tmpDb);
        const schemaPath = path.resolve(__dirname, 'init.sql');
        if (fs.existsSync(schemaPath)) {
          const schema = fs.readFileSync(schemaPath, 'utf8');
          tempConn.exec(schema, (err) => {
            if (!err) {
              try { require('../scripts/seed'); } catch (e) {}
            }
          });
        }
      }
    }
    dbPath = tmpDb;
  }

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
