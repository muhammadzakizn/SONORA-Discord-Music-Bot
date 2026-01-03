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
    """Customer Support DM handling - Users just DM the bot directly"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.ai = get_support_ai()
        self.db = get_support_db()
        self._active_sessions = {}  # user_id -> session info
    
    # No /support command - users just DM the bot directly
    # Info about DM support is shown in welcome/goodbye messages
    
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
