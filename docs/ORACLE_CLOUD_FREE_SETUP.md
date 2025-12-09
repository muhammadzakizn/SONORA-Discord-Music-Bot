# 🚀 Tutorial: Deploy Discord Bot ke Oracle Cloud (FREE Forever!)

## 📋 Daftar Isi
1. [Tentang Oracle Cloud Free Tier](#tentang-oracle-cloud-free-tier)
2. [Apa yang Gratis?](#apa-yang-gratis)
3. [Cara Daftar Oracle Cloud](#cara-daftar-oracle-cloud)
4. [Setup VM Instance](#setup-vm-instance)
5. [Install Dependencies](#install-dependencies)
6. [Deploy Bot](#deploy-bot)
7. [Setup Auto-Start](#setup-auto-start)
8. [Tips & Troubleshooting](#tips--troubleshooting)

---

## 📌 Tentang Oracle Cloud Free Tier

### ✅ Apakah Benar-Benar Gratis Seumur Hidup?

**YA!** Oracle Cloud menawarkan **Always Free tier** yang berbeda dari free trial:

#### 🎁 Always Free Resources (Seumur Hidup):
- **2 VM Instances** (AMD) - 1/8 OCPU, 1 GB RAM each
- **4 ARM-based Ampere A1 cores** - Bisa dibuat 1 VM dengan 4 core + 24GB RAM!
- **2 Block Volumes** - Total 200 GB storage
- **10 GB Object Storage**
- **10 GB Archive Storage**
- **Outbound Data Transfer** - 10 TB/month
- **Load Balancer** - 1 instance, 10 Mbps
- **Autonomous Database** - 2 instances

#### 🎯 Yang Kita Butuhkan untuk Discord Bot:
- **1 VM ARM Ampere A1**: 4 cores, 24 GB RAM (FREE FOREVER!)
- **Boot Volume**: 50-100 GB (FREE)
- **Public IP**: 1 IPv4 address (FREE)
- **Bandwidth**: 10 TB/month (FREE)

### ⚠️ Perbedaan Always Free vs Free Trial:

| Feature | Always Free | Free Trial ($300 credit) |
|---------|------------|-------------------------|
| **Durasi** | Selamanya | 30 hari |
| **Biaya** | $0 | Gratis selama trial |
| **Resource** | Terbatas tapi cukup | Semua resource |
| **Perlu Kartu Kredit** | Ya (tidak dicharge) | Ya |
| **Bisa Upgrade?** | Ya, manual | Otomatis expire |

**PENTING**: Selama Anda hanya pakai resources "Always Free", **tidak akan dicharge sepeser pun**, meski kartu kredit terdaftar!

---

## 🎯 Apa yang Gratis?

### ✅ Untuk Discord Bot, Kita Dapat:

**Option 1: VM AMD (Simple)**
- 2 VM @ 1/8 OCPU, 1 GB RAM
- Cocok untuk: Bot kecil, 1-2 server Discord
- Performance: Basic

**Option 2: VM ARM Ampere A1 (RECOMMENDED!)**
- 1 VM @ 4 OCPU, 24 GB RAM
- Cocok untuk: Bot besar, unlimited servers, multiple features
- Performance: Excellent! Setara VPS $50/bulan!

**Storage:**
- 100-200 GB SSD boot disk
- Lebih dari cukup untuk bot + cache + downloads

**Network:**
- Public IPv4 address
- 10 TB bandwidth/month (sangat banyak!)
- Port forwarding (untuk web dashboard)

### 💰 Estimasi Biaya Jika Bayar:
VM ARM 4 core 24GB RAM setara:
- DigitalOcean: ~$48/month
- AWS EC2: ~$60/month
- **Oracle Free Tier: $0/month (FOREVER!)** 🎉

---

## 📝 Cara Daftar Oracle Cloud

### Step 1: Persiapan
Siapkan:
- ✅ Email aktif (Gmail recommended)
- ✅ Nomor HP untuk verifikasi
- ✅ Kartu kredit/debit (Visa/Mastercard)
  - **Hanya untuk verifikasi**
  - **Tidak akan dicharge** untuk Always Free resources
  - Alternatif: Jenius, Jago, atau virtual card lainnya

### Step 2: Registrasi

1. **Kunjungi**: https://www.oracle.com/cloud/free/

2. **Klik "Start for free"**

3. **Isi Form**:
   ```
   Country/Territory: Indonesia
   First Name: [Nama Anda]
   Last Name: [Nama Anda]
   Email: [Email Anda]
   ```

4. **Verifikasi Email**:
   - Cek inbox
   - Klik link verifikasi

5. **Cloud Account Information**:
   ```
   Cloud Account Name: [pilih nama unik]
   Home Region: [PENTING! Pilih yang dekat]
   ```
   
   **Recommended Regions untuk Indonesia**:
   - `ap-singapore-1` (Singapore) - Ping ~20-40ms
   - `ap-mumbai-1` (India) - Ping ~80-100ms
   - `ap-tokyo-1` (Japan) - Ping ~70-90ms
   - `ap-sydney-1` (Australia) - Ping ~100-120ms
   
   ⚠️ **PENTING**: Home region **TIDAK BISA DIUBAH**!

6. **Payment Verification**:
   - Masukkan data kartu kredit
   - Oracle akan charge $1-2 untuk verifikasi
   - Uang akan dikembalikan dalam 2-5 hari
   - Setup "Always Free" saat ditanya

7. **Tunggu Approval**:
   - Biasanya instant
   - Kadang perlu 1-24 jam review
   - Cek email untuk konfirmasi

### Step 3: Login Pertama Kali

1. **Login**: https://cloud.oracle.com/
2. **Masukkan**:
   - Cloud Account Name
   - Username (email Anda)
   - Password

3. **Akan masuk ke Dashboard** ✅

---

## 🖥️ Setup VM Instance

### Step 1: Create Compute Instance

1. **Di Dashboard**, klik **"Create a VM instance"**

2. **Name**: `discord-bot-vm` (atau nama lain)

3. **Placement**: Biarkan default

4. **Image and Shape**:

   **Image:**
   - Klik "Change Image"
   - Pilih: **Ubuntu 22.04** (Recommended)
   - Atau: **Ubuntu 20.04** atau **Oracle Linux 8**
   
   **Shape:**
   - Klik "Change Shape"
   - Pilih **"Ampere"** (ARM-based)
   - **IMPORTANT**: Select "VM.Standard.A1.Flex"
   - Set:
     - **OCPU count**: 4 (maksimum free tier)
     - **Memory (GB)**: 24 (maksimum free tier)
   
   💡 **Tips**: Gunakan SEMUA free quota di 1 VM untuk performa maksimal!

5. **Networking**:
   - **VCN**: Create new (atau pilih existing)
   - **Subnet**: Create new (atau pilih existing)
   - **Public IPv4 address**: ✅ **CENTANG INI!** (Very important!)
   - **Public IP**: Assign a public IPv4 address

6. **Add SSH Keys**:
   
   **Option A: Generate SSH Key Pair (Recommended)**
   - Klik "Generate a key pair for me"
   - Download **Private Key** (`.key` file)
   - Download **Public Key** (`.pub` file)
   - **SIMPAN BAIK-BAIK!** Tidak bisa di-download lagi!
   
   **Option B: Upload Your Own SSH Key**
   - Jika sudah punya SSH key
   - Paste public key content
   
   **Option C: Paste SSH Keys**
   - Paste your public key directly

7. **Boot Volume**:
   - Default: 50 GB (sudah cukup)
   - Bisa diubah: 100-200 GB (masih free)
   
   **Recommended**: 100 GB untuk bot + cache + downloads

8. **Klik "Create"**

9. **Tunggu Provisioning**:
   - Status: Provisioning → Running
   - Biasanya 1-3 menit
   - Catat **Public IP Address**!

### Step 2: Configure Security List (Firewall)

1. **Di Instance Details**, scroll ke **"Primary VNIC"**

2. **Klik Subnet Name** → **Security Lists** → **Default Security List**

3. **Add Ingress Rules** (Allow incoming traffic):

   **Rule 1: SSH (Port 22)**
   ```
   Source CIDR: 0.0.0.0/0
   Destination Port: 22
   Description: SSH access
   ```
   
   **Rule 2: Web Dashboard (Port 5000)**
   ```
   Source CIDR: 0.0.0.0/0
   Destination Port: 5000
   Description: Web Dashboard (stable)
   ```
   
   **Rule 3: Beta Web Dashboard (Port 5001)**
   ```
   Source CIDR: 0.0.0.0/0
   Destination Port: 5001
   Description: Web Dashboard (beta)
   ```
   
   **Rule 4: HTTPS (Optional, Port 443)**
   ```
   Source CIDR: 0.0.0.0/0
   Destination Port: 443
   Description: HTTPS
   ```

4. **Save Changes**

### Step 3: Connect via SSH

#### Dari Windows:

**Menggunakan PuTTY:**

1. Download PuTTY: https://www.putty.org/

2. Convert `.key` to `.ppk`:
   - Buka **PuTTYgen**
   - Load private key (`.key` file)
   - Save private key as `.ppk`

3. Buka **PuTTY**:
   - Host Name: `ubuntu@YOUR_PUBLIC_IP`
   - Port: 22
   - Connection → SSH → Auth → Browse → Pilih `.ppk` file
   - Open

**Menggunakan Windows Terminal/PowerShell:**

```powershell
# Set permission untuk key file (jika belum)
icacls "path\to\private-key.key" /inheritance:r
icacls "path\to\private-key.key" /grant:r "%username%:R"

# Connect
ssh -i "path\to\private-key.key" ubuntu@YOUR_PUBLIC_IP
```

#### Dari Linux/Mac:

```bash
# Set permission
chmod 400 ~/path/to/private-key.key

# Connect
ssh -i ~/path/to/private-key.key ubuntu@YOUR_PUBLIC_IP
```

**Default username berdasarkan OS:**
- Ubuntu: `ubuntu`
- Oracle Linux: `opc`
- CentOS: `centos`

---

## 📦 Install Dependencies

### Step 1: Update System

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install basic tools
sudo apt install -y git curl wget nano htop screen tmux
```

### Step 2: Install Python 3.11+

```bash
# Ubuntu 22.04 includes Python 3.10
python3 --version

# Install Python 3.11 (optional, recommended)
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev

# Set Python 3.11 as default (optional)
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# Install pip
sudo apt install -y python3-pip
```

### Step 3: Install FFmpeg & Opus

```bash
# Install FFmpeg
sudo apt install -y ffmpeg

# Install Opus codec
sudo apt install -y libopus0 libopus-dev

# Verify installation
ffmpeg -version
```

### Step 4: Install yt-dlp

```bash
# Install yt-dlp (better than youtube-dl)
sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# Verify
yt-dlp --version
```

### Step 5: Configure Firewall (iptables)

```bash
# Ubuntu uses iptables, but Oracle has its own firewall
# We need to allow ports in OS firewall too

# Allow SSH (22)
sudo iptables -I INPUT -p tcp --dport 22 -j ACCEPT

# Allow Web Dashboard (5000)
sudo iptables -I INPUT -p tcp --dport 5000 -j ACCEPT

# Allow Beta Web Dashboard (5001)
sudo iptables -I INPUT -p tcp --dport 5001 -j ACCEPT

# Save rules
sudo netfilter-persistent save

# Or use firewalld (if installed)
# sudo firewall-cmd --permanent --add-port=5000/tcp
# sudo firewall-cmd --permanent --add-port=5001/tcp
# sudo firewall-cmd --reload
```

---

## 🤖 Deploy Bot

### Step 1: Clone Repository

```bash
# Clone bot repository
cd ~
git clone https://github.com/YOUR_USERNAME/SONORA-Discord-Bot.git
cd SONORA-Discord-Bot

# Or upload manually via SCP/SFTP
```

### Step 2: Setup Virtual Environment

```bash
# Create virtual environment
python3 -m venv env

# Activate
source env/bin/activate

# Install requirements
pip install -r requirements.txt
```

### Step 3: Configure Environment

```bash
# Copy .env example
cp .env.example .env

# Edit .env
nano .env
```

**Isi .env:**
```env
# Discord Bot Token
DISCORD_TOKEN=your_bot_token_here

# Bot Configuration
COMMAND_PREFIX=!
BOT_NAME=SONORA

# Audio Settings
AUDIO_BITRATE=128
AUDIO_SAMPLE_RATE=48000
DOWNLOADS_DIR=./downloads

# Web Dashboard
ENABLE_WEB_DASHBOARD=true
WEB_DASHBOARD_HOST=0.0.0.0
WEB_DASHBOARD_PORT=5000

# Database
DB_PATH=./bot.db

# Logging
LOG_LEVEL=INFO
LOG_FILE=./logs/bot.log

# Spotify (Optional)
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=

# Apple Music (Optional)
APPLE_MUSIC_KEY_ID=
APPLE_MUSIC_TEAM_ID=
APPLE_MUSIC_PRIVATE_KEY=
```

**Save**: Ctrl+O, Enter, Ctrl+X

### Step 4: Create Necessary Directories

```bash
# Create directories
mkdir -p downloads cache logs cookies

# Set permissions
chmod 755 downloads cache logs
```

### Step 5: Test Bot

```bash
# Test run
python3 main.py
```

Jika berhasil, akan muncul:
```
✅ Bot logged in as SONORA
✅ Connected to X guilds
✅ Web dashboard: http://0.0.0.0:5000
```

Press **Ctrl+C** to stop for now.

---

## 🔄 Setup Auto-Start

### Option 1: Using systemd (Recommended)

1. **Create Service File**:

```bash
sudo nano /etc/systemd/system/sonora-bot.service
```

2. **Paste Configuration**:

```ini
[Unit]
Description=SONORA Discord Music Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/SONORA-Discord-Bot
Environment="PATH=/home/ubuntu/SONORA-Discord-Bot/env/bin"
ExecStart=/home/ubuntu/SONORA-Discord-Bot/env/bin/python3 /home/ubuntu/SONORA-Discord-Bot/main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

3. **Enable and Start Service**:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start
sudo systemctl enable sonora-bot

# Start bot
sudo systemctl start sonora-bot

# Check status
sudo systemctl status sonora-bot

# View logs
sudo journalctl -u sonora-bot -f
```

4. **Manage Service**:

```bash
# Start
sudo systemctl start sonora-bot

# Stop
sudo systemctl stop sonora-bot

# Restart
sudo systemctl restart sonora-bot

# Status
sudo systemctl status sonora-bot

# Disable auto-start
sudo systemctl disable sonora-bot
```

### Option 2: Using screen (Simple)

```bash
# Start screen session
screen -S sonora-bot

# Navigate to bot directory
cd ~/SONORA-Discord-Bot

# Activate venv
source env/bin/activate

# Run bot
python3 main.py

# Detach: Ctrl+A then D

# Reattach
screen -r sonora-bot

# List screens
screen -ls

# Kill screen
screen -X -S sonora-bot quit
```

### Option 3: Using tmux

```bash
# Start tmux session
tmux new -s sonora-bot

# Run bot
cd ~/SONORA-Discord-Bot
source env/bin/activate
python3 main.py

# Detach: Ctrl+B then D

# Reattach
tmux attach -t sonora-bot

# List sessions
tmux ls

# Kill session
tmux kill-session -t sonora-bot
```

---

## 🌐 Access Web Dashboard

### From Public Internet:

```
http://YOUR_PUBLIC_IP:5000
```

### Setup Domain (Optional):

1. **Point Domain A Record to Public IP**:
   ```
   A    bot.yourdomain.com    →    YOUR_PUBLIC_IP
   ```

2. **Setup Nginx Reverse Proxy** (Optional):

```bash
# Install Nginx
sudo apt install -y nginx

# Create config
sudo nano /etc/nginx/sites-available/sonora-bot
```

```nginx
server {
    listen 80;
    server_name bot.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/sonora-bot /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

3. **Setup SSL with Let's Encrypt** (Optional):

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d bot.yourdomain.com

# Auto-renewal is configured automatically
```

---

## 💡 Tips & Troubleshooting

### Performance Tips:

1. **Monitor Resources**:
```bash
# Check CPU, RAM usage
htop

# Check disk space
df -h

# Check network
ifconfig
netstat -tuln
```

2. **Optimize Bot**:
   - Enable caching for downloads
   - Use opus format for audio
   - Limit concurrent downloads
   - Set max queue size

3. **Cleanup Regular**:
```bash
# Clear download cache (in bot directory)
rm -rf downloads/*

# Clear apt cache
sudo apt clean
```

### Common Issues:

#### 1. Cannot Connect via SSH

**Solution**:
- Check Security List allows port 22
- Check SSH key is correct
- Try: `ssh -vvv -i key.pem ubuntu@IP` for debug

#### 2. Web Dashboard Not Accessible

**Solution**:
```bash
# Check if bot is running
systemctl status sonora-bot

# Check if port is open
sudo netstat -tuln | grep 5000

# Allow in iptables
sudo iptables -I INPUT -p tcp --dport 5000 -j ACCEPT
sudo netfilter-persistent save
```

#### 3. Bot Crashes/Stops

**Solution**:
```bash
# Check logs
sudo journalctl -u sonora-bot -n 100

# Check errors
tail -f ~/SONORA-Discord-Bot/logs/bot.log

# Restart
sudo systemctl restart sonora-bot
```

#### 4. Out of Memory

**Solution**:
- ARM VM has 24GB RAM, should be enough
- Check memory: `free -h`
- Add swap if needed:
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### 5. Account Suspended/Terminated

**Reasons**:
- Inactivity (login at least once every 30 days)
- Mining cryptocurrency (prohibited)
- Abuse/spam
- Excessive resource usage outside free tier

**Prevention**:
- Login to console monthly
- Stay within Always Free limits
- Follow Oracle policies
- Monitor resource usage

### Monitoring & Maintenance:

1. **Setup Monitoring**:
```bash
# Install monitoring tools
sudo apt install -y netdata

# Access: http://YOUR_IP:19999
```

2. **Regular Updates**:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Update bot
cd ~/SONORA-Discord-Bot
git pull
source env/bin/activate
pip install -r requirements.txt --upgrade
sudo systemctl restart sonora-bot
```

3. **Backup Configuration**:
```bash
# Backup .env and database
tar -czf backup-$(date +%Y%m%d).tar.gz .env bot.db

# Download via SCP
scp -i key.pem ubuntu@YOUR_IP:~/backup-*.tar.gz .
```

---

## 📊 Resource Monitoring

### Check Always Free Usage:

1. **Login to Oracle Cloud Console**
2. **Go to**: Governance & Administration → **Cost Management**
3. **View**: Always Free resources usage
4. **Ensure**: "Always Free" tag is active on your resources

### Monitor VM Resources:

```bash
# Real-time monitoring
htop

# Disk usage
df -h
du -sh ~/SONORA-Discord-Bot/*

# Network usage
vnstat -l

# Bot logs
tail -f ~/SONORA-Discord-Bot/logs/bot.log
```

---

## ✅ Checklist Summary

### Before Starting:
- [ ] Email aktif
- [ ] Nomor HP
- [ ] Kartu kredit/debit untuk verifikasi
- [ ] Discord bot token ready

### During Setup:
- [ ] Oracle account created
- [ ] VM instance created (ARM Ampere A1, 4 core, 24GB RAM)
- [ ] Security list configured (ports 22, 5000, 5001)
- [ ] SSH key downloaded & saved
- [ ] Successfully connected via SSH

### Bot Deployment:
- [ ] System updated
- [ ] Python, FFmpeg, yt-dlp installed
- [ ] Bot code uploaded/cloned
- [ ] Virtual environment created
- [ ] .env configured with Discord token
- [ ] Bot tested manually
- [ ] Systemd service configured
- [ ] Auto-start enabled

### After Deployment:
- [ ] Web dashboard accessible
- [ ] Bot responding in Discord
- [ ] Monitoring setup
- [ ] Backup configuration saved

---

## 🎉 Conclusion

Dengan Oracle Cloud Always Free tier, Anda mendapat:
- ✅ **4 core ARM CPU + 24GB RAM** (setara VPS $50/month)
- ✅ **100-200 GB storage**
- ✅ **10 TB bandwidth/month**
- ✅ **Public IP address**
- ✅ **Gratis selamanya** (bukan trial!)

Perfect untuk Discord bot yang bisa handle:
- Unlimited Discord servers
- Multiple audio streams
- Web dashboard
- Large cache/downloads
- 24/7 uptime

**Total Cost: $0/month FOREVER!** 🎊

---

## 📚 Referensi

- Oracle Cloud Free Tier: https://www.oracle.com/cloud/free/
- Oracle Cloud Docs: https://docs.oracle.com/en-us/iaas/
- Discord.py Docs: https://discordpy.readthedocs.io/
- Ubuntu Server Guide: https://ubuntu.com/server/docs

---

**Created**: December 6, 2025  
**Author**: Rovo Dev  
**Status**: ✅ Tested & Working  
**Bot Version**: 3.4.0
