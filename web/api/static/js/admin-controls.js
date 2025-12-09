// Admin Controls for Web Panel

class AdminControls {
    constructor() {
        this.init();
    }
    
    init() {
        console.log('Admin Controls initialized');
    }
    
    // Maintenance Mode
    async toggleMaintenance(enable) {
        try {
            const response = await fetch('/api/admin/maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enable })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(result.message, 'success');
                return true;
            } else {
                throw new Error(result.error || 'Failed');
            }
        } catch (error) {
            this.showNotification('Failed to toggle maintenance mode', 'error');
            return false;
        }
    }
    
    // Bot Controls
    async pauseAll() {
        if (!confirm('Pause playback in ALL servers?')) return;
        
        try {
            const response = await fetch('/api/admin/bot/pause', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(result.message, 'success');
            }
        } catch (error) {
            this.showNotification('Failed to pause all', 'error');
        }
    }
    
    async resumeAll() {
        try {
            const response = await fetch('/api/admin/bot/resume', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(result.message, 'success');
            }
        } catch (error) {
            this.showNotification('Failed to resume all', 'error');
        }
    }
    
    async stopAll() {
        if (!confirm('Stop and disconnect from ALL servers?')) return;
        
        try {
            const response = await fetch('/api/admin/bot/stop-all', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(result.message, 'success');
            }
        } catch (error) {
            this.showNotification('Failed to stop all', 'error');
        }
    }
    
    async restartBot() {
        if (!confirm('Restart bot? This will disconnect all users briefly.')) return;
        
        try {
            const response = await fetch('/api/admin/bot/restart', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(result.message, 'warning');
            }
        } catch (error) {
            this.showNotification('Restart initiated', 'warning');
        }
    }
    
    async shutdownBot() {
        if (!confirm('SHUTDOWN bot completely? This cannot be undone remotely!')) return;
        if (!confirm('Are you SURE? Bot will stop completely.')) return;
        
        try {
            const response = await fetch('/api/admin/system/shutdown', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            this.showNotification('Shutdown initiated', 'error');
        }
    }
    
    async clearCache() {
        if (!confirm('Clear ALL cached downloads? This will slow down playback temporarily.')) return;
        
        try {
            const response = await fetch('/api/admin/cache/clear', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(result.message, 'success');
            }
        } catch (error) {
            this.showNotification('Failed to clear cache', 'error');
        }
    }
    
    showNotification(message, type = 'info') {
        const colors = {
            success: '#1DB954',
            error: '#DC3545',
            warning: '#FFA500',
            info: '#800020'
        };
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            background: ${colors[type]};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize
const adminControls = new AdminControls();
window.adminControls = adminControls;
