#!/usr/bin/env python3
"""
SONORA Bot - Beta to Stable Promotion Script
Automated workflow for promoting beta features to stable version
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path
from datetime import datetime
import json

class Colors:
    GREEN = '\033[92m'
    BLUE = '\033[94m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    CYAN = '\033[96m'
    MAGENTA = '\033[95m'
    BOLD = '\033[1m'
    END = '\033[0m'

class BetaPromotion:
    def __init__(self):
        self.root_dir = Path(__file__).parent.parent
        self.beta_dir = self.root_dir / 'beta-version'
        self.backup_dir = self.root_dir / 'backups'
        self.timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
    def print_header(self, text):
        print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*60}{Colors.END}")
        print(f"{Colors.CYAN}{Colors.BOLD}{text.center(60)}{Colors.END}")
        print(f"{Colors.CYAN}{Colors.BOLD}{'='*60}{Colors.END}\n")
    
    def print_step(self, step, text):
        print(f"{Colors.BLUE}{Colors.BOLD}[Step {step}]{Colors.END} {text}")
    
    def print_success(self, text):
        print(f"{Colors.GREEN}✅ {text}{Colors.END}")
    
    def print_error(self, text):
        print(f"{Colors.RED}❌ {text}{Colors.END}")
    
    def print_warning(self, text):
        print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")
    
    def confirm(self, question):
        response = input(f"{Colors.YELLOW}{question} (yes/no): {Colors.END}").lower()
        return response in ['yes', 'y']
    
    def run_command(self, cmd, capture=False):
        """Run shell command"""
        try:
            if capture:
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
                return result.returncode == 0, result.stdout.strip()
            else:
                result = subprocess.run(cmd, shell=True)
                return result.returncode == 0, None
        except Exception as e:
            return False, str(e)
    
    def backup_stable(self):
        """Backup current stable version"""
        self.print_step(1, "Backing up current stable version...")
        
        # Create backup directory
        self.backup_dir.mkdir(exist_ok=True)
        backup_path = self.backup_dir / f"stable_backup_{self.timestamp}"
        backup_path.mkdir(exist_ok=True)
        
        # Backup important files
        files_to_backup = [
            'main.py',
            'bot.db',
            '.env',
            'core',
            'commands',
            'services',
            'ui',
            'utils',
            'config',
            'database',
            'web'
        ]
        
        for item in files_to_backup:
            src = self.root_dir / item
            if src.exists():
                dst = backup_path / item
                if src.is_file():
                    shutil.copy2(src, dst)
                else:
                    shutil.copytree(src, dst, dirs_exist_ok=True)
        
        self.print_success(f"Stable version backed up to: {backup_path}")
        return backup_path
    
    def run_tests(self):
        """Run automated tests on beta version"""
        self.print_step(2, "Running automated tests on beta version...")
        
        # Check if test file exists
        test_file = self.root_dir / 'tests' / 'test_all_features.py'
        if not test_file.exists():
            self.print_warning("No test file found. Skipping automated tests.")
            return self.confirm("Continue without running tests?")
        
        # Run pytest
        print("Running pytest...")
        success, output = self.run_command('pytest tests/ -v', capture=True)
        
        if success:
            self.print_success("All tests passed!")
            return True
        else:
            self.print_error("Some tests failed!")
            print(output)
            return self.confirm("Continue despite test failures?")
    
    def check_beta_changes(self):
        """Check what changes exist in beta"""
        self.print_step(3, "Analyzing beta changes...")
        
        changes = {
            'new_features': [],
            'bug_fixes': [],
            'modified_files': []
        }
        
        # Check for new commands
        beta_commands = self.beta_dir / 'commands'
        if beta_commands.exists():
            for file in beta_commands.glob('*.py'):
                if file.name != '__init__.py':
                    changes['new_features'].append(f"Command: {file.stem}")
        
        # Check for modified core files
        beta_core = self.beta_dir / 'core'
        if beta_core.exists():
            for file in beta_core.glob('*.py'):
                if file.name != '__init__.py':
                    changes['modified_files'].append(f"Core: {file.name}")
        
        print(f"\n{Colors.CYAN}Beta Changes Summary:{Colors.END}")
        print(f"  New Features: {len(changes['new_features'])}")
        print(f"  Modified Files: {len(changes['modified_files'])}")
        
        return changes
    
    def merge_beta_to_stable(self):
        """Merge beta changes to stable"""
        self.print_step(4, "Merging beta features to stable...")
        
        # List of directories to merge
        dirs_to_merge = ['commands', 'core', 'services', 'ui', 'utils', 'web', 'database']
        
        for dir_name in dirs_to_merge:
            beta_dir = self.beta_dir / dir_name
            stable_dir = self.root_dir / dir_name
            
            if not beta_dir.exists():
                continue
            
            print(f"  Merging {dir_name}...")
            
            # Copy new/modified files
            for file in beta_dir.rglob('*.py'):
                if file.name == '__init__.py':
                    continue
                
                rel_path = file.relative_to(beta_dir)
                dst = stable_dir / rel_path
                
                # Create parent directories if needed
                dst.parent.mkdir(parents=True, exist_ok=True)
                
                # Copy file
                shutil.copy2(file, dst)
                print(f"    ✓ {rel_path}")
        
        self.print_success("Beta features merged to stable")
    
    def remove_beta_suffix(self):
        """Remove -beta suffix from commands"""
        self.print_step(5, "Removing -beta suffix from commands...")
        
        commands_dir = self.root_dir / 'commands'
        
        for file in commands_dir.glob('*.py'):
            if file.name == '__init__.py':
                continue
            
            content = file.read_text()
            
            # Remove -beta suffix from command names
            content = content.replace('-beta', '')
            content = content.replace('BETA', '')
            content = content.replace('[BETA]', '')
            
            file.write_text(content)
            print(f"  ✓ Cleaned {file.name}")
        
        self.print_success("Beta suffixes removed")
    
    def update_version(self):
        """Update version number"""
        self.print_step(6, "Updating version number...")
        
        # Read current version
        version_file = self.root_dir / 'config' / 'constants.py'
        if version_file.exists():
            content = version_file.read_text()
            
            # Ask for new version
            print(f"\n{Colors.YELLOW}Current version pattern: 3.x.x-beta{Colors.END}")
            new_version = input(f"{Colors.BOLD}Enter new stable version (e.g., 3.4.0): {Colors.END}")
            
            # Update version in file
            content = content.replace('3.3.0', new_version)
            content = content.replace('-beta', '')
            
            version_file.write_text(content)
            
            self.print_success(f"Version updated to {new_version}")
            return new_version
        else:
            self.print_warning("Version file not found")
            return "3.4.0"
    
    def create_git_tag(self, version):
        """Create git tag for release"""
        self.print_step(7, "Creating git tag...")
        
        tag_name = f"v{version}"
        
        success, _ = self.run_command(f'git tag -a {tag_name} -m "Release {version}"')
        
        if success:
            self.print_success(f"Git tag created: {tag_name}")
        else:
            self.print_warning("Failed to create git tag (may not be in git repo)")
    
    def generate_changelog(self, changes, version):
        """Generate changelog entry"""
        self.print_step(8, "Generating changelog...")
        
        changelog_file = self.root_dir / 'CHANGELOG.md'
        
        # Create changelog entry
        entry = f"""
## [{version}] - {datetime.now().strftime('%Y-%m-%d')}

### Added
{chr(10).join([f'- {feature}' for feature in changes.get('new_features', [])])}

### Changed
{chr(10).join([f'- {file}' for file in changes.get('modified_files', [])])}

### Fixed
{chr(10).join([f'- {fix}' for fix in changes.get('bug_fixes', [])])}

---

"""
        
        # Prepend to changelog
        if changelog_file.exists():
            current_content = changelog_file.read_text()
            changelog_file.write_text(entry + current_content)
        else:
            changelog_file.write_text(entry)
        
        self.print_success("Changelog updated")
    
    def cleanup_beta(self):
        """Cleanup beta version after promotion"""
        self.print_step(9, "Cleaning up beta version...")
        
        if self.confirm("Reset beta version to clean state?"):
            # Backup beta database
            beta_db = self.beta_dir / 'bot_beta.db'
            if beta_db.exists():
                backup_db = self.backup_dir / f"bot_beta_{self.timestamp}.db"
                shutil.copy2(beta_db, backup_db)
                beta_db.unlink()
                self.print_success("Beta database backed up and reset")
            
            # Clear beta logs
            beta_logs = self.beta_dir / 'logs'
            if beta_logs.exists():
                shutil.rmtree(beta_logs)
                beta_logs.mkdir()
                self.print_success("Beta logs cleared")
    
    def run_promotion(self):
        """Run complete promotion workflow"""
        self.print_header("BETA → STABLE PROMOTION WORKFLOW")
        
        print(f"{Colors.YELLOW}This will promote beta features to stable version.{Colors.END}")
        print(f"{Colors.YELLOW}Make sure you have tested beta thoroughly!{Colors.END}\n")
        
        if not self.confirm("Continue with promotion?"):
            print(f"\n{Colors.RED}Promotion cancelled.{Colors.END}\n")
            return
        
        try:
            # Step 1: Backup
            backup_path = self.backup_stable()
            
            # Step 2: Run tests
            if not self.run_tests():
                raise Exception("Tests failed or cancelled")
            
            # Step 3: Check changes
            changes = self.check_beta_changes()
            
            # Step 4: Merge
            self.merge_beta_to_stable()
            
            # Step 5: Remove beta suffix
            self.remove_beta_suffix()
            
            # Step 6: Update version
            version = self.update_version()
            
            # Step 7: Create git tag
            self.create_git_tag(version)
            
            # Step 8: Generate changelog
            self.generate_changelog(changes, version)
            
            # Step 9: Cleanup
            self.cleanup_beta()
            
            # Success!
            self.print_header("PROMOTION COMPLETED SUCCESSFULLY!")
            
            print(f"{Colors.GREEN}✅ Beta features promoted to stable v{version}{Colors.END}")
            print(f"{Colors.GREEN}✅ Backup saved to: {backup_path}{Colors.END}")
            print(f"{Colors.GREEN}✅ Changelog updated{Colors.END}")
            print(f"{Colors.GREEN}✅ Git tag created: v{version}{Colors.END}\n")
            
            print(f"{Colors.CYAN}Next steps:{Colors.END}")
            print(f"  1. Test stable version: python3 main.py")
            print(f"  2. Push to repository: git push origin main --tags")
            print(f"  3. Deploy to production")
            print(f"  4. Start new beta development cycle\n")
            
        except Exception as e:
            self.print_error(f"Promotion failed: {e}")
            print(f"\n{Colors.YELLOW}Rollback options:{Colors.END}")
            print(f"  1. Restore from backup: {backup_path}")
            print(f"  2. Manual rollback required\n")
            sys.exit(1)

def main():
    promotion = BetaPromotion()
    promotion.run_promotion()

if __name__ == "__main__":
    main()
