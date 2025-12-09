# 🌿 SONORA Bot - Branch Strategy

## Overview

```
main (stable/production)
  │
  └── development
      │
      ├── beta (testing)
      │
      └── alpha (experimental)
```

## Branch Purposes

### 🟢 main (Production)
- **Purpose**: Stable, production-ready code
- **Stability**: 100% stable
- **Testing**: Full QA passed
- **Deploy**: Production servers
- **Database**: `bot.db`
- **Port**: 5000

### 🔧 development
- **Purpose**: Active development
- **Stability**: Semi-stable
- **Testing**: Manual testing
- **Deploy**: Development servers
- **Database**: `bot.db`
- **Port**: 5000

### 🧪 beta
- **Purpose**: Beta testing with users
- **Stability**: Testing phase
- **Testing**: User acceptance testing
- **Deploy**: Beta servers
- **Database**: `bot_beta.db`
- **Port**: 5002

### 🔬 alpha
- **Purpose**: Experimental features
- **Stability**: Unstable, may break
- **Testing**: Developer testing only
- **Deploy**: Local/test servers
- **Database**: `bot_alpha.db`
- **Port**: 5001

## Quick Commands

```bash
# Setup branches
chmod +x tmp_rovodev_setup_dev_branches.sh
./tmp_rovodev_setup_dev_branches.sh

# Switch environment
chmod +x switch_environment.sh
./switch_environment.sh

# Manual switch
git checkout alpha    # Experimental
git checkout beta     # Testing
git checkout development # Development
git checkout main     # Production
```
