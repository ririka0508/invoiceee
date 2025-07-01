const express = require('express');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;
const { pool } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 認証ミドルウェアを適用
router.use(authenticateToken);

// ダウンロード実行
router.post('/', async (req, res) => {
  let browser;
  const client = await pool.connect();
  
  try {
    const { loginUrl, username, password, securityCode, billingPath = '/billing/in' } = req.body;
    const userId = req.user.userId;

    if (!loginUrl || !securityCode) {
      return res.status(400).json({ 
        error: 'Login URL and security code are required' 
      });
    }

    // ダウンロードディレクトリを確保
    const downloadDir = path.join(__dirname, '../../downloads', userId.toString());
    await fs.mkdir(downloadDir, { recursive: true });

    // Playwrightブラウザを起動
    browser = await chromium.launch({
      headless: process.env.NODE_ENV === 'production',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const context = await browser.newContext({
      acceptDownloads: true
    });
    const page = await context.newPage();

    console.log(`[User ${userId}] Starting download process...`);
    
    // ログイン処理
    console.log(`[User ${userId}] Navigating to: ${loginUrl}`);
    await page.goto(loginUrl, { waitUntil: 'networkidle2' });

    // セキュリティコード入力
    console.log(`[User ${userId}] Filling security code...`);
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    await page.fill('input[type="text"]', securityCode);

    // ユーザー名・パスワード入力（提供されている場合）
    if (username) {
      const usernameSelectors = ['input[type="email"]', 'input[name="username"]', 'input[name="email"]'];
      for (const selector of usernameSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          await page.fill(selector, username);
          break;
        } catch (e) {
          // 次のセレクターを試す
        }
      }
    }

    if (password) {
      try {
        await page.waitForSelector('input[type="password"]', { timeout: 5000 });
        await page.fill('input[type="password"]', password);
      } catch (e) {
        console.log(`[User ${userId}] Password field not found, continuing...`);
      }
    }

    // ログインボタンをクリック
    const loginButtonSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:contains("ログイン")',
      'button:contains("Login")',
      '.login-button',
      '#login-button'
    ];

    let loginSuccess = false;
    for (const selector of loginButtonSelectors) {
      try {
        await page.click(selector);
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
        loginSuccess = true;
        break;
      } catch (e) {
        console.log(`[User ${userId}] Login button selector ${selector} failed, trying next...`);
      }
    }

    if (!loginSuccess) {
      throw new Error('Login button not found or login failed');
    }

    console.log(`[User ${userId}] Login successful, navigating to billing page...`);

    // 請求ページに移動
    const billingUrl = new URL(billingPath, loginUrl).href;
    await page.goto(billingUrl, { waitUntil: 'networkidle2' });

    // PDFダウンロードリンクを探す
    const downloadLinks = await page.$$eval('a', links => 
      links
        .filter(link => 
          link.href.includes('.pdf') || 
          link.textContent.includes('ダウンロード') ||
          link.textContent.includes('Download') ||
          link.textContent.includes('PDF')
        )
        .map(link => ({
          href: link.href,
          text: link.textContent.trim()
        }))
    );

    console.log(`[User ${userId}] Found ${downloadLinks.length} potential download links`);

    if (downloadLinks.length === 0) {
      throw new Error('No download links found on the billing page');
    }

    // ダウンロード実行
    const downloadResults = [];
    for (const link of downloadLinks.slice(0, 10)) { // 最大10件まで
      try {
        console.log(`[User ${userId}] Downloading: ${link.text} (${link.href})`);
        
        // ダウンロード開始
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
        
        await page.click(`a[href="${link.href}"]`);
        
        // ダウンロード完了を待つ
        const download = await downloadPromise;
        
        // ファイル名を生成
        const filename = download.suggestedFilename() || `invoice_${Date.now()}.pdf`;
        const filePath = path.join(downloadDir, filename);
        
        // ファイルを保存
        await download.saveAs(filePath);
        
        // ファイル情報を取得
        const stats = await fs.stat(filePath);

        // データベースに記録
        await client.query(`
          INSERT INTO download_history (user_id, portal_name, portal_url, filename, file_path, file_size, status)
          VALUES ($1, $2, $3, $4, $5, $6, 'completed')
        `, [
          userId,
          new URL(loginUrl).hostname,
          loginUrl,
          filename,
          filePath,
          stats.size
        ]);

        downloadResults.push({
          filename: filename,
          size: stats.size,
          status: 'completed'
        });

      } catch (error) {
        console.error(`[User ${userId}] Download failed for ${link.href}:`, error);
        
        // エラーも記録
        await client.query(`
          INSERT INTO download_history (user_id, portal_name, portal_url, filename, file_path, status, error_message)
          VALUES ($1, $2, $3, $4, $5, 'failed', $6)
        `, [
          userId,
          new URL(loginUrl).hostname,
          loginUrl,
          `failed_${Date.now()}.pdf`,
          '',
          error.message
        ]);

        downloadResults.push({
          filename: link.text || 'Unknown',
          status: 'failed',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Download process completed',
      results: downloadResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`Download error:`, error);
    
    // エラーをデータベースに記録
    try {
      await client.query(`
        INSERT INTO download_history (user_id, portal_name, portal_url, filename, file_path, status, error_message)
        VALUES ($1, $2, $3, $4, $5, 'failed', $6)
      `, [
        req.user.userId,
        'Unknown',
        req.body.loginUrl || '',
        `error_${Date.now()}.pdf`,
        '',
        error.message
      ]);
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError);
    }
    
    res.status(500).json({
      error: 'Download failed',
      message: error.message
    });
  } finally {
    if (browser) {
      await browser.close();
    }
    client.release();
  }
});

// ダウンロード履歴取得
router.get('/history', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    const { limit = 50, offset = 0 } = req.query;

    const result = await client.query(`
      SELECT id, portal_name, portal_url, filename, file_size, status, error_message, created_at
      FROM download_history 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    res.json({
      success: true,
      downloads: result.rows,
      total: result.rowCount
    });

  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch download history' });
  } finally {
    client.release();
  }
});

module.exports = router;