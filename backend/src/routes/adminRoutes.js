const express = require('express');
const router = express.Router();
const { createUser, getAllUsers, getAllTeachers, getAllStudents, updateUserStatus, getAllDevices } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// Apply middleware to all routes
router.use(protect);
router.use(authorize('admin'));

router.post('/users', createUser);
router.get('/users', getAllUsers);
router.get('/teachers', getAllTeachers);
router.get('/students', getAllStudents);
router.get('/devices', getAllDevices);
router.patch('/users/:id/status', updateUserStatus);

module.exports = router;
