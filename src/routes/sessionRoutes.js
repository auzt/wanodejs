const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const sessionController = require('../controllers/sessionController');

const router = express.Router();

// Protected routes (require authentication)
router.use(authMiddleware);

// Get all sessions
router.get('/', sessionController.getAllSessions);

// Get session status
router.get('/:sessionId/status', sessionController.getSessionStatus);

// Initialize new session
router.post('/init', sessionController.initSession);

// Get QR Code for session
router.get('/:sessionId/qr', sessionController.getQRCode);

// Reconnect session
router.post('/:sessionId/reconnect', sessionController.reconnectSession);

// Disconnect session
router.post('/:sessionId/disconnect', sessionController.disconnectSession);

// Delete session
router.delete('/:sessionId', sessionController.deleteSession);

// Check if phone number exists on WhatsApp
router.get('/:sessionId/check-number/:phoneNumber', sessionController.checkWhatsAppNumber);

// Send text message
router.post('/:sessionId/send-message', sessionController.sendTextMessage);

// Send image
router.post('/:sessionId/send-image', sessionController.sendImage);

// Send file
router.post('/:sessionId/send-file', sessionController.sendFile);

module.exports = router;