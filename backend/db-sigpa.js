const { Client } = require('pg');
require('dotenv').config();

const runSigpaQuery = async (user, password, text, params) => {
  if (!user || !password) {
    throw new Error('Credenciais SIGPA não fornecidas');
  }
  
  const client = new Client({
    user,
    host: '192.168.164.6',
    database: 'sigpa',
    password,
    port: 5432,
  });

  await client.connect();
  
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    await client.end();
  }
};

module.exports = {
  runSigpaQuery
};
