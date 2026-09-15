const express = require('express');
const router = express.Router();
const { triggerWarnings } = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/warn/:courseId', authorize('teacher'), triggerWarnings);

module.exports = router;
