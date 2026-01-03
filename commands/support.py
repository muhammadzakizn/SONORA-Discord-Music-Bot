"""
Support Command and DM Handler

Handles /support command in guilds and DM message handling for AI support.
"""

import discord
from discord import app_commands
from discord.ext import commands
import logging
import asyncio
from typing import Optional

from services.support.support_ai import get_support_ai, UserIntent
from database.models_support import get_support_db, TicketType
from ui.support_modals import SupportActionView, FeedbackModal, IssueReportModal, LiveSupportModal

logger = logging.getLogger('discord_music_bot.commands.support')


class SupportCog(commands.Cog):
    """Customer Support commands and DM handling"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.ai = get_support_ai()
        self.db = get_support_db()
        self._active_sessions = {}  # user_id -> session info
    
    @app_commands.command(name="support", description="Get customer support via DM")
    async def support(self, interaction: discord.Interaction):
        """
        Open support session via DM.
        Must be used in a guild, will send DM to user.
        """
        # Check if used in DM
        if isinstance(interaction.channel, discord.DMChannel):
            await interaction.response.send_message(
                embed=discord.Embed(
                    title="Support",
                    description="Kamu sudah di DM! Langsung ketik pesan kamu.",
                    color=0x7B1E3C
                ),
                ephemeral=True
            )
            return
        
        # Check if user is logged in (has dashboard account)
        user_id = str(interaction.user.id)
        
        # Try to send DM
        try:
            dm_channel = await interaction.user.create_dm()
            
            # Welcome message
            embed = discord.Embed(
                title="SONORA Support",
                description=(
                    f"Hai **{interaction.user.display_name}**! Selamat datang di SONORA Support.\n\n"
                    "Aku adalah AI Assistant yang siap membantu kamu. Kamu bisa:\n\n"
                    "💬 **Tanya apa saja** tentang SONORA\n"
                    "💡 **Beri feedback** atau saran fitur\n"
                    "🐛 **Laporkan masalah** yang kamu temui\n"
                    "👨‍💻 **Hubungi developer** untuk bantuan langsung\n\n"
                    "Ketik pesan kamu, atau klik tombol di bawah:"
                ),
                color=0x7B1E3C
            )
            embed.set_thumbnail(url=self.bot.user.display_avatar.url if self.bot.user else None)
            embed.set_footer(text="Support SONORA • Powered by AI")
            
            # Create action buttons
            view = SupportActionView(
                on_ticket_created=self._notify_developers
            )
            
            await dm_channel.send(embed=embed, view=view)
            
            # Mark session as active
            self._active_sessions[user_id] = {
                'started_at': discord.utils.utcnow(),
                'guild_id': interaction.guild.id if interaction.guild else None
            }
            
            await interaction.response.send_message(
                embed=discord.Embed(
                    title="Support Session Started",
                    description=(
                        "Cek DM kamu untuk memulai sesi support.\n"
                        "Jika tidak menerima DM, pastikan pengaturan privasi "
                        "Discord kamu mengizinkan pesan dari anggota server."
                    ),
                    color=0x7B1E3C
                ),
                ephemeral=True
            )
            
            logger.info(f"Support session started for {interaction.user.display_name}")
            
        except discord.Forbidden:
            await interaction.response.send_message(
                embed=discord.Embed(
                    title="Tidak Bisa Mengirim DM",
                    description=(
                        "Aku tidak bisa mengirim DM ke kamu.\n\n"
                        "**Cara mengaktifkan:**\n"
                        "1. Buka Server Settings\n"
                        "2. Privacy Settings\n"
                        "3. Aktifkan 'Allow DMs from server members'"
                    ),
                    color=0xE74C3C
                ),
                ephemeral=True
            )
    
    async def _notify_developers(self, ticket_id: str):
        """Notify developers about new ticket"""
        try:
            ticket = self.db.get_ticket(ticket_id)
            if not ticket:
                return
            
            # Get developer IDs from environment
            import os
            dev_ids = os.getenv('DEVELOPER_IDS', '564879374843854869').split(',')
            
            for dev_id in dev_ids:
                try:
                    dev_user = await self.bot.fetch_user(int(dev_id.strip()))
                    if dev_user:
                        embed = discord.Embed(
                            title="New Support Ticket",
                            description=(
                                f"**Ticket:** `{ticket.id}`\n"
                                f"**Type:** {ticket.ticket_type.title()}\n"
                                f"**User:** {ticket.user_name}\n"
                                f"**Subject:** {ticket.subject}\n\n"
                                f"**Description:**\n{ticket.description[:500]}"
                            ),
                            color=0xE74C3C if ticket.ticket_type == 'issue' else 0x3498DB
                        )
                        embed.set_footer(text="Check Developer Dashboard for details")
                        
                        await dev_user.send(embed=embed)
                        logger.info(f"Notified developer {dev_id} about ticket {ticket_id}")
                except Exception as e:
                    logger.debug(f"Could not notify developer {dev_id}: {e}")
                    
        except Exception as e:
            logger.error(f"Error notifying developers: {e}")
    
    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        """Handle DM messages for support"""
        # Ignore bot messages
        if message.author.bot:
            return
        
        # Only handle DMs
        if not isinstance(message.channel, discord.DMChannel):
            return
        
        # Check if message starts with command prefix (ignore)
        if message.content.startswith(('/', '!', '?', '.', '-')):
            await message.reply(
                embed=discord.Embed(
                    title="Commands Not Available in DM",
                    description=(
                        "Perintah bot tidak tersedia di DM.\n\n"
                        "Untuk support, cukup ketik pesan biasa atau gunakan tombol di atas.\n"
                        "Untuk menggunakan bot, pergi ke server Discord."
                    ),
                    color=0xF39C12
                )
            )
            return
        
        # Process with AI
        user_id = str(message.author.id)
        user_name = message.author.display_name
        
        async with message.channel.typing():
            try:
                response, intent = await self.ai.generate_response(
                    message.content,
                    user_name
                )
                
                # Create response embed
                embed = None
                view = None
                
                if intent in [UserIntent.FEEDBACK, UserIntent.ISSUE, UserIntent.LIVE_SUPPORT]:
                    # Show action buttons for these intents
                    embed = discord.Embed(
                        description=response,
                        color=0x7B1E3C
                    )
                    view = SupportActionView(
                        show_feedback=(intent == UserIntent.FEEDBACK),
                        show_issue=(intent == UserIntent.ISSUE),
                        show_live=(intent == UserIntent.LIVE_SUPPORT),
                        on_ticket_created=self._notify_developers
                    )
                    await message.reply(embed=embed, view=view)
                else:
                    # Regular text response
                    await message.reply(response)
                
                logger.debug(f"AI response to {user_name}: intent={intent.value}")
                
            except Exception as e:
                logger.error(f"Error processing DM: {e}")
                await message.reply(
                    "Maaf, terjadi kesalahan. Coba lagi nanti atau gunakan tombol di atas."
                )


async def setup(bot: commands.Bot):
    """Setup the support cog"""
    await bot.add_cog(SupportCog(bot))
    logger.info("Support cog loaded")
