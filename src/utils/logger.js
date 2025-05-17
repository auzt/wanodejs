const pino = require('pino');

// Format objek menjadi string
const formatObject = (obj) => {
    if (typeof obj === 'object' && obj !== null) {
        try {
            return JSON.stringify(obj);
        } catch (e) {
            return `[Circular Object]`;
        }
    }
    return obj;
};

// Middleware untuk menangani objek dalam log
const objHandler = {
    level: 'info',
    messageKey: 'msg',
    // Proses pesan sebelum diteruskan ke pino
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    formatters: {
        log(object) {
            // Pastikan setiap properti objek diformat dengan benar
            const result = {};
            for (const key in object) {
                if (typeof object[key] === 'object' && object[key] !== null) {
                    result[key] = formatObject(object[key]);
                } else {
                    result[key] = object[key];
                }
            }
            return result;
        }
    }
};

const logger = pino({
    ...objHandler,
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
        }
    }
});

// Tambahkan override untuk membuat format yang lebih baik
const originalInfo = logger.info;
logger.info = function (msg, ...args) {
    if (typeof msg === 'object') {
        return originalInfo.call(this, { msg: formatObject(msg) }, ...args);
    }
    return originalInfo.call(this, msg, ...args);
};

const originalError = logger.error;
logger.error = function (msg, ...args) {
    if (typeof msg === 'object') {
        return originalError.call(this, { msg: formatObject(msg) }, ...args);
    }
    return originalError.call(this, msg, ...args);
};

module.exports = logger;