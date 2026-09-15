const express = require('express');
const router = express.Router();
const { getCourseReport, getMyAttendance, exportCourseReportCSV } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/course/:courseId', authorize('admin', 'teacher'), getCourseReport);
router.get('/course/:courseId/export', authorize('admin', 'teacher'), exportCourseReportCSV);
router.get('/my-attendance', authorize('student'), getMyAttendance);

module.exports = router;
