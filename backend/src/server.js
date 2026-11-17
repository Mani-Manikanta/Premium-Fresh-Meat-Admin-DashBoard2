require('dotenv').config();

const app = require('./app');
const pool = require('./config/db');

const requiredVariables = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
  console.error(`Missing required environment variables: ${missingVariables.join(', ')}`);
  process.exit(1);
}

const port = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    await pool.query('SELECT 1');
    app.listen(port, () => {
      console.log(`API server listening at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Could not connect to MySQL. Check the backend .env settings and database service.', error.message);
    process.exitCode = 1;
    await pool.end();
  }
}

startServer();
