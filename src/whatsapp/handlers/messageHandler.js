const logger = require('../../utils/logger');
const { sendMessageWebhook } = require('../../services/webhookService');
const { extractPhoneNumber } = require('../../helpers/formatter');

/**
 * Handle incoming WhatsApp messages
 * @param {string} sessionId - Session identifier
 * @param {Object} socket - WhatsApp socket instance
 * @param {Object} messagesUpsert - Messages upsert object
 */
const messageHandler = async (sessionId, socket, messagesUpsert) => {
    try {
        // Only process new messages
        if (messagesUpsert.type !== 'notify') return;

        const messages = messagesUpsert.messages || [];

        for (const message of messages) {
            // Skip if not a real message or if from self
            if (!message.message || message.key.fromMe) continue;

            // Get message details
            const msgType = Object.keys(message.message)[0];
            const from = message.key.remoteJid;
            const sender = extractPhoneNumber(from);
            const timestamp = message.messageTimestamp * 1000; // Convert to milliseconds

            // Get message content based on type
            let content = '';
            let mediaUrl = null;
            let caption = null;

            if (msgType === 'conversation') {
                content = message.message.conversation;
            } else if (msgType === 'extendedTextMessage') {
                content = message.message.extendedTextMessage.text;
            } else if (msgType === 'imageMessage') {
                content = '[Image]';
                caption = message.message.imageMessage.caption;
                // Handle image download if needed
            } else if (msgType === 'documentMessage') {
                content = '[Document]';
                caption = message.message.documentMessage.caption;
                // Handle document download if needed
            } else if (msgType === 'audioMessage') {
                content = '[Audio]';
                // Handle audio download if needed
            } else if (msgType === 'videoMessage') {
                content = '[Video]';
                caption = message.message.videoMessage.caption;
                // Handle video download if needed
            } else if (msgType === 'locationMessage') {
                const { degreesLatitude, degreesLongitude } = message.message.locationMessage;
                content = `[Location: ${degreesLatitude},${degreesLongitude}]`;
            } else {
                content = `[${msgType}]`;
            }

            // Log message
            logger.info(`New message from ${sender} to ${sessionId}: ${content}`);

            // Prepare message data for webhook
            const messageData = {
                sessionId,
                messageId: message.key.id,
                timestamp,
                from: sender,
                fromJid: from,
                type: msgType,
                content,
                caption,
                mediaUrl,
                rawMessage: message // Include raw message for additional processing
            };

            // Send webhook notification
            await sendMessageWebhook(messageData);

            // Send read receipt after delay if enabled
            if (process.env.WA_READ_MESSAGES !== 'false') {
                const readDelay = parseInt(process.env.WA_READ_DELAY || '2000');

                setTimeout(async () => {
                    try {
                        // Send read receipt
                        await socket.readMessages([message.key]);
                        logger.debug(`Read receipt sent for message from ${sender}`);
                    } catch (readError) {
                        logger.error(`Error sending read receipt: ${readError.message}`);
                    }
                }, readDelay);
            }
        }
    } catch (error) {
        logger.error(`Error in message handler for session ${sessionId}: ${error.message}`);
    }
};

module.exports = { messageHandler };