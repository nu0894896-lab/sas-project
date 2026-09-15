const db = require('../db');
const { sendLowAttendanceWarning } = require('../utils/emailService');

// @desc    Trigger warning emails for a course
// @route   POST /api/notifications/warn/:courseId
// @access  Private (Teacher)
const triggerWarnings = async (req, res) => {
  const courseId = req.params.courseId;

  try {
    // 1. Verify Teacher owns this course
    const teacherResult = await db.query('SELECT id FROM teachers WHERE user_id = $1', [req.user.id]);
    const courseCheck = await db.query('SELECT course_name FROM courses WHERE id = $1 AND teacher_id = $2', [courseId, teacherResult.rows[0].id]);
    
    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized for this course' });
    }
    const courseName = courseCheck.rows[0].course_name;

    // 2. Fetch attendance analytics to identify at-risk students (< 75%)
    const analytics = await db.query(`
      SELECT 
        u.name, u.email,
        COUNT(ar.id) FILTER (WHERE ar.status = 'Present') AS total_present,
        (SELECT COUNT(id) FROM attendance_sessions WHERE course_id = $1) AS total_sessions
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN attendance_sessions asess ON asess.course_id = e.course_id
      LEFT JOIN attendance_records ar ON ar.session_id = asess.id AND ar.student_id = s.id
      WHERE e.course_id = $1
      GROUP BY u.name, u.email
    `, [courseId]);

    let emailsSent = 0;

    for (let student of analytics.rows) {
      const sessions = parseInt(student.total_sessions);
      if (sessions === 0) continue;

      const present = parseInt(student.total_present);
      const percentage = (present / sessions) * 100;

      // If attendance is below 75%, send email
      if (percentage < 75) {
        await sendLowAttendanceWarning(student.email, student.name, courseName, percentage.toFixed(1));
        emailsSent++;
      }
    }

    res.json({ message: `Successfully sent ${emailsSent} warning emails.` });

  } catch (error) {
    console.error('Trigger warning error:', error);
    res.status(500).json({ message: 'Server error sending warnings' });
  }
};

module.exports = {
  triggerWarnings
};
