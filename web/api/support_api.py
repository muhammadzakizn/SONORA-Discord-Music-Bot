"""
Support API Endpoints

Flask routes for customer support system.
Handles tickets, messages, and notifications for developer dashboard.
"""

import logging
from flask import Blueprint, jsonify, request
from typing import Optional
import sys
import os

# Add parent path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from database.models_support import get_support_db, TicketStatus, TicketType

logger = logging.getLogger('discord_music_bot.api.support')

# Create blueprint
support_bp = Blueprint('support', __name__, url_prefix='/api/support')


@support_bp.route('/tickets', methods=['GET'])
def get_tickets():
    """
    Get all support tickets with optional filters.
    
    Query params:
        - status: Filter by status (pending, in_progress, etc)
        - type: Filter by type (feedback, issue, live)
        - user_id: Filter by user ID
        - limit: Max number of tickets (default 100)
    """
    try:
        db = get_support_db()
        
        status = request.args.get('status')
        ticket_type = request.args.get('type')
        user_id = request.args.get('user_id')
        limit = int(request.args.get('limit', 100))
        
        if user_id:
            tickets = db.get_user_tickets(user_id)
        else:
            tickets = db.get_all_tickets(
                status=status,
                ticket_type=ticket_type,
                limit=limit
            )
        
        return jsonify({
            'success': True,
            'tickets': [t.to_dict() for t in tickets],
            'count': len(tickets)
        })
        
    except Exception as e:
        logger.error(f"Error getting tickets: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@support_bp.route('/tickets/<ticket_id>', methods=['GET'])
def get_ticket(ticket_id: str):
    """Get a specific ticket by ID"""
    try:
        db = get_support_db()
        ticket = db.get_ticket(ticket_id)
        
        if not ticket:
            return jsonify({'success': False, 'error': 'Ticket not found'}), 404
        
        return jsonify({
            'success': True,
            'ticket': ticket.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Error getting ticket: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@support_bp.route('/tickets/<ticket_id>/status', methods=['PUT'])
def update_ticket_status(ticket_id: str):
    """
    Update ticket status.
    
    Body:
        - status: New status (pending, in_progress, waiting_user, resolved, closed)
        - assigned_to: Optional developer ID to assign
    """
    try:
        data = request.get_json()
        new_status = data.get('status')
        assigned_to = data.get('assigned_to')
        
        if not new_status:
            return jsonify({'success': False, 'error': 'Status required'}), 400
        
        # Validate status
        valid_statuses = [s.value for s in TicketStatus]
        if new_status not in valid_statuses:
            return jsonify({
                'success': False, 
                'error': f'Invalid status. Valid: {valid_statuses}'
            }), 400
        
        db = get_support_db()
        success = db.update_status(ticket_id, new_status, assigned_to)
        
        if not success:
            return jsonify({'success': False, 'error': 'Ticket not found'}), 404
        
        return jsonify({
            'success': True,
            'message': f'Status updated to {new_status}'
        })
        
    except Exception as e:
        logger.error(f"Error updating ticket status: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@support_bp.route('/tickets/<ticket_id>/message', methods=['POST'])
def send_message(ticket_id: str):
    """
    Send a message to a ticket (and to user via DM).
    
    Body:
        - content: Message content
        - sender_id: Developer ID
    """
    try:
        data = request.get_json()
        content = data.get('content')
        sender_id = data.get('sender_id', 'developer')
        
        if not content:
            return jsonify({'success': False, 'error': 'Content required'}), 400
        
        db = get_support_db()
        
        # Check ticket exists
        ticket = db.get_ticket(ticket_id)
        if not ticket:
            return jsonify({'success': False, 'error': 'Ticket not found'}), 404
        
        # Add message to database
        message = db.add_message(
            ticket_id=ticket_id,
            sender_type='developer',
            sender_id=sender_id,
            content=content
        )
        
        # Try to send DM to user
        dm_sent = False
        try:
            from web.api.flask_app import get_bot
            import asyncio
            
            bot = get_bot()
            if bot:
                async def send_dm():
                    try:
                        user = await bot.fetch_user(int(ticket.user_id))
                        if user:
                            import discord
                            embed = discord.Embed(
                                title=f"Support Update - {ticket_id}",
                                description=content,
                                color=0x7B1E3C
                            )
                            embed.set_footer(text="Reply to this message to respond")
                            await user.send(embed=embed)
                            return True
                    except Exception as e:
                        logger.warning(f"Could not send DM to user: {e}")
                    return False
                
                # Run async function
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    dm_sent = loop.run_until_complete(send_dm())
                finally:
                    loop.close()
                    
        except Exception as e:
            logger.warning(f"Error sending DM: {e}")
        
        return jsonify({
            'success': True,
            'message': message.to_dict(),
            'dm_sent': dm_sent
        })
        
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@support_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get support statistics"""
    try:
        db = get_support_db()
        
        all_tickets = db.get_all_tickets(limit=1000)
        
        # Calculate stats
        by_status = {}
        by_type = {}
        for ticket in all_tickets:
            by_status[ticket.status] = by_status.get(ticket.status, 0) + 1
            by_type[ticket.ticket_type] = by_type.get(ticket.ticket_type, 0) + 1
        
        active_count = db.get_active_tickets_count()
        
        return jsonify({
            'success': True,
            'stats': {
                'total': len(all_tickets),
                'active': active_count,
                'by_status': by_status,
                'by_type': by_type
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


def register_support_api(app):
    """Register support blueprint with Flask app"""
    app.register_blueprint(support_bp)
    logger.info("Support API endpoints registered")
