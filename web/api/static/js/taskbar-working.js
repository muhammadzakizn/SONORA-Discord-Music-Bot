// SONORA Music Bot - Working Taskbar

console.log('🎵 SONORA Taskbar loading...');

document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 Initializing SONORA taskbar...');
    
    const container = document.getElementById('taskbar-container');
    if (!container) {
        console.error('❌ Taskbar container not found!');
        return;
    }
    
    // Check if user is admin
    const isAdmin = window.isAdmin || false;
    const isAuthenticated = window.isAuthenticated || false;
    
    // Get current page
    const currentPath = window.location.pathname;
    
    // Build taskbar items
    let dockItems = `
        <a href="/" class="dock-item ${currentPath === '/' ? 'active' : ''}" title="Home">
            <span style="font-size: 1.5rem;">🏠</span>
            <span class="dock-tooltip">Home</span>
        </a>
    `;
    
    // Add admin/login link
    if (isAuthenticated || isAdmin) {
        dockItems += `
        <a href="/admin" class="dock-item ${currentPath === '/admin' ? 'active' : ''}" title="Admin Panel">
            <span style="font-size: 1.5rem;">🛠️</span>
            <span class="dock-tooltip">Admin</span>
        </a>
        `;
    } else {
        // Show login link if not authenticated
        dockItems += `
        <a href="/login" class="dock-item ${currentPath === '/login' ? 'active' : ''}" title="Login Admin">
            <span style="font-size: 1.5rem;">🔐</span>
            <span class="dock-tooltip">Login Admin</span>
        </a>
        `;
    }
    
    // Theme toggle
    dockItems += `
        <div class="dock-separator"></div>
        <div class="dock-item" id="theme-toggle-btn" title="Toggle Theme">
            <span style="font-size: 1.5rem;">🌓</span>
            <span class="dock-tooltip">Toggle Theme</span>
        </div>
    `;
    
    // Create dock HTML
    const dockHTML = `
        <div class="sonora-dock" style="
            position: fixed;
            bottom: 1rem;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(26, 26, 26, 0.85);
            backdrop-filter: blur(40px) saturate(200%);
            -webkit-backdrop-filter: blur(40px) saturate(200%);
            border: 1px solid rgba(128, 0, 32, 0.5);
            border-radius: 20px;
            padding: 0.75rem 1rem;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            display: flex;
            gap: 0.75rem;
            align-items: center;
            z-index: 10000;
        ">
            ${dockItems}
        </div>
        
        <style>
        body.dark-mode .sonora-dock {
            background: rgba(26, 26, 26, 0.85) !important;
            border-color: rgba(160, 32, 47, 0.5) !important;
        }
        
        body.light-mode .sonora-dock {
            background: rgba(255, 255, 255, 0.85) !important;
            border-color: rgba(128, 0, 32, 0.5) !important;
        }
        
        .dock-item {
            width: 52px;
            height: 52px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 14px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            text-decoration: none;
            color: inherit;
        }
        
        .dock-item:hover {
            transform: translateY(-10px) scale(1.15);
            background: rgba(128, 0, 32, 0.2);
        }
        
        .dock-item.active {
            background: rgba(128, 0, 32, 0.3);
            box-shadow: 0 0 20px rgba(128, 0, 32, 0.4);
        }
        
        .dock-item.active::after {
            content: '';
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 6px;
            height: 6px;
            background: #800020;
            border-radius: 50%;
        }
        
        .dock-separator {
            width: 1px;
            height: 45px;
            background: rgba(128, 0, 32, 0.4);
            margin: 0 0.5rem;
        }
        
        .dock-tooltip {
            position: absolute;
            bottom: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.875rem;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
        }
        
        .dock-item:hover .dock-tooltip {
            opacity: 1;
        }
        </style>
    `;
    
    container.innerHTML = dockHTML;
    console.log('✓ SONORA Taskbar created');
    
    // Theme toggle functionality
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', function() {
            if (window.themeManager && typeof window.themeManager.toggleTheme === 'function') {
                window.themeManager.toggleTheme();
            } else {
                // Fallback
                document.body.classList.toggle('dark-mode');
                document.body.classList.toggle('light-mode');
            }
            
            // Show notification
            showNotification('Theme toggled!');
        });
    }
    
    console.log('✅ SONORA Taskbar initialized!');
});

function showNotification(message) {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 1rem;
        right: 1rem;
        background: rgba(128, 0, 32, 0.95);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        z-index: 99999;
        animation: slideInRight 0.3s ease;
        font-weight: 500;
    `;
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 2000);
}
