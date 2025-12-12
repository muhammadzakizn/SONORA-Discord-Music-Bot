"""Welcome message with permission checker for new guilds"""

import discord
from discord import ui
from discord.ext import commands
from typing import List, Tuple, Optional
import asyncio

from config.logging_config import get_logger

logger = get_logger('ui.welcome')


class PermissionChecker:
    """Checks bot permissions in a guild"""
    
    # Required permissions for bot to function
    CRITICAL_PERMISSIONS = [
        ('connect', 'Connect to Voice', 'Bergabung ke Voice Channel'),
        ('speak', 'Speak in Voice', 'Berbicara di Voice Channel'),
        ('send_messages', 'Send Messages', 'Kirim Pesan'),
        ('use_application_commands', 'Use Slash Commands', 'Gunakan Slash Commands'),
    ]
    
    # Nice to have permissions
    RECOMMENDED_PERMISSIONS = [
        ('embed_links', 'Embed Links', 'Embed Links'),
        ('add_reactions', 'Add Reactions', 'Tambah Reaksi'),
        ('use_external_emojis', 'External Emojis', 'Emoji Eksternal'),
        ('read_message_history', 'Read History', 'Baca Riwayat Pesan'),
    ]
    
    @classmethod
    def check_guild(cls, guild: discord.Guild) -> Tuple[List[dict], List[dict], int, int]:
        """
        Check all permissions in a guild
        
        Returns:
            Tuple of (critical_issues, warnings, voice_channels, text_channels)
        """
        bot_perms = guild.me.guild_permissions
        critical_issues = []
        warnings = []
        
        # Check critical permissions
        for perm_name, en_desc, id_desc in cls.CRITICAL_PERMISSIONS:
            if not getattr(bot_perms, perm_name, False):
                critical_issues.append({
                    'permission': perm_name,
                    'en': en_desc,
                    'id': id_desc
                })
        
        # Check recommended permissions
        for perm_name, en_desc, id_desc in cls.RECOMMENDED_PERMISSIONS:
            if not getattr(bot_perms, perm_name, False):
                warnings.append({
                    'permission': perm_name,
                    'en': en_desc,
                    'id': id_desc
                })
        
        # Count accessible channels
        voice_channels = 0
        text_channels = 0
        
        for channel in guild.voice_channels:
            perms = channel.permissions_for(guild.me)
            if perms.connect and perms.speak:
                voice_channels += 1
        
        for channel in guild.text_channels:
            perms = channel.permissions_for(guild.me)
            if perms.send_messages:
                text_channels += 1
        
        # Add channel access issues
        if voice_channels == 0:
            critical_issues.append({
                'permission': 'voice_access',
                'en': 'Access to Voice Channels',
                'id': 'Akses ke Voice Channel'
            })
        
        if text_channels == 0:
            critical_issues.append({
                'permission': 'text_access',
                'en': 'Access to Text Channels',
                'id': 'Akses ke Text Channel'
            })
        
        return critical_issues, warnings, voice_channels, text_channels


class WelcomeView(ui.View):
    """Interactive welcome view with refresh and links"""
    
    def __init__(self, guild: discord.Guild, bot: commands.Bot):
        super().__init__(timeout=3600)  # 1 hour timeout
        self.guild = guild
        self.bot = bot
        self.message: Optional[discord.Message] = None
        
        # Add link buttons
        self.add_item(ui.Button(
            label="🌐 Website",
            url="https://s.id/SONORAbot",
            style=discord.ButtonStyle.link
        ))
        self.add_item(ui.Button(
            label="📜 Terms of Service",
            url="https://s.id/SONORAbot/terms",
            style=discord.ButtonStyle.link
        ))
        self.add_item(ui.Button(
            label="🔒 Privacy Policy",
            url="https://s.id/SONORAbot/privacy",
            style=discord.ButtonStyle.link
        ))
    
    def create_welcome_embed(self) -> discord.Embed:
        """Create the main welcome embed with permission status"""
        critical, warnings, voice_count, text_count = PermissionChecker.check_guild(self.guild)
        
        # Determine overall status
        has_critical = len(critical) > 0
        has_warnings = len(warnings) > 0
        
        if has_critical:
            color = 0xED4245  # Red
            status_emoji = "🔴"
        elif has_warnings:
            color = 0xFEE75C  # Yellow
            status_emoji = "🟡"
        else:
            color = 0x57F287  # Green
            status_emoji = "🟢"
        
        embed = discord.Embed(
            title="🎵 SONORA Music Bot",
            color=color
        )
        
        # Welcome message - Bilingual
        embed.description = (
            "**Halo! Terima kasih telah mengundang SONORA ke server Anda!**\n"
            "*Hello! Thank you for inviting SONORA to your server!*\n\n"
            "Bot musik berkualitas tinggi dengan dukungan Spotify, YouTube, dan Apple Music.\n"
            "*High-quality music bot with Spotify, YouTube, and Apple Music support.*"
        )
        
        # Permission status section
        if has_critical:
            issues_text = ""
            for issue in critical[:5]:
                issues_text += f"❌ **{issue['id']}** / *{issue['en']}*\n"
            if len(critical) > 5:
                issues_text += f"... +{len(critical) - 5} lainnya / *more*\n"
            
            embed.add_field(
                name=f"{status_emoji} Perizinan Perlu Diperbaiki / Permissions Need Fixing",
                value=issues_text,
                inline=False
            )
            
            embed.add_field(
                name="🔧 Cara Memperbaiki / How to Fix",
                value=(
                    "Buka **Server Settings → Roles → SONORA** dan aktifkan izin yang diperlukan.\n"
                    "*Go to **Server Settings → Roles → SONORA** and enable required permissions.*"
                ),
                inline=False
            )
        
        elif has_warnings:
            warn_text = ""
            for warn in warnings[:3]:
                warn_text += f"⚠️ **{warn['id']}** / *{warn['en']}*\n"
            
            embed.add_field(
                name=f"{status_emoji} Peringatan Kecil / Minor Warnings",
                value=warn_text + "\n*Bot tetap bisa berfungsi, tapi beberapa fitur mungkin terbatas.*\n*Bot can still work, but some features may be limited.*",
                inline=False
            )
            
            embed.add_field(
                name="✅ Status Bot",
                value=(
                    f"Bot siap digunakan! / *Bot is ready!*\n"
                    f"📢 {text_count} text channel • 🔊 {voice_count} voice channel"
                ),
                inline=False
            )
        
        else:
            embed.add_field(
                name=f"{status_emoji} Semua Perizinan OK / All Permissions OK",
                value=(
                    f"✅ Bot siap digunakan dengan sempurna!\n"
                    f"*Bot is ready to use perfectly!*\n\n"
                    f"📢 {text_count} text channel • 🔊 {voice_count} voice channel tersedia"
                ),
                inline=False
            )
        
        # Quick start guide
        embed.add_field(
            name="🚀 Cara Menggunakan / How to Use",
            value=(
                "1️⃣ Bergabung ke voice channel / *Join a voice channel*\n"
                "2️⃣ Ketik `/play <judul/link>` / *Type `/play <title/link>`*\n"
                "3️⃣ Nikmati musiknya! 🎧 / *Enjoy the music!*"
            ),
            inline=False
        )
        
        # Terms reminder
        embed.add_field(
            name="📋 Syarat & Ketentuan / Terms & Conditions",
            value=(
                "Dengan menggunakan bot ini, Anda menyetujui **Terms of Service** kami.\n"
                "*By using this bot, you agree to our **Terms of Service**.*\n"
                "Klik tombol di bawah untuk membaca selengkapnya.\n"
                "*Click the buttons below to read more.*"
            ),
            inline=False
        )
        
        embed.set_footer(
            text="Klik 🔄 Refresh untuk cek ulang perizinan | Click 🔄 Refresh to re-check permissions"
        )
        
        if self.bot.user and self.bot.user.avatar:
            embed.set_thumbnail(url=self.bot.user.display_avatar.url)
        
        return embed
    
    def create_checking_embed(self, progress: int = 0) -> discord.Embed:
        """Create embed showing permission check in progress"""
        embed = discord.Embed(
            title="🔍 Mengecek Perizinan... / Checking Permissions...",
            description=f"⏳ Progress: {progress}%\n\n{'█' * (progress // 10)}{'░' * (10 - progress // 10)}",
            color=0x5865F2  # Discord blurple
        )
        
        embed.add_field(
            name="Status",
            value="Sedang memeriksa akses channel dan perizinan bot...\n*Checking channel access and bot permissions...*",
            inline=False
        )
        
        return embed
    
    @ui.button(label="🔄 Refresh", style=discord.ButtonStyle.primary, row=0)
    async def refresh_button(self, interaction: discord.Interaction, button: ui.Button):
        """Re-check permissions when button is clicked"""
        # Show checking progress
        await interaction.response.edit_message(
            embed=self.create_checking_embed(0),
            view=self
        )
        
        # Simulate progress
        for i in range(1, 11):
            await asyncio.sleep(0.2)
            try:
                await interaction.edit_original_response(
                    embed=self.create_checking_embed(i * 10)
                )
            except:
                pass
        
        # Update with new results
        await asyncio.sleep(0.3)
        embed = self.create_welcome_embed()
        await interaction.edit_original_response(embed=embed, view=self)


async def send_welcome_message(guild: discord.Guild, bot: commands.Bot) -> bool:
    """
    Send enhanced welcome message to a guild
    
    Returns:
        True if message was sent successfully
    """
    target_channel = None
    
    # Priority 1: System channel (where join messages go)
    if guild.system_channel:
        perms = guild.system_channel.permissions_for(guild.me)
        if perms.send_messages:
            target_channel = guild.system_channel
            logger.debug(f"Using system channel: {target_channel.name}")
    
    # Priority 2: Look for common channel names
    if not target_channel:
        common_names = ['general', 'chat', 'bot', 'bots', 'commands', 'music', 'welcome', 'lobby']
        for channel in guild.text_channels:
            if any(name in channel.name.lower() for name in common_names):
                perms = channel.permissions_for(guild.me)
                if perms.send_messages:
                    target_channel = channel
                    logger.debug(f"Using common channel: {target_channel.name}")
                    break
    
    # Priority 3: First accessible text channel
    if not target_channel:
        for channel in guild.text_channels:
            perms = channel.permissions_for(guild.me)
            if perms.send_messages:
                target_channel = channel
                logger.debug(f"Using first accessible channel: {target_channel.name}")
                break
    
    # Priority 4: ANY text channel (even without full permissions)
    if not target_channel and guild.text_channels:
        for channel in guild.text_channels:
            try:
                perms = channel.permissions_for(guild.me)
                if perms.view_channel:
                    target_channel = channel
                    logger.debug(f"Using viewable channel: {target_channel.name}")
                    break
            except:
                pass
    
    if not target_channel:
        logger.warning(f"No accessible channel in {guild.name} for welcome message")
        # Try to DM server owner as last resort
        try:
            if guild.owner:
                embed = discord.Embed(
                    title="🎵 SONORA telah bergabung ke server Anda!",
                    description=(
                        f"Bot telah bergabung ke **{guild.name}** tetapi tidak dapat menemukan channel yang dapat diakses.\n\n"
                        f"*Bot has joined **{guild.name}** but couldn't find an accessible channel.*\n\n"
                        "Silakan berikan SONORA akses ke setidaknya satu text channel.\n"
                        "*Please grant SONORA access to at least one text channel.*"
                    ),
                    color=0xFEE75C
                )
                await guild.owner.send(embed=embed)
                logger.info(f"Sent DM to owner of {guild.name}")
        except:
            pass
        return False
    
    try:
        view = WelcomeView(guild, bot)
        embed = view.create_welcome_embed()
        
        # Check if we can send embeds
        perms = target_channel.permissions_for(guild.me)
        if perms.embed_links:
            message = await target_channel.send(embed=embed, view=view)
        else:
            # Fallback to plain text if no embed permission
            message = await target_channel.send(
                "🎵 **SONORA Music Bot** telah bergabung!\n"
                "*SONORA Music Bot has joined!*\n\n"
                "Ketik `/play <lagu>` untuk mulai.\n"
                "*Type `/play <song>` to start.*\n\n"
                "⚠️ Bot membutuhkan izin **Embed Links** untuk tampilan yang lebih baik.",
                view=view
            )
        
        view.message = message
        logger.info(f"Sent welcome message to #{target_channel.name} in {guild.name}")
        return True
    except discord.Forbidden as e:
        logger.warning(f"Forbidden to send welcome in {guild.name}: {e}")
        return False
    except Exception as e:
        logger.error(f"Failed to send welcome message: {e}", exc_info=True)
        return False

