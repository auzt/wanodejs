/**
 * Check if number exists on WhatsApp
 * @param {Object} waSocket - WhatsApp socket connection
 * @param {string} phoneNumber - Phone number to check (with or without country code)
 * @returns {Promise<boolean>} - True if number exists on WhatsApp
 */
const isWhatsAppNumber = async (waSocket, phoneNumber) => {
    try {
        // Format phone number
        let formattedNumber = phoneNumber.replace(/\D/g, '');

        // Add country code if not present
        if (formattedNumber.startsWith('0')) {
            formattedNumber = '62' + formattedNumber.substring(1);
        } else if (!formattedNumber.startsWith('62')) {
            formattedNumber = '62' + formattedNumber;
        }

        // Check if number exists on WhatsApp
        const [result] = await waSocket.onWhatsApp(formattedNumber);

        // Return true if exists
        return result?.exists || false;
    } catch (error) {
        console.error(`Error checking WhatsApp number: ${error.message}`);
        return false;
    }
};

module.exports = { isWhatsAppNumber };