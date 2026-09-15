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
    const result = await db.query(`
      SELECT d.id 
      FROM devices d
      JOIN students s ON d.student_id = s.id
      WHERE s.user_id = $1 AND d.device_identifier = $2 AND d.status = 'active'
    `, [userId, deviceIdentifier]);

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verifying device ownership:', error);
    return false;
  }
};

/**
 * Validates the biometric claim.
 * Since the backend does not process raw biometric data (per NFR-06),
 * the mobile client is trusted to perform FaceID/TouchID and send a signed assertion or a boolean flag.
 * In a production scenario, this should verify a cryptographic signature from the device's secure enclave.
 * 
 * @param {boolean} biometricPassed - The claim sent by the device
 * @returns {boolean}
 */
const verifyBiometricClaim = (biometricPassed) => {
  // Placeholder for cryptographic verification logic
  return biometricPassed === true;
};

/**
 * Validates the proximity claim.
 * Depending on the implementation (e.g., dynamic QR code scanning, Bluetooth BLE, Geolocation),
 * this function checks if the student's payload matches the teacher's session requirements.
 * 
 * @param {string} studentProximityToken - Token scanned by the student
 * @param {string} sessionProximityToken - The valid token for the active attendance session
 * @returns {boolean}
 */
const verifyProximityClaim = (studentProximityToken, sessionProximityToken) => {
  if (!studentProximityToken || !sessionProximityToken) return false;
  
  // Simple token matching. Can be expanded to calculate GPS radius.
  return studentProximityToken === sessionProximityToken;
};

module.exports = {
  verifyDeviceOwnership,
  verifyBiometricClaim,
  verifyProximityClaim
};
