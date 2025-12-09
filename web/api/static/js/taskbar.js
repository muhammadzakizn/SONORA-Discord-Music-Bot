// macOS-Style Bottom Taskbar (Dock)

class Taskbar {
    constructor() {
        this.currentView = 'home';
        this.items = [
            { id: 'home', icon: '🏠', label: 'Home', view: 'dashboard' },
            { id: 'playing', icon: '🎵', label: 'Now Playing', view: 'now-playing' },
            { id: 'queue', icon: '📋', label: 'Queue', view: 'queue' },
            { id: 'stats', icon: '📊', label: 'Statistics', view: 'stats', admin: false },
            { id: 'library', icon: '📥', label: 'Library', view: 'library' },
            { id: 'settings', icon: '⚙️', label: 'Settings', view: 'settings' },
            { id: 'separator' },
            { id: 'admin', icon: '🛠️', label: 'Admin', view: 'admin', admin: true },
            { id: 'broadcast', icon: '📢', label: 'Broadcast', view: 'broadcast', admin: true },
            { id: 'separator' },
            { id: 'theme', icon: '🌓', label: 'Theme Toggle', action: 'toggleTheme' }
        ];
        
        this.init();
    }
    
    init() {
        this.render();
        this.setupEventListeners();
        this.loadView(this.currentView);
    }
    
    render() {
        const container = document.getElementById('taskbar-container');
        if (!container) {
            console.error('Taskbar container not found');
            return;
        }
        
        const dock = document.createElement('div');
        dock.className = 'glass-dock';
        dock.id = 'dock';
        
        this.items.forEach(item => {
            if (item.id === 'separator') {
                const separator = document.createElement('div');
                separator.className = 'dock-separator';
                dock.appendChild(separator);
            } else {
                const dockItem = this.createDockItem(item);
                dock.appendChild(dockItem);
            }
        });
        
        container.innerHTML = '';
        container.appendChild(dock);
        
        // Set initial active state
        this.setActive(this.currentView);
    }
    
    createDockItem(item) {
        const element = document.createElement('div');
        element.className = 'dock-item';
        element.id = `dock-${item.id}`;
        element.innerHTML = item.icon;
        element.dataset.view = item.view || '';
        element.dataset.action = item.action || '';
        
        // Tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'glass-tooltip';
        tooltip.textContent = item.label;
        tooltip.style.cssText = `
            bottom: 60px;
            left: 50%;
            transform: translateX(-50%);
        `;
        element.appendChild(tooltip);
        
        // Hover effects
        element.addEventListener('mouseenter', () => {
            tooltip.classList.add('show');
        });
        
        element.addEventListener('mouseleave', () => {
            tooltip.classList.remove('show');
        });
        
        // Click handler
        element.addEventListener('click', () => {
            if (item.action) {
                this.handleAction(item.action);
            } else if (item.view) {
                this.switchView(item.view);
            }
        });
        
        // Hide admin items if not admin
        if (item.admin && !window.isAdmin) {
            element.style.display = 'none';
        }
        
        return element;
    }
    
    switchView(view) {
        if (this.currentView === view) return;
        
        this.currentView = view;
        this.setActive(view);
        this.loadView(view);
    }
    
    setActive(view) {
        // Remove all active states
        document.querySelectorAll('.dock-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Set active state
        this.items.forEach(item => {
            if (item.view === view) {
                const element = document.getElementById(`dock-${item.id}`);
                if (element) {
                    element.classList.add('active');
                }
            }
        });
    }
    
    loadView(view) {
        const contentContainer = document.getElementById('main-content');
        if (!contentContainer) return;
        
        // Add page transition animation
        contentContainer.classList.remove('page-transition');
        void contentContainer.offsetWidth; // Force reflow
        contentContainer.classList.add('page-transition');
        
        // Load view content
        switch (view) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'now-playing':
                this.loadNowPlaying();
                break;
            case 'queue':
                this.loadQueue();
                break;
            case 'stats':
                this.loadStats();
                break;
            case 'library':
                this.loadLibrary();
                break;
            case 'settings':
                this.loadSettings();
                break;
            case 'admin':
                this.loadAdmin();
                break;
            case 'broadcast':
                this.loadBroadcast();
                break;
            default:
                this.loadDashboard();
        }
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('viewChanged', { detail: { view } }));
    }
    
    handleAction(action) {
        switch (action) {
            case 'toggleTheme':
                if (window.themeManager) {
                    window.themeManager.toggleTheme();
                }
                break;
            default:
                console.log('Unknown action:', action);
        }
    }
    
    // View loaders (to be implemented)
    loadDashboard() {
        console.log('Loading dashboard...');
        // Will be implemented with actual dashboard content
    }
    
    loadNowPlaying() {
        console.log('Loading now playing...');
        // Will be implemented with now playing UI
    }
    
    loadQueue() {
        console.log('Loading queue...');
        // Will be implemented with queue UI
    }
    
    loadStats() {
        console.log('Loading stats...');
        // Will be implemented with stats/analytics UI
    }
    
    loadLibrary() {
        console.log('Loading library...');
        // Will be implemented with downloads/library UI
    }
    
    loadSettings() {
        console.log('Loading settings...');
        // Will be implemented with settings UI
    }
    
    loadAdmin() {
        console.log('Loading admin...');
        // Will be implemented with admin panel UI
    }
    
    loadBroadcast() {
        console.log('Loading broadcast...');
        // Will be implemented with broadcast UI
    }
    
    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                const key = e.key.toLowerCase();
                const shortcuts = {
                    '1': 'dashboard',
                    '2': 'now-playing',
                    '3': 'queue',
                    '4': 'stats',
                    '5': 'library',
                    '6': 'settings',
                    't': 'theme'
                };
                
                if (shortcuts[key]) {
                    e.preventDefault();
                    if (key === 't' && window.themeManager) {
                        window.themeManager.toggleTheme();
                    } else {
                        this.switchView(shortcuts[key]);
                    }
                }
            }
        });
    }
    
    // Public API
    getCurrentView() {
        return this.currentView;
    }
    
    goTo(view) {
        this.switchView(view);
    }
    
    showNotification(message, type = 'info') {
        // Create notification badge
        const notification = document.createElement('div');
        notification.className = 'glass-badge badge-maroon';
        notification.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 9999;
            animation: bounceIn 0.5s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.5s ease';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
}

// Initialize taskbar when DOM is ready
let taskbar;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        taskbar = new Taskbar();
        window.taskbar = taskbar;
    });
} else {
    taskbar = new Taskbar();
    window.taskbar = taskbar;
}
