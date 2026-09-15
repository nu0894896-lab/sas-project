require('dotenv').config({ path: '../.env' });
const db = require('../db');
const crypto = require('crypto');

const start = async () => {
  try {
    // Get test teacher
    const teacherResult = await db.query("SELECT t.id FROM teachers t JOIN users u ON t.user_id = u.id WHERE u.email = 'teacher1@example.com'");
    if (teacherResult.rows.length === 0) return console.log('Teacher not found');
    const teacherId = teacherResult.rows[0].id;

    // Get course CS101
    const courseResult = await db.query("SELECT id FROM courses WHERE course_code = 'CS101'");
    if (courseResult.rows.length === 0) return console.log('Course CS101 not found');
    const courseId = courseResult.rows[0].id;

    // Check if session exists
    const check = await db.query("SELECT * FROM attendance_sessions WHERE course_id = $1 AND status = 'active'", [courseId]);
    if (check.rows.length > 0) {
      console.log('Session already active for CS101. Proximity Token:', check.rows[0].proximity_token);
      return;
    }

    const proximityToken = crypto.randomBytes(8).toString('hex');
    await db.query(
      'INSERT INTO attendance_sessions (course_id, teacher_id, proximity_token) VALUES ($1, $2, $3)',
      [courseId, teacherId, proximityToken]
    );

    console.log(`Successfully started session for CS101! Proximity Token: ${proximityToken}`);
  } catch (error) {
    console.error(error);
  }
};
start();
