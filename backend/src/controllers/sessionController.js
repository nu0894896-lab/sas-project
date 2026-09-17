const db = require('../db');
const crypto = require('crypto');

// @desc    Start an attendance session
// @route   POST /api/sessions/start
// @access  Private (Teacher)
const startSession = async (req, res) => {
  const { course_id, duration_minutes } = req.body;

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
      const existing = activeSession.rows[0];
      // If it has an end_time and has expired, close it automatically
      if (existing.end_time && new Date() > new Date(existing.end_time)) {
        await db.query("UPDATE attendance_sessions SET status = 'ended' WHERE id = $1", [existing.id]);
      } else {
        return res.status(400).json({ message: 'An active session already exists for this course' });
      }
    }

    // Generate proximity token
    const proximityToken = crypto.randomBytes(8).toString('hex');

    // Calculate duration and end time (default 10 minutes)
    const duration = parseInt(duration_minutes) > 0 ? parseInt(duration_minutes) : 10;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    const result = await db.query(
      'INSERT INTO attendance_sessions (course_id, teacher_id, proximity_token, start_time, end_time, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [course_id, teacherId, proximityToken, startTime.toISOString(), endTime.toISOString(), 'active']
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
      if (studentResult.rows.length === 0) {
        return res.status(403).json({ message: 'Student profile not found' });
      }
      const studentId = studentResult.rows[0].id;

      const enrolled = await db.query('SELECT * FROM enrollments WHERE student_id = $1 AND course_id = $2', [studentId, courseId]);
      if (enrolled.rows.length === 0) {
        return res.status(403).json({ message: 'You are not enrolled in this course' });
      }
    }

    let query = "SELECT id, course_id, teacher_id, start_time, end_time, status";
    if (req.user.role === 'teacher') {
      query += ", proximity_token";
    }
    query += " FROM attendance_sessions WHERE course_id = $1 AND status = 'active'";

    const result = await db.query(query, [courseId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No active session for this course' });
    }

    const session = result.rows[0];

    // Check if session has expired by end_time
    if (session.end_time && new Date() > new Date(session.end_time)) {
      await db.query("UPDATE attendance_sessions SET status = 'ended' WHERE id = $1", [session.id]);
      return res.status(404).json({ message: 'Session has expired' });
    }

    res.json(session);
  } catch (error) {
    console.error('Get active session error:', error);
    res.status(500).json({ message: 'Server error retrieving session' });
  }
};

// @desc    Get live attendance tracking status (present vs not marked)
// @route   GET /api/sessions/:id/live-status
// @access  Private (Teacher)
const getSessionLiveStatus = async (req, res) => {
  const sessionId = req.params.id;

  try {
    const teacherResult = await db.query('SELECT id FROM teachers WHERE user_id = $1', [req.user.id]);
    if (teacherResult.rows.length === 0) {
      return res.status(403).json({ message: 'Only teachers can access live session status' });
    }
    const teacherId = teacherResult.rows[0].id;

    // Get session
    const sessionRes = await db.query(
      'SELECT s.*, c.course_name, c.course_code FROM attendance_sessions s JOIN courses c ON s.course_id = c.id WHERE s.id = $1 AND s.teacher_id = $2',
      [sessionId, teacherId]
    );
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' });
    }
    const session = sessionRes.rows[0];

    // Check if auto-expired
    const now = new Date();
    if (session.status === 'active' && session.end_time && now > new Date(session.end_time)) {
      await db.query("UPDATE attendance_sessions SET status = 'ended' WHERE id = $1", [sessionId]);
      session.status = 'ended';
    }

    // Get all enrolled students for this course
    const enrolledRes = await db.query(`
      SELECT s.id as student_id, u.name, s.registration_number, u.email, s.department
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE e.course_id = $1
      ORDER BY u.name ASC
    `, [session.course_id]);

    // Get attendance records for this session
    const recordsRes = await db.query(`
      SELECT ar.student_id, ar.status, ar.marked_at, u.name, s.registration_number
      FROM attendance_records ar
      JOIN students s ON ar.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE ar.session_id = $1
    `, [sessionId]);

    const recordMap = new Map();
    recordsRes.rows.forEach(r => recordMap.set(r.student_id, r));

    const present = [];
    const unmarked = [];

    enrolledRes.rows.forEach(student => {
      const rec = recordMap.get(student.student_id);
      if (rec && rec.status === 'Present') {
        present.push({
          ...student,
          status: 'Present',
          marked_at: rec.marked_at
        });
      } else {
        unmarked.push({
          ...student,
          status: rec ? rec.status : 'Not Marked',
          marked_at: rec ? rec.marked_at : null
        });
      }
    });

    const remainingSeconds = session.end_time 
      ? Math.max(0, Math.floor((new Date(session.end_time).getTime() - now.getTime()) / 1000))
      : null;

    res.json({
      session,
      total_enrolled: enrolledRes.rows.length,
      present_count: present.length,
      unmarked_count: unmarked.length,
      present,
      unmarked,
      remaining_seconds: remainingSeconds,
      is_expired: remainingSeconds !== null && remainingSeconds <= 0
    });
  } catch (error) {
    console.error('Live status error:', error);
    res.status(500).json({ message: 'Server error fetching live status' });
  }
};

// @desc    Submit and finalize attendance for a session
// @route   POST /api/sessions/:id/submit
// @access  Private (Teacher)
const submitAttendance = async (req, res) => {
  const sessionId = req.params.id;

  try {
    const teacherResult = await db.query('SELECT id FROM teachers WHERE user_id = $1', [req.user.id]);
    if (teacherResult.rows.length === 0) {
      return res.status(403).json({ message: 'Only teachers can submit attendance' });
    }
    const teacherId = teacherResult.rows[0].id;

    const sessionRes = await db.query(
      'SELECT * FROM attendance_sessions WHERE id = $1 AND teacher_id = $2',
      [sessionId, teacherId]
    );
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' });
    }
    const session = sessionRes.rows[0];

    // Mark session as ended
    await db.query(
      "UPDATE attendance_sessions SET status = 'ended', end_time = CURRENT_TIMESTAMP WHERE id = $1",
      [sessionId]
    );

    // Find all enrolled students
    const enrolledRes = await db.query(
      'SELECT student_id FROM enrollments WHERE course_id = $1',
      [session.course_id]
    );

    // Find all students who already marked attendance
    const recordsRes = await db.query(
      'SELECT student_id FROM attendance_records WHERE session_id = $1',
      [sessionId]
    );
    const existingStudentIds = new Set(recordsRes.rows.map(r => r.student_id));

    // Automatically record 'Absent' for all unmarked students
    let newlyMarkedAbsent = 0;
    for (const student of enrolledRes.rows) {
      if (!existingStudentIds.has(student.student_id)) {
        await db.query(
          "INSERT INTO attendance_records (session_id, student_id, status) VALUES ($1, $2, 'Absent')",
          [sessionId, student.student_id]
        );
        newlyMarkedAbsent++;
      }
    }

    // Get final count summary
    const finalCounts = await db.query(
      "SELECT status, COUNT(*) as count FROM attendance_records WHERE session_id = $1 GROUP BY status",
      [sessionId]
    );

    let presentCount = 0;
    let absentCount = 0;
    finalCounts.rows.forEach(r => {
      if (r.status === 'Present') presentCount = parseInt(r.count);
      if (r.status === 'Absent' || r.status === 'Failed') absentCount += parseInt(r.count);
    });

    res.json({
      message: 'Attendance successfully submitted and locked',
      session_id: sessionId,
      total_enrolled: enrolledRes.rows.length,
      present_count: presentCount,
      absent_count: absentCount,
      newly_marked_absent: newlyMarkedAbsent
    });
  } catch (error) {
    console.error('Submit attendance error:', error);
    res.status(500).json({ message: 'Server error submitting attendance' });
  }
};

module.exports = {
  startSession,
  endSession,
  getActiveSession,
  getSessionLiveStatus,
  submitAttendance
};
