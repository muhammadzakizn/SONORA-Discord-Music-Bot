# 📢 Advanced Broadcast & Logs Features - v3.2.2

## ✨ New Features

### **1. Advanced Broadcast System**
### **2. Real-time Log Viewer**

---

## 📢 Advanced Broadcast System

### **Features:**

#### **✅ Custom Channel Selection**
- Select specific guilds
- Select specific channels within guilds
- Or broadcast to ALL channels

#### **✅ Permission Checking**
- Automatically checks send_messages permission
- Checks mention_everyone permission for @everyone/@here
- Disables channels where bot doesn't have permission
- Shows warning icons for limited permissions

#### **✅ Mention Options**
- No mention (default)
- @here - mentions online users only
- @everyone - mentions all users
- Auto-validates mention permissions before sending

#### **✅ Preview System**
- Live message preview
- Shows how message will appear
- Updates as you type

#### **✅ Results Tracking**
- Shows success/failed count
- Lists all channels message was sent to
- Shows failure reasons
- Real-time feedback

---

## 🎯 How to Use Broadcast

### **Access:**
```
Admin Panel → Quick Actions → Click "📢 Broadcast" card
```

### **Step 1: Enter Message**
```
Type your message in the text area
Message will auto-preview below
```

### **Step 2: Choose Mention Type**
```
○ No Mention (default)
○ @here (online users only)  
○ @everyone (all users)

⚠️ Bot will check permissions automatically
```

### **Step 3: Select Channels**

**Option A: ALL Channels**
```
☑️ Send to ALL channels in ALL servers
This will skip channel selection
```

**Option B: Specific Channels**
```
Uncheck "ALL channels"
Select guilds (check guild checkbox)
Or select specific channels
```

**Permission Indicators:**
```
# channel-name              ← Can send
# channel-name ⚠️            ← No permission (disabled)
# channel-name 🔕            ← No mention permission
```

### **Step 4: Preview & Send**
```
Check preview
Click "📢 Send Broadcast"
Confirm in dialog
Wait for results
```

### **Step 5: View Results**
```
✅ Success count
❌ Failed count
List of all channels
Failure reasons if any
```

---

## 📋 Real-time Log Viewer

### **Features:**

#### **✅ Multiple Log Levels**
- All logs (default)
- Errors only
- Warnings only
- Info only

#### **✅ Real-time Updates**
- Auto-refresh every 30 seconds
- Manual refresh button
- Shows last 200 lines

#### **✅ Color-Coded**
- ERROR: Red
- WARNING: Orange
- INFO: Blue
- DEBUG: Gray

#### **✅ Formatted Display**
- Monospace font (console-like)
- Timestamp | Level | Message
- Scrollable view
- Auto-scroll to bottom

---

## 🎯 How to Use Logs

### **Access:**
```
Admin Panel → Scroll to "📋 Console Logs" section
```

### **Filter Logs:**
```
[All] [Errors] [Warnings] [Info] [🔄 Refresh]

Click any button to filter
```

### **View Logs:**
```
Console-style viewer
Scrollable up to 500px height
Color-coded by level
Auto-scroll to latest
```

### **Refresh:**
```
Click "🔄 Refresh" button
Or wait 30 seconds for auto-refresh
```

---

## 📊 API Endpoints

### **1. Get Guilds with Channels**
```
GET /api/admin/guilds/channels

Returns:
[
  {
    "id": "123456789",
    "name": "Server Name",
    "icon": "url",
    "channels": [
      {
        "id": "987654321",
        "name": "general",
        "type": "text",
        "position": 0,
        "permissions": {
          "send_messages": true,
          "embed_links": true,
          "mention_everyone": false
        }
      }
    ]
  }
]
```

### **2. Send Broadcast**
```
POST /api/admin/broadcast
Content-Type: application/json

Body:
{
  "message": "Your message",
  "guild_ids": ["123", "456"],       // or []
  "channel_ids": ["789", "012"],     // or []
  "mention_type": "none",            // "none", "here", "everyone"
  "all_channels": false              // true to broadcast everywhere
}

Returns:
{
  "success": true,
  "sent": 5,
  "failed": 2,
  "results": [
    {
      "guild": "Server Name",
      "channel": "general",
      "status": "success"
    },
    {
      "guild": "Another Server",
      "channel": "announcements",
      "status": "failed",
      "reason": "No send_messages permission"
    }
  ]
}
```

### **3. Get Logs**
```
GET /api/admin/logs?type=all&lines=200

Parameters:
- type: all, error, warning, info
- lines: 1-1000 (default 100)

Returns:
{
  "logs": [
    {
      "timestamp": "22:30:15",
      "level": "INFO",
      "message": "Bot started successfully",
      "file": "bot.log"
    }
  ],
  "total": 150
}
```

---

## 🎨 UI Components

### **Broadcast Modal:**
```
┌────────────────────────────────────┐
│ 📢 Advanced Broadcast System       │
├────────────────────────────────────┤
│ Message: [textarea]                │
│                                    │
│ Mention Type:                      │
│ ○ No Mention ○ @here ○ @everyone   │
│                                    │
│ ☐ Send to ALL channels in ALL     │
│   servers                          │
│                                    │
│ Guild & Channel Selection:         │
│ ┌──────────────────────────────┐  │
│ │ ☑️ Server 1 (5 channels)      │  │
│ │   ☑️ # general               │  │
│ │   ☑️ # announcements         │  │
│ │   ☐ # music                  │  │
│ │                               │  │
│ │ ☐ Server 2 (3 channels)      │  │
│ │   ☐ # general ⚠️              │  │
│ │   ☑️ # bot-commands           │  │
│ └──────────────────────────────┘  │
│                                    │
│ Preview:                           │
│ [Message preview box]              │
│                                    │
│ [📢 Send Broadcast] [Cancel]       │
└────────────────────────────────────┘
```

### **Logs Viewer:**
```
┌────────────────────────────────────┐
│ 📋 Console Logs                    │
├────────────────────────────────────┤
│ [All][Errors][Warnings][Info][🔄] │
├────────────────────────────────────┤
│ 22:30:15  INFO   Bot started       │
│ 22:30:16  INFO   Connected to...   │
│ 22:30:20  WARNING Network issue... │
│ 22:30:25  ERROR  Failed to...      │
│ 22:30:30  INFO   Recovered...      │
│ ... (scrollable)                   │
└────────────────────────────────────┘
```

---

## ⚡ Examples

### **Example 1: Broadcast to All**
```
1. Click "📢 Broadcast" in Quick Actions
2. Enter message: "Bot update v3.2.2 is live!"
3. Select "No Mention"
4. Check "☑️ Send to ALL channels in ALL servers"
5. Click "📢 Send Broadcast"
6. Confirm
7. View results: "✅ Sent to 15 channels"
```

### **Example 2: Targeted Broadcast**
```
1. Click "📢 Broadcast"
2. Enter message: "Maintenance in 10 minutes"
3. Select "@here"
4. Select specific servers
5. Select specific channels (only #announcements)
6. Click "📢 Send Broadcast"
7. View results with per-channel status
```

### **Example 3: View Error Logs**
```
1. Scroll to "📋 Console Logs"
2. Click [Errors] button
3. View all error logs
4. Check timestamps and messages
5. Click [🔄 Refresh] for latest
```

---

## 🔐 Security

### **Permission Checks:**
```
✅ Checks send_messages before sending
✅ Checks mention_everyone for @mentions
✅ Disables channels with no permission
✅ Shows warnings for limited permissions
✅ Validates before broadcast
```

### **Safety Features:**
```
✅ Confirmation dialog before send
✅ Preview before send
✅ Shows exactly where message will go
✅ Tracks all results
✅ Logs all broadcast attempts
```

---

## 📊 Use Cases

### **1. Announcements**
```
Use: Important bot announcements
Method: Broadcast to ALL channels
Mention: @everyone
Example: "New features available!"
```

### **2. Maintenance Notices**
```
Use: Scheduled maintenance
Method: Broadcast to all #announcements channels
Mention: @here
Example: "Maintenance in 30 minutes"
```

### **3. Updates**
```
Use: Bot updates
Method: Broadcast to #bot-commands channels
Mention: None
Example: "Version 3.2.2 released!"
```

### **4. Debug Issues**
```
Use: Monitor bot problems
Method: View ERROR logs
Filter: Errors only
Action: Check recent error patterns
```

---

## 🎉 Summary

### **Broadcast System:**
✅ Custom channel selection  
✅ Permission checking  
✅ Mention support (@here, @everyone)  
✅ Live preview  
✅ Results tracking  
✅ Bulk operations  

### **Log Viewer:**
✅ Real-time logs  
✅ Multiple filters  
✅ Color-coded display  
✅ Auto-refresh  
✅ Console-style viewer  
✅ Scrollable history  

**Status:** ✅ Production Ready!

---

**Version:** 3.2.2  
**Last Updated:** December 2, 2025  
**Features:** Advanced Broadcast + Log Viewer
