const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Send webhook notification for incoming messages
 * @param {Object} data - Message data 
 */
const sendMessageWebhook = async (data) => {
    try {
        if (!process.env.WEBHOOK_MESSAGE_URL) {
            logger.warn('Message webhook URL not configured');
            return;
        }

        await axios.post(process.env.WEBHOOK_MESSAGE_URL, data, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.API_KEY
            },
            timeout: 5000 // 5 seconds timeout
        });

        logger.debug(`Message webhook sent: ${JSON.stringify(data)}`);
    } catch (error) {
        logger.error(`Failed to send message webhook: ${error.message}`);
    }
};

/**
 * Send webhook notification for connection status changes
 * @param {Object} data - Connection status data
 */
const sendConnectionWebhook = async (data) => {
    try {
        if (!process.env.WEBHOOK_CONNECTION_URL) {
            logger.warn('Connection webhook URL not configured');
            return;
        }

        await axios.post(process.env.WEBHOOK_CONNECTION_URL, data, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.API_KEY
            },
            timeout: 5000 // 5 seconds timeout
        });

        logger.debug(`Connection webhook sent: ${JSON.stringify(data)}`);
    } catch (error) {
        logger.error(`Failed to send connection webhook: ${error.message}`);
    }
};

module.exports = {
    sendMessageWebhook,
    sendConnectionWebhook
};