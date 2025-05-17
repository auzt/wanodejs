const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Get session directory path
 * @param {string} sessionId - Session identifier
 * @returns {string} - Full path to session directory
 */
const getSessionPath = (sessionId) => {
    return path.join(process.cwd(), 'sessions', sessionId);
};

/**
 * Check if session directory exists
 * @param {string} sessionId - Session identifier
 * @returns {boolean} - True if session exists
 */
const sessionExists = (sessionId) => {
    const sessionPath = getSessionPath(sessionId);
    return fs.existsSync(sessionPath);
};

/**
 * Create session directory
 * @param {string} sessionId - Session identifier
 * @returns {boolean} - True if created successfully
 */
const createSessionDirectory = (sessionId) => {
    try {
        const sessionPath = getSessionPath(sessionId);
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
            logger.info(`Created session directory for ${sessionId}`);
        }
        return true;
    } catch (error) {
        logger.error(`Failed to create session directory: ${error.message}`);
        return false;
    }
};

/**
 * Remove session directory
 * @param {string} sessionId - Session identifier
 * @returns {boolean} - True if removed successfully
 */
const removeSessionDirectory = (sessionId) => {
    try {
        const sessionPath = getSessionPath(sessionId);
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            logger.info(`Removed session directory for ${sessionId}`);
        }
        return true;
    } catch (error) {
        logger.error(`Failed to remove session directory: ${error.message}`);
        return false;
    }
};

/**
 * List all session directories
 * @returns {Array} - Array of session IDs
 */
const listSessions = () => {
    try {
        const sessionsDir = path.join(process.cwd(), 'sessions');
        if (!fs.existsSync(sessionsDir)) {
            fs.mkdirSync(sessionsDir, { recursive: true });
        }

        const items = fs.readdirSync(sessionsDir);
        // Filter out .gitkeep and any other files
        return items.filter(item => {
            const fullPath = path.join(sessionsDir, item);
            return fs.statSync(fullPath).isDirectory() && item !== '.gitkeep';
        });
    } catch (error) {
        logger.error(`Failed to list sessions: ${error.message}`);
        return [];
    }
};

module.exports = {
    getSessionPath,
    sessionExists,
    createSessionDirectory,
    removeSessionDirectory,
    listSessions
};