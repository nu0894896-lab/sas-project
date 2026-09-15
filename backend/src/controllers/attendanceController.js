const db = require('../db');
const { verifyDeviceOwnership, verifyBiometricClaim, verifyProximityClaim } = require('../utils/verificationHelper');

// @desc    Mark attendance
// @route   POST /api/attendance/mark
// @access  Private (Student)
const markAttendance = async (req, res) => {
  const { session_id, device_identifier, proximity_token, biometric_passed } = req.body;

  if (!session_id || !device_identifier || !proximity_token || biometric_passed === undefined) {
    return res.status(400).json({ message: 'Missing required attendance data' });
  }

  try {
    // 1. Get student ID
    const studentResult = await db.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Student profile not found' });
    }
    const studentId = studentResult.rows[0].id;

    // 2. Validate session is active
    const sessionResult = await db.query('SELECT * FROM attendance_sessions WHERE id = $1', [session_id]);
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' });
    }
    const session = sessionResult.rows[0];
    if (session.status !== 'active') {
      return res.status(400).json({ message: 'Session expired' });
    }

    // 3. Perform Verifications (Proximity, Biometric, Device)
    let isPresent = true;
    let failReason = '';

    const isDeviceValid = await verifyDeviceOwnership(req.user.id, device_identifier);
    if (!isDeviceValid) {
      isPresent = false;
      failReason = 'Device verification failed. You must use your registered device.';
    }

    const isProximityValid = verifyProximityClaim(proximity_token, session.proximity_token);
    if (!isProximityValid) {
      isPresent = false;
      failReason = 'Proximity verification failed. Invalid token.';
    }

    const isBiometricValid = verifyBiometricClaim(biometric_passed);
    if (!isBiometricValid) {
      isPresent = false;
      failReason = 'Biometric verification failed.';
    }

    const attendanceStatus = isPresent ? 'Present' : 'Failed';

    // 4. Record Attendance
    const result = await db.query(
      'INSERT INTO attendance_records (session_id, student_id, status) VALUES ($1, $2, $3) RETURNING *',
      [session_id, studentId, attendanceStatus]
    );

    if (isPresent) {
      res.status(201).json({ message: 'Attendance marked successfully', record: result.rows[0] });
    } else {
      res.status(400).json({ message: failReason, record: result.rows[0] });
    }

  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ message: 'You have already attempted to mark attendance for this session' });
    }
    console.error('Mark attendance error:', error);
    res.status(500).json({ message: 'Server error marking attendance' });
  }
};

module.exports = {
  markAttendance
};
