/**
 * Validate phone number
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - True if valid
 */
const isValidPhoneNumber = (phoneNumber) => {
    // Basic validation for phone numbers
    // Accepts formats: 081234567890, 6281234567890, +6281234567890
    const phoneRegex = /^(\+?62|0)[0-9]{9,12}$/;
    return phoneRegex.test(phoneNumber);
};

/**
 * Validate session ID
 * @param {string} sessionId - Session ID to validate
 * @returns {boolean} - True if valid
 */
const isValidSessionId = (sessionId) => {
    // Session ID should be alphanumeric with optional dashes or underscores
    const sessionIdRegex = /^[a-zA-Z0-9\-_]{3,50}$/;
    return sessionIdRegex.test(sessionId);
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid
 */
const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
};

module.exports = {
    isValidPhoneNumber,
    isValidSessionId,
    isValidUrl
};