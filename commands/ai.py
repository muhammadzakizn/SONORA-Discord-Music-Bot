"""
AI Command - Ask AI Questions via Modal or Text Command
"""

import discord
from discord import app_commands
from discord.ext import commands
import logging
import time
from typing import Dict, Optional, Tuple

logger = logging.getLogger('discord_music_bot.commands.ai')

# Rate limiting
_rate_limits: Dict[int, float] = {}
RATE_LIMIT_SECONDS = 30  # 30 seconds between questions

# Blocked topics
BLOCKED_KEYWORDS = [
    'politic', 'politik', 'democrat', 'republican', 'trump', 'biden',
    'religion', 'agama', 'islam', 'christian', 'hindu', 'buddha',
    'porn', 'sex', 'nude', 'nsfw', 'xxx',
    'kill', 'murder', 'suicide', 'bunuh',
    'drug', 'cocaine', 'heroin', 'narkoba',
    'hack', 'crack', 'pirate', 'illegal'
]

class AIHelpers:
    """Helper methods for AI commands"""
    
    @staticmethod
    def check_rate_limit(user_id: int) -> Optional[int]:
        """Check rate limit. Returns remaining seconds or None if allowed."""
        now = time.time()
        if user_id in _rate_limits:
            elapsed = now - _rate_limits[user_id]
            if elapsed < RATE_LIMIT_SECONDS:
                return int(RATE_LIMIT_SECONDS - elapsed)
        _rate_limits[user_id] = now
        return None

    @staticmethod
    def check_blocked_topic(text: str) -> bool:
        """Check if text contains blocked keywords"""
        text_lower = text.lower()
        for keyword in BLOCKED_KEYWORDS:
            if keyword in text_lower:
                return True
        return False

    @staticmethod
    async def get_ai_response_content(user_id: int, question: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Get AI response.
        Returns: (Response Text, Error Message)
        """
        try:
            from services.support.support_ai import get_support_ai
            ai = get_support_ai()
            
            # generate_response returns (response_text, intent)
            response_text, intent = await ai.generate_response(
                message=question,
                user_name=f"User_{user_id}"  # Simple user name
            )
            return response_text, None
            
        except Exception as e:
            logger.error(f"AI response error: {e}", exc_info=True)
            return None, "Sorry, I couldn't process your question right now. Please try again later."

    @staticmethod
    def create_response_embed(question: str, response: str) -> discord.Embed:
        """Create standard AI response embed"""
        embed = discord.Embed(
            title="🤖 AI Response",
            color=0x7B1E3C
        )
        embed.add_field(
            name="📝 Your Question",
            value=question[:256],
            inline=False
        )
        
        # Split response logic
        content_limit = 1024
        first_chunk = response[:content_limit]
        
        embed.add_field(
            name="💬 Answer",
            value=first_chunk,
            inline=False
        )
        
        if len(response) > content_limit:
            remaining = response[content_limit:2048]
            if remaining:
                embed.add_field(name="(continued)", value=remaining, inline=False)
        
        embed.set_footer(text="SONORA AI • Powered by Gemini")
        return embed



class AICog(commands.Cog):
    """AI Assistant - /ai command and . prefix"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
    
    @app_commands.command(name="ai", description="Ask AI a question about SONORA or general topics")
    @app_commands.describe(question="Your question for the AI")
    async def ai(self, interaction: discord.Interaction, question: str):
        """Ask AI a question directly"""
        
        # Check rate limit
        retry_after = AIHelpers.check_rate_limit(interaction.user.id)
        if retry_after:
            await interaction.response.send_message(
                f"⏱️ Please wait **{retry_after} seconds** before asking another question.",
                ephemeral=True
            )
            return
            
        # Check blocked
        if AIHelpers.check_blocked_topic(question):
            await interaction.response.send_message(
                embed=discord.Embed(
                    title="❌ Restricted Topic",
                    description="This topic is not allowed.",
                    color=0xE74C3C
                ),
                ephemeral=True
            )
            return
            
        # Defer (Public)
        await interaction.response.defer(ephemeral=False, thinking=True)
        
        # Get Response
        response, error = await AIHelpers.get_ai_response_content(interaction.user.id, question)
        
        if error:
            await interaction.followup.send(
                f"Sorry, I couldn't process your question right now. Please try again later.",
                ephemeral=True
            )
            return
            
        # Send plain text response (public)
        await interaction.followup.send(response, ephemeral=False)

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        """Listen for messages triggering AI (dot prefix, mention, or reply)"""
        # Ignore bots
        if message.author.bot:
            return
            
        # Determine Trigger and Query
        query = ""
        is_trigger = False
        
        # 1. Check Dot Prefix
        if message.content.startswith('.'):
            query = message.content[1:].strip()
            is_trigger = True
            
        # 2. Check Mention
        elif self.bot.user in message.mentions:
            # Remove mention from content
            query = message.content.replace(f'<@{self.bot.user.id}>', '').replace(f'<@!{self.bot.user.id}>', '').strip()
            is_trigger = True
            
        # 3. Check Reply to Bot
        elif message.reference:
            try:
                # Try getting cached message first
                ref_msg = message.reference.cached_message
                if not ref_msg and message.reference.message_id:
                    try:
                        ref_msg = await message.channel.fetch_message(message.reference.message_id)
                    except (discord.NotFound, discord.Forbidden):
                        pass

                if ref_msg and ref_msg.author.id == self.bot.user.id:
                    query = message.content.strip()
                    is_trigger = True
            except Exception:
                pass

        # If not triggered or empty query, ignore
        if not is_trigger or not query:
            return
            
        # Rate Limit Check
        retry_after = AIHelpers.check_rate_limit(message.author.id)
        if retry_after:
            await message.add_reaction("⏱️")
            return
            
        # Check blocked
        if AIHelpers.check_blocked_topic(query):
            await message.add_reaction("❌")
            return
            
        # Indicate typing
        async with message.channel.typing():
            response, error = await AIHelpers.get_ai_response_content(message.author.id, query)
            
            if error:
                await message.reply(
                    "Sorry, I couldn't process your question right now.",
                    mention_author=False
                )
                return
            
            # Send plain text response (no embed)
            await message.reply(response, mention_author=False)


async def setup(bot: commands.Bot):
    await bot.add_cog(AICog(bot))
