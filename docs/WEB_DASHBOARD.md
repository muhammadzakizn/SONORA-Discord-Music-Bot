# Web Dashboard Documentation

## Overview

The Discord Music Bot includes a real-time web dashboard for monitoring and controlling the bot remotely.

**Access:** `http://localhost:5000` (default)

## Features

### 1. Real-time Monitoring
- Live bot status (online/offline)
- Active guilds count
- Voice connections
- Currently playing tracks
- WebSocket updates every 2 seconds

### 2. Guild Management
- View all guilds
- See current playing track per guild
- View queue for each guild
- Click guild for detailed view

### 3. Playback Controls
- Pause/Resume current track
- Skip to next track
- Stop playback
- Works from any device on network

### 4. Play History
- Recent 20 tracks played
- Shows title, artist, username
- Timestamp with "time ago" format
- Filter by guild or user

### 5. Statistics & Analytics
- User stats (total plays, listening time, top artists)
- Guild analytics (top tracks, peak hours)
- Configurable time periods (7, 30, 90 days)

## Configuration

### Environment Variables

Add to `.env` file:

```bash
ENABLE_WEB_DASHBOARD=true
WEB_DASHBOARD_HOST=0.0.0.0
WEB_DASHBOARD_PORT=5000
```

### Options

- `ENABLE_WEB_DASHBOARD`: Enable/disable dashboard (default: `true`)
- `WEB_DASHBOARD_HOST`: Host to bind to (default: `0.0.0.0` - all interfaces)
- `WEB_DASHBOARD_PORT`: Port number (default: `5000`)

## Setup

### 1. Install Dependencies

```bash
pip install flask flask-cors flask-socketio
```

### 2. Enable in .env

```bash
ENABLE_WEB_DASHBOARD=true
```

### 3. Start Bot

```bash
python main.py
```

### 4. Access Dashboard

Open browser: `http://localhost:5000`

For remote access: `http://YOUR_SERVER_IP:5000`

## API Endpoints

### Bot Status
```
GET /api/status
```
Returns bot status, guild count, voice connections, latency.

### Guilds List
```
GET /api/guilds
```
Returns all guilds with current playing status.

### Guild Detail
```
GET /api/guild/<guild_id>
```
Returns detailed guild information including queue.

### Play History
```
GET /api/history?guild_id=<id>&user_id=<id>&limit=<n>
```
Returns play history with optional filters.

### User Statistics
```
GET /api/stats/user/<user_id>?guild_id=<id>
```
Returns user listening statistics.

### Guild Analytics
```
GET /api/stats/guild/<guild_id>?days=<n>
```
Returns guild analytics for specified period.

### Playback Control
```
POST /api/control/<guild_id>/<action>
```
Actions: `pause`, `resume`, `skip`, `stop`

## WebSocket Events

### Client → Server
- `connect` - Client connects
- `disconnect` - Client disconnects
- `subscribe_guild` - Subscribe to guild updates

### Server → Client
- `connected` - Connection established
- `status_update` - Bot status broadcast (every 2s)
- `guild_update_{guild_id}` - Guild-specific updates

## Security

### ⚠️ Important Security Notes

**Default Configuration:**
- Binds to `0.0.0.0:5000` (accessible from all network interfaces)
- No authentication required
- Suitable for local network only

**For Production:**
1. Use reverse proxy (nginx, Apache)
2. Enable HTTPS with SSL certificate
3. Add authentication (JWT, OAuth)
4. Use firewall rules
5. Change secret key in `web/app.py`

### Local Network Only

To restrict to localhost:
```bash
WEB_DASHBOARD_HOST=127.0.0.1
```

### Change Port

If port 5000 is in use:
```bash
WEB_DASHBOARD_PORT=8080
```

## Troubleshooting

### Dashboard Not Starting

**Check dependencies:**
```bash
pip install flask flask-cors flask-socketio
```

**Check port availability:**
```bash
# macOS/Linux
lsof -i :5000

# Windows
netstat -ano | findstr :5000
```

### Cannot Access Dashboard

**Check firewall:**
- Ensure port 5000 is open
- Check OS firewall settings

**Check binding:**
- Use `0.0.0.0` for network access
- Use `127.0.0.1` for localhost only

### WebSocket Not Connecting

**Check browser console for errors**

**Verify bot is running:**
```bash
curl http://localhost:5000/api/status
```

## Performance

### Resource Usage
- Memory: +50-100 MB (Flask server)
- CPU: <2% idle, <5% active
- Network: Minimal (WebSocket updates every 2s)

### Impact on Bot
- No impact on voice playback
- No impact on command response time
- Can be disabled without affecting bot

## Development

### File Structure
```
web/
├── app.py                  # Flask backend
├── templates/
│   └── dashboard.html      # Main page
└── static/
    ├── css/
    │   └── dashboard.css   # Styles
    └── js/
        └── dashboard.js    # Frontend logic
```

### Adding New Features

**1. Add API endpoint in `web/app.py`:**
```python
@app.route('/api/custom')
def api_custom():
    return jsonify({"data": "value"})
```

**2. Add frontend function in `web/static/js/dashboard.js`:**
```javascript
async function loadCustomData() {
    const response = await fetch('/api/custom');
    const data = await response.json();
    // Handle data
}
```

**3. Update HTML in `web/templates/dashboard.html`:**
```html
<div id="custom-section"></div>
```

## Future Enhancements

Planned features:
- [ ] Authentication system
- [ ] User permissions
- [ ] Mobile app
- [ ] Charts and graphs
- [ ] Export functionality
- [ ] Email notifications
- [ ] Custom themes
- [ ] Multi-language support

## Support

For dashboard issues:
1. Check bot logs in `logs/` directory
2. Check browser console for errors
3. Verify dependencies installed
4. Try different browser
5. Restart bot

## References

- [Flask Documentation](https://flask.palletsprojects.com/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [Flask-CORS](https://flask-cors.readthedocs.io/)
