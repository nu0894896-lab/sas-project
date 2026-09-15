const db = require('../db');
const { Parser } = require('json2csv');

// @desc    Export course attendance report as CSV
// @route   GET /api/reports/course/:courseId/export
// @access  Private (Teacher, Admin)
const exportCourseReportCSV = async (req, res) => {
  const courseId = req.params.courseId;

  try {
    if (req.user.role === 'teacher') {
      const teacherResult = await db.query('SELECT id FROM teachers WHERE user_id = $1', [req.user.id]);
      const courseCheck = await db.query('SELECT id FROM courses WHERE id = $1 AND teacher_id = $2', [courseId, teacherResult.rows[0].id]);
      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Not authorized to export this course report' });
      }
    }

    const reportData = await db.query(`
      SELECT 
        u.name AS student_name, 
        s.registration_number,
        COUNT(ar.id) FILTER (WHERE ar.status = 'Present') AS total_present,
        COUNT(DISTINCT asess.id) AS total_sessions
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN attendance_sessions asess ON asess.course_id = e.course_id
      LEFT JOIN attendance_records ar ON ar.session_id = asess.id AND ar.student_id = s.id
      WHERE e.course_id = $1
      GROUP BY u.name, s.registration_number
      ORDER BY u.name ASC
    `, [courseId]);

    const fields = ['student_name', 'registration_number', 'total_present', 'total_sessions'];
    const opts = { fields };
    const parser = new Parser(opts);
    const csv = parser.parse(reportData.rows);

    res.header('Content-Type', 'text/csv');
    res.attachment(`course_${courseId}_attendance.csv`);
    return res.send(csv);
  } catch (error) {
    console.error('CSV Export error:', error);
    res.status(500).json({ message: 'Server error generating CSV' });
  }
};

// @desc    Get course attendance report
// @route   GET /api/reports/course/:courseId
// @access  Private (Teacher, Admin)
const getCourseReport = async (req, res) => {
  const courseId = req.params.courseId;

  try {
    // Only allow teacher assigned to course, or admin
    if (req.user.role === 'teacher') {
      const teacherResult = await db.query('SELECT id FROM teachers WHERE user_id = $1', [req.user.id]);
      const courseCheck = await db.query('SELECT id FROM courses WHERE id = $1 AND teacher_id = $2', [courseId, teacherResult.rows[0].id]);
      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Not authorized to view this course report' });
      }
    }

    const reportData = await db.query(`
      SELECT 
        u.name AS student_name, 
        s.registration_number,
        COUNT(ar.id) FILTER (WHERE ar.status = 'Present') AS total_present,
        COUNT(DISTINCT asess.id) AS total_sessions
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN attendance_sessions asess ON asess.course_id = e.course_id
      LEFT JOIN attendance_records ar ON ar.session_id = asess.id AND ar.student_id = s.id
      WHERE e.course_id = $1
      GROUP BY u.name, s.registration_number
      ORDER BY u.name ASC
    `, [courseId]);

    res.json(reportData.rows);
  } catch (error) {
    console.error('Course report error:', error);
    res.status(500).json({ message: 'Server error generating report' });
  }
};

// @desc    Get my personal attendance history
// @route   GET /api/reports/my-attendance
// @access  Private (Student)
const getMyAttendance = async (req, res) => {
  try {
    const studentResult = await db.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    const studentId = studentResult.rows[0].id;

    const history = await db.query(`
      SELECT c.course_name, asess.start_time, ar.status, ar.marked_at
      FROM attendance_records ar
      JOIN attendance_sessions asess ON ar.session_id = asess.id
      JOIN courses c ON asess.course_id = c.id
      WHERE ar.student_id = $1
      ORDER BY asess.start_time DESC
    `, [studentId]);

    res.json(history.rows);
  } catch (error) {
    console.error('Personal attendance history error:', error);
    res.status(500).json({ message: 'Server error retrieving history' });
  }
};

module.exports = {
  getCourseReport,
  getMyAttendance,
  exportCourseReportCSV
};
