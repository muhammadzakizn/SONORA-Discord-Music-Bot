"""
Support Command - Modal-Based System

Handles /support command with button categories and modal forms.
No AI DM chat - uses modals instead (no Message Content Intent needed).
"""

import discord
from discord import app_commands
from discord.ext import commands
import logging
import time
from typing import Optional, Dict
from datetime import datetime, timedelta

logger = logging.getLogger('discord_music_bot.commands.support')

# Cooldown tracking: {user_id: {report_type: last_submit_time}}
_cooldowns: Dict[int, Dict[str, float]] = {}
COOLDOWN_SECONDS = 3600  # 1 hour


class BugReportModal(discord.ui.Modal, title="Bug Report"):
    """Modal for bug reports"""
    
    bug_title = discord.ui.TextInput(
        label="Title",
        placeholder="Brief description of the bug",
        max_length=100,
        required=True
    )
    
    steps = discord.ui.TextInput(
        label="Steps to Reproduce",
        placeholder="1. Use /play command\n2. ...\n3. Bug appears",
        style=discord.TextStyle.paragraph,
        max_length=1000,
        required=True
    )
    
    expected = discord.ui.TextInput(
        label="Expected Behavior",
        placeholder="What should have happened?",
        max_length=300,
        required=True
    )
    
    actual = discord.ui.TextInput(
        label="Actual Behavior",
        placeholder="What actually happened?",
        max_length=300,
        required=True
    )
    
    async def on_submit(self, interaction: discord.Interaction):
        await _handle_submission(interaction, "bug", {
            "title": self.bug_title.value,
            "steps": self.steps.value,
            "expected": self.expected.value,
            "actual": self.actual.value
        })


class FeatureRequestModal(discord.ui.Modal, title="Feature Request"):
    """Modal for feature requests"""
    
    feature_title = discord.ui.TextInput(
        label="Feature Title",
        placeholder="Name of the feature",
        max_length=100,
        required=True
    )
    
    description = discord.ui.TextInput(
        label="Description",
        placeholder="Describe the feature in detail",
        style=discord.TextStyle.paragraph,
        max_length=1000,
        required=True
    )
    
    use_case = discord.ui.TextInput(
        label="Use Case",
        placeholder="How would this feature help users?",
        max_length=500,
        required=True
    )
    
    async def on_submit(self, interaction: discord.Interaction):
        await _handle_submission(interaction, "feature", {
            "title": self.feature_title.value,
            "description": self.description.value,
            "use_case": self.use_case.value
        })


class FeedbackModal(discord.ui.Modal, title="Feedback"):
    """Modal for general feedback"""
    
    rating = discord.ui.TextInput(
        label="Rating (1-5)",
        placeholder="5",
        max_length=1,
        required=True
    )
    
    feedback = discord.ui.TextInput(
        label="Your Feedback",
        placeholder="Share your thoughts about SONORA...",
        style=discord.TextStyle.paragraph,
        max_length=1000,
        required=True
    )
    
    async def on_submit(self, interaction: discord.Interaction):
        await _handle_submission(interaction, "feedback", {
            "rating": self.rating.value,
            "feedback": self.feedback.value
        })


class QuestionModal(discord.ui.Modal, title="Question"):
    """Modal for questions"""
    
    question = discord.ui.TextInput(
        label="Your Question",
        placeholder="What would you like to know?",
        style=discord.TextStyle.paragraph,
        max_length=1000,
        required=True
    )
    
    async def on_submit(self, interaction: discord.Interaction):
        await _handle_submission(interaction, "question", {
            "question": self.question.value
        })


async def _handle_submission(interaction: discord.Interaction, report_type: str, data: dict):
    """Handle form submission, notify developers"""
    user = interaction.user
    
    try:
        # Save to database (optional)
        try:
            from database.models_support import get_support_db
            db = get_support_db()
            
            ticket_id = db.create_ticket(
                user_id=str(user.id),
                user_name=str(user),
                ticket_type=report_type,
                subject=data.get('title', data.get('question', 'Feedback')),
                description=str(data)
            )
        except Exception as e:
            logger.warning(f"Could not save to database: {e}")
            ticket_id = f"{report_type[:3].upper()}-{int(time.time())}"
        
        # Build notification embed
        type_colors = {
            "bug": 0xE74C3C,      # Red
            "feature": 0x3498DB,   # Blue
            "feedback": 0x2ECC71,  # Green
            "question": 0x95A5A6   # Gray
        }
        
        type_titles = {
            "bug": "🐛 Bug Report",
            "feature": "💡 Feature Request",
            "feedback": "💬 Feedback",
            "question": "❓ Question"
        }
        
        embed = discord.Embed(
            title=f"New {type_titles.get(report_type, 'Report')}",
            color=type_colors.get(report_type, 0x7B1E3C)
        )
        embed.add_field(name="User", value=f"{user} (`{user.id}`)", inline=False)
        embed.add_field(name="Ticket ID", value=f"`{ticket_id}`", inline=True)
        embed.add_field(name="Type", value=report_type.title(), inline=True)
        
        # Add data fields
        for key, value in data.items():
            if value:
                embed.add_field(
                    name=key.replace('_', ' ').title(),
                    value=value[:1000] if len(value) > 1000 else value,
                    inline=False
                )
        
        embed.set_footer(text=f"Submitted at {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
        
        # Notify developers
        import os
        dev_ids = os.getenv('DEVELOPER_IDS', '564879374843854869').split(',')
        
        for dev_id in dev_ids:
            try:
                dev_user = await interaction.client.fetch_user(int(dev_id.strip()))
                if dev_user:
                    await dev_user.send(embed=embed)
                    logger.info(f"Notified developer {dev_id}")
            except Exception as e:
                logger.debug(f"Could not notify dev {dev_id}: {e}")
        
        # Update cooldown
        user_id = user.id
        if user_id not in _cooldowns:
            _cooldowns[user_id] = {}
        _cooldowns[user_id][report_type] = time.time()
        
        # Confirm to user
        await interaction.response.send_message(
            embed=discord.Embed(
                title="✅ Submitted Successfully",
                description=(
                    f"Your **{report_type}** has been submitted.\n\n"
                    f"**Ticket ID:** `{ticket_id}`\n\n"
                    "A developer will review it soon. Thank you!"
                ),
                color=0x2ECC71
            ),
            ephemeral=True
        )
        
    except Exception as e:
        logger.error(f"Submission error: {e}", exc_info=True)
        await interaction.response.send_message(
            "❌ An error occurred. Please try again later.",
            ephemeral=True
        )


class SupportCategoryView(discord.ui.View):
    """View with category buttons for support"""
    
    def __init__(self):
        super().__init__(timeout=300)
    
    def _check_cooldown(self, user_id: int, report_type: str) -> Optional[int]:
        """Check if user is on cooldown. Returns remaining seconds or None"""
        if user_id not in _cooldowns:
            return None
        
        last_time = _cooldowns[user_id].get(report_type)
        if not last_time:
            return None
        
        elapsed = time.time() - last_time
        if elapsed < COOLDOWN_SECONDS:
            return int(COOLDOWN_SECONDS - elapsed)
        
        return None
    
    @discord.ui.button(label="Bug Report", emoji="🐛", style=discord.ButtonStyle.danger, row=0)
    async def bug_report(self, interaction: discord.Interaction, button: discord.ui.Button):
        remaining = self._check_cooldown(interaction.user.id, "bug")
        if remaining:
            await interaction.response.send_message(
                f"⏱️ Please wait **{remaining // 60} minutes** before submitting another bug report.",
                ephemeral=True
            )
            return
        await interaction.response.send_modal(BugReportModal())
    
    @discord.ui.button(label="Feature Request", emoji="💡", style=discord.ButtonStyle.primary, row=0)
    async def feature_request(self, interaction: discord.Interaction, button: discord.ui.Button):
        remaining = self._check_cooldown(interaction.user.id, "feature")
        if remaining:
            await interaction.response.send_message(
                f"⏱️ Please wait **{remaining // 60} minutes** before submitting another feature request.",
                ephemeral=True
            )
            return
        await interaction.response.send_modal(FeatureRequestModal())
    
    @discord.ui.button(label="Feedback", emoji="💬", style=discord.ButtonStyle.success, row=0)
    async def feedback(self, interaction: discord.Interaction, button: discord.ui.Button):
        remaining = self._check_cooldown(interaction.user.id, "feedback")
        if remaining:
            await interaction.response.send_message(
                f"⏱️ Please wait **{remaining // 60} minutes** before submitting more feedback.",
                ephemeral=True
            )
            return
        await interaction.response.send_modal(FeedbackModal())
    
    @discord.ui.button(label="Question", emoji="❓", style=discord.ButtonStyle.secondary, row=0)
    async def question(self, interaction: discord.Interaction, button: discord.ui.Button):
        remaining = self._check_cooldown(interaction.user.id, "question")
        if remaining:
            await interaction.response.send_message(
                f"⏱️ Please wait **{remaining // 60} minutes** before asking another question.",
                ephemeral=True
            )
            return
        await interaction.response.send_modal(QuestionModal())


class SupportCog(commands.Cog):
    """Customer Support - /support command with modal forms"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
    
    @app_commands.command(name="support", description="Contact support team")
    async def support(self, interaction: discord.Interaction):
        """Send support menu with category buttons"""
        
        embed = discord.Embed(
            title="🎧 SONORA Support",
            description=(
                "Need help? Choose a category below to submit your request.\n\n"
                "**Available Categories:**\n"
                "🐛 **Bug Report** - Report bugs or errors\n"
                "💡 **Feature Request** - Suggest new features\n"
                "💬 **Feedback** - Share your thoughts\n"
                "❓ **Question** - Ask about usage\n\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            ),
            color=0x7B1E3C
        )
        
        embed.add_field(
            name="⚠️ Important Notice",
            value=(
                "• This is for **serious inquiries only**\n"
                "• **1-hour cooldown** between submissions\n"
                "• Abuse may result in restrictions"
            ),
            inline=False
        )
        
        embed.add_field(
            name="🌐 Resources",
            value=(
                "[Website](https://sonora.muhammadzakizn.com) • "
                "[Dashboard](https://sonora.muhammadzakizn.com/dashboard) • "
                "[Documentation](https://sonora.muhammadzakizn.com/docs)"
            ),
            inline=False
        )
        
        embed.set_footer(text="SONORA • Premium Discord Music Bot")
        
        view = SupportCategoryView()
        
        await interaction.response.send_message(embed=embed, view=view, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(SupportCog(bot))
