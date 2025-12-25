"""Donate slash command for supporting the developer"""

import discord
from discord import app_commands
from discord.ext import commands

from config.logging_config import get_logger

logger = get_logger('commands.donate')


class DonateView(discord.ui.View):
    """View with donate buttons"""
    
    def __init__(self):
        super().__init__(timeout=None)
        self.add_item(discord.ui.Button(
            label="💖 Support Developer",
            url="https://teer.id/muhammadzakizn",
            style=discord.ButtonStyle.link
        ))
        self.add_item(discord.ui.Button(
            label="⭐ Vote & Rate",
            url="https://top.gg/bot/1443855259536461928?s=09bfcce8f1e15",
            style=discord.ButtonStyle.link
        ))
        self.add_item(discord.ui.Button(
            label="🌐 Website",
            url="https://sonora.muhammadzakizn.com",
            style=discord.ButtonStyle.link
        ))


class DonateCommand(commands.Cog):
    """Donate command cog"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        logger.info("DonateCommand cog initialized")
    
    @app_commands.command(name="donate", description="Support the developer of SONORA")
    async def donate(self, interaction: discord.Interaction):
        """Show donate embed with support links"""
        
        embed = discord.Embed(
            title="💖 Support SONORA",
            description=(
                "**Terima kasih sudah menggunakan SONORA!** 🎵\n\n"
                "Bot ini dikembangkan dengan sepenuh hati untuk memberikan "
                "pengalaman musik terbaik di Discord.\n\n"
                "Jika kamu menikmati SONORA, pertimbangkan untuk:\n\n"
                "☕ **Mentraktir Developer Kopi**\n"
                "> Setiap donasi membantu server tetap berjalan\n\n"
                "⭐ **Vote di Top.gg**\n"
                "> Bantu bot ini naik peringkat\n\n"
                "📣 **Share ke Teman**\n"
                "> Ajak teman-temanmu menggunakan SONORA\n\n"
                "*Setiap dukungan berarti banyak bagi kami!* 💖"
            ),
            color=discord.Color.from_rgb(255, 105, 180)  # Hot pink
        )
        embed.set_thumbnail(url=self.bot.user.display_avatar.url if self.bot.user else None)
        embed.set_footer(text="Made with ❤️ by Muhammad Zaky • SONORA v3.4.0")
        
        await interaction.response.send_message(embed=embed, view=DonateView())


async def setup(bot: commands.Bot):
    """Setup function for loading the cog"""
    await bot.add_cog(DonateCommand(bot))
    logger.info("DonateCommand cog loaded")
