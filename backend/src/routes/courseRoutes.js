const express = require('express');
const router = express.Router();
const { createCourse, getMyCourses, enrollStudent } = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Admin routes
router.post('/', authorize('admin'), createCourse);
router.post('/enroll', authorize('admin'), enrollStudent);

// Accessible by everyone to see their relevant courses
router.get('/my-courses', getMyCourses);

module.exports = router;
