"""
Interactive Queue View with Pagination
"""

import discord
from typing import List, Optional
from config.logging_config import get_logger

logger = get_logger('ui.queue_view')


class InteractiveQueueView(discord.ui.View):
    """
    Interactive queue view with pagination and per-voice-channel filtering
    
    Features:
    - Filter queue by user's voice channel
    - 5 tracks per page
    - Jump to track
    - Remove track
    - Next/Previous page navigation
    """
    
    def __init__(self, bot, guild_id: int, user_voice_channel_id: int, timeout: float = 180):
        """
        Initialize queue view
        
        Args:
            bot: Bot instance
            guild_id: Guild ID
            user_voice_channel_id: User's voice channel ID (for filtering)
            timeout: View timeout in seconds
        """
        super().__init__(timeout=timeout)
        self.bot = bot
        self.guild_id = guild_id
        self.user_voice_channel_id = user_voice_channel_id
        self.current_page = 0
        self.items_per_page = 5
        
        # Get queue items filtered by user's voice channel
        self.queue_items = self._get_filtered_queue()
        
        # Update button states
        self._update_buttons()
    
    def _get_filtered_queue(self) -> List:
        """
        Get queue items filtered by user's voice channel
        
        Returns:
            List of queue items in user's voice channel
        """
        queue_cog = self.bot.get_cog('QueueCommands')
        if not queue_cog or self.guild_id not in queue_cog.queues:
            return []
        
        all_items = queue_cog.queues[self.guild_id]
        
        # Filter by voice channel
        filtered = []
        for item in all_items:
            voice_ch_id = getattr(item, 'voice_channel_id', None)
            if voice_ch_id == self.user_voice_channel_id:
                filtered.append(item)
        
        return filtered
    
    def _get_total_pages(self) -> int:
        """Get total number of pages"""
        if not self.queue_items:
            return 0
        return (len(self.queue_items) - 1) // self.items_per_page + 1
    
    def _get_page_items(self) -> List:
        """Get items for current page"""
        start = self.current_page * self.items_per_page
        end = start + self.items_per_page
        return self.queue_items[start:end]
    
    def _update_buttons(self):
        """Update button states based on current page"""
        total_pages = self._get_total_pages()
        
        # Previous button
        self.previous_button.disabled = (self.current_page == 0)
        
        # Next button
        self.next_button.disabled = (self.current_page >= total_pages - 1)
        
        # Track selection - only enable if there are items
        self.track_select.disabled = (len(self.queue_items) == 0)
        
        # Update select menu options
        if self.queue_items:
            page_items = self._get_page_items()
            options = []
            
            for i, item in enumerate(page_items):
                global_index = self.current_page * self.items_per_page + i
                title = getattr(item, 'title', 'Unknown')
                artist = getattr(item, 'artist', 'Unknown')
                
                # Truncate for display
                label = f"{global_index + 1}. {title[:30]}"
                description = f"{artist[:40]}"
                
                options.append(discord.SelectOption(
                    label=label,
                    description=description,
                    value=str(global_index)
                ))
            
            self.track_select.options = options
    
    def create_embed(self) -> discord.Embed:
        """
        Create queue embed for current page
        
        Returns:
            Discord embed
        """
        # Get voice channel name
        guild = self.bot.get_guild(self.guild_id)
        voice_channel_name = "Unknown"
        if guild:
            channel = guild.get_channel(self.user_voice_channel_id)
            if channel:
                voice_channel_name = channel.name
        
        if not self.queue_items:
            embed = discord.Embed(
                title="📋 Queue Empty",
                description=f"No tracks queued in **{voice_channel_name}**",
                color=discord.Color.blue()
            )
            return embed
        
        # Build queue display
        page_items = self._get_page_items()
        total_pages = self._get_total_pages()
        
        embed = discord.Embed(
            title=f"📋 Queue - {voice_channel_name}",
            description=f"Page {self.current_page + 1}/{total_pages} • Total: {len(self.queue_items)} tracks",
            color=discord.Color.blue()
        )
        
        # Add tracks
        for i, item in enumerate(page_items):
            global_index = self.current_page * self.items_per_page + i
            title = getattr(item, 'title', 'Unknown')
            artist = getattr(item, 'artist', 'Unknown')
            duration = getattr(item, 'duration', 0)
            
            # Format duration
            minutes = int(duration // 60)
            seconds = int(duration % 60)
            duration_str = f"{minutes}:{seconds:02d}"
            
            embed.add_field(
                name=f"{global_index + 1}. {title}",
                value=f"👤 {artist} • ⏱️ {duration_str}",
                inline=False
            )
        
        embed.set_footer(text="Select a track to jump or remove • Use arrows to navigate")
        
        return embed
    
    @discord.ui.button(label="◀️ Previous", style=discord.ButtonStyle.secondary, row=0)
    async def previous_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Previous page"""
        if self.current_page > 0:
            self.current_page -= 1
            self._update_buttons()
            await interaction.response.edit_message(embed=self.create_embed(), view=self)
        else:
            await interaction.response.defer()
    
    @discord.ui.button(label="▶️ Next", style=discord.ButtonStyle.secondary, row=0)
    async def next_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Next page"""
        if self.current_page < self._get_total_pages() - 1:
            self.current_page += 1
            self._update_buttons()
            await interaction.response.edit_message(embed=self.create_embed(), view=self)
        else:
            await interaction.response.defer()
    
    @discord.ui.button(label="🔀 Shuffle", style=discord.ButtonStyle.primary, row=0)
    async def shuffle_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Shuffle queue (own VC only)"""
        queue_cog = self.bot.get_cog('QueueCommands')
        if not queue_cog:
            await interaction.response.send_message("❌ Queue system not available", ephemeral=True)
            return
        
        all_queue = queue_cog.queues.get(self.guild_id, [])
        
        # Extract tracks from user's voice channel
        user_tracks = []
        user_indices = []
        
        for i, item in enumerate(all_queue):
            voice_ch_id = getattr(item, 'voice_channel_id', None)
            if voice_ch_id == self.user_voice_channel_id:
                user_tracks.append(item)
                user_indices.append(i)
        
        if len(user_tracks) < 2:
            await interaction.response.send_message(
                "❌ Need at least 2 tracks to shuffle",
                ephemeral=True
            )
            return
        
        # Shuffle user's tracks
        import random
        random.shuffle(user_tracks)
        
        # Put shuffled tracks back
        for i, idx in enumerate(user_indices):
            all_queue[idx] = user_tracks[i]
        
        # Refresh view
        self.queue_items = self._get_filtered_queue()
        self.current_page = 0  # Reset to first page
        self._update_buttons()
        
        embed = self.create_embed()
        embed.description = f"🔀 Shuffled! • Page {self.current_page + 1}/{self._get_total_pages()} • Total: {len(self.queue_items)} tracks"
        
        await interaction.response.edit_message(embed=embed, view=self)
    
    @discord.ui.select(
        placeholder="Select a track...",
        options=[discord.SelectOption(label="Loading...", value="0")],
        row=1
    )
    async def track_select(self, interaction: discord.Interaction, select: discord.ui.Select):
        """Track selected"""
        selected_index = int(select.values[0])
        
        # Show action buttons for selected track
        view = TrackActionView(
            bot=self.bot,
            guild_id=self.guild_id,
            user_voice_channel_id=self.user_voice_channel_id,
            track_index=selected_index,
            parent_view=self
        )
        
        selected_item = self.queue_items[selected_index]
        title = getattr(selected_item, 'title', 'Unknown')
        artist = getattr(selected_item, 'artist', 'Unknown')
        
        embed = discord.Embed(
            title="🎵 Track Actions",
            description=f"**{title}**\n*{artist}*\n\nPosition: #{selected_index + 1}",
            color=discord.Color.green()
        )
        
        await interaction.response.edit_message(embed=embed, view=view)


class TrackActionView(discord.ui.View):
    """View for track-specific actions"""
    
    def __init__(self, bot, guild_id: int, user_voice_channel_id: int, track_index: int, parent_view):
        super().__init__(timeout=60)
        self.bot = bot
        self.guild_id = guild_id
        self.user_voice_channel_id = user_voice_channel_id
        self.track_index = track_index
        self.parent_view = parent_view
        
        # Add move position select menu dynamically
        self._add_move_select()
    
    @discord.ui.button(label="⏭️ Jump to This", style=discord.ButtonStyle.primary)
    async def jump_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Jump to selected track"""
        queue_cog = self.bot.get_cog('QueueCommands')
        if not queue_cog:
            await interaction.response.send_message("❌ Queue system not available", ephemeral=True)
            return
        
        all_queue = queue_cog.queues.get(self.guild_id, [])
        
        # Find actual index in full queue
        filtered_count = 0
        actual_index = -1
        for i, item in enumerate(all_queue):
            voice_ch_id = getattr(item, 'voice_channel_id', None)
            if voice_ch_id == self.user_voice_channel_id:
                if filtered_count == self.track_index:
                    actual_index = i
                    break
                filtered_count += 1
        
        if actual_index == -1:
            await interaction.response.send_message("❌ Track not found", ephemeral=True)
            return
        
        # Remove all tracks before this one (in same voice channel only)
        removed_count = 0
        to_remove = []
        for i in range(actual_index):
            item = all_queue[i]
            voice_ch_id = getattr(item, 'voice_channel_id', None)
            if voice_ch_id == self.user_voice_channel_id:
                to_remove.append(i)
        
        # Remove in reverse order to maintain indices
        for i in reversed(to_remove):
            all_queue.pop(i)
            removed_count += 1
        
        # Skip current playing track to trigger auto-play
        control_cog = self.bot.get_cog('ControlCommands')
        if control_cog:
            connection = self.bot.voice_manager.connections.get(self.guild_id)
            if connection and connection.is_playing():
                connection.connection.stop()
        
        embed = discord.Embed(
            title="⏭️ Jumped to Track",
            description=f"Skipped {removed_count} tracks\nNow playing next: **{self.parent_view.queue_items[self.track_index].title}**",
            color=discord.Color.green()
        )
        
        await interaction.response.edit_message(embed=embed, view=None)
    
    @discord.ui.button(label="🗑️ Remove", style=discord.ButtonStyle.danger)
    async def remove_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Remove selected track"""
        queue_cog = self.bot.get_cog('QueueCommands')
        if not queue_cog:
            await interaction.response.send_message("❌ Queue system not available", ephemeral=True)
            return
        
        all_queue = queue_cog.queues.get(self.guild_id, [])
        
        # Find actual index
        filtered_count = 0
        actual_index = -1
        for i, item in enumerate(all_queue):
            voice_ch_id = getattr(item, 'voice_channel_id', None)
            if voice_ch_id == self.user_voice_channel_id:
                if filtered_count == self.track_index:
                    actual_index = i
                    break
                filtered_count += 1
        
        if actual_index == -1:
            await interaction.response.send_message("❌ Track not found", ephemeral=True)
            return
        
        removed_item = all_queue.pop(actual_index)
        
        embed = discord.Embed(
            title="🗑️ Track Removed",
            description=f"Removed: **{removed_item.title}**\n*{removed_item.artist}*",
            color=discord.Color.red()
        )
        
        await interaction.response.edit_message(embed=embed, view=None)
    
    @discord.ui.button(label="◀️ Back", style=discord.ButtonStyle.secondary)
    async def back_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Back to queue view"""
        # Refresh parent view
        self.parent_view.queue_items = self.parent_view._get_filtered_queue()
        self.parent_view._update_buttons()
        
        await interaction.response.edit_message(
            embed=self.parent_view.create_embed(),
            view=self.parent_view
        )
    
    def _add_move_select(self):
        """Add move position select menu"""
        # Get total tracks in user's queue
        queue_items = self.parent_view.queue_items
        
        if len(queue_items) < 2:
            # Not enough tracks to move
            return
        
        # Create options for positions (up to 25 options limit)
        options = []
        max_positions = min(len(queue_items), 25)
        
        for i in range(max_positions):
            pos = i + 1
            is_current = (i == self.track_index)
            
            label = f"Position #{pos}"
            if is_current:
                label += " (current)"
            
            description = f"Move to position {pos}"
            if i < len(queue_items):
                # Show what track is currently at this position
                track = queue_items[i]
                track_title = getattr(track, 'title', 'Unknown')[:30]
                description = f"Before: {track_title}" if not is_current else "Current position"
            
            options.append(discord.SelectOption(
                label=label,
                description=description[:100],  # Discord limit
                value=str(pos),
                default=is_current
            ))
        
        # Create select menu
        select = discord.ui.Select(
            placeholder="🔄 Move to position...",
            options=options,
            row=2
        )
        select.callback = self._move_select_callback
        self.add_item(select)
    
    async def _move_select_callback(self, interaction: discord.Interaction):
        """Handle move position selection"""
        select = interaction.data.get('values', [])[0]
        to_position = int(select)
        from_position = self.track_index + 1  # Convert to 1-indexed
        
        if from_position == to_position:
            await interaction.response.send_message(
                "❌ Track is already at that position",
                ephemeral=True
            )
            return
        
        queue_cog = self.bot.get_cog('QueueCommands')
        if not queue_cog:
            await interaction.response.send_message("❌ Queue system not available", ephemeral=True)
            return
        
        all_queue = queue_cog.queues.get(self.guild_id, [])
        
        # Get user's tracks with their actual indices
        user_tracks = []
        user_indices = []
        
        for i, item in enumerate(all_queue):
            voice_ch_id = getattr(item, 'voice_channel_id', None)
            if voice_ch_id == self.user_voice_channel_id:
                user_tracks.append(item)
                user_indices.append(i)
        
        # Convert to 0-indexed
        from_idx = from_position - 1
        to_idx = to_position - 1
        
        # Get the track to move
        track_to_move = user_tracks[from_idx]
        
        # Remove from old position
        user_tracks.pop(from_idx)
        
        # Insert at new position
        user_tracks.insert(to_idx, track_to_move)
        
        # Put back in all_queue
        for i, idx in enumerate(user_indices):
            all_queue[idx] = user_tracks[i]
        
        # Create success embed
        embed = discord.Embed(
            title="✅ Track Moved",
            description=f"**{track_to_move.title}**\n*{track_to_move.artist}*\n\n"
                       f"From position **#{from_position}** → **#{to_position}**",
            color=discord.Color.green()
        )
        
        await interaction.response.edit_message(embed=embed, view=None)
