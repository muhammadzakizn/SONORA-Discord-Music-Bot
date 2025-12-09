# 🚀 Oracle Cloud - Quick Start Guide

## TL;DR - Quick Setup

### 1. Daftar Oracle Cloud (5 menit)
```
1. Kunjungi: https://www.oracle.com/cloud/free/
2. Klik "Start for free"
3. Isi form + verifikasi kartu kredit ($1-2 akan dikembalikan)
4. Pilih region: ap-singapore-1 (recommended untuk Indonesia)
5. Tunggu approval (instant - 24 jam)
```

### 2. Create VM Instance (5 menit)
```
1. Dashboard → "Create a VM instance"
2. Name: discord-bot
3. Image: Ubuntu 22.04
4. Shape: VM.Standard.A1.Flex (ARM) - 4 OCPU, 24GB RAM
5. Network: Assign public IPv4 ✅
6. SSH Keys: Generate & download
7. Boot Volume: 100 GB
8. Create!
```

### 3. Configure Firewall (2 menit)
```
Instance Details → Subnet → Security Lists → Add Ingress Rules:
- Port 22 (SSH)
- Port 5000 (Web Dashboard)
- Port 5001 (Beta Dashboard)
Source: 0.0.0.0/0
```

### 4. Connect SSH (1 menit)
```bash
# Windows (PowerShell)
ssh -i "path\to\key.key" ubuntu@YOUR_PUBLIC_IP

# Linux/Mac
chmod 400 ~/key.key
ssh -i ~/key.key ubuntu@YOUR_PUBLIC_IP
```

### 5. Install Dependencies (5 menit)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essentials
sudo apt install -y git python3 python3-pip python3-venv ffmpeg libopus0

# Install yt-dlp
sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# Configure firewall
sudo iptables -I INPUT -p tcp --dport 5000 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 5001 -j ACCEPT
```

### 6. Deploy Bot (5 menit)
```bash
# Clone repo
cd ~
git clone YOUR_REPO_URL SONORA-Discord-Bot
cd SONORA-Discord-Bot

# Setup venv
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt

# Configure
cp .env.example .env
nano .env  # Edit token

# Test run
python3 main.py
```

### 7. Auto-Start Setup (3 menit)
```bash
# Create systemd service
sudo nano /etc/systemd/system/sonora-bot.service
```

Paste:
```ini
[Unit]
Description=SONORA Discord Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/SONORA-Discord-Bot
Environment="PATH=/home/ubuntu/SONORA-Discord-Bot/env/bin"
ExecStart=/home/ubuntu/SONORA-Discord-Bot/env/bin/python3 main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable & start
sudo systemctl daemon-reload
sudo systemctl enable sonora-bot
sudo systemctl start sonora-bot
sudo systemctl status sonora-bot
```

### 8. Access Web Dashboard
```
http://YOUR_PUBLIC_IP:5000
```

**DONE! Bot running 24/7 FREE!** 🎉

---

## ❓ FAQ Singkat

### Apakah benar gratis selamanya?
**YA!** Selama gunakan "Always Free" resources:
- 4 ARM cores + 24GB RAM
- 200 GB storage
- 10 TB bandwidth/month
- **$0/month forever!**

### Butuh kartu kredit?
**YA**, tapi hanya verifikasi. Tidak akan dicharge untuk Always Free resources.

### Bisa mining crypto?
**TIDAK!** Prohibited. Akun akan di-ban.

### Akun bisa hilang?
Akun bisa di-terminate jika:
- Tidak login >90 hari
- Melanggar TOS
- **Solusi**: Login console minimal 1x/bulan

### Resource cukup untuk bot besar?
**YA!** 4 cores + 24GB RAM cukup untuk:
- Unlimited Discord servers
- Multiple audio streams
- Web dashboard
- Cache & downloads
- 24/7 uptime

### Kalau mau upgrade?
Bisa upgrade resources (bayar). Always Free resources tetap gratis.

---

## 🔧 Management Commands

```bash
# Check bot status
sudo systemctl status sonora-bot

# Start bot
sudo systemctl start sonora-bot

# Stop bot
sudo systemctl stop sonora-bot

# Restart bot
sudo systemctl restart sonora-bot

# View logs
sudo journalctl -u sonora-bot -f

# Update bot
cd ~/SONORA-Discord-Bot
git pull
source env/bin/activate
pip install -r requirements.txt --upgrade
sudo systemctl restart sonora-bot

# Check resources
htop
df -h
free -h
```

---

## 🎯 What You Get (FREE Forever!)

| Resource | Free Tier | Market Value |
|----------|-----------|--------------|
| CPU | 4 ARM cores | ~$30/mo |
| RAM | 24 GB | ~$20/mo |
| Storage | 200 GB SSD | ~$10/mo |
| Bandwidth | 10 TB/mo | ~$50/mo |
| Public IP | 1 IPv4 | ~$5/mo |
| **Total** | **$0/mo** | **~$115/mo** |

**Savings: $1,380/year!** 💰

---

## 📋 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Cannot SSH | Check Security List allows port 22 |
| Dashboard not accessible | Allow port 5000 in iptables |
| Bot crashes | Check logs: `journalctl -u sonora-bot` |
| Out of space | Clear cache: `rm -rf downloads/*` |
| Slow connection | Use screen/tmux for SSH |

---

## 📚 Full Documentation

For detailed guide, see: [ORACLE_CLOUD_FREE_SETUP.md](./ORACLE_CLOUD_FREE_SETUP.md)

---

**Total Setup Time: ~30 minutes**  
**Cost: $0/month FOREVER!** 🎊
