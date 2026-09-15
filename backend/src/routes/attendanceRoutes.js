const express = require('express');
const router = express.Router();
const { markAttendance } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/mark', authorize('student'), markAttendance);

module.exports = router;
