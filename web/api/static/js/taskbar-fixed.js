// Simple Taskbar Implementation - v3.3.0

console.log('🔧 Taskbar script loading...');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 Initializing taskbar...');
    
    // Create taskbar
    const container = document.getElementById('taskbar-container');
    if (!container) {
        console.error('❌ Taskbar container not found!');
        return;
    }
    
    console.log('✓ Taskbar container found');
    
    // Create dock HTML
    const dockHTML = `
        <div class="glass-dock" id="main-dock" style="
            position: fixed;
            bottom: 1rem;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(40px) saturate(200%);
            -webkit-backdrop-filter: blur(40px) saturate(200%);
            border: 1px solid rgba(128, 0, 32, 0.3);
            border-radius: 20px;
            padding: 0.5rem;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            display: flex;
            gap: 0.5rem;
            align-items: center;
            z-index: 1000;
        ">
            <div class="dock-item" data-view="home" style="
                width: 48px;
                height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 1.5rem;
                position: relative;
            ">
                🏠
                <span class="tooltip" style="
                    position: absolute;
                    bottom: 60px;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.2s;
                ">Home</span>
            </div>
            
            <div class="dock-item" data-view="playing" style="
                width: 48px;
                height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 1.5rem;
                position: relative;
            ">
                🎵
                <span class="tooltip" style="
                    position: absolute;
                    bottom: 60px;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.2s;
                ">Now Playing</span>
            </div>
            
            <div class="dock-item" data-view="queue" style="
                width: 48px;
                height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 1.5rem;
                position: relative;
            ">
                📋
                <span class="tooltip" style="
                    position: absolute;
                    bottom: 60px;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.2s;
                ">Queue</span>
            </div>
            
            <div class="dock-item" data-view="stats" style="
                width: 48px;
                height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 1.5rem;
                position: relative;
            ">
                📊
                <span class="tooltip" style="
                    position: absolute;
                    bottom: 60px;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.2s;
                ">Statistics</span>
            </div>
            
            <div class="dock-separator" style="
                width: 1px;
                height: 40px;
                background: rgba(128, 0, 32, 0.3);
                margin: 0 0.25rem;
            "></div>
            
            <div class="dock-item" data-action="theme" style="
                width: 48px;
                height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 1.5rem;
                position: relative;
            " id="theme-toggle">
                🌓
                <span class="tooltip" style="
                    position: absolute;
                    bottom: 60px;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.2s;
                ">Toggle Theme</span>
            </div>
        </div>
    `;
    
    container.innerHTML = dockHTML;
    console.log('✓ Taskbar HTML created');
    
    // Add hover effects
    const dockItems = document.querySelectorAll('.dock-item');
    dockItems.forEach(item => {
        // Hover effect
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.1)';
            this.style.background = 'rgba(128, 0, 32, 0.15)';
            
            // Show tooltip
            const tooltip = this.querySelector('.tooltip');
            if (tooltip) {
                tooltip.style.opacity = '1';
            }
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.background = 'transparent';
            
            // Hide tooltip
            const tooltip = this.querySelector('.tooltip');
            if (tooltip) {
                tooltip.style.opacity = '0';
            }
        });
        
        // Click handler
        item.addEventListener('click', function() {
            const view = this.getAttribute('data-view');
            const action = this.getAttribute('data-action');
            
            console.log('Clicked:', view || action);
            
            if (action === 'theme') {
                // Toggle theme
                if (window.themeManager && typeof window.themeManager.toggleTheme === 'function') {
                    window.themeManager.toggleTheme();
                } else {
                    // Fallback theme toggle
                    document.body.classList.toggle('dark-mode');
                    document.body.classList.toggle('light-mode');
                    console.log('Theme toggled (fallback)');
                }
            } else if (view) {
                // Navigate to view
                console.log('Navigate to:', view);
                
                // Remove active from all
                dockItems.forEach(i => {
                    i.style.background = 'transparent';
                    i.classList.remove('active');
                });
                
                // Set this active
                this.style.background = 'rgba(128, 0, 32, 0.2)';
                this.classList.add('active');
                
                // Show notification
                showNotification(`Navigating to ${view}...`);
            }
        });
    });
    
    console.log('✓ Taskbar events attached');
    console.log('✅ Taskbar initialized successfully!');
});

// Simple notification function
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 1rem;
        right: 1rem;
        background: rgba(128, 0, 32, 0.95);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

console.log('✓ Taskbar script loaded');
