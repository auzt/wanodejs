/**
 * Improved connection handler that handles WhatsApp connection events
 */
const logger = require('../../utils/logger');
const { sendConnectionWebhook } = require('../../services/webhookService');

/**
 * Handle WhatsApp connection updates with improved reconnection logic
 * @param {string} sessionId - Session identifier
 * @param {Object} socket - WhatsApp socket instance
 * @param {Object} update - Connection update object
 */
const connectionHandler = async (sessionId, socket, update) => {
    try {
        const { connection, lastDisconnect, receivedPendingNotifications } = update;

        // Prepare connection status data for webhook
        let connectionStatus = {
            sessionId,
            timestamp: Date.now(),
            status: connection || 'unknown',
            error: null
        };

        // Add error information if available
        if (lastDisconnect?.error) {
            connectionStatus.error = {
                message: lastDisconnect.error.message,
                statusCode: lastDisconnect.error.output?.statusCode,
                stack: lastDisconnect.error.stack
            };

            logger.error(`Connection error for session ${sessionId}: ${lastDisconnect.error.message}`, {
                sessionId,
                trace: lastDisconnect.error.stack
            });
        }

        // Log connection status
        switch (connection) {
            case 'connecting':
                logger.info(`Session ${sessionId} is connecting...`);
                break;

            case 'open':
                logger.info(`Session ${sessionId} connected successfully`);

                // Try to mark WhatsApp as online when connected
                try {
                    await socket.sendPresenceUpdate('available');
                    logger.debug(`Set presence to available for session ${sessionId}`);
                } catch (err) {
                    logger.warn(`Failed to set presence for session ${sessionId}: ${err.message}`);
                }

                // Add user details to connection status
                if (socket.user) {
                    connectionStatus.user = {
                        id: socket.user.id,
                        name: socket.user.name
                    };
                }
                break;

            case 'close':
                logger.info(`Session ${sessionId} disconnected`);
                break;

            default:
                // Handle other connection events
                if (receivedPendingNotifications) {
                    logger.info(`Session ${sessionId} received pending notifications`);
                }
        }

        // Send webhook notification about connection status
        await sendConnectionWebhook(connectionStatus);
    } catch (error) {
        logger.error(`Error in connection handler for session ${sessionId}: ${error.message}`, {
            sessionId,
            trace: error.stack
        });
    }
};

module.exports = { connectionHandler };