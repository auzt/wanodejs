const {
    createSession,
    getSession,
    getQRCode,
    closeSession,
    getAllSessions: getSessions
} = require('../whatsapp/sessions');
const {
    sessionExists,
    removeSessionDirectory,
    createSessionDirectory
} = require('../utils/sessionUtils');
const {
    isValidPhoneNumber,
    isValidSessionId,
    isValidUrl
} = require('../helpers/validator');
const { formatPhoneNumber } = require('../helpers/formatter');
const { isWhatsAppNumber } = require('../utils/whatsappValidator');
const { simulateTyping } = require('../utils/typingUtils');
const logger = require('../utils/logger');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Get all active sessions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const listAllSessions = async (req, res) => {
    try {
        const sessions = getSessions();

        res.status(200).json({
            status: 'success',
            data: {
                count: sessions.length,
                sessions
            }
        });
    } catch (error) {
        logger.error(`Error getting sessions: ${error.message}`);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get sessions',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Initialize new session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const initSession = async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId || !isValidSessionId(sessionId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid session ID. Use only alphanumeric characters, dashes, and underscores (3-50 chars).'
            });
        }

        // Check if session already exists
        if (getSession(sessionId)) {
            return res.status(400).json({
                status: 'error',
                message: `Session ${sessionId} already exists`
            });
        }

        // Create session directory
        createSessionDirectory(sessionId);

        // Initialize session
        await createSession(sessionId);

        res.status(201).json({
            status: 'success',
            message: `Session ${sessionId} initialized successfully`,
            data: {
                sessionId
            }
        });
    } catch (error) {
        logger.error(`Error initializing session: ${error.message}`);
        res.status(500).json({
            status: 'error',
            message: 'Failed to initialize session',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get session status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSessionStatus = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!isValidSessionId(sessionId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid session ID'
            });
        }

        const session = getSession(sessionId);

        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: `Session ${sessionId} not found`
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                sessionId,
                connected: session.isConnected,
                phoneNumber: session.user?.id ? session.user.id.split('@')[0] : null,
                user: session.user
            }
        });
    } catch (error) {
        logger.error(`Error getting session status: ${error.message}`);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get session status',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get QR code for session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getQRCodeData = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!isValidSessionId(sessionId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid session ID'
            });
        }

        // Get session
        const session = getSession(sessionId);

        // Check if session exists
        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: `Session ${sessionId} not found`
            });
        }

        // Check if already connected
        if (session.isConnected) {
            return res.status(400).json({
                status: 'error',
                message: `Session ${sessionId} is already connected`
            });
        }

        // Get QR code
        const qrCode = getQRCode(sessionId);

        if (!qrCode) {
            return res.status(404).json({
                status: 'error',
                message: 'QR code not available yet. Try again in a few seconds.'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                qrCode
            }
        });
    } catch (error) {
        logger.error(`Error getting QR code: ${error.message}`);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get QR code',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Reconnect session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const reconnectSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!isValidSessionId(sessionId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid session ID'
            });
        }

        // Check if session exists
        if (!sessionExists(sessionId)) {
            return res.status(404).json({
                status: 'error',
                message: `Session ${sessionId} not found`
            });
        }

        // Close existing session if it exists
        const existingSession = getSession(sessionId);
        if (existingSession) {
            await closeSession(sessionId);
        }

        // Create new session
        await createSession(sessionId);

        res.status(200).json({
            status: 'success',
            message: `Session ${sessionId} reconnecting`,
            data: {
                sessionId
            }
        });
    } catch (error) {
        logger.error(`Error reconnecting session: ${error.message}`);
        res.status(500).json({
            status: 'error',
            message: 'Failed to reconnect session',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Disconnect session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const disconnectSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!isValidSessionId(sessionId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid session ID'
            });
        }

        const session = getSession(sessionId);

        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: `Session ${sessionId} not found`
            });
        }

        // Close session
        await closeSession(sessionId);

        res.status(200).json({
            status: 'success',
            message: `Session ${sessionId} disconnected`
        });
    } catch (error) {
        logger.error(`Error disconnecting session: ${error.message}`);
        res.status(500).json({
            status: 'error',
            message: 'Failed to disconnect session',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Delete session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!isValidSessionId(sessionId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid session ID'
            });
        }

        // Close session if active
        const session = getSession(sessionId);
        if (session) {
            await closeSession(sessionId);
        }

        // Remove session directory
        if (sessionExists(sessionId)) {
            removeSessionDirectory(sessionId);
        }

        res.status(200).json({
            status: 'success',
            message: `Session ${sessionId} deleted`
        });
    } catch (error) {
        logger.error(`Error deleting session: ${error.message}`);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete session',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Send text message
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendTextMessage = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { phoneNumber, message } = req.body;

        if (!isValidSessionId(sessionId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid session ID'
            });
        }

        if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid phone number'
            });
        }

        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                status: 'error',
                message: 'Message is required'
            });
        }

        const session = getSession(sessionId);

        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: `Session ${sessionId} not found`
            });
        }

        if (!session.isConnected) {
            return res.status(400).json({
                status: 'error',
                message: `Session ${sessionId} is not connected`
            });
        }

        // Format phone number
        const formattedNumber = formatPhoneNumber(phoneNumber);

        // Check if number exists on WhatsApp
        const exists = await isWhatsAppNumber(session, phoneNumber);

        if (!exists) {
            return res.status(400).json({
                status: 'error',
                message: `The number ${phoneNumber} is not registered on WhatsApp`
            });
        }

        // Respond immediately to client
        res.status(200).json({
            status: 'success',
            message: 'Message queued successfully',
            data: {
                to: phoneNumber,
                timestamp: new Date().toISOString()
            }
        });

        // Simulate typing before sending
        await simulateTyping(session, formattedNumber);

        // Send message
        const result = await session.sendMessage(formattedNumber, { text: message });

        logger.info(`Message sent successfully to ${phoneNumber}: ${message.substring(0, 30)}${message.length > 30 ? '...' : ''}`);
    } catch (error) {
        logger.error(`Error sending text message: ${error.message}`);

        // Only respond if headers haven't been sent yet
        if (!res.headersSent) {
            res.status(500).json({
                status: 'error',
                message: 'Failed to send message',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
};

/**
 * Send image message
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendImage = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { phoneNumber, imageUrl, caption } = req.body;

        if (!isValidSessionId(sessionId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid session ID'
            });
        }

        if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid phone number'
            });
        }

        if (!imageUrl || !isValidUrl(imageUrl)) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid image URL is required'
            });
        }

        const session = getSession(sessionId);

        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: `Session ${sessionId} not found`
            });
        }

        if (!session.isConnected) {
            return res.status(400).json({
                status: 'error',
                message: `Session ${sessionId} is not connected`
            });
        }

        // Format phone number
        const formattedNumber = formatPhoneNumber(phoneNumber);

        // Check if number exists on WhatsApp
        const exists = await isWhatsAppNumber(session, phoneNumber);

        if (!exists) {
            return res.status(400).json({
                status: 'error',
                message: `The number ${phoneNumber} is not registered on WhatsApp`
            });
        }

        // Download image from URL
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');

        // Respond immediately to client
        res.status(200).json({
            status: 'success',
            message: 'Image queued successfully',
            data: {
                to: phoneNumber,
                timestamp: new Date().toISOString()
            }
        });

        // Simulate typing before sending
        await simulateTyping(session, formattedNumber);

        // Send image
        const result = await session.sendMessage(formattedNumber, {
            image: buffer,
            caption: caption || ''
        });

        logger.info(`Image sent successfully to ${phoneNumber}`);
    } catch (error) {
        logger.error(`Error sending image: ${error.message}`);

        // Only respond if headers haven't been sent yet
        if (!res.headersSent) {
            res.status(500).json({
                status: 'error',
                message: 'Failed to send image',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
};

/**
 * Send file message
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendFile = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { phoneNumber, fileUrl, fileName, caption } = req.body;

        if (!isValidSessionId(sessionId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid session ID'
            });
        }

        if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid phone number'
            });
        }

        if (!fileUrl || !isValidUrl(fileUrl)) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid file URL is required'
            });
        }

        const session = getSession(sessionId);

        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: `Session ${sessionId} not found`
            });
        }

        if (!session.isConnected) {
            return res.status(400).json({
                status: 'error',
                message: `Session ${sessionId} is not connected`
            });
        }

        // Format phone number
        const formattedNumber = formatPhoneNumber(phoneNumber);

        // Check if number exists on WhatsApp
        const exists = await isWhatsAppNumber(session, phoneNumber);

        if (!exists) {
            return res.status(400).json({
                status: 'error',
                message: `The number ${phoneNumber} is not registered on WhatsApp`
            });
        }

        // Download file from URL
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');

        // Get file mimetype based on extension
        const displayFileName = fileName || path.basename(fileUrl);
        const extension = path.extname(displayFileName).toLowerCase();
        let mimetype = 'application/octet-stream'; // Default mimetype

        // Map common extensions to mimetypes
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.mp3': 'audio/mpeg',
            '.mp4': 'video/mp4',
            '.txt': 'text/plain'
        };

        if (mimeTypes[extension]) {
            mimetype = mimeTypes[extension];
        }

        // Respond immediately to client
        res.status(200).json({
            status: 'success',
            message: 'File queued successfully',
            data: {
                to: phoneNumber,
                fileName: displayFileName,
                timestamp: new Date().toISOString()
            }
        });

        // Simulate typing before sending
        await simulateTyping(session, formattedNumber);

        // Send document
        const result = await session.sendMessage(formattedNumber, {
            document: buffer,
            mimetype,
            fileName: displayFileName,
            caption: caption || ''
        });

        logger.info(`File sent successfully to ${phoneNumber}: ${displayFileName}`);
    } catch (error) {
        logger.error(`Error sending file: ${error.message}`);

        // Only respond if headers haven't been sent yet
        if (!res.headersSent) {
            res.status(500).json({
                status: 'error',
                message: 'Failed to send file',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
};

/**
 * Check if phone number exists on WhatsApp
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const checkWhatsAppNumber = async (req, res) => {
    try {
        const { sessionId, phoneNumber } = req.params;

        if (!isValidSessionId(sessionId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid session ID'
            });
        }

        if (!isValidPhoneNumber(phoneNumber)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid phone number'
            });
        }

        const session = getSession(sessionId);

        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: `Session ${sessionId} not found`
            });
        }

        if (!session.isConnected) {
            return res.status(400).json({
                status: 'error',
                message: `Session ${sessionId} is not connected`
            });
        }

        // Check if number exists on WhatsApp
        const exists = await isWhatsAppNumber(session, phoneNumber);

        res.status(200).json({
            status: 'success',
            data: {
                phoneNumber,
                exists,
                formattedNumber: formatPhoneNumber(phoneNumber).replace('@s.whatsapp.net', '')
            }
        });
    } catch (error) {
        logger.error(`Error checking WhatsApp number: ${error.message}`);
        res.status(500).json({
            status: 'error',
            message: 'Failed to check WhatsApp number',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getAllSessions: listAllSessions,
    initSession,
    getSessionStatus,
    getQRCode: getQRCodeData,
    reconnectSession,
    disconnectSession,
    deleteSession,
    sendTextMessage,
    sendImage,
    sendFile,
    checkWhatsAppNumber
};