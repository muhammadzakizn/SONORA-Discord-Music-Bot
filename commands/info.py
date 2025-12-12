"""Website and Help slash commands"""

import discord
from discord import app_commands
from discord.ext import commands

from config.logging_config import get_logger

logger = get_logger('commands.info')


class WebsiteView(discord.ui.View):
    """View with website button"""
    
    def __init__(self):
        super().__init__(timeout=None)
        self.add_item(discord.ui.Button(
            label="🌐 Kunjungi Website",
            url="https://s.id/SONORAbot",
            style=discord.ButtonStyle.link
        ))
        self.add_item(discord.ui.Button(
            label="📊 Dashboard",
            url="https://s.id/SONORAbotHOME",
            style=discord.ButtonStyle.link
        ))


class HelpView(discord.ui.View):
    """View with help-related buttons"""
    
    def __init__(self):
        super().__init__(timeout=None)
        self.add_item(discord.ui.Button(
            label="📖 Dokumentasi",
            url="https://s.id/SONORAbotDOCS",
            style=discord.ButtonStyle.link
        ))
        self.add_item(discord.ui.Button(
            label="💬 Support Server",
            url="https://s.id/SONORAbotSUPPORT",
            style=discord.ButtonStyle.link
        ))
        self.add_item(discord.ui.Button(
            label="🌐 Website",
            url="https://s.id/SONORAbot",
            style=discord.ButtonStyle.link
        ))


class InfoCommands(commands.Cog):
    """Info commands cog"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        logger.info("InfoCommands cog initialized")
    
    @app_commands.command(name="website", description="Lihat fitur-fitur website SONORA")
    async def website(self, interaction: discord.Interaction):
        """Show website features"""
        
        embed = discord.Embed(
            title="🌐 SONORA Website",
            description=(
                "**Website resmi SONORA** menyediakan berbagai fitur untuk "
                "meningkatkan pengalaman musikmu!\n"
            ),
            color=discord.Color.from_rgb(123, 30, 60)  # Maroon
        )
        
        embed.add_field(
            name="📊 Dashboard Admin",
            value=(
                "• Monitor semua server sekaligus\n"
                "• Kontrol playback dari browser\n"
                "• Lihat queue dan history\n"
                "• Real-time updates"
            ),
            inline=True
        )
        
        embed.add_field(
            name="🎵 Features",
            value=(
                "• Album artwork berkualitas HD\n"
                "• Synced lyrics display\n"
                "• Multi-source streaming\n"
                "• Premium audio quality"
            ),
            inline=True
        )
        
        embed.add_field(
            name="⚙️ Settings",
            value=(
                "• Dark/Light mode\n"
                "• Multi-language support\n"
                "• Responsive design\n"
                "• PWA support"
            ),
            inline=True
        )
        
        embed.set_footer(text="SONORA • Premium Discord Music Bot")
        
        await interaction.response.send_message(embed=embed, view=WebsiteView())
    
    @app_commands.command(name="help", description="Panduan lengkap menggunakan bot SONORA")
    async def help(self, interaction: discord.Interaction):
        """Show help guide"""
        
        embed = discord.Embed(
            title="📖 Panduan SONORA",
            description=(
                "**SONORA** adalah bot musik premium yang mendukung "
                "Spotify, Apple Music, dan YouTube Music dengan kualitas audio terbaik.\n"
            ),
            color=discord.Color.blue()
        )
        
        embed.add_field(
            name="🎵 Memutar Musik",
            value=(
                "`/play <query>` - Putar lagu/playlist\n"
                "`/play <URL>` - Putar dari link\n"
                "Mendukung: Spotify, Apple Music, YouTube"
            ),
            inline=False
        )
        
        embed.add_field(
            name="⏯️ Kontrol Playback",
            value=(
                "`/pause` - Pause playback\n"
                "`/resume` - Resume playback\n"
                "`/skip` - Skip ke lagu berikutnya\n"
                "`/stop` - Stop dan disconnect"
            ),
            inline=True
        )
        
        embed.add_field(
            name="📋 Queue Management",
            value=(
                "`/queue` - Lihat antrian\n"
                "`/shuffle` - Acak antrian\n"
                "`/clear` - Hapus antrian\n"
                "`/loop` - Toggle loop mode"
            ),
            inline=True
        )
        
        embed.add_field(
            name="🔊 Audio Settings",
            value=(
                "`/volume <0-200>` - Atur volume\n"
                "`/equalizer` - Buka EQ presets\n"
                "`/lyrics` - Kontrol lirik"
            ),
            inline=True
        )
        
        embed.add_field(
            name="ℹ️ Info Commands",
            value=(
                "`/website` - Lihat fitur web\n"
                "`/donate` - Dukung developer\n"
                "`/stats` - Statistik bot"
            ),
            inline=True
        )
        
        embed.add_field(
            name="🎛️ Menu Kontrol",
            value=(
                "Gunakan dropdown **Menu Kontrol** di bawah player "
                "untuk akses cepat ke semua fitur!"
            ),
            inline=False
        )
        
        embed.set_footer(text="Gunakan /donate untuk mendukung pengembangan SONORA! 💖")
        
        await interaction.response.send_message(embed=embed, view=HelpView())


async def setup(bot: commands.Bot):
    """Setup function for loading the cog"""
    await bot.add_cog(InfoCommands(bot))
    logger.info("InfoCommands cog loaded")
