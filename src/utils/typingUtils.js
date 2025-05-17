/**
 * Simulate typing and delay before sending message
 * @param {Object} socket - WhatsApp socket connection
 * @param {string} jid - Recipient JID
 * @returns {Promise<void>}
 */
const simulateTyping = async (socket, jid) => {
    try {
        // Check if typing simulation is enabled
        if (process.env.WA_USE_TYPING === 'false') {
            return;
        }

        // Get configuration from environment variables
        const minDelay = parseInt(process.env.WA_MIN_SEND_DELAY || '2');
        const maxDelay = parseInt(process.env.WA_MAX_SEND_DELAY || '30');
        const typingDuration = parseInt(process.env.WA_TYPING_DURATION || '2000');
        const typingInterval = parseInt(process.env.WA_TYPING_INTERVAL || '1000');

        // Calculate random delay between min and max (in seconds)
        const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay);
        const totalDelay = randomDelay * 1000; // Convert to milliseconds

        // Calculate number of typing sessions needed
        const sessions = Math.floor(totalDelay / (typingDuration + typingInterval));

        // Simulate typing pattern: type for 2 seconds, pause for 1 second, repeat
        for (let i = 0; i < sessions; i++) {
            // Send typing status
            await socket.sendPresenceUpdate('composing', jid);

            // Wait for typing duration
            await new Promise(resolve => setTimeout(resolve, typingDuration));

            // Send paused status
            await socket.sendPresenceUpdate('paused', jid);

            // Wait for interval
            await new Promise(resolve => setTimeout(resolve, typingInterval));
        }

        // Final typing session if there's remaining time
        const remainingTime = totalDelay % (typingDuration + typingInterval);
        if (remainingTime > 0) {
            // Send typing status for remaining time
            await socket.sendPresenceUpdate('composing', jid);
            await new Promise(resolve => setTimeout(resolve, Math.min(remainingTime, typingDuration)));

            // Send paused status if needed
            if (remainingTime > typingDuration) {
                await socket.sendPresenceUpdate('paused', jid);
                await new Promise(resolve => setTimeout(resolve, remainingTime - typingDuration));
            }
        }

        // Final paused status
        await socket.sendPresenceUpdate('paused', jid);
    } catch (error) {
        // Log error but don't interrupt the message sending
        console.error(`Error simulating typing: ${error.message}`);
    }
};

module.exports = { simulateTyping };