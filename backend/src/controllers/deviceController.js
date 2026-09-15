const db = require('../db');

// @desc    Register a student device
// @route   POST /api/devices/register
// @access  Private (Student)
const registerDevice = async (req, res) => {
  const { device_identifier, device_model } = req.body;

  if (!device_identifier) {
    return res.status(400).json({ message: 'Device identifier is required' });
  }

  try {
    // 1. Get the student's ID from their user_id
    const studentResult = await db.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Student profile not found' });
    }
    const studentId = studentResult.rows[0].id;

    // 2. Check if the device identifier is already registered by someone else
    const existingDeviceResult = await db.query('SELECT * FROM devices WHERE device_identifier = $1', [device_identifier]);
    if (existingDeviceResult.rows.length > 0) {
      return res.status(400).json({ message: 'This device is already registered to an account' });
    }

    // 3. Register the device (The DB unique constraint on student_id will block >1 device per student)
    const result = await db.query(
      'INSERT INTO devices (student_id, device_identifier, device_model) VALUES ($1, $2, $3) RETURNING *',
      [studentId, device_identifier, device_model]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    if (error.code === '23505' && error.constraint === 'devices_student_id_key') {
      return res.status(400).json({ message: 'You already have a registered device. Please contact an admin to reset it.' });
    }
    console.error('Register device error:', error);
    res.status(500).json({ message: 'Server error registering device' });
  }
};

// @desc    Get my registered device
// @route   GET /api/devices/my-device
// @access  Private (Student)
const getMyDevice = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT d.* 
      FROM devices d
      JOIN students s ON d.student_id = s.id
      WHERE s.user_id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No registered device found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get my device error:', error);
    res.status(500).json({ message: 'Server error retrieving device' });
  }
};

// @desc    Revoke a student's device
// @route   DELETE /api/devices/:id
// @access  Private (Admin)
const revokeDevice = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM devices WHERE id = $1 RETURNING *', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Device not found' });
    }

    res.json({ message: 'Device revoked successfully', device: result.rows[0] });
  } catch (error) {
    console.error('Revoke device error:', error);
    res.status(500).json({ message: 'Server error revoking device' });
  }
};

module.exports = {
  registerDevice,
  getMyDevice,
  revokeDevice
};
