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


class StartSupportView(discord.ui.View):
    """View with button to start DM support session"""
    
    def __init__(self, bot: commands.Bot, user: discord.User, is_registered: bool):
        super().__init__(timeout=300)
        self.bot = bot
        self.user = user
        self.is_registered = is_registered
    
    @discord.ui.button(label="📩 Start DM Support", style=discord.ButtonStyle.primary)
    async def start_dm(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Send DM to user to start support session"""
        try:
            # Create welcome DM embed
            embed = discord.Embed(
                title="👋 Welcome to SONORA Support!",
                description=(
                    "**Hai! Selamat datang di SONORA Support.**\n"
                    "*Hi! Welcome to SONORA Support.*\n\n"
                    "Saya adalah AI Assistant yang siap membantu 24/7.\n"
                    "*I'm an AI Assistant ready to help 24/7.*\n\n"
                    "Silakan ketik pertanyaan atau masalahmu di bawah!\n"
                    "*Please type your question or issue below!*"
                ),
                color=0x7B1E3C
            )
            
            if self.is_registered:
                embed.add_field(
                    name="✅ Account Status",
                    value="Registered in Dashboard / Terdaftar di Dashboard",
                    inline=False
                )
            
            embed.set_footer(text="SONORA AI Support • Powered by DeepSeek")
            
            # Send DM
            await self.user.send(embed=embed)
            
            # Update original message
            await interaction.response.edit_message(
                content="✅ Check your DM! / Cek DM kamu!",
                embed=None,
                view=None
            )
            
        except discord.Forbidden:
            await interaction.response.send_message(
                "❌ Cannot send DM! Please enable DMs from server members.\n"
                "*Tidak bisa kirim DM! Aktifkan DM dari anggota server.*",
                ephemeral=True
            )
        except Exception as e:
            logger.error(f"Error starting DM support: {e}")
            await interaction.response.send_message(
                "❌ Error occurred. Please try again.\n*Terjadi kesalahan. Coba lagi.*",
                ephemeral=True
            )

class SupportCog(commands.Cog):
    """Customer Support - /support command and DM handling"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.ai = get_support_ai()
        self.db = get_support_db()
        self._active_sessions = {}  # user_id -> session info
    
    @app_commands.command(name="support", description="Minta bantuan dari AI Support")
    async def support(self, interaction: discord.Interaction):
        """Redirect user to DM for support and check database registration"""
        user = interaction.user
        
        # Check if user is registered in dashboard
        is_registered = await self._check_user_registration(str(user.id))
        
        # Create embed for redirect (bilingual)
        embed = discord.Embed(
            title="💬 SONORA Support",
            description=(
                "**Untuk bantuan, silakan DM bot ini langsung!**\n"
                "*For support, please DM this bot directly!*\n\n"
                "🤖 AI Support siap membantu 24/7 dengan:\n"
                "*AI Support is ready to help 24/7 with:*\n"
                "• Pertanyaan fitur / Feature questions\n"
                "• Lapor bug / Bug reports\n"
                "• Feedback & saran / Suggestions\n"
                "• Hubungi developer / Contact developer"
            ),
            color=0x7B1E3C
        )
        
        if is_registered:
            embed.add_field(
                name="✅ Account Status",
                value="Terdaftar di Dashboard / Registered in Dashboard",
                inline=False
            )
        else:
            embed.add_field(
                name="📝 Join Dashboard",
                value=(
                    "Belum punya akun? / Don't have an account?\n"
                    "[sonora.muhammadzakizn.com](https://sonora.muhammadzakizn.com)"
                ),
                inline=False
            )
        
        embed.set_footer(text="Click button below to start DM chat / Klik tombol untuk mulai chat")
        
        # Create view with DM button
        view = StartSupportView(self.bot, user, is_registered)
        
        await interaction.response.send_message(embed=embed, view=view, ephemeral=True)
    
    async def _check_user_registration(self, discord_id: str) -> bool:
        """Check if user is registered in dashboard database"""
        try:
            from database.db_manager import get_db_manager
            db = get_db_manager()
            
            # Check if user exists in users table
            result = db.execute_raw(
                "SELECT id FROM users WHERE discord_id = ?",
                (discord_id,)
            )
            return len(result) > 0 if result else False
        except Exception as e:
            logger.debug(f"Error checking user registration: {e}")
            return False
    
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
