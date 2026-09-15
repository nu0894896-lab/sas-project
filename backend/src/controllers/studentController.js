const db = require('../db');

// @desc    Get all students
// @route   GET /api/students
// @access  Private (Admin, Teacher)
const getStudents = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.id as student_id, u.id as user_id, u.name, u.email, s.registration_number, u.status 
      FROM students s
      JOIN users u ON s.user_id = u.id
      ORDER BY u.name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Server error retrieving students' });
  }
};

// @desc    Get student profile
// @route   GET /api/students/me
// @access  Private (Student)
const getStudentProfile = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.id as student_id, u.id as user_id, u.name, u.email, s.registration_number, u.status 
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE u.id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get student profile error:', error);
    res.status(500).json({ message: 'Server error retrieving profile' });
  }
};

module.exports = {
  getStudents,
  getStudentProfile
};
