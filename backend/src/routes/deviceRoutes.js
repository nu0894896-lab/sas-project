const express = require('express');
const router = express.Router();
const { registerDevice, getMyDevice, revokeDevice } = require('../controllers/deviceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Student routes
router.post('/register', authorize('student'), registerDevice);
router.get('/my-device', authorize('student'), getMyDevice);

// Admin routes
router.delete('/:id', authorize('admin'), revokeDevice);

module.exports = router;
