const express = require('express');
const router = express.Router();
const { submitComplaint } = require('../controllers/adminController'); // Or dedicated complaintController
const { protect } = require('../middleware/auth');

// POST /api/complaints
router.post('/', protect, submitComplaint);

module.exports = router;