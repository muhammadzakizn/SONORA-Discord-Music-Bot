"""
Permission Fallback Utility

Handles permission errors with intelligent fallback:
1. Try original method (interaction.followup, message.edit, etc)
2. If fails, try channel.send
3. If still fails, notify server owner via DM
"""

import discord
from typing import Optional, Union
from config.logging_config import get_logger

logger = get_logger('utils.permission_fallback')


async def find_sendable_channel(guild: discord.Guild) -> Optional[discord.TextChannel]:
    """
    Find a text channel where bot can send messages.
    
    Checks permissions and returns first available channel.
    """
    for channel in guild.text_channels:
        if channel.permissions_for(guild.me).send_messages:
            return channel
    return None


async def notify_owner_permission_issue(guild: discord.Guild, error_message: str) -> bool:
    """
    Notify server owner about permission issues via DM.
    
    Returns True if DM was sent successfully.
    """
    try:
        owner = guild.owner
        if owner:
            embed = discord.Embed(
                title="⚠️ SONORA Permission Issue",
                description=(
                    f"I'm having trouble sending messages in **{guild.name}**.\n\n"
                    f"**Error:** {error_message}\n\n"
                    "**Possible fixes:**\n"
                    "• Check my permissions in the server settings\n"
                    "• Make sure I have 'Send Messages' permission\n"
                    "• Reinvite me with updated permissions"
                ),
                color=0xF39C12  # Orange/warning
            )
            embed.set_footer(text="SONORA Music Bot")
            
            await owner.send(embed=embed)
            logger.info(f"Notified owner {owner.name} about permission issue in {guild.name}")
            return True
    except discord.Forbidden:
        logger.warning(f"Cannot DM owner of {guild.name}")
    except Exception as e:
        logger.error(f"Failed to notify owner: {e}")
    return False


async def send_with_fallback(
    primary_target: Union[discord.Interaction, discord.Message, discord.TextChannel],
    content: Optional[str] = None,
    embed: Optional[discord.Embed] = None,
    guild: Optional[discord.Guild] = None
) -> bool:
    """
    Try to send message with fallback chain.
    
    Flow:
    1. Try primary target (interaction.followup/edit, message.edit, channel.send)
    2. If fails, find sendable channel and try there
    3. If still fails, notify server owner
    
    Returns True if message was sent successfully.
    """
    kwargs = {}
    if content is not None:
        kwargs['content'] = content
    if embed is not None:
        kwargs['embed'] = embed
    
    if not kwargs:
        return True  # Nothing to send
    
    # Try primary target first
    try:
        if isinstance(primary_target, discord.Interaction):
            if primary_target.response.is_done():
                await primary_target.followup.send(**kwargs)
            else:
                await primary_target.response.send_message(**kwargs)
            return True
            
        elif isinstance(primary_target, discord.Message):
            await primary_target.edit(**kwargs)
            return True
            
        elif isinstance(primary_target, discord.TextChannel):
            await primary_target.send(**kwargs)
            return True
            
    except discord.HTTPException as e:
        # Token expired (50027) or forbidden (403)
        if e.code in [50027, 10062, 40060]:  # Invalid webhook token, Unknown interaction, Interaction timeout
            logger.warning(f"Interaction token expired or invalid: {e.code}")
        elif e.status == 403:
            logger.warning(f"Forbidden: {e}")
        else:
            logger.error(f"HTTP error sending message: {e}")
    except Exception as e:
        logger.error(f"Error sending message: {e}")
    
    # Fallback: Find sendable channel
    if guild is None:
        if isinstance(primary_target, discord.Interaction) and primary_target.guild:
            guild = primary_target.guild
        elif isinstance(primary_target, discord.Message) and primary_target.guild:
            guild = primary_target.guild
        elif isinstance(primary_target, discord.TextChannel):
            guild = primary_target.guild
    
    if guild:
        fallback_channel = await find_sendable_channel(guild)
        if fallback_channel:
            try:
                await fallback_channel.send(**kwargs)
                logger.info(f"Sent via fallback channel: {fallback_channel.name}")
                return True
            except Exception as e:
                logger.warning(f"Fallback channel send failed: {e}")
        
        # Last resort: notify owner
        error_msg = "Unable to send messages in any channel"
        await notify_owner_permission_issue(guild, error_msg)
    
    return False


async def edit_with_fallback(
    message: discord.Message,
    content: Optional[str] = None,
    embed: Optional[discord.Embed] = None
) -> bool:
    """
    Edit message with permission check and fallback.
    
    If edit fails, try to send new message in same channel.
    """
    kwargs = {}
    if content is not None:
        kwargs['content'] = content
    if embed is not None:
        kwargs['embed'] = embed
    
    if not kwargs:
        return True
    
    try:
        await message.edit(**kwargs)
        return True
    except discord.HTTPException as e:
        if e.code == 50027:  # Invalid webhook token
            logger.warning("Interaction token expired, trying channel send")
        else:
            logger.warning(f"Edit failed: {e}")
    except Exception as e:
        logger.error(f"Edit error: {e}")
    
    # Fallback: send to channel
    try:
        channel = message.channel
        if isinstance(channel, discord.TextChannel):
            await channel.send(**kwargs)
            logger.info("Sent message via channel fallback")
            return True
    except Exception as e:
        logger.error(f"Channel send fallback failed: {e}")
    
    # Notify owner if in guild
    if message.guild:
        await notify_owner_permission_issue(
            message.guild,
            "Unable to edit or send messages in this channel"
        )
    
    return False


async def check_voice_permissions(
    channel: discord.VoiceChannel,
    guild: discord.Guild
) -> tuple[bool, Optional[str]]:
    """
    Check if bot has required voice permissions.
    
    Returns (has_permission, error_message)
    """
    perms = channel.permissions_for(guild.me)
    
    if not perms.connect:
        return False, "Missing 'Connect' permission for voice channel"
    
    if not perms.speak:
        return False, "Missing 'Speak' permission for voice channel"
    
    return True, None
