import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// In-memory ticket store (use database in production)
const tickets = new Map<string, SupportTicket>();

export interface SupportTicket {
  id: string;                    // SONORA-XXXXX-XXXX format
  userId: string;
  discordUsername: string;
  email?: string;
  category: 'bug' | 'feature' | 'question' | 'account' | 'other';
  title: string;
  description: string;
  attachments?: string[];
  status: 'new' | 'reviewing' | 'in-progress' | 'waiting' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  scheduledDeletion?: string;    // 15 days after resolved
  responses: TicketResponse[];
  followUpSubmitted: boolean;
}

interface TicketResponse {
  id: string;
  from: 'user' | 'admin';
  message: string;
  attachments?: string[];
  createdAt: string;
}

// Generate SONORA-XXXXX-XXXX ticket code
function generateTicketCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let part1 = '';
  let part2 = '';
  
  for (let i = 0; i < 5; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  for (let i = 0; i < 4; i++) {
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `SONORA-${part1}-${part2}`;
}

// POST - Create new ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, discordUsername, email, category, title, description, attachments } = body;

    // Validation
    if (!userId || !discordUsername || !category || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be 200 characters or less' },
        { status: 400 }
      );
    }

    if (description.length > 5000) {
      return NextResponse.json(
        { error: 'Description must be 5000 characters or less' },
        { status: 400 }
      );
    }

    // Generate unique ticket ID
    let ticketId = generateTicketCode();
    while (tickets.has(ticketId)) {
      ticketId = generateTicketCode();
    }

    const now = new Date().toISOString();

    const ticket: SupportTicket = {
      id: ticketId,
      userId,
      discordUsername,
      email,
      category,
      title,
      description,
      attachments: attachments || [],
      status: 'new',
      priority: category === 'bug' ? 'high' : 'medium',
      createdAt: now,
      updatedAt: now,
      responses: [],
      followUpSubmitted: false,
    };

    tickets.set(ticketId, ticket);

    return NextResponse.json({
      success: true,
      ticketId,
      message: 'Ticket created successfully',
      estimatedResponseTime: '24-48 hours',
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
}

// GET - Get ticket by ID or list tickets
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticketId = searchParams.get('id');
  const userId = searchParams.get('userId');
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Get specific ticket
  if (ticketId) {
    const ticket = tickets.get(ticketId);
    
    if (!ticket) {
      return NextResponse.json({
        found: false,
        message: 'Ticket tidak ditemukan atau sudah dihapus dari sistem',
        deleted: true,
      });
    }

    // Calculate scheduled deletion date if resolved
    let deletionInfo = null;
    if (ticket.resolvedAt) {
      const resolvedDate = new Date(ticket.resolvedAt);
      const deletionDate = new Date(resolvedDate.getTime() + 15 * 24 * 60 * 60 * 1000);
      const daysUntilDeletion = Math.ceil((deletionDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      
      deletionInfo = {
        scheduledDate: deletionDate.toISOString(),
        daysRemaining: Math.max(0, daysUntilDeletion),
        message: `Ticket akan otomatis terhapus dalam ${daysUntilDeletion} hari`,
      };
    }

    return NextResponse.json({
      found: true,
      ticket,
      deletionInfo,
    });
  }

  // List tickets (for admin or user)
  let ticketList = Array.from(tickets.values());

  // Filter by user
  if (userId) {
    ticketList = ticketList.filter(t => t.userId === userId);
  }

  // Filter by status
  if (status) {
    ticketList = ticketList.filter(t => t.status === status);
  }

  // Sort by createdAt descending
  ticketList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Pagination
  const total = ticketList.length;
  ticketList = ticketList.slice(offset, offset + limit);

  // Stats
  const stats = {
    total: tickets.size,
    new: Array.from(tickets.values()).filter(t => t.status === 'new').length,
    inProgress: Array.from(tickets.values()).filter(t => t.status === 'in-progress').length,
    resolved: Array.from(tickets.values()).filter(t => t.status === 'resolved').length,
  };

  return NextResponse.json({
    tickets: ticketList,
    total,
    hasMore: offset + limit < total,
    stats,
  });
}

// PATCH - Update ticket (status, add response, resolve)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, status, response, isAdmin, resolveReason, followUp } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID required' },
        { status: 400 }
      );
    }

    const ticket = tickets.get(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    // Update status
    if (status) {
      ticket.status = status;
      ticket.updatedAt = now;

      // If resolved, set scheduled deletion
      if (status === 'resolved' || status === 'closed') {
        ticket.resolvedAt = now;
        const deletionDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
        ticket.scheduledDeletion = deletionDate.toISOString();
      }
    }

    // Add response
    if (response) {
      ticket.responses.push({
        id: crypto.randomBytes(8).toString('hex'),
        from: isAdmin ? 'admin' : 'user',
        message: response,
        createdAt: now,
      });
      ticket.updatedAt = now;
    }

    // Follow-up (user can only do once)
    if (followUp && !ticket.followUpSubmitted) {
      ticket.responses.push({
        id: crypto.randomBytes(8).toString('hex'),
        from: 'user',
        message: followUp,
        createdAt: now,
      });
      ticket.followUpSubmitted = true;
      ticket.updatedAt = now;
    }

    tickets.set(ticketId, ticket);

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}

// DELETE - Delete ticket (admin only or auto-delete)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticketId = searchParams.get('id');
  const autoDelete = searchParams.get('auto') === 'true';

  if (!ticketId) {
    return NextResponse.json(
      { error: 'Ticket ID required' },
      { status: 400 }
    );
  }

  const ticket = tickets.get(ticketId);
  if (!ticket) {
    return NextResponse.json(
      { error: 'Ticket not found' },
      { status: 404 }
    );
  }

  // Delete permanently
  tickets.delete(ticketId);

  return NextResponse.json({
    success: true,
    message: autoDelete 
      ? 'Ticket auto-deleted per 15-day retention policy'
      : 'Ticket deleted successfully',
    deletedAt: new Date().toISOString(),
  });
}
