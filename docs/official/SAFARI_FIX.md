# 🔧 Safari HTTPS-Only Error - Fix Guide

## ❌ Error Message:
```
"Navigation failed because the request was for an HTTP URL with HTTPS-Only enabled"
(WebKitErrorDomain:305)
```

---

## ✅ SOLUSI (Pilih salah satu):

### **Solusi 1: Disable HTTPS-Only untuk localhost (Recommended)**

#### Di Safari:
1. Buka **Safari** → **Settings** (⌘,)
2. Klik tab **Advanced**
3. Klik **Website Settings** di bagian "Privacy & Security"
4. Atau langsung: **Settings** → **Websites** → **HTTPS-Only**
5. Cari `192.168.1.6` atau `localhost` di list
6. Set ke **"Off"** atau **"Allow HTTP"**
7. Refresh halaman

**Screenshot:**
```
Settings → Websites → HTTPS-Only → 192.168.1.6 → Off
```

---

### **Solusi 2: Use Chrome/Edge/Firefox**

Browser lain tidak punya HTTPS-Only default:

- ✅ **Chrome**: `http://192.168.1.6:5001/admin`
- ✅ **Edge**: `http://192.168.1.6:5001/admin`
- ✅ **Firefox**: `http://192.168.1.6:5001/admin`

---

### **Solusi 3: Setup HTTPS untuk Production (Advanced)**

Jika ingin proper HTTPS:

#### 1. Generate SSL Certificate
```bash
# Self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

#### 2. Update main.py
```python
# In start_web_server_thread function
web_thread = start_web_server_thread(
    host=WEB_DASHBOARD_HOST,
    port=WEB_DASHBOARD_PORT,
    ssl_context=('cert.pem', 'key.pem')  # Add this
)
```

#### 3. Update web/app.py
```python
def run_web_server(host='0.0.0.0', port=5000, ssl_context=None):
    socketio.run(app, host=host, port=port, debug=False, ssl_context=ssl_context)
```

#### 4. Access via HTTPS
```
https://192.168.1.6:5001
```

**Note:** Self-signed certificate akan show warning, click "Advanced" → "Proceed anyway"

---

## 🎯 Recommended: Use Chrome for Development

Safari punya security yang sangat ketat untuk development. Untuk dashboard ini, lebih baik pakai:

### **Chrome** (Recommended)
- Tidak perlu setting apapun
- Developer tools lebih lengkap
- Console lebih baik untuk debugging

### **Microsoft Edge**
- Chromium-based (sama seperti Chrome)
- Works perfectly untuk local development

### **Firefox**
- Good developer tools
- No HTTPS-Only by default

---

## 📱 Safari Mobile (iPhone/iPad)

Jika akses dari iPhone/iPad:

1. Buka **Settings** app
2. Scroll ke **Safari**
3. Cari **"Advanced"**
4. Toggle **"HTTPS-Only Mode"** OFF
5. Kembali ke Safari dan refresh

---

## 🌐 Alternative: Access dari Device Lain

Jika tidak mau ubah Safari settings:

1. Buka Chrome/Edge di Mac Anda
2. Atau akses dari phone/laptop lain:
   ```
   http://192.168.1.6:5001
   ```

---

## ✅ Quick Fix untuk Sekarang:

### **Disable HTTPS-Only di Safari:**
```
Safari → Settings (⌘,) 
→ Advanced 
→ Uncheck "Upgrade to HTTPS when available"
```

**ATAU**

### **Use Chrome:**
```bash
# Install Chrome jika belum ada
# Lalu buka:
http://192.168.1.6:5001/admin
```

---

## 🎉 Setelah Fix:

Anda akan melihat:
- ✅ SONORA branding
- ✅ Glass morphism UI
- ✅ Maroon theme
- ✅ Bottom taskbar (🏠 🛠️ 🌓)
- ✅ Admin controls
- ✅ Smooth animations

---

**Try Chrome atau disable HTTPS-Only di Safari!** 😊
