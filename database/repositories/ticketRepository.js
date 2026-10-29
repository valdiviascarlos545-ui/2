/**
 * Madrazo Cartel Bot - Ticket Repository
 * Atomic database transactions for ticket creation, claiming, unclaiming, reassigning, and closing.
 */
import { getDatabase } from '../index.js';

export const ticketRepository = {
  /**
   * Get next sequential ticket number atomically
   */
  getNextTicketNumber() {
    const db = getDatabase();
    const update = db.prepare('UPDATE counters SET value = value + 1 WHERE name = ?');
    const select = db.prepare('SELECT value FROM counters WHERE name = ?');

    const increment = db.transaction(() => {
      update.run('ticket_number');
      const row = select.get('ticket_number');
      return row.value;
    });

    return increment();
  },

  /**
   * Create new ticket record
   */
  createTicket(data) {
    const db = getDatabase();
    const ticketNumber = this.getNextTicketNumber();
    const ticketId = `TIC-${ticketNumber}`;

    const stmt = db.prepare(`
      INSERT INTO tickets (
        ticket_id, ticket_number, ticket_type, channel_id, guild_id,
        opener_id, opener_name, status, created_at, reassign_history
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, '[]')
    `);

    stmt.run(
      ticketId,
      ticketNumber,
      data.ticketType,
      data.channelId,
      data.guildId,
      data.openerId,
      data.openerName,
      Date.now()
    );

    return this.getTicketByChannel(data.channelId);
  },

  /**
   * Get ticket by channel ID
   */
  getTicketByChannel(channelId) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM tickets WHERE channel_id = ?');
    const ticket = stmt.get(channelId);
    if (ticket && ticket.reassign_history) {
      try {
        ticket.reassignHistory = JSON.parse(ticket.reassign_history);
      } catch {
        ticket.reassignHistory = [];
      }
    }
    return ticket || null;
  },

  /**
   * Get ticket by ticket ID (e.g. TIC-1049)
   */
  getTicketById(ticketId) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM tickets WHERE ticket_id = ?');
    return stmt.get(ticketId) || null;
  },

  /**
   * Claim ticket atomically using conditional update.
   * Returns { success: boolean, ticket: object, alreadyClaimed: boolean }
   */
  claimTicket(channelId, handlerId, handlerName) {
    const db = getDatabase();

    const claimTransaction = db.transaction(() => {
      const current = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
      if (!current) {
        return { success: false, error: 'Ticket not found.' };
      }

      if (current.status === 'closed') {
        return { success: false, error: 'Cannot claim a closed ticket.' };
      }

      // Check if ticket is already claimed
      if (current.handler_id) {
        return {
          success: false,
          alreadyClaimed: true,
          currentHandlerId: current.handler_id,
          currentHandlerName: current.handler_name,
          ticket: current
        };
      }

      // Atomic conditional update
      const stmt = db.prepare(`
        UPDATE tickets 
        SET handler_id = ?, handler_name = ?, claim_timestamp = ?, status = 'claimed'
        WHERE channel_id = ? AND handler_id IS NULL
      `);
      const result = stmt.run(handlerId, handlerName, Date.now(), channelId);

      if (result.changes === 0) {
        // Race condition: another staff member claimed between check and update
        const updated = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
        return {
          success: false,
          alreadyClaimed: true,
          currentHandlerId: updated.handler_id,
          currentHandlerName: updated.handler_name,
          ticket: updated
        };
      }

      const updated = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
      return { success: true, ticket: updated };
    });

    return claimTransaction();
  },

  /**
   * Unclaim ticket atomically
   */
  unclaimTicket(channelId, actorId) {
    const db = getDatabase();

    const unclaimTransaction = db.transaction(() => {
      const current = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
      if (!current) {
        return { success: false, error: 'Ticket not found.' };
      }

      if (!current.handler_id) {
        return { success: false, error: 'Ticket is not currently claimed.' };
      }

      const previousHandlerId = current.handler_id;
      const previousHandlerName = current.handler_name;

      const stmt = db.prepare(`
        UPDATE tickets 
        SET handler_id = NULL, handler_name = NULL, unclaim_timestamp = ?, status = 'open'
        WHERE channel_id = ?
      `);
      stmt.run(Date.now(), channelId);

      const updated = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
      return {
        success: true,
        previousHandlerId,
        previousHandlerName,
        ticket: updated
      };
    });

    return unclaimTransaction();
  },

  /**
   * Reassign ticket to another staff member
   */
  reassignTicket(channelId, newHandlerId, newHandlerName, actorId, actorName) {
    const db = getDatabase();

    const reassignTransaction = db.transaction(() => {
      const current = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
      if (!current) {
        return { success: false, error: 'Ticket not found.' };
      }

      let history = [];
      try {
        history = current.reassign_history ? JSON.parse(current.reassign_history) : [];
      } catch {
        history = [];
      }

      history.push({
        fromId: current.handler_id,
        fromName: current.handler_name,
        toId: newHandlerId,
        toName: newHandlerName,
        reassignedBy: actorId,
        reassignedByName: actorName,
        timestamp: Date.now()
      });

      const stmt = db.prepare(`
        UPDATE tickets
        SET handler_id = ?, handler_name = ?, reassign_history = ?, status = 'claimed'
        WHERE channel_id = ?
      `);
      stmt.run(newHandlerId, newHandlerName, JSON.stringify(history), channelId);

      const updated = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
      return { success: true, ticket: updated, oldHandlerId: current.handler_id };
    });

    return reassignTransaction();
  },

  /**
   * Close ticket
   */
  closeTicket(channelId, closedById, closedByName, reason = 'No reason provided', transcriptUrl = null) {
    const db = getDatabase();

    const stmt = db.prepare(`
      UPDATE tickets
      SET status = 'closed', closed_by_id = ?, closed_by_name = ?, close_reason = ?, closed_at = ?, transcript_url = ?
      WHERE channel_id = ?
    `);

    stmt.run(closedById, closedByName, reason, Date.now(), transcriptUrl, channelId);
    return this.getTicketByChannel(channelId);
  },

  /**
   * Get all tickets with optional status filter
   */
  getAllTickets(status = null) {
    const db = getDatabase();
    if (status) {
      return db.prepare('SELECT * FROM tickets WHERE status = ? ORDER BY id DESC').all(status);
    }
    return db.prepare('SELECT * FROM tickets ORDER BY id DESC').all();
  }
};
