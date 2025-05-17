const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { createSessionDirectory, getSessionPath } = require('../utils/sessionUtils');
const { connectionHandler } = require('./handlers/connectionHandler');
const { messageHandler } = require('./handlers/messageHandler');

/**
 * Create WhatsApp connection with optimized parameters
 * @param {string} sessionId - Session identifier
 * @param {Function} qrCallback - Callback function to handle QR code
 * @param {Function} removeQRCallback - Callback to remove QR code
 * @returns {Object} - WhatsApp connection object
 */
const createWAConnection = async (sessionId, qrCallback, removeQRCallback) => {
    try {
        // Create session directory if it doesn't exist
        createSessionDirectory(sessionId);

        // Delete auth-info-multi.json if it's corrupted
        const authPath = path.join(getSessionPath(sessionId), 'auth-info-multi.json');
        if (fs.existsSync(authPath)) {
            try {
                const authContent = fs.readFileSync(authPath, 'utf8');
                JSON.parse(authContent); // Test if valid JSON
            } catch (e) {
                logger.warn(`Found corrupted auth file for ${sessionId}, removing it`);
                fs.unlinkSync(authPath);
            }
        }

        // Get session auth state
        const { state, saveCreds } = await useMultiFileAuthState(getSessionPath(sessionId));

        // Create optimized socket options
        const socketOptions = {
            auth: state,
            printQRInTerminal: false,
            // Browser ID that mimics popular phones to avoid blocks
            browser: ['Chrome (Linux)', 'Chrome', '110.0.5481.177'],
            // Increased timeouts for better stability
            connectTimeoutMs: 120000,
            keepAliveIntervalMs: 50000,
            defaultQueryTimeoutMs: 120000,
            // Maximum retries
            maxRetries: 5,
            // Don't sync history to save bandwidth
            syncFullHistory: false,
            // Mark online to keep connection active
            markOnlineOnConnect: true,
            // Bail connection on retries to force fresh connection
            retryRequestDelayMs: 3000,
            // Disable unused features
            generateHighQualityLinkPreview: false,
            // Transport options
            transactionOpts: {
                maxCommitRetries: 10,
                delayBetweenTriesMs: 3000
            },
            // More frequent pings to WhatsApp to keep connection alive
            patchMessageBeforeSending: true,
            // Ignore broadcast messages
            shouldIgnoreJid: jid => jid.includes('@broadcast'),
            // Retry failed messages
            maxMsgRetryCount: 5,
            // Use Pino logger child method
            logger: logger.child({ sessionId })
        };

        // Create WhatsApp socket
        const socket = makeWASocket(socketOptions);

        // Add flag to track connection state
        socket.isConnected = false;

        // Setup connection event handler
        socket.ev.on('connection.update', async (update) => {
            try {
                const qrCodeTimeout = parseInt(process.env.WA_QR_TIMEOUT) || 60000;
                const { connection, lastDisconnect, qr } = update;

                // Handle connection events
                connectionHandler(sessionId, socket, update);

                // Handle QR code
                if (qr) {
                    try {
                        // Convert QR to data URL for frontend
                        const qrDataURL = await qrcode.toDataURL(qr);

                        // Call QR callback with QR data URL
                        if (typeof qrCallback === 'function') {
                            qrCallback(qrDataURL);
                        }

                        // Set timeout to clear QR after specified time
                        setTimeout(() => {
                            if (typeof removeQRCallback === 'function') {
                                removeQRCallback(sessionId);
                            }
                        }, qrCodeTimeout);
                    } catch (qrError) {
                        logger.error(`Error generating QR code: ${qrError.message}`);
                    }
                }

                // Handle successful connection
                if (connection === 'open') {
                    socket.isConnected = true;

                    // Remove QR when connected
                    if (typeof removeQRCallback === 'function') {
                        removeQRCallback(sessionId);
                    }

                    // Send immediate "available" presence
                    try {
                        await socket.sendPresenceUpdate('available');
                        logger.info(`Session ${sessionId} connected successfully and marked as available`);
                    } catch (err) {
                        logger.warn(`Connected but couldn't set presence for ${sessionId}: ${err.message}`);
                    }
                }

                // Handle disconnection with retries
                if (connection === 'close') {
                    socket.isConnected = false;

                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const errorMessage = lastDisconnect?.error?.message || 'Unknown reason';

                    // Determine if we should reconnect
                    let shouldReconnect = process.env.WA_AUTO_RECONNECT !== 'false';

                    // Don't reconnect if logged out or replaced
                    if (statusCode === DisconnectReason.loggedOut) {
                        shouldReconnect = false;
                        logger.warn(`Session ${sessionId} logged out - will not attempt to reconnect`);
                    } else if (statusCode === DisconnectReason.connectionReplaced) {
                        shouldReconnect = false;
                        logger.warn(`Session ${sessionId} connection replaced - device is connected elsewhere`);
                    }

                    logger.info(`Session ${sessionId} disconnected: ${errorMessage} (code: ${statusCode}) - will ${shouldReconnect ? 'attempt to reconnect' : 'not reconnect'}`);

                    // If there's a specific stream error, we might want to clear session
                    if (errorMessage.includes('Stream Errored') && statusCode === 515) {
                        logger.warn(`Stream error detected for ${sessionId}, session might need to be reset`);
                    }
                }
            } catch (error) {
                logger.error(`Error in connection update handler: ${error.message}`);
            }
        });

        // Setup credentials update event to save auth
        socket.ev.on('creds.update', async () => {
            try {
                await saveCreds();
                logger.debug(`Saved auth credentials for ${sessionId}`);
            } catch (error) {
                logger.error(`Failed to save credentials for ${sessionId}: ${error.message}`);
            }
        });

        // Setup message event handlers
        socket.ev.on('messages.upsert', (messages) => {
            try {
                messageHandler(sessionId, socket, messages);
            } catch (error) {
                logger.error(`Error handling messages for ${sessionId}: ${error.message}`);
            }
        });

        return socket;
    } catch (error) {
        logger.error(`Error creating WhatsApp connection for ${sessionId}: ${error.message}`);
        throw error;
    }
};

module.exports = { createWAConnection };