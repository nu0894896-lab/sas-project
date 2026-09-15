const db = require('../db');

const seedCourses = async () => {
  try {
    const courses = [
      { code: 'CS101', name: 'Introduction to Computer Science' },
      { code: 'CS201', name: 'Data Structures and Algorithms' },
      { code: 'CS301', name: 'Operating Systems' },
      { code: 'CS401', name: 'Database Management Systems' },
      { code: 'CS501', name: 'Software Engineering' },
      { code: 'CS601', name: 'Artificial Intelligence' }
    ];

    // Find the test teacher
    const teacherResult = await db.query('SELECT * FROM teachers LIMIT 1');
    const teacherId = teacherResult.rows.length > 0 ? teacherResult.rows[0].id : null;

    if (!teacherId) {
      console.log('No teacher found to assign courses to.');
      return;
    }

    for (let course of courses) {
      // Check if exists
      const check = await db.query('SELECT * FROM courses WHERE course_code = $1', [course.code]);
      if (check.rows.length === 0) {
        await db.query(
          'INSERT INTO courses (course_code, course_name, teacher_id) VALUES ($1, $2, $3)',
          [course.code, course.name, teacherId]
        );
        console.log(`Seeded course: ${course.name}`);
      } else {
        console.log(`Course ${course.code} already exists.`);
      }
    }
    console.log('Finished seeding courses.');
  } catch (error) {
    console.error('Error seeding courses:', error);
  }
};

seedCourses();
