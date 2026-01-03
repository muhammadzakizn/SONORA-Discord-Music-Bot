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
            url="https://sonora.muhammadzakizn.com",
            style=discord.ButtonStyle.link
        ))
        self.add_item(discord.ui.Button(
            label="📊 Dashboard",
            url="https://sonora.muhammadzakizn.com",
            style=discord.ButtonStyle.link
        ))


class AskAIModal(discord.ui.Modal, title="Tanya AI Support"):
    """Modal for asking AI questions"""
    
    question = discord.ui.TextInput(
        label="Pertanyaan kamu",
        style=discord.TextStyle.paragraph,
        placeholder="Contoh: Bagaimana cara menggunakan /play?",
        max_length=500,
        required=True
    )
    
    async def on_submit(self, interaction: discord.Interaction):
        from services.support.support_ai import get_support_ai
        ai = get_support_ai()
        
        await interaction.response.defer(thinking=True)
        
        try:
            response, intent = await ai.generate_response(
                self.question.value,
                interaction.user.display_name
            )
            
            embed = discord.Embed(
                title="💬 Jawaban AI",
                description=response,
                color=0x7B1E3C
            )
            embed.set_footer(text="Butuh bantuan lebih? DM bot ini langsung!")
            
            await interaction.followup.send(embed=embed)
        except Exception as e:
            await interaction.followup.send(
                "Maaf, AI sedang tidak tersedia. Coba DM bot ini langsung untuk bantuan."
            )


class HelpView(discord.ui.View):
    """View with help-related buttons including Ask AI"""
    
    def __init__(self):
        super().__init__(timeout=None)
        self.add_item(discord.ui.Button(
            label="📖 Dokumentasi",
            url="https://sonora.muhammadzakizn.com/docs",
            style=discord.ButtonStyle.link
        ))
        self.add_item(discord.ui.Button(
            label="💬 Support Server",
            url="https://sonora.muhammadzakizn.com/support",
            style=discord.ButtonStyle.link
        ))
        self.add_item(discord.ui.Button(
            label="🌐 Website",
            url="https://sonora.muhammadzakizn.com",
            style=discord.ButtonStyle.link
        ))
    
    @discord.ui.button(label="🤖 Tanya AI", style=discord.ButtonStyle.primary, row=1)
    async def ask_ai_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Open AI question modal"""
        await interaction.response.send_modal(AskAIModal())


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
    @app_commands.describe(command="Nama command spesifik untuk dijelaskan oleh AI (opsional)")
    async def help(self, interaction: discord.Interaction, command: str = None):
        """Show help guide or AI explanation for specific command"""
        
        # If specific command requested, use AI to explain
        if command:
            from services.support.support_ai import get_support_ai
            ai = get_support_ai()
            
            await interaction.response.defer(thinking=True)
            
            try:
                # Ask AI to explain the specific command
                question = f"Jelaskan cara menggunakan command /{command} di bot SONORA secara detail. Berikan contoh penggunaan."
                response, intent = await ai.generate_response(
                    question,
                    interaction.user.display_name
                )
                
                embed = discord.Embed(
                    title=f"📖 Bantuan: /{command}",
                    description=response,
                    color=0x7B1E3C
                )
                embed.set_footer(text="Klik 'Tanya AI' untuk pertanyaan lainnya!")
                
                await interaction.followup.send(embed=embed, view=HelpView())
            except Exception as e:
                logger.error(f"Error getting AI help for command: {e}")
                await interaction.followup.send(
                    f"Maaf, tidak bisa mendapatkan info untuk `/{command}`. Coba `/help` tanpa parameter.",
                    ephemeral=True
                )
            return
        
        # Show general help guide
        embed = discord.Embed(
            title="📖 Panduan SONORA",
            description=(
                "**SONORA** adalah bot musik premium yang mendukung "
                "Spotify, Apple Music, dan YouTube Music dengan kualitas audio terbaik.\n\n"
                "💡 **Tip:** Gunakan `/help [command]` untuk penjelasan detail dari AI!\n"
                "Contoh: `/help play` atau `/help queue`"
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
                "`/stats` - Statistik bot\n"
                "`/support` - Minta bantuan"
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
        
        embed.set_footer(text="Klik 🤖 Tanya AI untuk bertanya langsung! | /donate untuk support 💖")
        
        await interaction.response.send_message(embed=embed, view=HelpView())


async def setup(bot: commands.Bot):
    """Setup function for loading the cog"""
    await bot.add_cog(InfoCommands(bot))
    logger.info("InfoCommands cog loaded")
