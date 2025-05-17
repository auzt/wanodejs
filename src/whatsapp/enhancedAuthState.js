const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const logger = require('../utils/logger');

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const mkdirAsync = promisify(fs.mkdir);
const statAsync = promisify(fs.stat);

/**
 * Enhanced auth state handler
 * @param {string} folder - Folder where auth files are stored
 */
const useEnhancedAuthState = async (folder) => {
    const authFolder = path.resolve(folder);

    // Ensure folder exists
    try {
        await mkdirAsync(authFolder, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }

    const fixFileName = (file) => {
        return file.replace(/\//g, '__').replace(/:/g, '-');
    };

    const writeData = async (data, file) => {
        try {
            const filePath = path.join(authFolder, fixFileName(file));
            await writeFileAsync(filePath, JSON.stringify(data, null, 2));
        } catch (error) {
            logger.error(`Error writing auth file ${file}: ${error.message}`);
        }
    };

    const readData = async (file) => {
        try {
            const filePath = path.join(authFolder, fixFileName(file));
            const fileStats = await statAsync(filePath);

            // Skip if file is empty
            if (fileStats.size === 0) {
                return null;
            }

            const data = await readFileAsync(filePath);
            return JSON.parse(data.toString());
        } catch (error) {
            // If file doesn't exist or is invalid, return null
            if (error.code === 'ENOENT' || error instanceof SyntaxError) {
                return null;
            }

            logger.error(`Error reading auth file ${file}: ${error.message}`);
            return null;
        }
    };

    const removeData = async (file) => {
        try {
            const filePath = path.join(authFolder, fixFileName(file));
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            logger.error(`Error removing auth file ${file}: ${error.message}`);
        }
    };

    // Main auth state file
    const creds = await readData('creds.json') || {
        noiseKey: null,
        signedIdentityKey: null,
        signedPreKey: null,
        registrationId: null,
        advSecretKey: null,
        nextPreKeyId: 0,
        firstUnuploadedPreKeyId: 0,
        serverHasPreKeys: false,
        account: null,
        me: null,
        signalIdentities: [],
        lastAccountSyncTimestamp: 0,
        myAppStateKeyId: null
    };

    // Extra safety check
    if (!creds.noiseKey || !creds.signedIdentityKey) {
        logger.info('Creating new session credentials');
    }

    let keys = {};

    // Function to save creds
    const saveCreds = async () => {
        try {
            await writeData(creds, 'creds.json');
            logger.debug('Saved auth credentials');
        } catch (error) {
            logger.error(`Failed to save auth credentials: ${error.message}`);
        }
    };

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    try {
                        const data = {};
                        await Promise.all(ids.map(async (id) => {
                            const key = await readData(`${type}-${id}.json`);
                            if (key) data[id] = key;
                        }));
                        return data;
                    } catch (error) {
                        logger.error(`Failed to get keys: ${error.message}`);
                        return {};
                    }
                },
                set: async (data) => {
                    try {
                        const tasks = [];
                        for (const category in data) {
                            for (const id in data[category]) {
                                const value = data[category][id];
                                tasks.push(writeData(value, `${category}-${id}.json`));
                            }
                        }
                        await Promise.all(tasks);
                    } catch (error) {
                        logger.error(`Failed to set keys: ${error.message}`);
                    }
                }
            }
        },
        saveCreds
    };
};

module.exports = { useEnhancedAuthState };