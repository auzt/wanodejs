const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// Create database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        logger.info('Database connection established successfully');
        connection.release();
        return true;
    } catch (error) {
        logger.error(`Database connection error: ${error.message}`);
        return false;
    }
};

// Execute query with parameters
const query = async (sql, params = []) => {
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (error) {
        logger.error(`Query error: ${error.message}`);
        throw error;
    }
};

module.exports = {
    pool,
    query,
    testConnection
};