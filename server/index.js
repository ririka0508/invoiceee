require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoices');
const downloadRoutes = require('./routes/download');

// Database
const { connectDB } = require('./models/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Next.jsのため無効化
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100 // リクエスト数制限
});
app.use('/api/', limiter);

// CORS設定
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/download', downloadRoutes);

// Serve static files from Next.js build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/.next/static')));
  app.use(express.static(path.join(__dirname, '../client/.next')));
  
  // Handle Next.js app routing
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    // Serve Next.js app for frontend routes
    res.sendFile(path.join(__dirname, '../client/.next/static/index.html'), (err) => {
      if (err) {
        // Fallback to API info if frontend not available
        res.json({ 
          message: 'invoiceee Full-Stack App',
          version: '2.0.0',
          status: 'running',
          frontend: 'building...',
          endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            invoices: '/api/invoices',
            download: '/api/download'
          }
        });
      }
    });
  });
} else {
  // Development mode - API info only
  app.get('/', (req, res) => {
    res.json({ 
      message: 'invoiceee API Server (Development)',
      version: '2.0.0',
      status: 'running',
      mode: 'development',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        invoices: '/api/invoices',
        download: '/api/download'
      }
    });
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database connection test
app.get('/api/db-test', async (req, res) => {
  try {
    const { pool } = require('./models/database');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    client.release();
    
    res.json({
      status: 'database_connected',
      timestamp: new Date().toISOString(),
      database: {
        current_time: result.rows[0].current_time,
        postgres_version: result.rows[0].pg_version,
        database_url_set: !!process.env.DATABASE_URL
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'database_error',
      error: error.message,
      database_url_set: !!process.env.DATABASE_URL
    });
  }
});

// Environment variables test
app.get('/api/env-test', (req, res) => {
  res.json({
    status: 'environment_check',
    timestamp: new Date().toISOString(),
    environment: {
      node_env: process.env.NODE_ENV,
      database_url_set: !!process.env.DATABASE_URL,
      google_client_id_set: !!process.env.GOOGLE_CLIENT_ID,
      google_client_secret_set: !!process.env.GOOGLE_CLIENT_SECRET,
      nextauth_secret_set: !!process.env.NEXTAUTH_SECRET,
      port: process.env.PORT || 5000
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// データベース接続とサーバー開始
async function startServer() {
  try {
    await connectDB();
    console.log('✅ Database connected successfully');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});