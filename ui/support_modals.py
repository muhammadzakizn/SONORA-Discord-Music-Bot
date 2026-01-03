"""
Support Modals (Discord Forms)

Discord UI modals for customer support forms.
"""

import discord
from discord import ui
from typing import Optional, Callable, Awaitable
import logging

from database.models_support import get_support_db, TicketType, TicketStatus

logger = logging.getLogger('discord_music_bot.support.modals')


class FeedbackModal(ui.Modal, title="Feedback & Saran"):
    """Modal for submitting feedback/suggestions"""
    
    subject = ui.TextInput(
        label="Judul Feedback",
        placeholder="Contoh: Saran fitur playlist",
        max_length=100,
        required=True
    )
    
    category = ui.TextInput(
        label="Kategori",
        placeholder="Fitur Baru / Perbaikan UI / Saran Umum",
        max_length=50,
        required=False
    )
    
    description = ui.TextInput(
        label="Detail Feedback",
        style=discord.TextStyle.paragraph,
        placeholder="Jelaskan saran atau feedback kamu secara detail...",
        max_length=1000,
        required=True
    )
    
    def __init__(self, on_submit: Optional[Callable[[discord.Interaction, 'FeedbackModal'], Awaitable[None]]] = None):
        super().__init__()
        self._on_submit = on_submit
    
    async def on_submit(self, interaction: discord.Interaction):
        try:
            db = get_support_db()
            
            # Create ticket
            ticket = db.create_ticket(
                user_id=str(interaction.user.id),
                user_name=interaction.user.display_name,
                ticket_type=TicketType.FEEDBACK.value,
                subject=self.subject.value,
                description=f"Kategori: {self.category.value or 'Umum'}\n\n{self.description.value}",
                priority="normal"
            )
            
            await interaction.response.send_message(
                embed=discord.Embed(
                    title="Feedback Terkirim",
                    description=(
                        f"Terima kasih atas feedback kamu!\n\n"
                        f"**Nomor Tiket:** `{ticket.id}`\n\n"
                        "Feedback kamu akan kami tinjau. Kamu bisa melacak status di dashboard."
                    ),
                    color=0x7B1E3C
                ),
                ephemeral=True
            )
            
            logger.info(f"Feedback submitted: {ticket.id} from {interaction.user.display_name}")
            
            if self._on_submit:
                await self._on_submit(interaction, self)
                
        except Exception as e:
            logger.error(f"Error submitting feedback: {e}")
            await interaction.response.send_message(
                "Terjadi kesalahan saat mengirim feedback. Coba lagi.",
                ephemeral=True
            )


class IssueReportModal(ui.Modal, title="Laporan Masalah"):
    """Modal for reporting issues/bugs"""
    
    subject = ui.TextInput(
        label="Ringkasan Masalah",
        placeholder="Contoh: Bot tidak bisa memutar lagu",
        max_length=100,
        required=True
    )
    
    steps = ui.TextInput(
        label="Langkah untuk Mengulang",
        style=discord.TextStyle.paragraph,
        placeholder="1. Ketik /play\n2. Pilih lagu\n3. Error muncul",
        max_length=500,
        required=True
    )
    
    expected = ui.TextInput(
        label="Yang Diharapkan",
        placeholder="Bot seharusnya memutar lagu",
        max_length=200,
        required=False
    )
    
    actual = ui.TextInput(
        label="Yang Terjadi",
        style=discord.TextStyle.paragraph,
        placeholder="Bot menampilkan error / tidak merespons",
        max_length=500,
        required=True
    )
    
    def __init__(self, on_submit: Optional[Callable[[discord.Interaction, 'IssueReportModal'], Awaitable[None]]] = None):
        super().__init__()
        self._on_submit = on_submit
    
    async def on_submit(self, interaction: discord.Interaction):
        try:
            db = get_support_db()
            
            description = (
                f"**Langkah:**\n{self.steps.value}\n\n"
                f"**Diharapkan:** {self.expected.value or 'Tidak diisi'}\n\n"
                f"**Yang Terjadi:**\n{self.actual.value}"
            )
            
            ticket = db.create_ticket(
                user_id=str(interaction.user.id),
                user_name=interaction.user.display_name,
                ticket_type=TicketType.ISSUE.value,
                subject=self.subject.value,
                description=description,
                priority="high"  # Issues are high priority
            )
            
            await interaction.response.send_message(
                embed=discord.Embed(
                    title="Laporan Masalah Terkirim",
                    description=(
                        f"Laporan masalah kamu sudah diterima.\n\n"
                        f"**Nomor Tiket:** `{ticket.id}`\n\n"
                        "Developer akan segera meninjau masalah ini. "
                        "Kamu akan mendapat notifikasi saat ada update."
                    ),
                    color=0xE74C3C
                ),
                ephemeral=True
            )
            
            logger.info(f"Issue reported: {ticket.id} from {interaction.user.display_name}")
            
            if self._on_submit:
                await self._on_submit(interaction, self)
                
        except Exception as e:
            logger.error(f"Error submitting issue: {e}")
            await interaction.response.send_message(
                "Terjadi kesalahan saat mengirim laporan. Coba lagi.",
                ephemeral=True
            )


class LiveSupportModal(ui.Modal, title="Live Support"):
    """Modal for requesting live support from developer"""
    
    subject = ui.TextInput(
        label="Subjek",
        placeholder="Contoh: Butuh bantuan setup bot",
        max_length=100,
        required=True
    )
    
    urgency = ui.TextInput(
        label="Tingkat Urgensi",
        placeholder="Rendah / Normal / Tinggi / Mendesak",
        max_length=20,
        required=False
    )
    
    description = ui.TextInput(
        label="Jelaskan Kebutuhan Kamu",
        style=discord.TextStyle.paragraph,
        placeholder="Ceritakan apa yang kamu butuhkan bantuan...",
        max_length=1000,
        required=True
    )
    
    availability = ui.TextInput(
        label="Ketersediaan Waktu",
        placeholder="Contoh: Senin-Jumat 09:00-17:00 WIB",
        max_length=100,
        required=False
    )
    
    def __init__(self, on_submit: Optional[Callable[[discord.Interaction, 'LiveSupportModal'], Awaitable[None]]] = None):
        super().__init__()
        self._on_submit = on_submit
    
    async def on_submit(self, interaction: discord.Interaction):
        try:
            db = get_support_db()
            
            # Map urgency to priority
            urgency_map = {
                'rendah': 'low',
                'low': 'low',
                'normal': 'normal',
                'tinggi': 'high',
                'high': 'high',
                'mendesak': 'urgent',
                'urgent': 'urgent'
            }
            priority = urgency_map.get(
                (self.urgency.value or 'normal').lower().strip(),
                'normal'
            )
            
            description = (
                f"**Kebutuhan:**\n{self.description.value}\n\n"
                f"**Urgensi:** {self.urgency.value or 'Normal'}\n"
                f"**Ketersediaan:** {self.availability.value or 'Tidak disebutkan'}"
            )
            
            ticket = db.create_ticket(
                user_id=str(interaction.user.id),
                user_name=interaction.user.display_name,
                ticket_type=TicketType.LIVE.value,
                subject=self.subject.value,
                description=description,
                priority=priority
            )
            
            await interaction.response.send_message(
                embed=discord.Embed(
                    title="Permintaan Live Support",
                    description=(
                        f"Permintaan support kamu sudah masuk antrian.\n\n"
                        f"**Nomor Tiket:** `{ticket.id}`\n"
                        f"**Prioritas:** {priority.title()}\n\n"
                        "Developer akan menghubungi kamu melalui DM ini. "
                        "Harap tetap pantau pesan masuk."
                    ),
                    color=0x3498DB
                ),
                ephemeral=True
            )
            
            logger.info(f"Live support requested: {ticket.id} from {interaction.user.display_name}")
            
            if self._on_submit:
                await self._on_submit(interaction, self)
                
        except Exception as e:
            logger.error(f"Error submitting live support request: {e}")
            await interaction.response.send_message(
                "Terjadi kesalahan saat mengirim permintaan. Coba lagi.",
                ephemeral=True
            )


class SupportActionView(ui.View):
    """View with buttons for support actions"""
    
    def __init__(
        self, 
        show_feedback: bool = True,
        show_issue: bool = True,
        show_live: bool = True,
        on_ticket_created: Optional[Callable[[str], Awaitable[None]]] = None
    ):
        super().__init__(timeout=300)  # 5 minutes
        self._on_ticket_created = on_ticket_created
        
        if show_feedback:
            self.add_item(self.FeedbackButton(self._handle_callback))
        if show_issue:
            self.add_item(self.IssueButton(self._handle_callback))
        if show_live:
            self.add_item(self.LiveButton(self._handle_callback))
    
    async def _handle_callback(self, interaction: discord.Interaction, modal):
        """Called after modal submission"""
        if self._on_ticket_created:
            # Get the ticket ID from DB (most recent for this user)
            db = get_support_db()
            tickets = db.get_user_tickets(str(interaction.user.id))
            if tickets:
                await self._on_ticket_created(tickets[0].id)
    
    class FeedbackButton(ui.Button):
        def __init__(self, callback):
            super().__init__(
                label="Beri Feedback",
                style=discord.ButtonStyle.secondary,
                emoji="💡"
            )
            self._callback = callback
        
        async def callback(self, interaction: discord.Interaction):
            await interaction.response.send_modal(
                FeedbackModal(on_submit=self._callback)
            )
    
    class IssueButton(ui.Button):
        def __init__(self, callback):
            super().__init__(
                label="Laporkan Masalah",
                style=discord.ButtonStyle.danger,
                emoji="🐛"
            )
            self._callback = callback
        
        async def callback(self, interaction: discord.Interaction):
            await interaction.response.send_modal(
                IssueReportModal(on_submit=self._callback)
            )
    
    class LiveButton(ui.Button):
        def __init__(self, callback):
            super().__init__(
                label="Hubungi Developer",
                style=discord.ButtonStyle.primary,
                emoji="💬"
            )
            self._callback = callback
        
        async def callback(self, interaction: discord.Interaction):
            await interaction.response.send_modal(
                LiveSupportModal(on_submit=self._callback)
            )
