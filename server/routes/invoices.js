const express = require('express');
const { pool } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 認証ミドルウェアを適用
router.use(authenticateToken);

// ポータル設定一覧取得
router.get('/portals', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    
    const result = await client.query(`
      SELECT id, name, login_url, username, billing_path, is_active, created_at, updated_at
      FROM portal_configs 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [userId]);

    res.json({
      success: true,
      portals: result.rows
    });

  } catch (error) {
    console.error('Portals fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch portals' });
  } finally {
    client.release();
  }
});

// ポータル設定作成
router.post('/portals', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    const { name, loginUrl, username, password, securityCode, billingPath = '/billing/in' } = req.body;

    if (!name || !loginUrl || !securityCode) {
      return res.status(400).json({ error: 'Name, login URL, and security code are required' });
    }

    // パスワードとセキュリティコードは簡単な暗号化（実際はより強固な暗号化を推奨）
    const crypto = require('crypto');
    const encryptPassword = password ? crypto.createHash('sha256').update(password).digest('hex') : null;
    const encryptSecurityCode = crypto.createHash('sha256').update(securityCode).digest('hex');

    const result = await client.query(`
      INSERT INTO portal_configs (user_id, name, login_url, username, password_encrypted, security_code_encrypted, billing_path)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, login_url, username, billing_path, is_active, created_at
    `, [userId, name, loginUrl, username, encryptPassword, encryptSecurityCode, billingPath]);

    res.json({
      success: true,
      portal: result.rows[0]
    });

  } catch (error) {
    console.error('Portal creation error:', error);
    res.status(500).json({ error: 'Failed to create portal configuration' });
  } finally {
    client.release();
  }
});

// ポータル設定更新
router.put('/portals/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    const portalId = req.params.id;
    const { name, loginUrl, username, password, securityCode, billingPath, isActive } = req.body;

    // ポータルの所有者確認
    const ownerCheck = await client.query(
      'SELECT id FROM portal_configs WHERE id = $1 AND user_id = $2',
      [portalId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Portal not found or access denied' });
    }

    // 更新フィールドを動的に構築
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (loginUrl !== undefined) {
      updates.push(`login_url = $${paramIndex++}`);
      values.push(loginUrl);
    }
    if (username !== undefined) {
      updates.push(`username = $${paramIndex++}`);
      values.push(username);
    }
    if (password !== undefined) {
      const crypto = require('crypto');
      const encryptPassword = password ? crypto.createHash('sha256').update(password).digest('hex') : null;
      updates.push(`password_encrypted = $${paramIndex++}`);
      values.push(encryptPassword);
    }
    if (securityCode !== undefined) {
      const crypto = require('crypto');
      const encryptSecurityCode = crypto.createHash('sha256').update(securityCode).digest('hex');
      updates.push(`security_code_encrypted = $${paramIndex++}`);
      values.push(encryptSecurityCode);
    }
    if (billingPath !== undefined) {
      updates.push(`billing_path = $${paramIndex++}`);
      values.push(billingPath);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(portalId, userId);

    const query = `
      UPDATE portal_configs 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
      RETURNING id, name, login_url, username, billing_path, is_active, updated_at
    `;

    const result = await client.query(query, values);

    res.json({
      success: true,
      portal: result.rows[0]
    });

  } catch (error) {
    console.error('Portal update error:', error);
    res.status(500).json({ error: 'Failed to update portal configuration' });
  } finally {
    client.release();
  }
});

// ポータル設定削除
router.delete('/portals/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    const portalId = req.params.id;

    const result = await client.query(`
      DELETE FROM portal_configs 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [portalId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Portal not found or access denied' });
    }

    res.json({
      success: true,
      message: 'Portal configuration deleted successfully'
    });

  } catch (error) {
    console.error('Portal deletion error:', error);
    res.status(500).json({ error: 'Failed to delete portal configuration' });
  } finally {
    client.release();
  }
});

module.exports = router;