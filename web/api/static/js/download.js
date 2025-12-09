// Download Manager UI

class DownloadUI {
    constructor() {
        this.currentTrack = null;
        this.selectedTracks = [];
        this.downloadHistory = [];
        
        this.init();
    }
    
    init() {
        // Load download history
        this.loadHistory();
    }
    
    showDownloadMenu(trackInfo) {
        this.currentTrack = trackInfo;
        
        const modal = this.createDownloadModal();
        document.body.appendChild(modal);
        
        setTimeout(() => modal.classList.add('show'), 10);
    }
    
    createDownloadModal() {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            z-index: 9998;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        const modal = document.createElement('div');
        modal.className = 'glass-modal modal-enter';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 9999;
            width: 90%;
            max-width: 600px;
        `;
        
        modal.innerHTML = `
            <div class="modal-header" style="margin-bottom: 1.5rem;">
                <h2 class="gradient-maroon-text" style="font-size: 1.5rem; font-weight: 700; margin: 0;">
                    📥 Download Options
                </h2>
                <button id="close-download-modal" class="glass-btn" style="position: absolute; top: 0; right: 0;">
                    ✕
                </button>
            </div>
            
            <div class="modal-body">
                <div class="track-info glass-card" style="margin-bottom: 1.5rem; padding: 1rem;">
                    <div style="font-weight: 600; font-size: 1.1rem;">${this.currentTrack.title}</div>
                    <div style="color: var(--text-secondary); font-size: 0.9rem;">${this.currentTrack.artist}</div>
                </div>
                
                <div class="download-options" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <button class="download-option glass-card hover-lift ripple" data-type="audio" style="padding: 1.5rem; text-align: center; cursor: pointer; border: 2px solid transparent;">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎵</div>
                        <div style="font-weight: 600;">Audio Only</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
                            Download audio file
                        </div>
                    </button>
                    
                    <button class="download-option glass-card hover-lift ripple" data-type="lyrics" style="padding: 1.5rem; text-align: center; cursor: pointer; border: 2px solid transparent;">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📄</div>
                        <div style="font-weight: 600;">Lyrics Only</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
                            Download lyrics file
                        </div>
                    </button>
                    
                    <button class="download-option glass-card hover-lift ripple" data-type="artwork" style="padding: 1.5rem; text-align: center; cursor: pointer; border: 2px solid transparent;">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🖼️</div>
                        <div style="font-weight: 600;">Artwork Only</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
                            Download album cover
                        </div>
                    </button>
                    
                    <button class="download-option glass-card hover-lift ripple" data-type="full" style="padding: 1.5rem; text-align: center; cursor: pointer; border: 2px solid transparent;">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📦</div>
                        <div style="font-weight: 600;">Full Package</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
                            Audio + metadata + lyrics
                        </div>
                    </button>
                </div>
                
                <div id="format-selector" style="display: none; margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Format:</label>
                    <select id="download-format" class="glass-input" style="width: 100%;"></select>
                </div>
                
                <div style="display: flex; gap: 1rem;">
                    <button id="download-btn" class="btn-maroon" style="flex: 1;" disabled>
                        Select Download Type
                    </button>
                    <button id="cancel-download-btn" class="btn-maroon-outline">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        const container = document.createElement('div');
        container.appendChild(backdrop);
        container.appendChild(modal);
        
        // Setup event listeners
        this.setupDownloadModal(container);
        
        setTimeout(() => backdrop.style.opacity = '1', 10);
        
        return container;
    }
    
    setupDownloadModal(container) {
        const backdrop = container.querySelector('.modal-backdrop');
        const modal = container.querySelector('.glass-modal');
        const closeBtn = modal.querySelector('#close-download-modal');
        const cancelBtn = modal.querySelector('#cancel-download-btn');
        const downloadBtn = modal.querySelector('#download-btn');
        const options = modal.querySelectorAll('.download-option');
        const formatSelector = modal.querySelector('#format-selector');
        const formatSelect = modal.querySelector('#download-format');
        
        let selectedType = null;
        
        // Close handlers
        backdrop.addEventListener('click', () => this.closeModal(container));
        closeBtn.addEventListener('click', () => this.closeModal(container));
        cancelBtn.addEventListener('click', () => this.closeModal(container));
        
        // Option selection
        options.forEach(option => {
            option.addEventListener('click', () => {
                // Remove previous selection
                options.forEach(opt => {
                    opt.style.borderColor = 'transparent';
                    opt.style.background = '';
                });
                
                // Select this option
                option.style.borderColor = 'var(--maroon-primary)';
                option.style.background = 'rgba(128, 0, 32, 0.05)';
                
                selectedType = option.dataset.type;
                
                // Show format selector
                formatSelector.style.display = 'block';
                formatSelect.innerHTML = this.getFormatOptions(selectedType);
                
                // Enable download button
                downloadBtn.disabled = false;
                downloadBtn.textContent = `Download ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`;
            });
        });
        
        // Download handler
        downloadBtn.addEventListener('click', () => {
            if (selectedType) {
                const format = formatSelect.value;
                this.startDownload(selectedType, format, container);
            }
        });
    }
    
    getFormatOptions(type) {
        const formats = {
            audio: [
                { value: 'opus', label: 'OPUS (High Quality, Small Size)' },
                { value: 'mp3', label: 'MP3 (Universal Compatibility)' },
                { value: 'flac', label: 'FLAC (Lossless Quality)' }
            ],
            lyrics: [
                { value: 'lrc', label: 'LRC (Synced Lyrics)' },
                { value: 'txt', label: 'TXT (Plain Text)' }
            ],
            artwork: [
                { value: 'jpg', label: 'JPG (Smaller Size)' },
                { value: 'png', label: 'PNG (Higher Quality)' }
            ],
            full: [
                { value: 'mp3', label: 'MP3 Package' },
                { value: 'flac', label: 'FLAC Package' }
            ]
        };
        
        return formats[type].map(f => 
            `<option value="${f.value}">${f.label}</option>`
        ).join('');
    }
    
    async startDownload(type, format, container) {
        const downloadBtn = container.querySelector('#download-btn');
        
        // Show loading
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = `
            <div class="dots-loading" style="justify-content: center;">
                <span></span><span></span><span></span>
            </div>
        `;
        
        try {
            const endpoint = `/api/download/${type}`;
            const body = {
                track_info: this.currentTrack,
                format: format
            };
            
            // Add lyrics/artwork if needed
            if (type === 'lyrics' || type === 'full') {
                body.lyrics = this.currentTrack.lyrics || '';
            }
            if (type === 'artwork' || type === 'full') {
                body.artwork_url = this.currentTrack.artwork_url || '';
            }
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            if (response.ok) {
                const result = await response.json();
                
                // Close modal
                this.closeModal(container);
                
                // Show success notification
                this.showNotification(`✓ Download complete! Saved to: ${result.file_path}`, 'success');
                
                // Update history
                this.loadHistory();
            } else {
                throw new Error('Download failed');
            }
        } catch (error) {
            console.error('Download error:', error);
            this.showNotification('❌ Download failed. Please try again.', 'error');
            downloadBtn.disabled = false;
            downloadBtn.textContent = 'Try Again';
        }
    }
    
    closeModal(container) {
        const backdrop = container.querySelector('.modal-backdrop');
        const modal = container.querySelector('.glass-modal');
        
        backdrop.style.opacity = '0';
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -50%) scale(0.9)';
        
        setTimeout(() => container.remove(), 300);
    }
    
    async loadHistory() {
        try {
            const response = await fetch('/api/download/history?limit=50');
            if (response.ok) {
                this.downloadHistory = await response.json();
            }
        } catch (error) {
            console.error('Failed to load download history:', error);
        }
    }
    
    showHistory() {
        // Create history modal
        const modal = this.createHistoryModal();
        document.body.appendChild(modal);
        
        setTimeout(() => modal.classList.add('show'), 10);
    }
    
    createHistoryModal() {
        // Similar structure to download modal
        // Display download history with filters
        // Implementation details...
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'glass-card bounce-in';
        notification.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 9999;
            padding: 1rem 1.5rem;
            max-width: 400px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        `;
        
        const colors = {
            success: 'var(--maroon-primary)',
            error: '#DC3545',
            info: 'var(--maroon-light)'
        };
        
        notification.style.borderLeft = `4px solid ${colors[type]}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.5s ease';
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }
}

// Initialize
const downloadUI = new DownloadUI();
window.downloadUI = downloadUI;
