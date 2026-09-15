const db = require('../db');

// @desc    Create a course
// @route   POST /api/courses
// @access  Private (Admin)
const createCourse = async (req, res) => {
  const { course_code, course_name, teacher_id } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO courses (course_code, course_name, teacher_id) VALUES ($1, $2, $3) RETURNING *',
      [course_code, course_name, teacher_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Server error creating course' });
  }
};

// @desc    Enroll student in a course
// @route   POST /api/courses/enroll
// @access  Private (Admin)
const enrollStudent = async (req, res) => {
  const { student_id, course_id } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) RETURNING *',
      [student_id, course_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ message: 'Student is already enrolled in this course' });
    }
    console.error('Enroll student error:', error);
    res.status(500).json({ message: 'Server error enrolling student' });
  }
};

// @desc    Get courses associated with the logged-in user
// @route   GET /api/courses/my-courses
// @access  Private (Teacher, Student)
const getMyCourses = async (req, res) => {
  try {
    let result;

    if (req.user.role === 'teacher') {
      result = await db.query(`
        SELECT c.*, 
               EXISTS(SELECT 1 FROM attendance_sessions asess WHERE asess.course_id = c.id AND asess.status = 'active') as is_active
        FROM courses c
        JOIN teachers t ON c.teacher_id = t.id
        WHERE t.user_id = $1
      `, [req.user.id]);
    } else if (req.user.role === 'student') {
      result = await db.query(`
        SELECT c.*, t.name as teacher_name,
               EXISTS(SELECT 1 FROM attendance_sessions asess WHERE asess.course_id = c.id AND asess.status = 'active') as is_active
        FROM courses c
        JOIN enrollments e ON c.id = e.course_id
        JOIN students s ON e.student_id = s.id
        LEFT JOIN teachers tc ON c.teacher_id = tc.id
        LEFT JOIN users t ON tc.user_id = t.id
        WHERE s.user_id = $1
      `, [req.user.id]);
    } else {
       // Admins see all courses
       result = await db.query(`
         SELECT c.*, u.name as teacher_name 
         FROM courses c 
         LEFT JOIN teachers t ON c.teacher_id = t.id 
         LEFT JOIN users u ON t.user_id = u.id
       `);
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({ message: 'Server error retrieving courses' });
  }
};


module.exports = {
  createCourse,
  getMyCourses,
  enrollStudent
};
