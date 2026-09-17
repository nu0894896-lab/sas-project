const express = require('express');
const router = express.Router();
const { 
  startSession, 
  endSession, 
  getActiveSession, 
  getSessionLiveStatus, 
  submitAttendance 
} = require('../controllers/sessionController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/start', authorize('teacher'), startSession);
router.post('/end/:id', authorize('teacher'), endSession);
router.get('/active/:courseId', getActiveSession); // Both student and teacher
router.get('/:id/live-status', authorize('teacher'), getSessionLiveStatus);
router.post('/:id/submit', authorize('teacher'), submitAttendance);

module.exports = router;
