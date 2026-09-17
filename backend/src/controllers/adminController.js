const db = require('../db');
const bcrypt = require('bcryptjs');

// @desc    Create a new user (and student/teacher profile)
// @route   POST /api/admin/users
// @access  Private/Admin
const createUser = async (req, res) => {
  const { name, email, password, role, registration_number, department, employee_id } = req.body;

  try {
    // Check if user exists
    const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Start transaction
    await db.query('BEGIN');

    const result = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashedPassword, role]
    );

    const newUser = result.rows[0];

    // Create profile based on role
    if (role === 'student') {
      if (!registration_number) {
        try { await db.query('ROLLBACK'); } catch (e) {}
        return res.status(400).json({ message: 'Registration number is required for students' });
      }
      await db.query(
        'INSERT INTO students (user_id, registration_number, department) VALUES ($1, $2, $3)',
        [newUser.id, registration_number, department || null]
      );
    } else if (role === 'teacher') {
      const empId = employee_id?.trim() || `T-${1000 + newUser.id}-${Math.floor(100 + Math.random() * 900)}`;
      await db.query(
        'INSERT INTO teachers (user_id, employee_id, department) VALUES ($1, $2, $3)',
        [newUser.id, empId, department || null]
      );
    }

    await db.query('COMMIT');
    res.status(201).json(newUser);

  } catch (error) {
    try { await db.query('ROLLBACK'); } catch (e) {}
    console.error('Create user error:', error);
    res.status(500).json({ message: error.message || 'Server error creating user' });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error retrieving users' });
  }
};

// @desc    Update user status (activate/deactivate)
// @route   PATCH /api/admin/users/:id/status
// @access  Private/Admin
const updateUserStatus = async (req, res) => {
  const { status } = req.body;
  const userId = req.params.id;

  try {
    const result = await db.query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, status',
      [status, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error updating user status' });
  }
};

// @desc    Get all teachers
// @route   GET /api/admin/teachers
// @access  Private/Admin
const getAllTeachers = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT t.id as teacher_id, u.name, u.email FROM teachers t JOIN users u ON t.user_id = u.id'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get all teachers error:', error);
    res.status(500).json({ message: 'Server error retrieving teachers' });
  }
};

// @desc    Get all students
// @route   GET /api/admin/students
// @access  Private/Admin
const getAllStudents = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT s.id as student_id, u.name, u.email, s.registration_number FROM students s JOIN users u ON s.user_id = u.id'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({ message: 'Server error retrieving students' });
  }
};

// @desc    Get all devices
// @route   GET /api/admin/devices
// @access  Private/Admin
const getAllDevices = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT d.id, d.device_identifier, d.device_model, d.registered_at,
             u.name as student_name, s.registration_number
      FROM devices d
      JOIN students s ON d.student_id = s.id
      JOIN users u ON s.user_id = u.id
      ORDER BY d.registered_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all devices error:', error);
    res.status(500).json({ message: 'Server error retrieving devices' });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getAllTeachers,
  getAllStudents,
  updateUserStatus,
  getAllDevices
};
