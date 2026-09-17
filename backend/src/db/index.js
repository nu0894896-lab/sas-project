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

  let pgInitPromise = null;
  const ensurePostgresInit = async () => {
    if (pgInitPromise) return pgInitPromise;
    pgInitPromise = (async () => {
      try {
        const check = await pool.query("SELECT to_regclass('public.users') as tbl;");
        if (!check.rows[0].tbl) {
          await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                registration_number VARCHAR(100) UNIQUE NOT NULL,
                department VARCHAR(100)
            );
            CREATE TABLE IF NOT EXISTS teachers (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                employee_id VARCHAR(100) UNIQUE NOT NULL,
                department VARCHAR(100)
            );
            CREATE TABLE IF NOT EXISTS courses (
                id SERIAL PRIMARY KEY,
                course_code VARCHAR(50) UNIQUE NOT NULL,
                course_name VARCHAR(255) NOT NULL,
                teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS enrollments (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (student_id, course_id)
            );
            CREATE TABLE IF NOT EXISTS devices (
                id SERIAL PRIMARY KEY,
                student_id INTEGER UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                device_identifier VARCHAR(255) UNIQUE NOT NULL,
                device_model VARCHAR(255),
                status VARCHAR(50) DEFAULT 'active',
                registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS attendance_sessions (
                id SERIAL PRIMARY KEY,
                course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
                proximity_token VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'active',
                start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_time TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS attendance_records (
                id SERIAL PRIMARY KEY,
                session_id INTEGER NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                status VARCHAR(50) NOT NULL,
                marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (session_id, student_id)
            );
            INSERT INTO users (id, name, email, password_hash, role, status)
            VALUES 
            (1, 'System Admin', 'admin@example.com', '$2a$10$BVN14wvxTKdCYXy62rBcHe1/3eAunJLWSp4kF1BYVjNAZFHfMf9tO', 'admin', 'active'),
            (2, 'Test Teacher', 'teacher1@example.com', '$2a$10$BVN14wvxTKdCYXy62rBcHe1/3eAunJLWSp4kF1BYVjNAZFHfMf9tO', 'teacher', 'active'),
            (3, 'Test Student', 'student1@example.com', '$2a$10$BVN14wvxTKdCYXy62rBcHe1/3eAunJLWSp4kF1BYVjNAZFHfMf9tO', 'student', 'active')
            ON CONFLICT (email) DO NOTHING;

            INSERT INTO teachers (user_id, employee_id, department)
            VALUES (2, 'T-1001', 'Computer Science')
            ON CONFLICT (employee_id) DO NOTHING;

            INSERT INTO students (user_id, registration_number, department)
            VALUES (3, 'S-2023-001', 'Computer Science')
            ON CONFLICT (registration_number) DO NOTHING;

            SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1)) FROM users;
          `);
        }
      } catch (e) {
        console.error('PostgreSQL auto-init error:', e);
      }
    })();
    return pgInitPromise;
  };

  queryFunction = async (text, params = []) => {
    await ensurePostgresInit();
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

  let initPromise = null;
  const ensureInit = () => {
    if (initPromise) return initPromise;
    initPromise = new Promise((resolve) => {
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
        if (!err && row) {
          return resolve();
        }
        const schemaPath = path.resolve(__dirname, 'init.sql');
        if (fs.existsSync(schemaPath)) {
          const schema = fs.readFileSync(schemaPath, 'utf8');
          db.exec(schema, (execErr) => {
            if (execErr) console.error('Error auto-initializing schema in SQLite:', execErr);
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
    return initPromise;
  };

  queryFunction = async (text, params = []) => {
    await ensureInit();
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
