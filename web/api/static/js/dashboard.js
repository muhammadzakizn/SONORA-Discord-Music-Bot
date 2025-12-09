// Discord Music Bot Dashboard - JavaScript

// WebSocket connection
const socket = io();

// State
let currentGuilds = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard initializing...');
    
    // Connect to WebSocket
    connectWebSocket();
    
    // Load initial data
    loadStats();
    loadGuilds();
    loadActivity();
    
    // Refresh data periodically
    setInterval(loadStats, 5000);
    setInterval(loadGuilds, 10000);
    setInterval(loadActivity, 30000);
});

// WebSocket
function connectWebSocket() {
    socket.on('connect', () => {
        console.log('WebSocket connected');
        updateStatus('online');
    });
    
    socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        updateStatus('offline');
    });
    
    socket.on('status_update', (data) => {
        console.log('Status update:', data);
        updateStatsFromSocket(data);
    });
    
    socket.on('guild_update', (data) => {
        console.log('Guild update:', data);
        // Handle guild-specific updates
    });
}

function updateStatus(status) {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    
    if (status === 'online') {
        statusDot.classList.add('online');
        statusText.textContent = 'Online';
    } else {
        statusDot.classList.remove('online');
        statusText.textContent = 'Offline';
    }
}

// Load Stats
async function loadStats() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        if (data.error) {
            console.error('Failed to load stats:', data.error);
            return;
        }
        
        updateStats(data);
        updateStatus('online');
    } catch (error) {
        console.error('Error loading stats:', error);
        updateStatus('offline');
    }
}

function updateStats(data) {
    document.getElementById('stat-guilds').textContent = data.guilds || 0;
    document.getElementById('stat-users').textContent = data.users || 0;
    document.getElementById('stat-voice').textContent = data.voice_connections || 0;
    document.getElementById('stat-playing').textContent = data.playing || 0;
}

function updateStatsFromSocket(data) {
    document.getElementById('stat-guilds').textContent = data.guilds || 0;
    document.getElementById('stat-voice').textContent = data.voice_connections || 0;
    document.getElementById('stat-playing').textContent = data.playing || 0;
}

// Load Guilds
async function loadGuilds() {
    try {
        const response = await fetch('/api/guilds');
        const guilds = await response.json();
        
        if (guilds.error) {
            console.error('Failed to load guilds:', guilds.error);
            return;
        }
        
        currentGuilds = guilds;
        renderGuilds(guilds);
    } catch (error) {
        console.error('Error loading guilds:', error);
    }
}

function renderGuilds(guilds) {
    const container = document.getElementById('guilds-list');
    
    if (guilds.length === 0) {
        container.innerHTML = '<div class="loading">No guilds found</div>';
        return;
    }
    
    container.innerHTML = guilds.map(guild => {
        // Ensure guild.id is properly formatted
        const guildIdStr = String(guild.id);
        return `
        <div class="guild-card ${guild.is_playing ? 'playing' : ''}" onclick="openGuildModal('${guildIdStr}')">
            <div class="guild-header">
                <div class="guild-icon">
                    ${guild.icon ? 
                        `<img src="${guild.icon}" alt="${guild.name}">` : 
                        guild.name.charAt(0)
                    }
                </div>
                <div class="guild-info">
                    <h3>${guild.name}</h3>
                    <div class="guild-members">👥 ${guild.member_count} members</div>
                </div>
            </div>
            <div class="guild-status ${guild.is_playing ? 'playing' : ''}">
                ${guild.is_playing ? 
                    `▶️ Playing: ${guild.current_track ? 
                        `${guild.current_track.title} - ${guild.current_track.artist}` : 
                        'Unknown'
                    }` : 
                    '⏸️ Idle'
                }
            </div>
        </div>
    `;
    }).join('');
}

// Load Activity
async function loadActivity() {
    try {
        const response = await fetch('/api/history?limit=20');
        const history = await response.json();
        
        if (history.error) {
            console.error('Failed to load activity:', history.error);
            return;
        }
        
        renderActivity(history);
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

function renderActivity(history) {
    const container = document.getElementById('activity-list');
    
    if (history.length === 0) {
        container.innerHTML = '<div class="loading">No recent activity</div>';
        return;
    }
    
    container.innerHTML = history.map(item => `
        <div class="activity-item">
            <div class="activity-icon">🎵</div>
            <div class="activity-content">
                <div class="activity-title">${item.title}</div>
                <div class="activity-details">
                    ${item.artist} • Played by ${item.username}
                </div>
            </div>
            <div class="activity-time">${formatTime(item.played_at)}</div>
        </div>
    `).join('');
}

// Modal
async function openGuildModal(guildId) {
    const modal = document.getElementById('guild-modal');
    const content = document.getElementById('guild-detail');
    
    modal.classList.add('active');
    content.innerHTML = '<div class="loading">Loading guild details...</div>';
    
    try {
        const response = await fetch(`/api/guild/${guildId}`);
        const guild = await response.json();
        
        if (guild.error) {
            content.innerHTML = `<div class="loading">Error: ${guild.error}</div>`;
            return;
        }
        
        renderGuildDetail(guild);
    } catch (error) {
        console.error('Error loading guild detail:', error);
        content.innerHTML = '<div class="loading">Error loading guild details</div>';
    }
}

function renderGuildDetail(guild) {
    const content = document.getElementById('guild-detail');
    
    content.innerHTML = `
        <h2>${guild.name}</h2>
        <div style="margin-top: 20px;">
            <h3>Current Track</h3>
            ${guild.current_track ? `
                <div style="background: var(--bg-card); padding: 20px; border-radius: 12px; margin-top: 10px;">
                    ${guild.current_track.artwork_url ? 
                        `<img src="${guild.current_track.artwork_url}" style="width: 200px; height: 200px; border-radius: 8px; margin-bottom: 15px;">` : 
                        ''
                    }
                    <h4>${guild.current_track.title}</h4>
                    <p>${guild.current_track.artist}</p>
                    <div style="margin-top: 15px;">
                        <div style="display: flex; gap: 10px;">
                            <button onclick="controlPlayback(${guild.id}, 'pause')" style="padding: 10px 20px; background: var(--accent-primary); border: none; border-radius: 8px; color: white; cursor: pointer;">⏸️ Pause</button>
                            <button onclick="controlPlayback(${guild.id}, 'skip')" style="padding: 10px 20px; background: var(--accent-secondary); border: none; border-radius: 8px; color: white; cursor: pointer;">⏭️ Skip</button>
                            <button onclick="controlPlayback(${guild.id}, 'stop')" style="padding: 10px 20px; background: var(--error-color); border: none; border-radius: 8px; color: white; cursor: pointer;">⏹️ Stop</button>
                        </div>
                    </div>
                </div>
            ` : '<p>No track currently playing</p>'}
        </div>
        <div style="margin-top: 30px;">
            <h3>Queue (${guild.queue_length} tracks)</h3>
            ${guild.queue && guild.queue.length > 0 ? `
                <div style="margin-top: 10px;">
                    ${guild.queue.map(track => `
                        <div style="padding: 10px; background: var(--bg-card); border-radius: 8px; margin-bottom: 10px;">
                            ${track.position}. ${track.title} - ${track.artist}
                        </div>
                    `).join('')}
                </div>
            ` : '<p>Queue is empty</p>'}
        </div>
    `;
}

function closeModal() {
    const modal = document.getElementById('guild-modal');
    modal.classList.remove('active');
}

// Playback Control
async function controlPlayback(guildId, action) {
    try {
        const response = await fetch(`/api/control/${guildId}/${action}`, {
            method: 'POST'
        });
        const result = await response.json();
        
        if (result.error) {
            alert(`Error: ${result.error}`);
        } else {
            // Refresh guild detail
            setTimeout(() => openGuildModal(guildId), 500);
        }
    } catch (error) {
        console.error('Control action failed:', error);
        alert('Failed to control playback');
    }
}

// Utilities
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Close modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('guild-modal');
    if (event.target === modal) {
        closeModal();
    }
}
