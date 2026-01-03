"""
Support Ticket Database Models

Models for AI customer support system with ticket tracking.
"""

import sqlite3
import json
import secrets
import string
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
import logging

logger = logging.getLogger('discord_music_bot.support.models')


class TicketStatus(Enum):
    """Ticket status states"""
    PENDING = "pending"           # Waiting for developer
    IN_PROGRESS = "in_progress"   # Being handled
    WAITING_USER = "waiting_user" # Waiting for user response
    RESOLVED = "resolved"         # Resolved, waiting confirmation
    CLOSED = "closed"             # Ticket closed


class TicketType(Enum):
    """Types of support tickets"""
    FEEDBACK = "feedback"     # Suggestions/feedback
    ISSUE = "issue"           # Bug reports/issues
    LIVE = "live"             # Live support request


@dataclass
class SupportMessage:
    """A message in a support ticket"""
    id: str
    ticket_id: str
    sender_type: str  # "user" or "developer"
    sender_id: str
    content: str
    created_at: str
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SupportMessage':
        return cls(**data)


@dataclass
class SupportTicket:
    """A support ticket"""
    id: str                              # Random ID like SNRA-7K2M-9P4L
    user_id: str                         # Discord user ID
    user_name: str                       # Discord username
    ticket_type: str                     # feedback/issue/live
    status: str = "pending"              # Ticket status
    subject: str = ""                    # Brief subject
    description: str = ""                # Full description
    priority: str = "normal"             # low/normal/high/urgent
    assigned_to: Optional[str] = None    # Developer handling
    messages: List[SupportMessage] = field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""
    resolved_at: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['messages'] = [m.to_dict() if isinstance(m, SupportMessage) else m for m in self.messages]
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SupportTicket':
        messages = data.pop('messages', [])
        ticket = cls(**data)
        ticket.messages = [
            SupportMessage.from_dict(m) if isinstance(m, dict) else m 
            for m in messages
        ]
        return ticket


class SupportDatabase:
    """SQLite database for support tickets"""
    
    def __init__(self, db_path: str = "data/support.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
    
    def _init_db(self):
        """Initialize database tables"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tickets table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS tickets (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    user_name TEXT NOT NULL,
                    ticket_type TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    subject TEXT,
                    description TEXT,
                    priority TEXT DEFAULT 'normal',
                    assigned_to TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    resolved_at TEXT
                )
            ''')
            
            # Messages table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    ticket_id TEXT NOT NULL,
                    sender_type TEXT NOT NULL,
                    sender_id TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
                )
            ''')
            
            # Indexes
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_messages_ticket ON messages(ticket_id)')
            
            conn.commit()
            logger.info("Support database initialized")
    
    @staticmethod
    def generate_ticket_id() -> str:
        """
        Generate random ticket ID.
        Format: SNRA-XXXX-XXXX (e.g., SNRA-7K2M-9P4L)
        Uses characters that are easy to read (no 0/O, 1/I/l)
        """
        chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
        part1 = ''.join(secrets.choice(chars) for _ in range(4))
        part2 = ''.join(secrets.choice(chars) for _ in range(4))
        return f"SNRA-{part1}-{part2}"
    
    @staticmethod
    def generate_message_id() -> str:
        """Generate unique message ID"""
        return secrets.token_hex(8)
    
    def create_ticket(
        self,
        user_id: str,
        user_name: str,
        ticket_type: str,
        subject: str,
        description: str,
        priority: str = "normal"
    ) -> SupportTicket:
        """Create a new support ticket"""
        now = datetime.utcnow().isoformat()
        
        ticket = SupportTicket(
            id=self.generate_ticket_id(),
            user_id=user_id,
            user_name=user_name,
            ticket_type=ticket_type,
            status=TicketStatus.PENDING.value,
            subject=subject,
            description=description,
            priority=priority,
            created_at=now,
            updated_at=now
        )
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO tickets (
                    id, user_id, user_name, ticket_type, status, 
                    subject, description, priority, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                ticket.id, ticket.user_id, ticket.user_name, ticket.ticket_type,
                ticket.status, ticket.subject, ticket.description, ticket.priority,
                ticket.created_at, ticket.updated_at
            ))
            conn.commit()
        
        logger.info(f"Created ticket: {ticket.id} for user {user_name}")
        return ticket
    
    def get_ticket(self, ticket_id: str) -> Optional[SupportTicket]:
        """Get a ticket by ID"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM tickets WHERE id = ?', (ticket_id,))
            row = cursor.fetchone()
            
            if not row:
                return None
            
            ticket = SupportTicket(
                id=row['id'],
                user_id=row['user_id'],
                user_name=row['user_name'],
                ticket_type=row['ticket_type'],
                status=row['status'],
                subject=row['subject'],
                description=row['description'],
                priority=row['priority'],
                assigned_to=row['assigned_to'],
                created_at=row['created_at'],
                updated_at=row['updated_at'],
                resolved_at=row['resolved_at']
            )
            
            # Load messages
            cursor.execute(
                'SELECT * FROM messages WHERE ticket_id = ? ORDER BY created_at',
                (ticket_id,)
            )
            for msg_row in cursor.fetchall():
                ticket.messages.append(SupportMessage(
                    id=msg_row['id'],
                    ticket_id=msg_row['ticket_id'],
                    sender_type=msg_row['sender_type'],
                    sender_id=msg_row['sender_id'],
                    content=msg_row['content'],
                    created_at=msg_row['created_at']
                ))
            
            return ticket
    
    def get_user_tickets(self, user_id: str) -> List[SupportTicket]:
        """Get all tickets for a user"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute(
                'SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC',
                (user_id,)
            )
            
            tickets = []
            for row in cursor.fetchall():
                tickets.append(SupportTicket(
                    id=row['id'],
                    user_id=row['user_id'],
                    user_name=row['user_name'],
                    ticket_type=row['ticket_type'],
                    status=row['status'],
                    subject=row['subject'],
                    description=row['description'],
                    priority=row['priority'],
                    assigned_to=row['assigned_to'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at'],
                    resolved_at=row['resolved_at']
                ))
            
            return tickets
    
    def get_all_tickets(
        self, 
        status: Optional[str] = None,
        ticket_type: Optional[str] = None,
        limit: int = 100
    ) -> List[SupportTicket]:
        """Get all tickets with optional filters"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            query = 'SELECT * FROM tickets WHERE 1=1'
            params = []
            
            if status:
                query += ' AND status = ?'
                params.append(status)
            
            if ticket_type:
                query += ' AND ticket_type = ?'
                params.append(ticket_type)
            
            query += ' ORDER BY created_at DESC LIMIT ?'
            params.append(limit)
            
            cursor.execute(query, params)
            
            tickets = []
            for row in cursor.fetchall():
                ticket = SupportTicket(
                    id=row['id'],
                    user_id=row['user_id'],
                    user_name=row['user_name'],
                    ticket_type=row['ticket_type'],
                    status=row['status'],
                    subject=row['subject'],
                    description=row['description'],
                    priority=row['priority'],
                    assigned_to=row['assigned_to'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at'],
                    resolved_at=row['resolved_at']
                )
                
                # Load messages for this ticket
                cursor.execute(
                    'SELECT * FROM messages WHERE ticket_id = ? ORDER BY created_at',
                    (ticket.id,)
                )
                for msg_row in cursor.fetchall():
                    ticket.messages.append(SupportMessage(
                        id=msg_row['id'],
                        ticket_id=msg_row['ticket_id'],
                        sender_type=msg_row['sender_type'],
                        sender_id=msg_row['sender_id'],
                        content=msg_row['content'],
                        created_at=msg_row['created_at']
                    ))
                
                tickets.append(ticket)
            
            return tickets
    
    def update_status(
        self, 
        ticket_id: str, 
        new_status: str,
        assigned_to: Optional[str] = None
    ) -> bool:
        """Update ticket status"""
        now = datetime.utcnow().isoformat()
        resolved_at = now if new_status == TicketStatus.RESOLVED.value else None
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            if assigned_to:
                cursor.execute('''
                    UPDATE tickets 
                    SET status = ?, updated_at = ?, resolved_at = ?, assigned_to = ?
                    WHERE id = ?
                ''', (new_status, now, resolved_at, assigned_to, ticket_id))
            else:
                cursor.execute('''
                    UPDATE tickets 
                    SET status = ?, updated_at = ?, resolved_at = ?
                    WHERE id = ?
                ''', (new_status, now, resolved_at, ticket_id))
            
            conn.commit()
            success = cursor.rowcount > 0
        
        if success:
            logger.info(f"Updated ticket {ticket_id} status to {new_status}")
        
        return success
    
    def add_message(
        self,
        ticket_id: str,
        sender_type: str,  # "user" or "developer"
        sender_id: str,
        content: str
    ) -> Optional[SupportMessage]:
        """Add a message to a ticket"""
        now = datetime.utcnow().isoformat()
        
        message = SupportMessage(
            id=self.generate_message_id(),
            ticket_id=ticket_id,
            sender_type=sender_type,
            sender_id=sender_id,
            content=content,
            created_at=now
        )
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Insert message
            cursor.execute('''
                INSERT INTO messages (id, ticket_id, sender_type, sender_id, content, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                message.id, message.ticket_id, message.sender_type,
                message.sender_id, message.content, message.created_at
            ))
            
            # Update ticket timestamp
            cursor.execute(
                'UPDATE tickets SET updated_at = ? WHERE id = ?',
                (now, ticket_id)
            )
            
            conn.commit()
        
        return message
    
    def get_active_tickets_count(self) -> int:
        """Get count of active (non-closed) tickets"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                'SELECT COUNT(*) FROM tickets WHERE status != ?',
                (TicketStatus.CLOSED.value,)
            )
            return cursor.fetchone()[0]


# Singleton instance
_db_instance: Optional[SupportDatabase] = None


def get_support_db() -> SupportDatabase:
    """Get or create support database instance"""
    global _db_instance
    if _db_instance is None:
        _db_instance = SupportDatabase()
    return _db_instance
