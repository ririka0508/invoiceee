const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');
const { exec } = require('child_process');
const { downloadInvoices } = require('./downloadInvoices');
const { authenticateUser, createSession, validateSession, destroySession } = require('./auth');
const { createGoogleSession, validateGoogleSession, destroyGoogleSession } = require('./google-auth');

const PORT = process.env.PORT || 3001;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

// セッションIDをCookieから取得
function getSessionFromCookie(req) {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;
    
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
    }, {});
    
    return cookies.sessionId;
}

// 認証が必要なエンドポイントをチェック
function requireAuth(pathname) {
    const protectedPaths = ['/api/download', '/api/history', '/freee-ui.html', '/dashboard'];
    return protectedPaths.some(path => pathname.startsWith(path));
}

async function updateEnvFile(envVars) {
    const envPath = path.join(__dirname, '.env');
    
    try {
        let envContent = '';
        try {
            envContent = await fs.readFile(envPath, 'utf8');
        } catch (error) {
            // File doesn't exist, create new content
        }

        const existingVars = {};
        envContent.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length) {
                existingVars[key.trim()] = valueParts.join('=').trim();
            }
        });

        const mergedVars = { ...existingVars, ...envVars };
        const newContent = Object.entries(mergedVars)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        await fs.writeFile(envPath, newContent);
    } catch (error) {
        throw new Error('.env ファイルの更新に失敗しました');
    }
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    try {
        // 認証チェック
        if (requireAuth(pathname)) {
            const sessionId = getSessionFromCookie(req);
            let session = validateSession(sessionId);
            
            // 従来の認証でセッションが見つからない場合、Google認証セッションを確認
            if (!session) {
                session = validateGoogleSession(sessionId);
            }
            
            if (!session) {
                // 認証が必要だが、有効なセッションがない場合
                if (pathname.startsWith('/api/')) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: '認証が必要です' }));
                    return;
                } else {
                    // UIページの場合はログインページにリダイレクト
                    res.writeHead(302, { 'Location': '/login.html' });
                    res.end();
                    return;
                }
            }
            
            // 認証済みの場合、ユーザー情報をリクエストに追加
            req.user = session.user;
        }

        // ログイン認証API
        if (pathname === '/api/login' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    console.log('Login request received:', body);
                    const data = JSON.parse(body);
                    const { username, password } = data;
                    
                    console.log(`Attempting login for username: ${username}`);
                    const user = authenticateUser(username, password);
                    console.log('Authentication result:', user);
                    
                    if (user) {
                        const sessionId = createSession(user);
                        console.log('Session created:', sessionId);
                        
                        res.writeHead(200, { 
                            'Content-Type': 'application/json',
                            'Set-Cookie': `sessionId=${sessionId}; HttpOnly; Path=/; Max-Age=${24 * 60 * 60}` // 24時間
                        });
                        res.end(JSON.stringify({ 
                            success: true, 
                            user: user,
                            message: 'ログインしました'
                        }));
                    } else {
                        console.log('Authentication failed for:', username);
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'ユーザー名またはパスワードが間違っています' }));
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: '不正なリクエストです' }));
                }
            });
            return;
        }

        // Google認証API
        if (pathname === '/api/google-login' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    console.log('Google login request received:', body);
                    const data = JSON.parse(body);
                    const { idToken } = data;
                    
                    if (!idToken) {
                        console.error('No idToken provided');
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'IDトークンが提供されていません' }));
                        return;
                    }
                    
                    // Google ID Tokenの検証（簡易版）
                    console.log('Decoding idToken...');
                    const tokenParts = idToken.split('.');
                    if (tokenParts.length !== 3) {
                        console.error('Invalid token format');
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: '無効なトークン形式です' }));
                        return;
                    }
                    
                    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
                    console.log('Token payload:', payload);
                    
                    if (!payload.email || !payload.name) {
                        console.error('Missing email or name in payload:', payload);
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: '無効なGoogle認証トークンです（メールまたは名前が不足）' }));
                        return;
                    }
                    
                    console.log('Creating Google session for user:', payload.email);
                    const sessionId = createGoogleSession(payload);
                    console.log('Session created:', sessionId);
                    
                    res.writeHead(200, { 
                        'Content-Type': 'application/json',
                        'Set-Cookie': `sessionId=${sessionId}; HttpOnly; Path=/; Max-Age=${24 * 60 * 60}` // 24時間
                    });
                    res.end(JSON.stringify({ 
                        success: true, 
                        user: {
                            name: payload.name,
                            email: payload.email,
                            picture: payload.picture
                        },
                        message: 'Googleアカウントでログインしました'
                    }));
                } catch (error) {
                    console.error('Google login error details:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        error: `Google認証処理エラー: ${error.message}`,
                        details: error.stack
                    }));
                }
            });
            return;
        }

        // ログアウトAPI
        if (pathname === '/api/logout' && req.method === 'POST') {
            const sessionId = getSessionFromCookie(req);
            if (sessionId) {
                destroySession(sessionId);
                destroyGoogleSession(sessionId);
            }
            
            res.writeHead(200, { 
                'Content-Type': 'application/json',
                'Set-Cookie': 'sessionId=; HttpOnly; Path=/; Max-Age=0' // Cookie削除
            });
            res.end(JSON.stringify({ success: true, message: 'ログアウトしました' }));
            return;
        }

        // 現在のユーザー情報取得API
        if (pathname === '/api/me') {
            const sessionId = getSessionFromCookie(req);
            let session = validateSession(sessionId);
            
            // 従来の認証でセッションが見つからない場合、Google認証セッションを確認
            if (!session) {
                session = validateGoogleSession(sessionId);
            }
            
            if (session) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ user: session.user }));
            } else {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '認証が必要です' }));
            }
            return;
        }

        // Serve main page
        if (pathname === '/' || pathname === '/index.html') {
            const filePath = path.join(__dirname, 'public', 'index.html');
            const content = await fs.readFile(filePath);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
            return;
        }

        // Serve static files
        if (pathname.startsWith('/public/') || pathname.endsWith('.css') || pathname.endsWith('.js') || pathname.endsWith('.html') || pathname.endsWith('.png') || pathname.endsWith('.jpg') || pathname.endsWith('.jpeg') || pathname.endsWith('.svg')) {
            let filePath;
            if (pathname.startsWith('/public/')) {
                filePath = path.join(__dirname, pathname);
            } else {
                filePath = path.join(__dirname, 'public', path.basename(pathname));
            }
            
            try {
                const content = await fs.readFile(filePath);
                const ext = path.extname(filePath);
                const contentType = mimeTypes[ext] || 'text/plain';
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
                return;
            } catch (error) {
                res.writeHead(404);
                res.end('File not found');
                return;
            }
        }

        // API endpoints
        if (pathname === '/api/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
            return;
        }

        if (pathname === '/api/download' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const { loginUrl, username, password, securityCode, billingPath } = data;

                    if (!loginUrl || !securityCode) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'ログインURLとセキュリティコードは必須です' }));
                        return;
                    }

                    await updateEnvFile({
                        LOGIN_URL: loginUrl,
                        USERNAME: username || '',
                        PASSWORD: password || '',
                        SECURITY_CODE: securityCode,
                        BILLING_PATH: billingPath || '/billing/in'
                    });

                    await downloadInvoices();
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        message: 'ダウンロードが完了しました',
                        timestamp: new Date().toISOString()
                    }));
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
            return;
        }

        if (pathname === '/api/history') {
            try {
                const logFile = path.join(__dirname, 'download-log.json');
                try {
                    const logData = await fs.readFile(logFile, 'utf8');
                    const history = JSON.parse(logData);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(history));
                } catch (error) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ downloads: [] }));
                }
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '履歴の読み込みに失敗しました' }));
            }
            return;
        }

        // 404 for other paths
        res.writeHead(404);
        res.end('Not Found');

    } catch (error) {
        console.error('Server error:', error);
        res.writeHead(500);
        res.end('Internal Server Error');
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 invoiceee UI running at http://127.0.0.1:${PORT}`);
    console.log(`📁 Files will be saved to: ${path.join(__dirname, 'downloads')}`);
});