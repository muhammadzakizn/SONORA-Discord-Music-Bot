// PWA Installation and Management

class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.init();
    }
    
    init() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('✓ Service Worker registered:', registration.scope);
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        }
        
        // Listen for install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });
        
        // Check if already installed
        window.addEventListener('appinstalled', () => {
            console.log('✓ PWA installed');
            this.hideInstallButton();
        });
        
        // Check display mode
        if (this.isStandalone()) {
            console.log('✓ Running as PWA');
            document.body.classList.add('pwa-mode');
        }
    }
    
    isStandalone() {
        return (window.matchMedia('(display-mode: standalone)').matches) ||
               (window.navigator.standalone) ||
               document.referrer.includes('android-app://');
    }
    
    showInstallButton() {
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
            installBtn.style.display = 'block';
            installBtn.addEventListener('click', () => this.install());
        }
    }
    
    hideInstallButton() {
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    }
    
    async install() {
        if (!this.deferredPrompt) {
            console.log('Install prompt not available');
            return;
        }
        
        // Show install prompt
        this.deferredPrompt.prompt();
        
        // Wait for user response
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`Install outcome: ${outcome}`);
        
        // Clear prompt
        this.deferredPrompt = null;
        this.hideInstallButton();
    }
}

// Initialize PWA
const pwaManager = new PWAManager();

// Export for use in other scripts
window.pwaManager = pwaManager;
