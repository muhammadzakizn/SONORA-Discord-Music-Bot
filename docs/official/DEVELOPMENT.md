# 🔧 SONORA Bot - Development Guide

## 📋 Branch Strategy

SONORA Bot menggunakan Git Flow yang telah dimodifikasi untuk development:

```
main (stable)
  └── development
      ├── beta
      └── alpha
```

### 🌿 Branch Descriptions

| Branch | Purpose | Stability | Testing |
|--------|---------|-----------|---------|
| **main** | Production/Stable | 🟢 Stable | Full QA |
| **development** | Active development | 🟡 Semi-stable | Manual testing |
| **beta** | Beta testing | 🟡 Testing | User testing |
| **alpha** | Experimental | 🔴 Unstable | Developer testing |

---

## 🚀 Quick Start

### 1. Setup Development Branches

```bash
# Run setup script
chmod +x tmp_rovodev_setup_dev_branches.sh
./tmp_rovodev_setup_dev_branches.sh
```

### 2. Switch to Development Environment

#### For Alpha Testing (Experimental):
```bash
git checkout alpha
cp .env.alpha .env
python3 main.py
```

#### For Beta Testing:
```bash
git checkout beta
cp .env.beta .env
python3 main.py
```

#### For Stable:
```bash
git checkout main
cp .env.example .env
# Configure your production settings
python3 main.py
```

---

## 📝 Workflow

### 🔬 Alpha Development (Experimental Features)

1. **Switch to alpha branch**
   ```bash
   git checkout alpha
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feature/experimental-voice-effects
   ```

3. **Develop & test**
   ```bash
   # Edit code
   # Test extensively
   python3 main.py
   ```

4. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: add experimental voice effects"
   ```

5. **Merge back to alpha**
   ```bash
   git checkout alpha
   git merge feature/experimental-voice-effects
   ```

---

### 🧪 Beta Testing (Pre-release)

1. **Promote from alpha to beta**
   ```bash
   git checkout beta
   git merge alpha
   ```

2. **Beta testing period** (1-2 weeks)
   - Test with real users
   - Fix bugs found
   - Performance testing

3. **Bug fixes in beta**
   ```bash
   git checkout beta
   # Fix bugs
   git commit -m "fix: resolve playback issue in beta"
   ```

---

### 🚀 Production Release

1. **Promote from beta to development**
   ```bash
   git checkout development
   git merge beta
   ```

2. **Final testing in development**
   - Full regression testing
   - Security audit
   - Performance benchmarks

3. **Release to production**
   ```bash
   git checkout main
   git merge development
   git tag -a v3.4.0 -m "Release v3.4.0"
   git push origin main --tags
   ```

---

## 🔄 Branch Sync

### Update alpha from development:
```bash
git checkout alpha
git merge development
```

### Update beta from alpha:
```bash
git checkout beta
git merge alpha
```

### Update development from main (hotfixes):
```bash
git checkout development
git merge main
```

---

## 🗄️ Database Separation

Each environment uses separate database:

| Environment | Database File | Port |
|-------------|--------------|------|
| Production | `bot.db` | 5000 |
| Beta | `bot_beta.db` | 5002 |
| Alpha | `bot_alpha.db` | 5001 |

---

## 🐛 Bug Fix Workflow

### Critical Bug in Production:
```bash
# Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-playback-bug

# Fix the bug
# Test thoroughly

# Merge to main
git checkout main
git merge hotfix/critical-playback-bug
git tag -a v3.3.1 -m "Hotfix: Critical playback bug"

# Merge to all branches
git checkout development
git merge main

git checkout beta
git merge main

git checkout alpha
git merge main
```

### Non-critical Bug:
```bash
# Fix in development
git checkout development
git checkout -b fix/minor-ui-glitch

# Fix and test
git checkout development
git merge fix/minor-ui-glitch

# Will be included in next release
```

---

## 🧪 Testing Guidelines

### Alpha Testing Checklist:
- ✅ Code compiles without errors
- ✅ Basic functionality works
- ✅ New features are testable
- ⚠️ Expect bugs and instability

### Beta Testing Checklist:
- ✅ All alpha issues resolved
- ✅ Feature complete
- ✅ Performance acceptable
- ✅ Security reviewed
- ✅ User documentation ready

### Production Release Checklist:
- ✅ All beta issues resolved
- ✅ Full regression testing passed
- ✅ Performance benchmarks met
- ✅ Security audit passed
- ✅ Deployment tested
- ✅ Rollback plan ready
- ✅ User documentation published

---

## 📊 Version Numbers

Format: `MAJOR.MINOR.PATCH-STAGE`

Examples:
- `3.3.0` - Stable release
- `3.4.0-beta.1` - Beta version 1
- `3.4.0-alpha.3` - Alpha version 3

### Semantic Versioning:
- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes

---

## 🔐 Environment Variables

Each environment has its own `.env` file:

| File | Environment | Description |
|------|-------------|-------------|
| `.env` | Production | Active production config |
| `.env.alpha` | Alpha | Alpha testing config |
| `.env.beta` | Beta | Beta testing config |
| `.env.example` | Template | Example configuration |

**⚠️ IMPORTANT**: Never commit `.env` files with real credentials!

---

## 🛠️ Development Tools

### Code Quality:
```bash
# Check syntax
python3 -m py_compile main.py

# Format code
black .

# Lint code
pylint main.py

# Type checking
mypy main.py
```

### Testing:
```bash
# Run tests (when implemented)
pytest tests/

# Run with coverage
pytest --cov=. tests/
```

### Database Management:
```bash
# Backup database
cp bot.db bot.db.backup

# Reset alpha database
rm bot_alpha.db
python3 main.py  # Will recreate

# View database
sqlite3 bot.db
```

---

## 📚 Additional Resources

- **Architecture Documentation**: `docs/ARCHITECTURE.md`
- **API Documentation**: `docs/API.md`
- **Troubleshooting Guide**: `docs/TROUBLESHOOTING.md`
- **Contributing Guide**: `CONTRIBUTING.md` (to be created)

---

## 💡 Best Practices

1. **Always work in feature branches**
   - Never commit directly to main/development
   - Use descriptive branch names

2. **Write meaningful commit messages**
   - Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
   - Include issue/ticket numbers if applicable

3. **Test before merging**
   - Run all tests
   - Manual testing for critical features
   - Code review when possible

4. **Keep branches synchronized**
   - Regularly sync from parent branches
   - Resolve conflicts promptly

5. **Document everything**
   - Update documentation with code changes
   - Comment complex logic
   - Keep CHANGELOG.md updated

---

## 🆘 Need Help?

If you encounter issues:

1. Check `docs/TROUBLESHOOTING.md`
2. Review logs in `logs/` directory
3. Check Discord bot status
4. Verify environment variables
5. Test with minimal configuration

---

## 📝 Changelog

Track changes in `CHANGELOG.md`:

```markdown
## [3.4.0-alpha.1] - 2024-XX-XX
### Added
- New voice effects system
- Enhanced queue management

### Fixed
- Playback synchronization issue

### Changed
- Improved error messages
```

---

**Happy Coding! 🚀**

For questions or suggestions, check the documentation or open an issue.
