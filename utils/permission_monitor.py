"""Permission monitoring system - detects and reports permission issues proactively"""

import discord
from discord.ext import commands, tasks
from typing import List, Dict, Optional, Set
import asyncio

from config.logging_config import get_logger

logger = get_logger('utils.permission_monitor')


class PermissionMonitor:
    """Monitors and reports permission issues in guilds"""
    
    # Critical permissions that will break bot functionality
    CRITICAL_PERMISSIONS = {
        'connect': ('🔊 Connect', 'Bergabung ke Voice Channel'),
        'speak': ('🔊 Speak', 'Berbicara di Voice Channel'),
        'send_messages': ('💬 Send Messages', 'Kirim Pesan'),
        'use_application_commands': ('⌨️ Slash Commands', 'Gunakan Slash Commands'),
    }
    
    # Important but not critical
    IMPORTANT_PERMISSIONS = {
        'embed_links': ('🔗 Embed Links', 'Embed Links'),
        'add_reactions': ('👍 Add Reactions', 'Tambah Reaksi'),
        'read_message_history': ('📜 Read History', 'Baca Riwayat'),
    }
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._last_permission_state: Dict[int, Dict[str, bool]] = {}
        self._warned_guilds: Set[int] = set()
    
    def get_guild_permissions(self, guild: discord.Guild) -> Dict[str, bool]:
        """Get current permission state for a guild"""
        bot_perms = guild.me.guild_permissions
        state = {}
        
        for perm_name in list(self.CRITICAL_PERMISSIONS.keys()) + list(self.IMPORTANT_PERMISSIONS.keys()):
            state[perm_name] = getattr(bot_perms, perm_name, False)
        
        return state
    
    def check_permission_changes(self, guild: discord.Guild) -> tuple[List[str], List[str]]:
        """
        Check for permission changes since last check
        
        Returns:
            Tuple of (lost_permissions, gained_permissions)
        """
        current_state = self.get_guild_permissions(guild)
        last_state = self._last_permission_state.get(guild.id, {})
        
        lost = []
        gained = []
        
        for perm_name, has_perm in current_state.items():
            was_granted = last_state.get(perm_name, True)  # Assume had permission before
            
            if was_granted and not has_perm:
                lost.append(perm_name)
            elif not was_granted and has_perm:
                gained.append(perm_name)
        
        # Update state
        self._last_permission_state[guild.id] = current_state
        
        return lost, gained
    
    def check_critical_missing(self, guild: discord.Guild) -> List[str]:
        """Check which critical permissions are missing"""
        state = self.get_guild_permissions(guild)
        missing = []
        
        for perm_name in self.CRITICAL_PERMISSIONS.keys():
            if not state.get(perm_name, False):
                missing.append(perm_name)
        
        return missing
    
    async def send_permission_warning(
        self, 
        guild: discord.Guild, 
        lost_permissions: List[str],
        context_message: str = ""
    ) -> bool:
        """
        Send warning about lost permissions to guild
        
        Returns:
            True if message was sent successfully
        """
        if not lost_permissions:
            return False
        
        # Build warning message
        issues_text = ""
        has_critical = False
        
        for perm_name in lost_permissions:
            if perm_name in self.CRITICAL_PERMISSIONS:
                en_name, id_name = self.CRITICAL_PERMISSIONS[perm_name]
                issues_text += f"❌ **{id_name}** / *{en_name}*\n"
                has_critical = True
            elif perm_name in self.IMPORTANT_PERMISSIONS:
                en_name, id_name = self.IMPORTANT_PERMISSIONS[perm_name]
                issues_text += f"⚠️ **{id_name}** / *{en_name}*\n"
        
        # Create embed
        embed = discord.Embed(
            title="⚠️ Peringatan Perizinan / Permission Warning" if has_critical else "⚠️ Info Perizinan",
            description=(
                "Bot mendeteksi perubahan perizinan yang dapat mengganggu kinerja.\n"
                "*Bot detected permission changes that may affect functionality.*\n\n"
                f"{context_message}\n" if context_message else ""
            ),
            color=0xED4245 if has_critical else 0xFEE75C
        )
        
        embed.add_field(
            name="Perizinan yang Hilang / Lost Permissions",
            value=issues_text,
            inline=False
        )
        
        if has_critical:
            embed.add_field(
                name="⚡ Dampak / Impact",
                value=(
                    "Bot mungkin tidak dapat berfungsi dengan benar!\n"
                    "*Bot may not function properly!*"
                ),
                inline=False
            )
        
        embed.add_field(
            name="🔧 Cara Memperbaiki / How to Fix",
            value=(
                "**Server Settings → Roles → SONORA**\n"
                "Aktifkan kembali perizinan yang diperlukan.\n"
                "*Re-enable the required permissions.*"
            ),
            inline=False
        )
        
        embed.set_footer(text="SONORA Permission Monitor")
        
        # Try to send to a channel
        for channel in guild.text_channels:
            perms = channel.permissions_for(guild.me)
            if perms.send_messages:
                try:
                    await channel.send(embed=embed)
                    logger.info(f"[PERMISSION] Sent warning to {guild.name}#{channel.name}")
                    return True
                except:
                    continue
        
        # Fallback: DM owner
        try:
            if guild.owner:
                await guild.owner.send(embed=embed)
                logger.info(f"[PERMISSION] Sent DM warning to owner of {guild.name}")
                return True
        except:
            pass
        
        logger.warning(f"[PERMISSION] Could not send warning to {guild.name}")
        return False
    
    async def on_command_check(self, guild: discord.Guild) -> Optional[str]:
        """
        Check permissions before command execution
        Returns warning message if there are issues, None otherwise
        """
        missing = self.check_critical_missing(guild)
        
        if not missing:
            return None
        
        # Build warning
        issues = []
        for perm_name in missing:
            if perm_name in self.CRITICAL_PERMISSIONS:
                _, id_name = self.CRITICAL_PERMISSIONS[perm_name]
                issues.append(id_name)
        
        if issues:
            return (
                f"⚠️ **Peringatan:** Bot tidak memiliki izin yang diperlukan:\n"
                f"{', '.join(issues)}\n\n"
                f"*Warning: Bot is missing required permissions.*"
            )
        
        return None


# Global instance
_permission_monitor: Optional[PermissionMonitor] = None


def get_permission_monitor(bot: commands.Bot) -> PermissionMonitor:
    """Get or create permission monitor instance"""
    global _permission_monitor
    if _permission_monitor is None:
        _permission_monitor = PermissionMonitor(bot)
    return _permission_monitor


async def setup_permission_events(bot: commands.Bot):
    """Setup permission monitoring events"""
    monitor = get_permission_monitor(bot)
    
    @bot.event
    async def on_guild_role_update(before: discord.Role, after: discord.Role):
        """Detect when bot's role permissions change"""
        guild = after.guild
        
        # Check if this is one of bot's roles
        if after not in guild.me.roles:
            return
        
        # Check for permission changes
        lost, gained = monitor.check_permission_changes(guild)
        
        if lost:
            # Filter for critical only
            critical_lost = [p for p in lost if p in monitor.CRITICAL_PERMISSIONS]
            if critical_lost:
                await monitor.send_permission_warning(
                    guild, 
                    critical_lost,
                    f"Role **{after.name}** telah diubah."
                )
    
    @bot.event  
    async def on_member_update(before: discord.Member, after: discord.Member):
        """Detect when bot's roles change"""
        if after.id != bot.user.id:
            return
        
        guild = after.guild
        
        # Check for role changes
        old_roles = set(before.roles)
        new_roles = set(after.roles)
        
        if old_roles != new_roles:
            # Role was added or removed
            lost, gained = monitor.check_permission_changes(guild)
            
            if lost:
                critical_lost = [p for p in lost if p in monitor.CRITICAL_PERMISSIONS]
                if critical_lost:
                    await monitor.send_permission_warning(
                        guild,
                        critical_lost,
                        "Role bot telah diubah / *Bot roles have been changed*"
                    )
    
    logger.info("[PERMISSION] Permission monitoring events setup complete")
