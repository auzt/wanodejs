const logger = require('../utils/logger');
const { listSessions } = require('../utils/sessionUtils');
const { createWAConnection } = require('./waConnection');
const cron = require('node-cron');

// Store all active WhatsApp sessions
const sessions = new Map();

// Store QR codes for each session
const qrCodes = new Map();

/**
 * Remove QR code for a session
 * @param {string} sessionId - Session identifier
 */
const removeQRCode = (sessionId) => {
    qrCodes.delete(sessionId);
};

/**
 * Initialize existing sessions on server start
 */
const initSessions = async () => {
    try {
        // Get all session IDs from directory
        const sessionIds = listSessions();
        logger.info(`Found ${sessionIds.length} existing sessions`);

        // Initialize each session
        for (const sessionId of sessionIds) {
            logger.info(`Initializing session: ${sessionId}`);
            await createSession(sessionId);
        }

        // Setup cron job to send keep-alive pings
        setupKeepAliveJob();
    } catch (error) {
        logger.error(`Error initializing sessions: ${error.message}`);
    }
};

/**
 * Create a new WhatsApp session
 * @param {string} sessionId - Session identifier
 * @returns {Object} - Session connection object
 */
const createSession = async (sessionId) => {
    try {
        if (sessions.has(sessionId)) {
            logger.info(`Session ${sessionId} already exists`);
            return sessions.get(sessionId);
        }

        // Create new WhatsApp connection
        const waConnection = await createWAConnection(sessionId, (qr) => {
            // Store QR code for frontend to fetch
            qrCodes.set(sessionId, qr);
        }, removeQRCode); // Pass the removeQRCode function directly

        // Store session
        sessions.set(sessionId, waConnection);

        logger.info(`Session ${sessionId} created successfully`);
        return waConnection;
    } catch (error) {
        logger.error(`Error creating session ${sessionId}: ${error.message}`);
        throw error;
    }
};

/**
 * Get a WhatsApp session by ID
 * @param {string} sessionId - Session identifier
 * @returns {Object|null} - Session connection object
 */
const getSession = (sessionId) => {
    return sessions.get(sessionId) || null;
};

/**
 * Get QR code for a session
 * @param {string} sessionId - Session identifier
 * @returns {string|null} - QR code data URL
 */
const getQRCode = (sessionId) => {
    return qrCodes.get(sessionId) || null;
};

/**
 * Close and remove a session
 * @param {string} sessionId - Session identifier
 */
const closeSession = async (sessionId) => {
    try {
        const session = sessions.get(sessionId);

        if (session) {
            // Logout and close connection
            await session.logout();
            sessions.delete(sessionId);
            qrCodes.delete(sessionId);
            logger.info(`Session ${sessionId} closed and removed`);
        }
    } catch (error) {
        logger.error(`Error closing session ${sessionId}: ${error.message}`);
        // Force remove from sessions map even if error occurs
        sessions.delete(sessionId);
        qrCodes.delete(sessionId);
    }
};

/**
 * Get all active sessions
 * @returns {Array} - Array of session objects
 */
const getAllSessions = () => {
    const sessionsList = [];

    sessions.forEach((connection, sessionId) => {
        sessionsList.push({
            id: sessionId,
            connected: connection.isConnected,
            phoneNumber: connection.user?.id || ''
        });
    });

    return sessionsList;
};

/**
 * Setup cron job to keep connections alive
 */
const setupKeepAliveJob = () => {
    // Run every 2 minutes
    cron.schedule('*/2 * * * *', async () => {
        logger.debug('Running keep-alive job for WhatsApp sessions');

        for (const [sessionId, connection] of sessions.entries()) {
            try {
                if (connection.isConnected) {
                    // Send keep-alive ping, with better error handling
                    try {
                        // First, update presence
                        await connection.sendPresenceUpdate('available');

                        // Get the server time to ensure the server is still responsive
                        await connection.query({
                            tag: 'iq',
                            attrs: {
                                to: "@s.whatsapp.net",
                                type: 'get',
                                xmlns: 'w:g2'
                            },
                            content: [{ tag: 'time', attrs: {} }]
                        });

                        logger.debug(`Keep-alive sent for session ${sessionId}`);
                    } catch (pingError) {
                        logger.error(`Keep-alive error for session ${sessionId}: ${pingError.message}`, {
                            sessionId,
                            trace: pingError.stack
                        });

                        // If the ping fails, check if it's a serious error
                        if (pingError.message.includes('Connection was lost') ||
                            pingError.message.includes('Timed Out')) {
                            // Connection is probably dead, try to force reconnect
                            logger.warn(`Connection may be dead for session ${sessionId}, marking as disconnected`);
                            connection.isConnected = false;
                        }
                    }
                } else {
                    logger.debug(`Session ${sessionId} is not connected, skipping keep-alive`);
                }
            } catch (error) {
                logger.error(`Error in keep-alive job for session ${sessionId}: ${error.message}`, {
                    sessionId,
                    trace: error.stack
                });
            }
        }
    });
};

module.exports = {
    sessions,
    qrCodes,
    initSessions,
    createSession,
    getSession,
    getQRCode,
    removeQRCode,
    closeSession,
    getAllSessions
};