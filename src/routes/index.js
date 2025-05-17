const express = require('express');
const sessionRoutes = require('./sessionRoutes');
const { apiRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Apply rate limiter to all routes
router.use(apiRateLimiter);

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Server is running'
    });
});

// WhatsApp session routes
router.use('/session', sessionRoutes);

module.exports = router;