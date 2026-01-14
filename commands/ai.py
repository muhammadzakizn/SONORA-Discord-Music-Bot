"""
AI Command - Ask AI Questions via Modal

Uses slash command + modal to ask AI questions without Message Content Intent.
"""

import discord
from discord import app_commands
from discord.ext import commands
import logging
import time
import os
from typing import Dict

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


class AIQuestionModal(discord.ui.Modal, title="Ask AI"):
    """Modal for asking AI questions"""
    
    question = discord.ui.TextInput(
        label="Your Question",
        placeholder="e.g., How does Bluetooth send audio between devices?",
        style=discord.TextStyle.paragraph,
        max_length=500,
        required=True
    )
    
    async def on_submit(self, interaction: discord.Interaction):
        question_text = self.question.value.lower()
        
        # Check for blocked topics
        for keyword in BLOCKED_KEYWORDS:
            if keyword in question_text:
                await interaction.response.send_message(
                    embed=discord.Embed(
                        title="❌ Restricted Topic",
                        description=(
                            "This topic is not allowed. Please ask about:\n"
                            "- SONORA features and usage\n"
                            "- Music and audio technology\n"
                            "- General tech questions\n"
                            "- Discord bot development"
                        ),
                        color=0xE74C3C
                    ),
                    ephemeral=True
                )
                return
        
        # Get AI response
        await interaction.response.defer(ephemeral=True, thinking=True)
        
        try:
            from services.support.support_ai import get_support_ai
            ai = get_support_ai()
            
            # Prepare context
            context = (
                "You are SONORA AI Assistant, a helpful bot that answers questions about "
                "SONORA Discord music bot, music technology, audio, Discord, and general tech topics. "
                "Keep answers concise (max 500 words). Use simple language. "
                "If asked about SONORA features, explain: music playback, synchronized lyrics, "
                "queue management, multi-platform support (Deezer, Spotify, YouTube Music)."
            )
            
            response = await ai.get_response(
                user_id=str(interaction.user.id),
                message=self.question.value,
                context={"system_prompt": context}
            )
            
            # Create response embed
            embed = discord.Embed(
                title="🤖 AI Response",
                color=0x7B1E3C
            )
            embed.add_field(
                name="📝 Your Question",
                value=self.question.value[:256],
                inline=False
            )
            embed.add_field(
                name="💬 Answer",
                value=response[:1024] if len(response) > 1024 else response,
                inline=False
            )
            
            # If response is too long, add continuation
            if len(response) > 1024:
                remaining = response[1024:2048]
                embed.add_field(name="(continued)", value=remaining, inline=False)
            
            embed.set_footer(text="SONORA AI • Powered by Gemini")
            
            await interaction.followup.send(embed=embed, ephemeral=True)
            
        except Exception as e:
            logger.error(f"AI response error: {e}", exc_info=True)
            await interaction.followup.send(
                embed=discord.Embed(
                    title="❌ AI Unavailable",
                    description="Sorry, I couldn't process your question right now. Please try again later.",
                    color=0xE74C3C
                ),
                ephemeral=True
            )


class AICog(commands.Cog):
    """AI Assistant - /ai command for questions"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
    
    @app_commands.command(name="ai", description="Ask AI a question about SONORA or general topics")
    async def ai(self, interaction: discord.Interaction):
        """Open modal to ask AI a question"""
        
        # Check rate limit
        user_id = interaction.user.id
        now = time.time()
        
        if user_id in _rate_limits:
            elapsed = now - _rate_limits[user_id]
            if elapsed < RATE_LIMIT_SECONDS:
                remaining = int(RATE_LIMIT_SECONDS - elapsed)
                await interaction.response.send_message(
                    f"⏱️ Please wait **{remaining} seconds** before asking another question.",
                    ephemeral=True
                )
                return
        
        # Update rate limit
        _rate_limits[user_id] = now
        
        # Show modal
        await interaction.response.send_modal(AIQuestionModal())


async def setup(bot: commands.Bot):
    await bot.add_cog(AICog(bot))
