import mysql from 'mysql2/promise';

async function createDb() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: ''
  });
  await connection.query('CREATE DATABASE IF NOT EXISTS japz_pos;');
  console.log('Database created or already exists');
  await connection.end();
}

createDb().catch(err => {
  console.error(err);
  process.exit(1);
});
