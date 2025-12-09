# 🚀 Quick Start - Development Environment

## 1️⃣ Setup Development Branches

```bash
./tmp_rovodev_setup_dev_branches.sh
```

This creates:
- `main` - Production/Stable
- `development` - Active development
- `beta` - Beta testing
- `alpha` - Experimental

## 2️⃣ Switch Environment

### Interactive Switcher (Recommended):
```bash
./switch_environment.sh
```

### Manual Switch:
```bash
# Alpha (Experimental)
git checkout alpha
cp .env.alpha .env
python3 main.py

# Beta (Testing)
git checkout beta
cp .env.beta .env
python3 main.py

# Production (Stable)
git checkout main
cp .env.example .env
# Edit .env with your tokens
python3 main.py
```

## 3️⃣ Configuration Files

| Environment | Config File | Database | Port |
|-------------|-------------|----------|------|
| Production | `.env` | `bot.db` | 5000 |
| Development | `.env` | `bot.db` | 5000 |
| Beta | `.env.beta` | `bot_beta.db` | 5002 |
| Alpha | `.env.alpha` | `bot_alpha.db` | 5001 |

## 4️⃣ Development Workflow

### Feature Development:
```bash
git checkout alpha
git checkout -b feature/new-feature
# Develop and test
git commit -m "feat: add new feature"
git checkout alpha
git merge feature/new-feature
```

### Testing Phase:
```bash
git checkout beta
git merge alpha
# Test with users for 1-2 weeks
```

### Release:
```bash
git checkout development
git merge beta
# Final testing
git checkout main
git merge development
git tag -a v3.4.0 -m "Release v3.4.0"
```

## 📚 Full Documentation

See `DEVELOPMENT.md` for complete guide.
