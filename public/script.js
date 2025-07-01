class InvoiceDownloader {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.loadConfig();
        this.loadHistory();
        this.checkFormValidity();
    }

    initializeElements() {
        this.form = document.getElementById('configForm');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.downloadBtnText = document.getElementById('downloadBtnText');
        this.downloadSpinner = document.getElementById('downloadSpinner');
        this.historyContainer = document.getElementById('downloadHistory');
        this.logOutput = document.getElementById('logOutput');
        this.modal = document.getElementById('modal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalMessage = document.getElementById('modalMessage');
        this.closeModal = document.querySelector('.close');
        
        this.inputs = {
            loginUrl: document.getElementById('loginUrl'),
            username: document.getElementById('username'),
            password: document.getElementById('password'),
            securityCode: document.getElementById('securityCode'),
            billingPath: document.getElementById('billingPath')
        };
    }

    bindEvents() {
        this.downloadBtn.addEventListener('click', () => this.startDownload());
        this.closeModal.addEventListener('click', () => this.hideModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hideModal();
        });

        // Form validation
        Object.values(this.inputs).forEach(input => {
            input.addEventListener('input', () => this.checkFormValidity());
            input.addEventListener('blur', () => this.saveConfig());
        });

        // Auto-save config
        this.form.addEventListener('change', () => this.saveConfig());
    }

    checkFormValidity() {
        const requiredFields = ['loginUrl', 'securityCode'];
        const isValid = requiredFields.every(field => 
            this.inputs[field].value.trim() !== ''
        );
        
        this.downloadBtn.disabled = !isValid;
        
        if (isValid) {
            this.downloadBtn.querySelector('.help-text')?.remove();
        }
    }

    saveConfig() {
        const config = {};
        Object.entries(this.inputs).forEach(([key, input]) => {
            config[key] = input.value;
        });
        localStorage.setItem('invoiceDownloaderConfig', JSON.stringify(config));
    }

    loadConfig() {
        try {
            const config = JSON.parse(localStorage.getItem('invoiceDownloaderConfig') || '{}');
            Object.entries(config).forEach(([key, value]) => {
                if (this.inputs[key]) {
                    this.inputs[key].value = value;
                }
            });
        } catch (error) {
            console.error('Failed to load config:', error);
        }
    }

    async startDownload() {
        if (this.downloadBtn.disabled) return;

        this.setDownloadingState(true);
        this.logMessage('ダウンロードを開始します...', 'info');

        try {
            const config = this.getFormData();
            
            this.logMessage('サーバーにリクエストを送信中...', 'info');
            
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config)
            });

            const result = await response.json();

            if (response.ok) {
                this.logMessage('ダウンロードが完了しました！', 'success');
                this.showModal('成功', 'PDFのダウンロードが完了しました。');
                this.loadHistory();
            } else {
                throw new Error(result.error || 'ダウンロードに失敗しました');
            }
        } catch (error) {
            this.logMessage(`エラー: ${error.message}`, 'error');
            this.showModal('エラー', `ダウンロードに失敗しました: ${error.message}`);
        } finally {
            this.setDownloadingState(false);
        }
    }

    setDownloadingState(isDownloading) {
        this.downloadBtn.disabled = isDownloading;
        if (isDownloading) {
            this.downloadBtnText.textContent = 'ダウンロード中...';
            this.downloadSpinner.classList.remove('hidden');
        } else {
            this.downloadBtnText.textContent = 'PDFをダウンロード';
            this.downloadSpinner.classList.add('hidden');
        }
    }

    getFormData() {
        const data = {};
        Object.entries(this.inputs).forEach(([key, input]) => {
            data[key] = input.value.trim();
        });
        return data;
    }

    async loadHistory() {
        try {
            const response = await fetch('/api/history');
            const history = await response.json();
            
            this.renderHistory(history.downloads || []);
        } catch (error) {
            console.error('Failed to load history:', error);
            this.logMessage('履歴の読み込みに失敗しました', 'error');
        }
    }

    renderHistory(downloads) {
        if (!downloads.length) {
            this.historyContainer.innerHTML = '<p class="no-data">ダウンロード履歴がありません</p>';
            return;
        }

        const historyHTML = downloads.map(download => `
            <div class="history-item">
                <div class="history-item-info">
                    <h4>${download.filename}</h4>
                    <p>${new Date(download.downloadTimestamp).toLocaleString('ja-JP')}</p>
                    <p>${download.filepath}</p>
                </div>
                <div class="history-item-actions">
                    <button class="btn btn-small btn-secondary" onclick="app.openFile('${download.filepath}')">
                        開く
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="app.showFileLocation('${download.filepath}')">
                        場所を表示
                    </button>
                </div>
            </div>
        `).join('');

        this.historyContainer.innerHTML = historyHTML;
    }

    async openFile(filepath) {
        try {
            const response = await fetch('/api/open-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filepath })
            });
            
            if (!response.ok) {
                throw new Error('ファイルを開けませんでした');
            }
        } catch (error) {
            this.showModal('エラー', error.message);
        }
    }

    async showFileLocation(filepath) {
        try {
            const response = await fetch('/api/show-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filepath })
            });
            
            if (!response.ok) {
                throw new Error('ファイルの場所を表示できませんでした');
            }
        } catch (error) {
            this.showModal('エラー', error.message);
        }
    }

    logMessage(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('ja-JP');
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        if (this.logOutput.querySelector('.no-data')) {
            this.logOutput.innerHTML = '';
        }
        
        this.logOutput.appendChild(logEntry);
        this.logOutput.scrollTop = this.logOutput.scrollHeight;
    }

    showModal(title, message) {
        this.modalTitle.textContent = title;
        this.modalMessage.textContent = message;
        this.modal.classList.remove('hidden');
    }

    hideModal() {
        this.modal.classList.add('hidden');
    }
}

// Initialize the application
const app = new InvoiceDownloader();

// Health check
window.addEventListener('load', async () => {
    try {
        const response = await fetch('/api/health');
        if (response.ok) {
            app.logMessage('サーバーに接続しました', 'success');
        } else {
            app.logMessage('サーバーの接続に問題があります', 'error');
        }
    } catch (error) {
        app.logMessage('サーバーに接続できませんでした', 'error');
    }
});