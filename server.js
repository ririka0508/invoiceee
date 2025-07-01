const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const { downloadInvoices } = require('./downloadInvoices');

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Download endpoint
app.post('/api/download', async (req, res) => {
    try {
        const { loginUrl, username, password, securityCode, billingPath } = req.body;

        // Validate required fields
        if (!loginUrl || !securityCode) {
            return res.status(400).json({ 
                error: 'ログインURLとセキュリティコードは必須です' 
            });
        }

        // Update .env file with new values
        await updateEnvFile({
            LOGIN_URL: loginUrl,
            USERNAME: username || '',
            PASSWORD: password || '',
            SECURITY_CODE: securityCode,
            BILLING_PATH: billingPath || '/billing/in'
        });

        // Execute the download script
        console.log('Starting download process...');
        
        // Run the download function
        await downloadInvoices();
        
        res.json({ 
            success: true, 
            message: 'ダウンロードが完了しました',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ 
            error: error.message || 'ダウンロードに失敗しました' 
        });
    }
});

// Get download history
app.get('/api/history', async (req, res) => {
    try {
        const logFile = path.join(__dirname, 'download-log.json');
        
        try {
            const logData = await fs.readFile(logFile, 'utf8');
            const history = JSON.parse(logData);
            res.json(history);
        } catch (error) {
            // If log file doesn't exist, return empty history
            res.json({ downloads: [] });
        }
    } catch (error) {
        console.error('Error reading history:', error);
        res.status(500).json({ error: '履歴の読み込みに失敗しました' });
    }
});

// Open file in default application
app.post('/api/open-file', async (req, res) => {
    try {
        const { filepath } = req.body;
        
        if (!filepath) {
            return res.status(400).json({ error: 'ファイルパスが指定されていません' });
        }

        // Check if file exists
        try {
            await fs.access(filepath);
        } catch (error) {
            return res.status(404).json({ error: 'ファイルが見つかりません' });
        }

        // Open file with default application
        let command;
        switch (process.platform) {
            case 'darwin': // macOS
                command = `open "${filepath}"`;
                break;
            case 'win32': // Windows
                command = `start "" "${filepath}"`;
                break;
            default: // Linux
                command = `xdg-open "${filepath}"`;
                break;
        }

        await execAsync(command);
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error opening file:', error);
        res.status(500).json({ error: 'ファイルを開けませんでした' });
    }
});

// Show file in finder/explorer
app.post('/api/show-file', async (req, res) => {
    try {
        const { filepath } = req.body;
        
        if (!filepath) {
            return res.status(400).json({ error: 'ファイルパスが指定されていません' });
        }

        // Show file in finder/explorer
        let command;
        switch (process.platform) {
            case 'darwin': // macOS
                command = `open -R "${filepath}"`;
                break;
            case 'win32': // Windows
                command = `explorer /select,"${filepath}"`;
                break;
            default: // Linux
                command = `xdg-open "${path.dirname(filepath)}"`;
                break;
        }

        await execAsync(command);
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error showing file:', error);
        res.status(500).json({ error: 'ファイルの場所を表示できませんでした' });
    }
});

// Helper function to update .env file
async function updateEnvFile(envVars) {
    const envPath = path.join(__dirname, '.env');
    
    try {
        // Read existing .env file
        let envContent = '';
        try {
            envContent = await fs.readFile(envPath, 'utf8');
        } catch (error) {
            // File doesn't exist, create new content
        }

        // Parse existing variables
        const existingVars = {};
        envContent.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length) {
                existingVars[key.trim()] = valueParts.join('=').trim();
            }
        });

        // Merge with new variables
        const mergedVars = { ...existingVars, ...envVars };

        // Generate new content
        const newContent = Object.entries(mergedVars)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        await fs.writeFile(envPath, newContent);
        
    } catch (error) {
        console.error('Error updating .env file:', error);
        throw new Error('.env ファイルの更新に失敗しました');
    }
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Invoice Downloader UI running at http://localhost:${PORT}`);
    console.log(`📁 Files will be saved to: ${path.join(__dirname, 'downloads')}`);
    
    // Try to open browser automatically
    const url = `http://localhost:${PORT}`;
    switch (process.platform) {
        case 'darwin':
            exec(`open ${url}`);
            break;
        case 'win32':
            exec(`start ${url}`);
            break;
        default:
            exec(`xdg-open ${url}`);
            break;
    }
});

module.exports = app;