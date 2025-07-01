require('dotenv').config();
const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  portalUrl: process.env.LOGIN_URL,
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  securityCode: process.env.SECURITY_CODE,
  billingPagePath: process.env.BILLING_PATH,
  downloadDir: './downloads',
  logFile: './download-log.json'
};

async function ensureDirectoryExists(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function loadExistingLog() {
  try {
    const logData = await fs.readFile(CONFIG.logFile, 'utf8');
    return JSON.parse(logData);
  } catch {
    return { downloads: [] };
  }
}

async function saveLog(logData) {
  await fs.writeFile(CONFIG.logFile, JSON.stringify(logData, null, 2));
}

async function downloadInvoices() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await ensureDirectoryExists(CONFIG.downloadDir);
    const downloadLog = await loadExistingLog();

    console.log('Navigating to login page...');
    await page.goto(CONFIG.portalUrl);

    console.log('Filling security code...');
    await page.fill('input[type="text"]', CONFIG.securityCode);
    
    console.log('Setting up download listener...');
    // Start listening for downloads BEFORE clicking anything
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    
    console.log('Clicking download button...');
    await page.click('text=ダウンロード');
    
    console.log('Waiting for modal/dialog to appear...');
    
    // Wait for the OK button to become visible
    try {
      console.log('Waiting for OK button to become visible...');
      await page.locator('button:has-text("OK")').waitFor({ state: 'visible', timeout: 10000 });
      console.log('OK button is now visible!');
    } catch (error) {
      console.log('OK button did not become visible within 10 seconds');
      await page.waitForTimeout(2000); // fallback wait
    }
    
    // Debug: Check what elements are visible on the page
    console.log('Checking for buttons on page...');
    const allButtons = await page.locator('button').all();
    console.log(`Found ${allButtons.length} buttons on page`);
    
    for (let i = 0; i < allButtons.length; i++) {
      try {
        const text = await allButtons[i].textContent();
        const isVisible = await allButtons[i].isVisible();
        console.log(`Button ${i}: "${text}" (visible: ${isVisible})`);
      } catch (error) {
        console.log(`Button ${i}: Error getting info`);
      }
    }
    
    // Look for modal OK button and click it
    const modalSelectors = [
      'button:has-text("OK")',
      'button:has-text("ok")',
      'button:text("OK")',
      'button[value="OK"]',
      'input[type="button"][value="OK"]',
      'button:has-text("確認")',
      'button:has-text("はい")',
      'button[type="submit"]',
      '.modal button',
      '.dialog button',
      '[role="dialog"] button'
    ];
    
    let modalClicked = false;
    for (const selector of modalSelectors) {
      try {
        console.log(`Trying selector: ${selector}`);
        const button = await page.locator(selector).first();
        if (await button.isVisible()) {
          console.log(`Found and clicking modal button: ${selector}`);
          await button.click();
          modalClicked = true;
          console.log('Modal button clicked successfully!');
          await page.waitForTimeout(1000); // Wait a bit after clicking
          break;
        } else {
          console.log(`Button exists but not visible: ${selector}`);
        }
      } catch (error) {
        console.log(`Selector failed: ${selector} - ${error.message}`);
      }
    }
    
    // If no visible modal found, try different approaches
    if (!modalClicked) {
      console.log('Trying alternative methods...');
      
      // Method 1: Execute the JavaScript function directly
      try {
        console.log('Executing downloadFile() function directly...');
        await page.evaluate(() => {
          if (typeof downloadFile === 'function') {
            downloadFile();
            return true;
          }
          return false;
        });
        console.log('JavaScript function executed');
        modalClicked = true;
        await page.waitForTimeout(2000);
      } catch (error) {
        console.log('JavaScript execution failed:', error.message);
        
        // Method 2: Force click the button
        try {
          console.log('Trying to force click invisible OK button...');
          await page.locator('button:has-text("OK")').click({ force: true });
          console.log('Force clicked OK button');
          modalClicked = true;
          await page.waitForTimeout(1000);
        } catch (error2) {
          console.log('Force click failed:', error2.message);
        }
      }
    }
    
    if (modalClicked) {
      console.log('Modal OK button clicked, waiting for download...');
    } else {
      console.log('No modal found, waiting for download anyway...');
    }
    
    // Wait for the download that was set up earlier
    let download = null;
    let logEntry = null;
    
    try {
      download = await downloadPromise;
      console.log('Download event detected!');
      console.log('Download URL:', download.url());
      console.log('Suggested filename:', download.suggestedFilename());
      
      const timestamp = new Date().toISOString();
      const filename = download.suggestedFilename() || `download_${Date.now()}.pdf`;
      const filepath = path.join(CONFIG.downloadDir, filename);

      console.log(`Saving download to: ${filepath}`);
      await download.saveAs(filepath);
      
      // Verify file was actually saved
      try {
        const stats = await fs.stat(filepath);
        console.log(`File saved successfully! Size: ${stats.size} bytes`);
      } catch (error) {
        console.log('ERROR: File was not saved!', error.message);
        throw new Error('ファイルの保存に失敗しました');
      }
      
      console.log(`PDF downloaded and saved as: ${filename}`);
      
      logEntry = {
        filename,
        filepath,
        downloadTimestamp: timestamp,
        pdfUrl: page.url(),
        downloadUrl: download.url(),
        fileSize: (await fs.stat(filepath)).size
      };
      
    } catch (error) {
      console.log('No download event detected within 30 seconds');
      console.log('Error:', error.message);
      throw new Error('PDFダウンロードが検出されませんでした');
    }
    
    if (logEntry) {
      downloadLog.downloads.push(logEntry);
      await saveLog(downloadLog);
    }
    
    console.log(`Files saved to: ${CONFIG.downloadDir}`);
    console.log(`Log saved to: ${CONFIG.logFile}`);

  } catch (error) {
    console.error('Script error:', error);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  downloadInvoices().catch(console.error);
}

module.exports = { downloadInvoices };