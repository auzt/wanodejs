const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Authentication middleware to validate JWT token
 */
const authMiddleware = (req, res, next) => {
    try {
        // Get the authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                status: 'error',
                message: 'Unauthorized: Authentication token is required'
            });
        }

        // Extract the token
        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'Unauthorized: Authentication token is required'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user information to request object
        req.user = decoded;

        next();
    } catch (error) {
        logger.error(`Authentication error: ${error.message}`);
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized: Invalid authentication token'
        });
    }
};

/**
 * API Key authentication middleware (alternative to JWT)
 */
const apiKeyAuth = (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];

        if (!apiKey || apiKey !== process.env.API_KEY) {
            return res.status(401).json({
                status: 'error',
                message: 'Unauthorized: Invalid API Key'
            });
        }

        next();
    } catch (error) {
        logger.error(`API Key authentication error: ${error.message}`);
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized: Authentication failed'
        });
    }
};

module.exports = { authMiddleware, apiKeyAuth };