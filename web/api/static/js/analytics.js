// Analytics & Statistics UI with Charts

class AnalyticsUI {
    constructor() {
        this.charts = {};
        this.currentPeriod = 30;
        
        this.init();
    }
    
    init() {
        // Load Chart.js if not already loaded
        this.loadChartLibrary();
    }
    
    loadChartLibrary() {
        if (typeof Chart !== 'undefined') return;
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script.onload = () => console.log('✓ Chart.js loaded');
        document.head.appendChild(script);
    }
    
    async renderAnalyticsDashboard(container) {
        container.innerHTML = `
            <div class="analytics-dashboard page-transition">
                <div class="analytics-header" style="margin-bottom: 2rem;">
                    <h1 class="gradient-maroon-text" style="font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem;">
                        📊 Analytics Dashboard
                    </h1>
                    <p style="color: var(--text-secondary);">
                        Insights into bot usage and activity
                    </p>
                </div>
                
                <!-- Period Selector -->
                <div class="glass-card" style="margin-bottom: 2rem; padding: 1rem;">
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <label style="font-weight: 600;">Time Period:</label>
                        <div class="period-buttons" style="display: flex; gap: 0.5rem;">
                            <button class="period-btn glass-btn active" data-days="7">7 Days</button>
                            <button class="period-btn glass-btn" data-days="30">30 Days</button>
                            <button class="period-btn glass-btn" data-days="90">90 Days</button>
                        </div>
                    </div>
                </div>
                
                <!-- Stats Grid -->
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                    <!-- Will be populated dynamically -->
                </div>
                
                <!-- Charts -->
                <div class="charts-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem;">
                    <!-- Command Usage Chart -->
                    <div class="glass-card">
                        <h3 class="accent-maroon" style="margin-bottom: 1rem;">Most Used Commands</h3>
                        <canvas id="commandsChart"></canvas>
                    </div>
                    
                    <!-- Platform Distribution Chart -->
                    <div class="glass-card">
                        <h3 class="accent-maroon" style="margin-bottom: 1rem;">Platform Distribution</h3>
                        <canvas id="platformsChart"></canvas>
                    </div>
                    
                    <!-- Play Method Chart -->
                    <div class="glass-card">
                        <h3 class="accent-maroon" style="margin-bottom: 1rem;">Play Methods</h3>
                        <canvas id="playMethodsChart"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        // Setup period buttons
        this.setupPeriodButtons(container);
        
        // Load data
        await this.loadAnalyticsData();
    }
    
    setupPeriodButtons(container) {
        const buttons = container.querySelectorAll('.period-btn');
        
        buttons.forEach(btn => {
            btn.addEventListener('click', async () => {
                // Update active state
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update period
                this.currentPeriod = parseInt(btn.dataset.days);
                
                // Reload data
                await this.loadAnalyticsData();
            });
        });
    }
    
    async loadAnalyticsData() {
        try {
            // Show loading
            this.showLoading();
            
            // Fetch all analytics data
            const [commands, platforms, playMethods] = await Promise.all([
                this.fetchCommandStats(),
                this.fetchPlatformStats(),
                this.fetchPlayMethodStats()
            ]);
            
            // Render charts
            this.renderCommandsChart(commands);
            this.renderPlatformsChart(platforms);
            this.renderPlayMethodsChart(playMethods);
            
            // Update stats grid
            this.updateStatsGrid({ commands, platforms, playMethods });
            
        } catch (error) {
            console.error('Failed to load analytics:', error);
            this.showError('Failed to load analytics data');
        }
    }
    
    async fetchCommandStats() {
        const response = await fetch(`/api/analytics/commands?days=${this.currentPeriod}`);
        if (!response.ok) throw new Error('Failed to fetch command stats');
        return await response.json();
    }
    
    async fetchPlatformStats() {
        const response = await fetch(`/api/analytics/platforms?days=${this.currentPeriod}`);
        if (!response.ok) throw new Error('Failed to fetch platform stats');
        return await response.json();
    }
    
    async fetchPlayMethodStats() {
        const response = await fetch(`/api/analytics/play-methods?days=${this.currentPeriod}`);
        if (!response.ok) throw new Error('Failed to fetch play method stats');
        return await response.json();
    }
    
    renderCommandsChart(data) {
        const ctx = document.getElementById('commandsChart');
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.charts.commands) {
            this.charts.commands.destroy();
        }
        
        // Create new chart
        this.charts.commands = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.command_name),
                datasets: [{
                    label: 'Usage Count',
                    data: data.map(d => d.count),
                    backgroundColor: 'rgba(128, 0, 32, 0.7)',
                    borderColor: 'rgba(128, 0, 32, 1)',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(128, 0, 32, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    renderPlatformsChart(data) {
        const ctx = document.getElementById('platformsChart');
        if (!ctx) return;
        
        if (this.charts.platforms) {
            this.charts.platforms.destroy();
        }
        
        const colors = {
            'spotify': 'rgba(30, 215, 96, 0.8)',
            'youtube': 'rgba(255, 0, 0, 0.8)',
            'apple_music': 'rgba(252, 52, 110, 0.8)',
            'other': 'rgba(128, 0, 32, 0.8)'
        };
        
        this.charts.platforms = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.platform.replace('_', ' ').toUpperCase()),
                datasets: [{
                    data: data.map(d => d.count),
                    backgroundColor: data.map(d => colors[d.platform] || colors.other),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    renderPlayMethodsChart(data) {
        const ctx = document.getElementById('playMethodsChart');
        if (!ctx) return;
        
        if (this.charts.playMethods) {
            this.charts.playMethods.destroy();
        }
        
        this.charts.playMethods = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.map(d => d.method.replace('_', ' ').toUpperCase()),
                datasets: [{
                    data: data.map(d => d.count),
                    backgroundColor: [
                        'rgba(128, 0, 32, 0.9)',
                        'rgba(160, 32, 47, 0.9)',
                        'rgba(192, 64, 79, 0.9)',
                        'rgba(224, 96, 111, 0.9)'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    updateStatsGrid(data) {
        const grid = document.querySelector('.stats-grid');
        if (!grid) return;
        
        const totalCommands = data.commands.reduce((sum, d) => sum + d.count, 0);
        const totalTracks = data.platforms.reduce((sum, d) => sum + d.count, 0);
        const mostUsedCommand = data.commands[0]?.command_name || 'N/A';
        const topPlatform = data.platforms[0]?.platform || 'N/A';
        
        grid.innerHTML = `
            <div class="glass-card card-entrance hover-lift">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎯</div>
                <div style="font-size: 2rem; font-weight: 700; color: var(--maroon-primary);">
                    ${totalCommands.toLocaleString()}
                </div>
                <div style="color: var(--text-secondary); font-weight: 500;">
                    Total Commands
                </div>
            </div>
            
            <div class="glass-card card-entrance hover-lift" style="animation-delay: 0.1s;">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎵</div>
                <div style="font-size: 2rem; font-weight: 700; color: var(--maroon-primary);">
                    ${totalTracks.toLocaleString()}
                </div>
                <div style="color: var(--text-secondary); font-weight: 500;">
                    Tracks Played
                </div>
            </div>
            
            <div class="glass-card card-entrance hover-lift" style="animation-delay: 0.2s;">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⭐</div>
                <div style="font-size: 1.25rem; font-weight: 700; color: var(--maroon-primary);">
                    /${mostUsedCommand}
                </div>
                <div style="color: var(--text-secondary); font-weight: 500;">
                    Most Used Command
                </div>
            </div>
            
            <div class="glass-card card-entrance hover-lift" style="animation-delay: 0.3s;">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">
                    ${topPlatform === 'spotify' ? '🟢' : topPlatform === 'youtube' ? '🔴' : '🎵'}
                </div>
                <div style="font-size: 1.25rem; font-weight: 700; color: var(--maroon-primary);">
                    ${topPlatform.replace('_', ' ').toUpperCase()}
                </div>
                <div style="color: var(--text-secondary); font-weight: 500;">
                    Top Platform
                </div>
            </div>
        `;
    }
    
    showLoading() {
        const grid = document.querySelector('.stats-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="glass-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                    <div class="spinner-maroon" style="margin: 0 auto 1rem;"></div>
                    <div>Loading analytics...</div>
                </div>
            `;
        }
    }
    
    showError(message) {
        const grid = document.querySelector('.stats-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="glass-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: rgba(220, 53, 69, 0.1);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <div style="color: #DC3545; font-weight: 600;">${message}</div>
                </div>
            `;
        }
    }
}

// Initialize
const analyticsUI = new AnalyticsUI();
window.analyticsUI = analyticsUI;
