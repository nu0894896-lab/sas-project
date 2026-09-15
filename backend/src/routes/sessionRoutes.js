const express = require('express');
const router = express.Router();
const { startSession, endSession, getActiveSession } = require('../controllers/sessionController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/start', authorize('teacher'), startSession);
router.post('/end/:id', authorize('teacher'), endSession);
router.get('/active/:courseId', getActiveSession); // Both student and teacher

module.exports = router;
