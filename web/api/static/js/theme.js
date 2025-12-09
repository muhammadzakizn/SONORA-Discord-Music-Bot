// Theme Management - Light/Dark Mode Toggle

class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || 'dark';
        this.init();
    }
    
    init() {
        // Apply stored theme
        this.applyTheme(this.currentTheme);
        
        // Setup toggle button
        this.setupToggle();
        
        // Listen for system preference changes
        this.watchSystemTheme();
    }
    
    getStoredTheme() {
        return localStorage.getItem('theme');
    }
    
    setStoredTheme(theme) {
        localStorage.setItem('theme', theme);
    }
    
    applyTheme(theme) {
        document.body.classList.remove('light-mode', 'dark-mode');
        document.body.classList.add(`${theme}-mode`);
        this.currentTheme = theme;
        this.setStoredTheme(theme);
        
        // Update toggle button icon
        this.updateToggleIcon();
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    }
    
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        
        // Smooth transition effect
        this.animateThemeChange();
    }
    
    setupToggle() {
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleTheme());
        }
    }
    
    updateToggleIcon() {
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            const icon = this.currentTheme === 'dark' ? '☀️' : '🌙';
            toggleBtn.innerHTML = icon;
            toggleBtn.title = `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} mode`;
        }
    }
    
    watchSystemTheme() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually set preference
            if (!this.getStoredTheme()) {
                const theme = e.matches ? 'dark' : 'light';
                this.applyTheme(theme);
            }
        });
    }
    
    animateThemeChange() {
        // Create transition overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: ${this.currentTheme === 'dark' ? '#000' : '#fff'};
            opacity: 0;
            pointer-events: none;
            z-index: 99999;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(overlay);
        
        // Animate
        requestAnimationFrame(() => {
            overlay.style.opacity = '0.3';
            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
            }, 150);
        });
    }
    
    getTheme() {
        return this.currentTheme;
    }
    
    isDark() {
        return this.currentTheme === 'dark';
    }
    
    isLight() {
        return this.currentTheme === 'light';
    }
}

// Initialize theme manager
const themeManager = new ThemeManager();

// Export for use in other scripts
window.themeManager = themeManager;
