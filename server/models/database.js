const { Pool } = require('pg');

// PostgreSQL接続設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// データベース接続テスト
async function connectDB() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set, skipping database connection');
    return;
  }

  try {
    const client = await pool.connect();
    console.log('PostgreSQL connected successfully');
    
    // テーブルの初期化
    await initializeTables(client);
    
    client.release();
  } catch (error) {
    console.error('Database connection error:', error);
    console.log('⚠️  Server will continue without database connection');
    // Don't throw error to allow server to start
  }
}

// テーブル初期化
async function initializeTables(client) {
  try {
    // ユーザーテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        image TEXT,
        provider VARCHAR(50) DEFAULT 'google',
        provider_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ダウンロード履歴テーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS download_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        portal_name VARCHAR(255) NOT NULL,
        portal_url TEXT NOT NULL,
        filename VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_size BIGINT,
        status VARCHAR(50) DEFAULT 'completed',
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ポータル設定テーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS portal_configs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        login_url TEXT NOT NULL,
        username VARCHAR(255),
        password_encrypted TEXT,
        security_code_encrypted TEXT,
        billing_path VARCHAR(255) DEFAULT '/billing/in',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // インデックス作成
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_download_history_user_id ON download_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_download_history_created_at ON download_history(created_at);
      CREATE INDEX IF NOT EXISTS idx_portal_configs_user_id ON portal_configs(user_id);
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing tables:', error);
    throw error;
  }
}

module.exports = {
  pool,
  connectDB,
  initializeTables
};