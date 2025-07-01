module.exports = {
  portalUrl: 'https://your-portal-url.com/login',
  username: 'your-username@example.com',
  password: 'your-password',
  billingPagePath: '/billing',
  downloadDir: './downloads',
  logFile: './download-log.json',
  
  selectors: {
    usernameField: 'input[name="username"]',
    passwordField: 'input[name="password"]',
    loginButton: 'button[type="submit"]',
    invoiceLinks: 'a[href*="invoice"], a[href*="pdf"], .invoice-download'
  },
  
  options: {
    headless: false,
    downloadTimeout: 30000,
    waitBetweenDownloads: 1000
  }
};