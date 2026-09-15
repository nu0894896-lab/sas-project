const express = require('express');
const router = express.Router();
const { getTeachers, getTeacherProfile } = require('../controllers/teacherController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Admin can list teachers
router.get('/', authorize('admin'), getTeachers);

// Teacher can view their own profile
router.get('/me', authorize('teacher'), getTeacherProfile);

module.exports = router;
