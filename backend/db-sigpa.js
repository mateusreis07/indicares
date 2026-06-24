const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: 'fabricio_cunha_leitura',
  host: '192.168.164.6',
  database: 'sigpa',
  password: 'OTWgrMefVT9fN8vx',
  port: 5432,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client (SIGPA PostgreSQL)', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
