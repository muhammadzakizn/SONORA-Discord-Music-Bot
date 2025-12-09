#!/usr/bin/env python3
"""
Integration Script for v3.3.0
Automatically integrates new features into web/app.py
"""

import os
import shutil
from datetime import datetime

def backup_file(filepath):
    """Create backup of file"""
    backup_path = f"{filepath}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(filepath, backup_path)
    print(f"✓ Backup created: {backup_path}")
    return backup_path

def integrate_v3_3():
    """Integrate v3.3.0 features into web/app.py"""
    
    app_py_path = 'web/app.py'
    
    print("=" * 60)
    print("Discord Music Bot v3.3.0 Integration")
    print("=" * 60)
    print()
    
    # 1. Backup original file
    print("Step 1: Creating backup...")
    backup_path = backup_file(app_py_path)
    
    # 2. Read original file
    print("Step 2: Reading web/app.py...")
    with open(app_py_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 3. Add new imports at the top (after existing imports)
    print("Step 3: Adding new imports...")
    
    import_marker = "from database.db_manager import get_db_manager"
    new_imports = """
# ==================== v3.3.0 NEW IMPORTS ====================
try:
    from datetime import datetime
    from web.auth import auth_manager, login_required, admin_required, public_or_authenticated
    from utils.analytics import analytics
    from services.translation import translator
    from services.download_manager import download_manager
    V3_3_FEATURES = True
    print("✓ v3.3.0 features loaded")
except ImportError as e:
    print(f"⚠️  v3.3.0 features not available: {e}")
    V3_3_FEATURES = False
    # Dummy decorators
    def login_required(f): return f
    def admin_required(f): return f  
    def public_or_authenticated(f): return f
"""
    
    if import_marker in content and "V3_3_FEATURES" not in content:
        content = content.replace(import_marker, import_marker + new_imports)
        print("  ✓ Imports added")
    else:
        print("  ⚠️  Imports already added or marker not found")
    
    # 4. Add SECRET_KEY to app config
    print("Step 4: Adding SECRET_KEY...")
    
    app_marker = "app = Flask(__name__)"
    secret_key_line = "\napp.config['SECRET_KEY'] = 'change-this-secret-key-in-production'  # TODO: Use .env"
    
    if app_marker in content and "SECRET_KEY" not in content:
        content = content.replace(app_marker, app_marker + secret_key_line)
        print("  ✓ SECRET_KEY added")
    else:
        print("  ⚠️  SECRET_KEY already exists")
    
    # 5. Add new API endpoints before start_background_tasks
    print("Step 5: Adding new API endpoints...")
    
    new_endpoints = """

# ==================== v3.3.0 NEW ROUTES ====================

if V3_3_FEATURES:
    @app.route('/login', methods=['GET'])
    def login_page():
        return render_template('login.html')
    
    @app.route('/manifest.json')
    def manifest():
        return send_from_directory('.', 'manifest.json')
    
    @app.route('/sw.js')  
    def service_worker():
        return send_from_directory('.', 'sw.js')

# ==================== v3.3.0 AUTHENTICATION API ====================

if V3_3_FEATURES:
    @app.route('/api/login', methods=['POST'])
    def api_login():
        data = request.json
        result = auth_manager.login(data.get('username'), data.get('password'))
        return jsonify(result) if result['success'] else (jsonify(result), 401)
    
    @app.route('/api/logout', methods=['POST'])
    def api_logout():
        auth_manager.logout()
        return jsonify({'success': True})
    
    @app.route('/api/auth/status', methods=['GET'])
    def api_auth_status():
        return jsonify({
            'authenticated': auth_manager.is_authenticated(),
            'role': session.get('role'),
            'username': session.get('username')
        })

# ==================== v3.3.0 ANALYTICS API ====================

if V3_3_FEATURES:
    @app.route('/api/analytics/commands', methods=['GET'])
    def api_analytics_commands():
        days = int(request.args.get('days', 30))
        bot = get_bot()
        if not bot:
            return jsonify({"error": "Bot not connected"}), 503
        
        async def get_stats():
            await analytics.init_tables()
            return await analytics.get_command_stats(days)
        
        try:
            future = asyncio.run_coroutine_threadsafe(get_stats(), bot.loop)
            return jsonify(future.result(timeout=5))
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/analytics/platforms', methods=['GET'])
    def api_analytics_platforms():
        days = int(request.args.get('days', 30))
        bot = get_bot()
        if not bot:
            return jsonify({"error": "Bot not connected"}), 503
        
        async def get_stats():
            await analytics.init_tables()
            return await analytics.get_platform_stats(days)
        
        try:
            future = asyncio.run_coroutine_threadsafe(get_stats(), bot.loop)
            return jsonify(future.result(timeout=5))
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/analytics/play-methods', methods=['GET'])
    def api_analytics_play_methods():
        days = int(request.args.get('days', 30))
        bot = get_bot()
        if not bot:
            return jsonify({"error": "Bot not connected"}), 503
        
        async def get_stats():
            await analytics.init_tables()
            return await analytics.get_play_method_stats(days)
        
        try:
            future = asyncio.run_coroutine_threadsafe(get_stats(), bot.loop)
            return jsonify(future.result(timeout=5))
        except Exception as e:
            return jsonify({"error": str(e)}), 500

# ==================== v3.3.0 TRANSLATION API ====================

if V3_3_FEATURES:
    @app.route('/api/translate', methods=['POST'])
    def api_translate_lyrics():
        data = request.json
        lyrics = data.get('lyrics', '')
        target_lang = data.get('target_lang', 'en')
        
        if not lyrics:
            return jsonify({"error": "No lyrics provided"}), 400
        
        result = translator.translate_lyrics(lyrics, target_lang)
        return jsonify(result) if result else (jsonify({"error": "Translation failed"}), 500)
    
    @app.route('/api/translate/languages', methods=['GET'])
    def api_translate_languages():
        return jsonify(translator.get_supported_languages())

"""
    
    marker = "def start_background_tasks():"
    if marker in content and "v3.3.0 NEW ROUTES" not in content:
        content = content.replace(marker, new_endpoints + "\n" + marker)
        print("  ✓ API endpoints added")
    else:
        print("  ⚠️  Endpoints already added or marker not found")
    
    # 6. Update route decorators to use auth
    print("Step 6: Updating route decorators...")
    
    # Update index route
    old_index = "@app.route('/')\ndef index():"
    new_index = "@app.route('/')\n@public_or_authenticated\ndef index():"
    if old_index in content and "@public_or_authenticated" not in content:
        content = content.replace(old_index, new_index)
        print("  ✓ Index route updated")
    
    # Update admin route  
    old_admin = "@app.route('/admin')\ndef admin():"
    new_admin = "@app.route('/admin')\n@admin_required\ndef admin():"
    if old_admin in content and "@admin_required" not in content.split("@app.route('/admin')")[1].split("def admin():")[0]:
        content = content.replace(old_admin, new_admin)
        print("  ✓ Admin route updated")
    
    # 7. Update templates to pass auth variables
    print("Step 7: Updating template renders...")
    content = content.replace(
        "return render_template('dashboard.html')",
        "return render_template('dashboard.html', is_admin=auth_manager.is_admin() if V3_3_FEATURES else False, is_authenticated=auth_manager.is_authenticated() if V3_3_FEATURES else False)"
    )
    content = content.replace(
        "return render_template('admin.html')",
        "return render_template('admin.html', is_admin=True, is_authenticated=True)"
    )
    print("  ✓ Template renders updated")
    
    # 8. Write updated file
    print("Step 8: Writing updated web/app.py...")
    with open(app_py_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("  ✓ File updated")
    
    # 9. Create exports folder for downloads
    print("Step 9: Creating exports folder...")
    os.makedirs('exports/audio', exist_ok=True)
    os.makedirs('exports/lyrics', exist_ok=True)
    os.makedirs('exports/artwork', exist_ok=True)
    os.makedirs('exports/full', exist_ok=True)
    print("  ✓ Exports folders created")
    
    print()
    print("=" * 60)
    print("✅ Integration Complete!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Install dependencies:")
    print("   pip install googletrans==4.0.0rc1 deep-translator flask-minify")
    print()
    print("2. Update .env file:")
    print("   ADMIN_USERNAME=admin")
    print("   ADMIN_PASSWORD=your_password")
    print("   SECRET_KEY=your-secret-key")
    print()
    print("3. Restart bot:")
    print("   python main.py")
    print()
    print("4. Access dashboard:")
    print("   http://localhost:5000")
    print("   http://localhost:5000/login")
    print()
    print(f"Backup saved to: {backup_path}")
    print()

if __name__ == '__main__':
    try:
        integrate_v3_3()
    except Exception as e:
        print(f"❌ Error during integration: {e}")
        print("Please check the error and try again.")
        import traceback
        traceback.print_exc()
