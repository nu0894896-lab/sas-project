const db = require('../db');

// @desc    Get all teachers
// @route   GET /api/teachers
// @access  Private (Admin)
const getTeachers = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.id as teacher_id, u.id as user_id, u.name, u.email, t.department, u.status 
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      ORDER BY u.name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ message: 'Server error retrieving teachers' });
  }
};

// @desc    Get teacher profile
// @route   GET /api/teachers/me
// @access  Private (Teacher)
const getTeacherProfile = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.id as teacher_id, u.id as user_id, u.name, u.email, t.department, u.status 
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      WHERE u.id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Teacher profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get teacher profile error:', error);
    res.status(500).json({ message: 'Server error retrieving profile' });
  }
};

module.exports = {
  getTeachers,
  getTeacherProfile
};
