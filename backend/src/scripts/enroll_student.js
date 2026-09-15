const db = require('../db');

const enroll = async () => {
  try {
    const studentRes = await db.query("SELECT s.id FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'student1@example.com'");
    if (studentRes.rows.length === 0) return console.log('Student not found');
    const studentId = studentRes.rows[0].id;

    const coursesRes = await db.query("SELECT id FROM courses");
    for (let course of coursesRes.rows) {
      try {
        await db.query('INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2)', [studentId, course.id]);
        console.log(`Enrolled in course ${course.id}`);
      } catch(e) {
        if (e.code === '23505') console.log(`Already enrolled in course ${course.id}`);
      }
    }
    console.log('Enrollment complete');
  } catch (error) {
    console.error(error);
  }
};
enroll();
