# 📊 Beta to Stable Promotion Workflow

## Overview

This document describes the automated workflow for promoting beta features to stable production.

---

## 🔄 Promotion Process

### Automated Workflow Steps

```
Beta Version → Testing → Promotion → Stable Version
     ↓           ↓           ↓            ↓
  Feature    Validation   Merge &      Production
Development   Testing    Cleanup       Release
```

### Step-by-Step Process

#### 1. **Backup Current Stable** 🔒
```bash
# Automatically backs up:
- main.py
- bot.db
- All core modules
- Configuration files
```

**Backup Location**: `backups/stable_backup_YYYYMMDD_HHMMSS/`

---

#### 2. **Run Automated Tests** 🧪
```bash
# Runs test suite:
- Unit tests
- Integration tests
- Feature tests
```

**Result**: Pass/Fail + detailed report

---

#### 3. **Analyze Beta Changes** 🔍
```bash
# Detects:
- New features added
- Modified files
- Bug fixes implemented
```

**Output**: Change summary report

---

#### 4. **Merge Beta to Stable** 🔀
```bash
# Merges:
- Commands
- Core modules
- Services
- UI components
- Web dashboard
```

**Process**: File-by-file copy with validation

---

#### 5. **Remove Beta Suffixes** ✂️
```bash
# Cleans up:
- Command names (-beta → regular)
- File references
- Documentation
```

**Result**: Clean stable codebase

---

#### 6. **Update Version Number** 🔢
```bash
# Updates:
- config/constants.py
- README.md
- Documentation
```

**Format**: `3.3.0-beta` → `3.4.0`

---

#### 7. **Create Git Tag** 🏷️
```bash
# Creates:
- Version tag (v3.4.0)
- Release notes
- Commit message
```

**Command**: `git tag -a v3.4.0 -m "Release 3.4.0"`

---

#### 8. **Generate Changelog** 📝
```bash
# Updates CHANGELOG.md with:
- Added features
- Changed files
- Fixed bugs
- Breaking changes
```

---

#### 9. **Cleanup Beta** 🧹
```bash
# Resets beta environment:
- Backs up beta database
- Clears beta logs
- Resets feature flags
```

---

## 🚀 Usage

### Using Launcher (Recommended)
```bash
python3 launcher.py
# Select: 4. Promote Beta → Stable
```

### Direct Script
```bash
python3 scripts/promote_beta.py
```

---

## ⚙️ Configuration

### Prerequisites
- Beta version tested thoroughly
- All tests passing
- Features documented
- Breaking changes noted

### Environment Check
```bash
# Verify before promotion:
✅ Beta bot running stable for 1-2 weeks
✅ No critical bugs reported
✅ User acceptance testing completed
✅ Performance benchmarks met
✅ Security review passed
```

---

## 📋 Promotion Checklist

### Before Promotion
- [ ] Beta tested for at least 1 week
- [ ] All automated tests passing
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] Breaking changes documented
- [ ] Backup stable version
- [ ] Team approval received

### During Promotion
- [ ] Run promotion script
- [ ] Review change summary
- [ ] Confirm merge
- [ ] Verify version update
- [ ] Check changelog

### After Promotion
- [ ] Test stable version
- [ ] Verify all features working
- [ ] Check web dashboard
- [ ] Monitor error logs
- [ ] Update production deployment
- [ ] Announce release
- [ ] Reset beta environment

---

## 🔄 Rollback Procedure

If promotion fails or issues found:

### Immediate Rollback
```bash
# Restore from backup
cd backups/stable_backup_YYYYMMDD_HHMMSS/
cp -r * ../../

# Restart stable version
python3 main.py
```

### Partial Rollback
```bash
# Revert specific files
git checkout HEAD~1 -- path/to/file.py
```

---

## 📊 Success Metrics

### Promotion Success Criteria
- ✅ All tests passed
- ✅ No errors during merge
- ✅ Version updated correctly
- ✅ Changelog generated
- ✅ Git tag created
- ✅ Backup completed

### Post-Promotion Validation
- ✅ Bot starts without errors
- ✅ Commands working correctly
- ✅ Web dashboard accessible
- ✅ Database migrations successful
- ✅ Performance metrics normal

---

## 🛠️ Troubleshooting

### Common Issues

#### Issue: Tests Failing
**Solution**: Fix tests before promotion or skip with confirmation

#### Issue: Merge Conflicts
**Solution**: Manually resolve conflicts in beta version first

#### Issue: Version Already Exists
**Solution**: Choose different version number

#### Issue: Backup Failed
**Solution**: Check disk space and permissions

---

## 📈 Best Practices

### 1. Regular Promotion Schedule
- **Weekly**: Small updates
- **Bi-weekly**: Feature updates
- **Monthly**: Major versions

### 2. Beta Testing Period
- **Minimum**: 1 week
- **Recommended**: 2 weeks
- **Major changes**: 3-4 weeks

### 3. Communication
- Announce beta features to testers
- Document breaking changes
- Update user documentation
- Notify users of stable release

### 4. Version Numbering
```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes
MINOR: New features (backwards compatible)
PATCH: Bug fixes
```

Examples:
- `3.3.0` → `3.4.0` (new features)
- `3.4.0` → `3.4.1` (bug fixes)
- `3.4.1` → `4.0.0` (breaking changes)

---

## 📝 Example Promotion

```bash
$ python3 scripts/promote_beta.py

🚀 SONORA Bot - Development Branch Setup
========================================

📍 Current environment: beta
✅ Beta tested for 14 days
✅ All automated tests passed

[Step 1] Backing up current stable version...
✅ Stable version backed up to: backups/stable_backup_20240105_143022

[Step 2] Running automated tests on beta version...
Running pytest...
✅ All tests passed!

[Step 3] Analyzing beta changes...
Beta Changes Summary:
  New Features: 3
  Modified Files: 12

[Step 4] Merging beta features to stable...
  Merging commands...
    ✓ play.py
    ✓ queue.py
  Merging core...
    ✓ bot.py
✅ Beta features merged to stable

[Step 5] Removing -beta suffix from commands...
  ✓ Cleaned play.py
  ✓ Cleaned queue.py
✅ Beta suffixes removed

[Step 6] Updating version number...
Enter new stable version (e.g., 3.4.0): 3.4.0
✅ Version updated to 3.4.0

[Step 7] Creating git tag...
✅ Git tag created: v3.4.0

[Step 8] Generating changelog...
✅ Changelog updated

[Step 9] Cleaning up beta version...
Reset beta version to clean state? (yes/no): yes
✅ Beta database backed up and reset
✅ Beta logs cleared

============================================================
           PROMOTION COMPLETED SUCCESSFULLY!
============================================================

✅ Beta features promoted to stable v3.4.0
✅ Backup saved to: backups/stable_backup_20240105_143022
✅ Changelog updated
✅ Git tag created: v3.4.0

Next steps:
  1. Test stable version: python3 main.py
  2. Push to repository: git push origin main --tags
  3. Deploy to production
  4. Start new beta development cycle
```

---

## 🎯 Summary

The promotion workflow provides:

✅ **Automated process** - Minimal manual intervention
✅ **Safe rollback** - Automatic backups
✅ **Quality gates** - Automated testing
✅ **Version control** - Git tagging
✅ **Documentation** - Automatic changelog
✅ **Clean separation** - Beta/Stable isolation

---

**Ready to promote?** Run: `python3 launcher.py` → Select: `4. Promote Beta → Stable`

**Questions?** Check: [docs/official/DEVELOPMENT.md](docs/official/DEVELOPMENT.md)
