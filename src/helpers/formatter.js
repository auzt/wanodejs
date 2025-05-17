/**
 * Format phone number to standard format
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} - Formatted phone number
 */
const formatPhoneNumber = (phoneNumber) => {
    // Remove any non-numeric characters
    let number = phoneNumber.replace(/\D/g, '');

    // Check if number has country code
    if (number.startsWith('0')) {
        // Replace leading 0 with 62 (Indonesia country code)
        number = '62' + number.substring(1);
    } else if (!number.startsWith('62')) {
        // Add Indonesia country code if not present
        number = '62' + number;
    }

    // Add @s.whatsapp.net suffix for WhatsApp IDs
    return `${number}@s.whatsapp.net`;
};

/**
 * Extract phone number from WhatsApp ID
 * @param {string} whatsappId - WhatsApp ID (e.g., 6281234567890@s.whatsapp.net)
 * @returns {string} - Extracted phone number
 */
const extractPhoneNumber = (whatsappId) => {
    if (!whatsappId) return '';

    // Remove the @s.whatsapp.net or @g.us suffix
    const parts = whatsappId.split('@');
    return parts[0];
};

/**
 * Format timestamp to readable date time
 * @param {number} timestamp - Timestamp to format
 * @returns {string} - Formatted date time
 */
const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
};

module.exports = {
    formatPhoneNumber,
    extractPhoneNumber,
    formatDateTime
};