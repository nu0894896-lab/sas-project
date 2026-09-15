const db = require('../db');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
  try {
    // Check if admin exists
    const checkQuery = 'SELECT * FROM users WHERE email = $1';
    const checkResult = await db.query(checkQuery, ['admin@example.com']);

    if (checkResult.rows.length === 0) {
      console.log('No admin found. Seeding default admin...');
      
      const passwordHash = await bcrypt.hash('password123', 10);
      
      // We do not use transactions since SQLite handles simple inserts fine and 
      // sqlite3 driver transaction logic is slightly different
      const insertUserQuery = `
        INSERT INTO users (name, email, password_hash, role, status) 
        VALUES ($1, $2, $3, $4, $5) RETURNING id
      `;
      const result = await db.query(insertUserQuery, ['System Admin', 'admin@example.com', passwordHash, 'admin', 'active']);
      
      console.log('Database seeded with default Admin successfully.', result.rows);
    } else {
      console.log('Admin user already exists. Skipping seed.');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

// Also seed a test teacher and student for the user's convenience
const seedTestAccounts = async () => {
  try {
    const checkT = await db.query('SELECT * FROM users WHERE email = $1', ['teacher1@example.com']);
    if (checkT.rows.length === 0) {
      const passwordHash = await bcrypt.hash('password123', 10);
      const userRes = await db.query(`INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id`, 
        ['Test Teacher', 'teacher1@example.com', passwordHash, 'teacher']);
      await db.query(`INSERT INTO teachers (user_id, employee_id, department) VALUES ($1, $2, $3)`, 
        [userRes.rows[0].id, 'T-1001', 'Computer Science']);
      console.log('Test Teacher seeded.');
    }

    const checkS = await db.query('SELECT * FROM users WHERE email = $1', ['student1@example.com']);
    if (checkS.rows.length === 0) {
      const passwordHash = await bcrypt.hash('password123', 10);
      const userRes = await db.query(`INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id`, 
        ['Test Student', 'student1@example.com', passwordHash, 'student']);
      await db.query(`INSERT INTO students (user_id, registration_number, department) VALUES ($1, $2, $3)`, 
        [userRes.rows[0].id, 'S-2023-001', 'Computer Science']);
      console.log('Test Student seeded.');
    }
  } catch(error) {
    console.error('Error seeding test accounts:', error);
  }
};

const runSeeds = async () => {
  await seedAdmin();
  await seedTestAccounts();
};

runSeeds();
