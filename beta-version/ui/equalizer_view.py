"""
Equalizer UI with presets and custom settings
"""

import discord
from typing import Optional
from services.audio.equalizer import get_equalizer_manager, EqualizerPresets, EqualizerSettings
from ui.embeds import EmbedBuilder
from config.logging_config import get_logger

logger = get_logger('ui.equalizer_view')


class EqualizerView(discord.ui.View):
    """Main equalizer control view"""
    
    def __init__(self, bot, guild_id: int, timeout: int = 180):
        super().__init__(timeout=timeout)
        self.bot = bot
        self.guild_id = guild_id
        self.eq_manager = get_equalizer_manager()
    
    @discord.ui.select(
        placeholder="🎛️ Select EQ Preset...",
        options=[
            discord.SelectOption(label="Flat (Default)", value="flat", description="No EQ adjustments", emoji="⚖️"),
            discord.SelectOption(label="Bass Boost", value="bass_boost", description="Enhanced low frequencies", emoji="🔊"),
            discord.SelectOption(label="Treble Boost", value="treble_boost", description="Enhanced high frequencies", emoji="✨"),
            discord.SelectOption(label="Vocal Boost", value="vocal_boost", description="Enhanced vocals/mid range", emoji="🎤"),
            discord.SelectOption(label="Rock", value="rock", description="Rock music optimized", emoji="🎸"),
            discord.SelectOption(label="Pop", value="pop", description="Pop music optimized", emoji="🎵"),
            discord.SelectOption(label="Classical", value="classical", description="Classical music optimized", emoji="🎻"),
            discord.SelectOption(label="Jazz", value="jazz", description="Jazz music optimized", emoji="🎷"),
            discord.SelectOption(label="Electronic", value="electronic", description="EDM/Electronic optimized", emoji="🎧"),
        ],
        row=0
    )
    async def preset_select(self, interaction: discord.Interaction, select: discord.ui.Select):
        """Handle preset selection"""
        preset_name = select.values[0]
        
        # Apply preset
        if self.eq_manager.set_preset(self.guild_id, preset_name):
            # Get preset details
            preset = EqualizerPresets.get_preset(preset_name)
            
            embed = EmbedBuilder.create_success(
                "Equalizer Updated",
                f"🎛️ Applied preset: **{preset_name.replace('_', ' ').title()}**\n\n"
                f"⚠️ Note: Restart playback for changes to take effect"
            )
            
            await interaction.response.edit_message(embed=embed, view=self)
            logger.info(f"Applied EQ preset '{preset_name}' in guild {self.guild_id}")
        else:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error("Error", "Failed to apply preset"),
                ephemeral=True
            )
    
    @discord.ui.button(label="Custom EQ", style=discord.ButtonStyle.primary, emoji="⚙️", row=1)
    async def custom_eq_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Open custom EQ editor"""
        view = CustomEqualizerView(self.bot, self.guild_id)
        embed = view.create_embed()
        await interaction.response.edit_message(embed=embed, view=view)
    
    @discord.ui.button(label="Save Current", style=discord.ButtonStyle.success, emoji="💾", row=1)
    async def save_preset_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Save current settings as custom preset"""
        # Show modal for preset name
        modal = SavePresetModal(self.bot, self.guild_id)
        await interaction.response.send_modal(modal)
    
    @discord.ui.button(label="My Presets", style=discord.ButtonStyle.secondary, emoji="📂", row=1)
    async def my_presets_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Show custom presets"""
        custom_presets = self.eq_manager.get_custom_presets(self.guild_id)
        
        if not custom_presets:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_warning(
                    "No Custom Presets",
                    "You haven't saved any custom presets yet.\n"
                    "Use **Custom EQ** to create one, then click **Save Current**."
                ),
                ephemeral=True
            )
            return
        
        view = CustomPresetsView(self.bot, self.guild_id, custom_presets)
        embed = view.create_embed()
        await interaction.response.edit_message(embed=embed, view=view)
    
    @discord.ui.button(label="🗑️ Close", style=discord.ButtonStyle.danger, row=2)
    async def close_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Close equalizer (delete message)"""
        await interaction.message.delete()
        await interaction.response.send_message("✅ Equalizer closed", ephemeral=True, delete_after=2)


class CustomEqualizerView(discord.ui.View):
    """Custom EQ editor with 10-band adjustment"""
    
    def __init__(self, bot, guild_id: int):
        super().__init__(timeout=300)
        self.bot = bot
        self.guild_id = guild_id
        self.eq_manager = get_equalizer_manager()
        self.current_settings = self.eq_manager.get_settings(guild_id)
        
        # Add band adjustment buttons
        self._add_band_selects()
    
    def _add_band_selects(self):
        """Add select menus for each frequency band"""
        bands = [
            ("32 Hz", "band_32hz", "Bass"),
            ("64 Hz", "band_64hz", "Bass"),
            ("125 Hz", "band_125hz", "Bass"),
            ("250 Hz", "band_250hz", "Low Mid"),
            ("500 Hz", "band_500hz", "Mid"),
        ]
        
        for i, (label, attr, desc) in enumerate(bands[:3]):  # Max 5 selects per view
            options = []
            for db in range(-12, 13, 2):  # -12 to +12 dB, step 2
                current_val = getattr(self.current_settings, attr)
                is_current = abs(current_val - db) < 0.1
                options.append(
                    discord.SelectOption(
                        label=f"{db:+d} dB",
                        value=f"{attr}:{db}",
                        description=f"{label} ({desc})",
                        default=is_current
                    )
                )
            
            select = discord.ui.Select(
                placeholder=f"{label} - {desc}",
                options=options[:25],  # Discord limit
                row=i
            )
            select.callback = self._band_select_callback
            self.add_item(select)
    
    async def _band_select_callback(self, interaction: discord.Interaction):
        """Handle band adjustment"""
        select = interaction.data.get('values', [])[0]
        attr, value = select.split(':')
        value = float(value)
        
        # Update settings
        setattr(self.current_settings, attr, value)
        self.eq_manager.set_settings(self.guild_id, self.current_settings)
        
        # Refresh view
        embed = self.create_embed()
        await interaction.response.edit_message(embed=embed, view=self)
    
    def create_embed(self) -> discord.Embed:
        """Create EQ display embed"""
        settings = self.current_settings
        
        # Visual EQ bars
        bands = [
            ("32 Hz", settings.band_32hz),
            ("64 Hz", settings.band_64hz),
            ("125 Hz", settings.band_125hz),
            ("250 Hz", settings.band_250hz),
            ("500 Hz", settings.band_500hz),
            ("1 kHz", settings.band_1khz),
            ("2 kHz", settings.band_2khz),
            ("4 kHz", settings.band_4khz),
            ("8 kHz", settings.band_8khz),
            ("16 kHz", settings.band_16khz),
        ]
        
        eq_display = "```\n"
        eq_display += "Frequency    dB      Level\n"
        eq_display += "─────────────────────────────\n"
        
        for freq, db in bands:
            # Create visual bar (12 is max, -12 is min)
            bar_length = int((db + 12) / 24 * 20)
            bar = "█" * bar_length + "░" * (20 - bar_length)
            eq_display += f"{freq:>8} {db:+5.1f}  {bar}\n"
        
        eq_display += "```"
        
        embed = discord.Embed(
            title="🎛️ Custom Equalizer",
            description=eq_display,
            color=discord.Color.blue()
        )
        
        embed.add_field(
            name="ℹ️ Instructions",
            value="Adjust each frequency band using the dropdowns below.\n"
                  "⚠️ Restart playback for changes to take effect.",
            inline=False
        )
        
        return embed
    
    @discord.ui.button(label="Reset to Flat", style=discord.ButtonStyle.danger, emoji="♻️", row=3)
    async def reset_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Reset to flat EQ"""
        self.current_settings = EqualizerPresets.FLAT
        self.eq_manager.set_settings(self.guild_id, self.current_settings)
        
        embed = self.create_embed()
        await interaction.response.edit_message(embed=embed, view=self)
    
    @discord.ui.button(label="◀️ Back", style=discord.ButtonStyle.secondary, row=4)
    async def back_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Go back to preset list"""
        view = EqualizerView(self.bot, self.guild_id)
        embed = discord.Embed(
            title="🎛️ Equalizer",
            description="Choose a preset or create your own custom EQ",
            color=discord.Color.blue()
        )
        await interaction.response.edit_message(embed=embed, view=view)


class SavePresetModal(discord.ui.Modal, title="Save Custom Preset"):
    """Modal for saving custom preset"""
    
    preset_name = discord.ui.TextInput(
        label="Preset Name",
        placeholder="e.g., My Bass Setup",
        max_length=30,
        required=True
    )
    
    def __init__(self, bot, guild_id: int):
        super().__init__()
        self.bot = bot
        self.guild_id = guild_id
        self.eq_manager = get_equalizer_manager()
    
    async def on_submit(self, interaction: discord.Interaction):
        name = self.preset_name.value.strip()
        
        if not name:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error("Error", "Preset name cannot be empty"),
                ephemeral=True
            )
            return
        
        # Save current settings
        current_settings = self.eq_manager.get_settings(self.guild_id)
        self.eq_manager.save_custom_preset(self.guild_id, name, current_settings)
        
        await interaction.response.send_message(
            embed=EmbedBuilder.create_success(
                "Preset Saved",
                f"✅ Saved preset: **{name}**\n"
                f"Access it from **My Presets** button"
            ),
            ephemeral=True
        )


class CustomPresetsView(discord.ui.View):
    """View for managing custom presets"""
    
    def __init__(self, bot, guild_id: int, presets: dict):
        super().__init__(timeout=180)
        self.bot = bot
        self.guild_id = guild_id
        self.presets = presets
        self.eq_manager = get_equalizer_manager()
        
        # Add preset select
        options = []
        for name in list(presets.keys())[:25]:  # Max 25 options
            options.append(
                discord.SelectOption(
                    label=name,
                    value=name,
                    emoji="🎵"
                )
            )
        
        if options:
            select = discord.ui.Select(
                placeholder="Select a custom preset...",
                options=options,
                row=0
            )
            select.callback = self.preset_callback
            self.add_item(select)
    
    async def preset_callback(self, interaction: discord.Interaction):
        """Apply custom preset"""
        preset_name = interaction.data.get('values', [])[0]
        
        if self.eq_manager.set_preset(self.guild_id, preset_name):
            await interaction.response.send_message(
                embed=EmbedBuilder.create_success(
                    "Preset Applied",
                    f"✅ Applied: **{preset_name}**\n"
                    f"⚠️ Restart playback for changes to take effect"
                ),
                ephemeral=True
            )
        else:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error("Error", "Failed to apply preset"),
                ephemeral=True
            )
    
    def create_embed(self) -> discord.Embed:
        """Create custom presets list embed"""
        preset_list = "\n".join([f"• **{name}**" for name in self.presets.keys()])
        
        embed = discord.Embed(
            title="📂 My Custom Presets",
            description=preset_list or "No custom presets saved",
            color=discord.Color.green()
        )
        
        embed.set_footer(text=f"Total: {len(self.presets)} presets")
        
        return embed
    
    @discord.ui.button(label="◀️ Back", style=discord.ButtonStyle.secondary, row=1)
    async def back_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Go back to main EQ view"""
        view = EqualizerView(self.bot, self.guild_id)
        embed = discord.Embed(
            title="🎛️ Equalizer",
            description="Choose a preset or create your own custom EQ",
            color=discord.Color.blue()
        )
        await interaction.response.edit_message(embed=embed, view=view)
