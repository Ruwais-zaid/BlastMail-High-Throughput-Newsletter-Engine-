"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closePool = exports.getClient = exports.query = void 0;
const pg_1 = require("pg");
require("dotenv/config");
const pool = new pg_1.Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
pool.on('error', (err) => {
    console.log('Unexpected error on idle client', err);
    process.exit(-1);
});
const query = async (text, params = []) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, [...params]);
        const duration = Date.now() - start;
        console.log('executed query', { text, duration, rows: res.rowCount });
        return res.rows;
    }
    catch (error) {
        console.log('Database query error', { text, error });
        throw error;
    }
};
exports.query = query;
const getClient = async () => {
    return await pool.connect();
};
exports.getClient = getClient;
const closePool = async () => {
    await pool.end();
};
exports.closePool = closePool;
exports.default = { query: exports.query, getClient: exports.getClient, closePool: exports.closePool };
