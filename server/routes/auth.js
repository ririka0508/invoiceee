const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../models/database');

const router = express.Router();

// Google OAuth後のユーザー情報保存/更新
router.post('/google', async (req, res) => {
  try {
    const { email, name, image, sub } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    const client = await pool.connect();
    
    try {
      // ユーザーが既に存在するかチェック
      const existingUser = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      let user;
      if (existingUser.rows.length > 0) {
        // 既存ユーザーの情報を更新
        const updateResult = await client.query(
          `UPDATE users 
           SET name = $1, image = $2, provider_id = $3, updated_at = CURRENT_TIMESTAMP
           WHERE email = $4 
           RETURNING *`,
          [name, image, sub, email]
        );
        user = updateResult.rows[0];
      } else {
        // 新規ユーザーを作成
        const insertResult = await client.query(
          `INSERT INTO users (email, name, image, provider, provider_id) 
           VALUES ($1, $2, $3, 'google', $4) 
           RETURNING *`,
          [email, name, image, sub]
        );
        user = insertResult.rows[0];
      }

      // JWT トークンを生成
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          name: user.name 
        },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image
        },
        token
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// トークン検証
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    
    // データベースからユーザー情報を取得
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, email, name, image FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      const user = result.rows[0];
      res.json({ success: true, user });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ログアウト（トークンベースなので特に処理は不要）
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;