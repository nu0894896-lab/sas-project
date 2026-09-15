const express = require('express');
const router = express.Router();
const { getStudents, getStudentProfile } = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Admin and Teacher can list students
router.get('/', authorize('admin', 'teacher'), getStudents);

// Student can view their own profile
router.get('/me', authorize('student'), getStudentProfile);

module.exports = router;
