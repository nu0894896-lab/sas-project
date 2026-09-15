const db = require('../db');
const crypto = require('crypto');

// @desc    Start an attendance session
// @route   POST /api/sessions/start
// @access  Private (Teacher)
const startSession = async (req, res) => {
  const { course_id } = req.body;

  try {
    // Check if user is a teacher and get their teacher_id
    const teacherResult = await db.query('SELECT id FROM teachers WHERE user_id = $1', [req.user.id]);
    if (teacherResult.rows.length === 0) {
      return res.status(403).json({ message: 'Only teachers can start sessions' });
    }
    const teacherId = teacherResult.rows[0].id;

    // Check if the teacher is assigned to this course
    const courseResult = await db.query('SELECT * FROM courses WHERE id = $1 AND teacher_id = $2', [course_id, teacherId]);
    if (courseResult.rows.length === 0) {
      return res.status(403).json({ message: 'You are not assigned to this course' });
    }

    // Check if there's already an active session for this course
    const activeSession = await db.query('SELECT * FROM attendance_sessions WHERE course_id = $1 AND status = $2', [course_id, 'active']);
    if (activeSession.rows.length > 0) {
      return res.status(400).json({ message: 'An active session already exists for this course' });
    }

    // Generate proximity token
    const proximityToken = crypto.randomBytes(8).toString('hex');

    const result = await db.query(
      'INSERT INTO attendance_sessions (course_id, teacher_id, proximity_token) VALUES ($1, $2, $3) RETURNING *',
      [course_id, teacherId, proximityToken]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ message: 'Server error starting session' });
  }
};

// @desc    End an attendance session
// @route   POST /api/sessions/end/:id
// @access  Private (Teacher)
const endSession = async (req, res) => {
  const sessionId = req.params.id;

  try {
    const teacherResult = await db.query('SELECT id FROM teachers WHERE user_id = $1', [req.user.id]);
    const teacherId = teacherResult.rows[0].id;

    const result = await db.query(
      "UPDATE attendance_sessions SET status = 'ended', end_time = CURRENT_TIMESTAMP WHERE id = $1 AND teacher_id = $2 AND status = 'active' RETURNING *",
      [sessionId, teacherId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Active session not found or you are not authorized to end it' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ message: 'Server error ending session' });
  }
};

// @desc    Get active session for a course
// @route   GET /api/sessions/active/:courseId
// @access  Private (Student, Teacher)
const getActiveSession = async (req, res) => {
  const courseId = req.params.courseId;

  try {
    // If student, verify enrollment
    if (req.user.role === 'student') {
      const studentResult = await db.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      const studentId = studentResult.rows[0].id;

      const enrolled = await db.query('SELECT * FROM enrollments WHERE student_id = $1 AND course_id = $2', [studentId, courseId]);
      if (enrolled.rows.length === 0) {
        return res.status(403).json({ message: 'You are not enrolled in this course' });
      }
    }

    let query = "SELECT id, course_id, teacher_id, start_time, status";
    if (req.user.role === 'teacher') {
      query += ", proximity_token";
    }
    query += " FROM attendance_sessions WHERE course_id = $1 AND status = 'active'";

    const result = await db.query(query, [courseId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No active session for this course' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get active session error:', error);
    res.status(500).json({ message: 'Server error retrieving session' });
  }
};

module.exports = {
  startSession,
  endSession,
  getActiveSession
};
