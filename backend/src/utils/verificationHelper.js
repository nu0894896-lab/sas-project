const db = require('../db');

/**
 * Validates if the provided device_identifier belongs to the student making the request.
 * 
 * @param {number} userId - The user.id of the student
 * @param {string} deviceIdentifier - The hardware identifier sent by the mobile app
 * @returns {Promise<boolean>} True if valid, False otherwise
 */
const verifyDeviceOwnership = async (userId, deviceIdentifier) => {
  try {
    const existing = await db.query(`
      SELECT d.id, d.device_identifier 
      FROM devices d
      JOIN students s ON d.student_id = s.id
      WHERE s.user_id = $1 AND d.status = 'active'
    `, [userId]);

    // If student has no registered device yet, auto-bind this first device/browser
    if (existing.rows.length === 0) {
      const studentRes = await db.query('SELECT id FROM students WHERE user_id = $1', [userId]);
      if (studentRes.rows.length > 0) {
        await db.query(
          'INSERT INTO devices (student_id, device_identifier, device_model) VALUES ($1, $2, $3)',
          [studentRes.rows[0].id, deviceIdentifier, 'Web Browser Client']
        );
        return true;
      }
    }

    return existing.rows.some(r => r.device_identifier === deviceIdentifier);
  } catch (error) {
    console.error('Error verifying device ownership:', error);
    return false;
  }
};

/**
 * Validates the biometric claim.
 * On the web platform, students verify through an active confirmation prompt or WebAuthn.
 * 
 * @param {boolean} biometricPassed - The claim sent by the client
 * @returns {boolean}
 */
const verifyBiometricClaim = (biometricPassed) => {
  return biometricPassed === true;
};

/**
 * Validates the proximity claim.
 * Supports exact string match or parsed JSON payload from QR scan.
 * 
 * @param {string} studentProximityToken - Token scanned or typed by the student
 * @param {string} sessionProximityToken - The valid token for the active attendance session
 * @returns {boolean}
 */
const verifyProximityClaim = (studentProximityToken, sessionProximityToken) => {
  if (!studentProximityToken || !sessionProximityToken) return false;
  
  let cleanToken = studentProximityToken.toString().trim();
  try {
    // If QR code scanned was JSON: { c_id: 1, token: "XYZ" }
    const parsed = JSON.parse(cleanToken);
    if (parsed && parsed.token) {
      cleanToken = parsed.token.toString().trim();
    }
  } catch (e) {
    // Not JSON, treat as raw token
  }

  return cleanToken.toLowerCase() === sessionProximityToken.toString().trim().toLowerCase();
};

module.exports = {
  verifyDeviceOwnership,
  verifyBiometricClaim,
  verifyProximityClaim
};
