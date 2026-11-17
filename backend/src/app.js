const riderRoutes = require('./routes/riders');
const sellerRoutes = require('./routes/sellers');
const customerRoutes = require('./routes/customers');
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

const app = express();
const allowedClientOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [])
]);

app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedClientOrigins.has(origin));
  }
}));
app.use(express.json({ limit: '3mb' }));
app.get('/api/health', (req, res) => {
  res.send('Premium Fresh Meat Backend is Working!');
});
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/riders', riderRoutes);
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Request body must contain valid JSON.' });
  }
  console.error(error);
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
});

module.exports = app;
