import { randomUUID } from 'node:crypto';
import { Op } from 'sequelize';
import { sequelize } from '../models/db.js';
import { RestaurantTable, Reservation } from '../models/reservationModel.js';
import { timeMinutes } from './reservationRules.js';

const failure = (message, status = 409) => Object.assign(new Error(message), { status });
const overlaps = (start, duration, otherStart, otherDuration) => start < otherStart + otherDuration && otherStart < start + duration;

export async function findFreeTables(date, startMinutes, durationMinutes, partySize, ignoreId = null, transaction = null) {
  // Lock physical tables in a stable order before checking occupancy. This is the
  // serialization point shared by staff bookings and confirmations.
  const tables = await RestaurantTable.findAll({
    where: { status: 'active', capacity: { [Op.gte]: partySize } },
    order: transaction ? [['id', 'ASC']] : [['capacity', 'ASC'], ['name', 'ASC']],
    transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  const bookings = await Reservation.findAll({
    where: { reservationDate: date, status: { [Op.in]: ['confirmed', 'seated'] }, tableId: { [Op.ne]: null }, ...(ignoreId ? { id: { [Op.ne]: ignoreId } } : {}) },
    transaction,
  });
  const busy = new Set(bookings.filter(booking => overlaps(startMinutes, durationMinutes, timeMinutes(String(booking.startTime)), booking.durationMinutes)).map(booking => booking.tableId));
  return tables.filter(table => !busy.has(table.id)).sort((a, b) => a.capacity - b.capacity || a.name.localeCompare(b.name));
}

export async function confirmTableBooking({ bookingId = null, slot = null, payload, actor }) {
  return sequelize.transaction({ isolationLevel: 'READ COMMITTED' }, async transaction => {
    let reservation;
    if (bookingId) {
      reservation = await Reservation.findByPk(bookingId, { transaction });
      if (!reservation) throw failure('Booking not found.', 404);
      slot = { date: reservation.reservationDate, startMinutes: timeMinutes(String(reservation.startTime)), durationMinutes: reservation.durationMinutes, partySize: reservation.partySize };
    }
    const free = await findFreeTables(slot.date, slot.startMinutes, slot.durationMinutes, slot.partySize, bookingId, transaction);
    if (reservation) {
      // Refresh after taking the shared table locks; a concurrent confirmation may have completed.
      await reservation.reload({ transaction, lock: transaction.LOCK.UPDATE });
      if (reservation.status !== 'pending') throw failure(`That booking is already ${reservation.status}.`);
    }
    const table = payload.tableId ? free.find(item => item.id === Number(payload.tableId)) : free[0];
    if (!table) throw failure('No table is free for that slot. Choose another time or table.');
    if (reservation) {
      await reservation.update({ status: 'confirmed', tableId: table.id, confirmedByUserId: actor.id, confirmedAt: new Date(), staffMessage: payload.message ? String(payload.message).slice(0, 255) : null }, { transaction });
    } else {
      const startTime = `${String(Math.floor(slot.startMinutes / 60)).padStart(2, '0')}:${String(slot.startMinutes % 60).padStart(2, '0')}:00`;
      reservation = await Reservation.create({
        code: `RSV-${randomUUID().replaceAll('-', '').slice(0, 16)}`,
        customerName: String(payload.customerName).trim().slice(0, 128), customerPhone: payload.customerPhone ? String(payload.customerPhone).slice(0, 32) : null,
        partySize: slot.partySize, reservationDate: slot.date, startTime, durationMinutes: slot.durationMinutes,
        tableId: table.id, status: 'confirmed', source: 'staff', notes: payload.notes ? String(payload.notes).slice(0, 255) : null,
        createdByUserId: actor.id, confirmedByUserId: actor.id, confirmedAt: new Date(),
      }, { transaction });
    }
    return { reservation, table };
  });
}
