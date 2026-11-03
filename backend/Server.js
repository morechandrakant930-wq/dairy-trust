
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Load environment variables before importing routes
require('dotenv').config({
  path: path.join(__dirname, '.env'),
});

const app = express();
const PORT = process.env.PORT || 5000;

// Check environment variables
console.log('GROQ API KEY LOADED:', !!process.env.GROQ_API_KEY);

if (!process.env.GROQ_API_KEY) {
  console.error('WARNING: GROQ_API_KEY missing in backend/.env');
}

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/farmers', require('./routes/farmers'));
app.use('/api/dairies', require('./routes/dairies'));
app.use('/api/milk-collections', require('./routes/MilkCollections'));
app.use('/api/milk-rates', require('./routes/MilkRates'));
app.use('/api/rate-charts', require('./routes/RateCharts'));
app.use('/api/pend-management', require('./routes/PendManagement'));
app.use('/api/bonus-management', require('./routes/BonusManagement'));
app.use('/api/payment-management', require('./routes/PaymentManagement'));
app.use('/api/ai-assistant', require('./routes/AIAssistant'));
app.use('/api/disputes', require('./routes/Disputes'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Dairy Trust Backend is running!',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Dairy Trust API is working!',
  });
});

// Unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// Start server
async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing from .env file');
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connected successfully!');
    console.log('Connected Database:', mongoose.connection.name);

    app.listen(PORT, () => {
      console.log(`Dairy Trust server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
