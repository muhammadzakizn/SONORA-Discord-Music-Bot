#!/usr/bin/env python3
"""Check v3.3.0 integration status"""

import sys
import os

print("=" * 60)
print("Discord Music Bot v3.3.0 - Status Check")
print("=" * 60)
print()

# Check files exist
files_to_check = [
    ('web/app.py', 'Main web app'),
    ('web/auth.py', 'Authentication system'),
    ('utils/analytics.py', 'Analytics tracker'),
    ('services/translation.py', 'Translation service'),
    ('services/download_manager.py', 'Download manager'),
    ('web/manifest.json', 'PWA manifest'),
    ('web/sw.js', 'Service worker'),
    ('web/templates/base.html', 'Base template'),
    ('web/templates/login.html', 'Login page'),
    ('web/static/css/maroon-theme.css', 'Maroon theme CSS'),
    ('web/static/css/glass.css', 'Glass morphism CSS'),
    ('web/static/js/theme.js', 'Theme toggle JS'),
    ('web/static/js/taskbar.js', 'Taskbar JS'),
]

print("📁 File Check:")
all_exist = True
for filepath, description in files_to_check:
    exists = os.path.exists(filepath)
    status = "✓" if exists else "✗"
    print(f"  {status} {description:30} ({filepath})")
    if not exists:
        all_exist = False

print()

# Check if web/app.py has v3.3.0 features
print("🔧 Integration Check:")
try:
    with open('web/app.py', 'r') as f:
        content = f.read()
        checks = [
            ('V3_3_FEATURES', 'Feature flag'),
            ('auth_manager', 'Authentication'),
            ('analytics', 'Analytics'),
            ('translator', 'Translation'),
            ('download_manager', 'Download manager'),
            ('/api/analytics/commands', 'Analytics API'),
            ('/api/translate', 'Translation API'),
            ('/login', 'Login route'),
        ]
        
        for check, description in checks:
            found = check in content
            status = "✓" if found else "✗"
            print(f"  {status} {description:30} ({check})")
except Exception as e:
    print(f"  ✗ Could not check web/app.py: {e}")

print()

# Check dependencies
print("📦 Dependencies Check:")
try:
    import deep_translator
    print("  ✓ deep-translator installed")
except ImportError:
    print("  ✗ deep-translator NOT installed")
    
try:
    import flask_minify
    print("  ✓ flask-minify installed")
except ImportError:
    print("  ⚠️  flask-minify NOT installed (optional)")

print()

# Check exports folder
print("📂 Folders Check:")
folders = ['exports/audio', 'exports/lyrics', 'exports/artwork', 'exports/full']
for folder in folders:
    exists = os.path.exists(folder)
    status = "✓" if exists else "✗"
    print(f"  {status} {folder}")

print()
print("=" * 60)

if all_exist:
    print("✅ All files present! Integration looks good.")
    print()
    print("🚀 Next steps:")
    print("1. Restart bot: python main.py")
    print("2. Access dashboard: http://192.168.1.6:5001")
    print("3. Login page: http://192.168.1.6:5001/login")
    print("   Username: admin")
    print("   Password: admin123")
else:
    print("⚠️  Some files missing. Run integration again.")

print("=" * 60)
