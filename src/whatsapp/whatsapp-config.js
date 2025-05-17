/**
 * WhatsApp connection configuration optimized for better stability
 */
const getConnectionOptions = (sessionId) => {
    return {
        // Browser identification
        browser: ['WhatsApp API', 'Chrome', '114.0.5735.199'],

        // Mark presence every 5 seconds to avoid disconnections
        markOnlineOnConnect: true,

        // Connection parameters
        connectTimeoutMs: 100000, // 100 seconds (increased from default)
        defaultQueryTimeoutMs: 100000, // 100 seconds (increased from default)
        keepAliveIntervalMs: 60000, // 60 seconds (less frequent pings)
        emitOwnEvents: false, // Reduce overhead

        // Reconnection parameters
        retryRequestDelayMs: 5000, // Longer delay between retries (5 seconds)
        maxRetries: 10, // More retries for operations

        // Offline queue
        maxMsgRetryCount: 5, // Retry sending messages 5 times

        // Prevent excessive logging and overhead
        syncFullHistory: false, // Don't load full history
        fireInitQueries: true, // Some initialization queries are important

        // Mimic official client
        patchMessageBeforeSending: true,

        // Generate link preview for messages
        generateHighQualityLinkPreview: false,

        // Compression & bandwidth options
        transactionOpts: {
            maxCommitRetries: 10,
            delayBetweenTriesMs: 3000
        },

        // Auto-reconnect configuration
        shouldIgnoreJid: (jid) => {
            return jid.includes('@broadcast')
        }
    };
};

module.exports = { getConnectionOptions };