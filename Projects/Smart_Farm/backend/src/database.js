/**
 * Database Connection Pool
 * PostgreSQL connection management for Smart Agriculture IoT Backend
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'smart_farm_dev',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  max: parseInt(process.env.CONNECTION_POOL_SIZE) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('✓ Database connection established');
});

/**
 * Execute query with connection from pool
 */
async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[DB] Query executed in ${duration}ms`);
    return result;
  } catch (error) {
    console.error('[DB ERROR] Query failed:', error.message);
    throw error;
  }
}

/**
 * Get single row
 */
async function getOne(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

/**
 * Get all rows
 */
async function getAll(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

/**
 * Insert and return inserted row
 */
async function insertOne(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

/**
 * Check database connection
 */
async function healthCheck() {
  try {
    const result = await pool.query('SELECT NOW()');
    return {
      status: 'connected',
      database: process.env.DATABASE_NAME,
      timestamp: result.rows[0].now
    };
  } catch (error) {
    return {
      status: 'disconnected',
      error: error.message
    };
  }
}

/**
 * Close all connections
 */
async function closePool() {
  await pool.end();
  console.log('✓ Database connection pool closed');
}

module.exports = {
  pool,
  query,
  getOne,
  getAll,
  insertOne,
  healthCheck,
  closePool
};
