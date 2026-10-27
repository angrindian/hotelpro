import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { AuditEvent, Booking, Hotel, Payment, Room, User } from './models/index.js';
import { env } from './config/env.js';
import { isValidStay } from './utils/dateRules.js';
import { canAccessHotel, requireAuth, requireRoles } from './middleware/auth.js';

export const api = Router();
const registerSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254), password: z.string().min(10).max(100) });
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(100) });
const bookingSchema = z.object({ hotelId: z.string().min(1), roomId: z.string().min(1), checkIn: z.coerce.date(), checkOut: z.coerce.date(), guests: z.coerce.number().int().min(1).max(12).default(1) }).refine(v => isValidStay(v.checkIn, v.checkOut), { message: 'Check-out must be after check-in' });
const roomSchema = z.object({ hotelId: z.string(), roomNumber: z.string().trim().min(1).max(20), type: z.enum(['Standard','Deluxe','Suite','Family']).default('Standard'), capacity: z.number().int().min(1).max(12).default(2), pricePerNight: z.number().min(0), description: z.string().max(500).optional() });
const hotelSchema = z.object({ name: z.string().trim().min(2), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/), city: z.string().trim().min(2), country: z.string().default('India'), description: z.string().max(1000).optional() });

api.get('/auth/me', (req, res) => res.json({ user: req.user ?? null }));
api.post('/auth/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    const email = parsed.data.email.toLowerCase();
    if (await User.exists({ email })) return res.status(409).json({ error: 'An account with this email already exists' });
    const user = await User.create({ name: parsed.data.name, email, passwordHash: await bcrypt.hash(parsed.data.password, 12), role: 'guest' });
    req.session.userId = String(user._id);
    res.status(201).json({ user: { id: String(user._id), name: user.name, email: user.email, role: user.role, hotelIds: [] } });
  } catch (e) { next(e); }
});
api.post('/auth/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password' });
    const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+passwordHash');
    if (!user || !user.active || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return res.status(401).json({ error: 'Invalid email or password' });
    await new Promise<void>((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
    req.session.userId = String(user._id);
    res.json({ user: { id: String(user._id), name: user.name, email: user.email, role: user.role, hotelIds: user.hotelIds.map(String) } });
  } catch (e) { next(e); }
});
api.post('/auth/logout', (req, res, next) => req.session.destroy(err => { if (err) return next(err); res.clearCookie(env.SESSION_COOKIE_NAME, { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'lax' }); res.status(204).end(); }));

api.get('/hotels', async (_req, res, next) => { try { const hotels = await Hotel.find({ active: true }).sort({ name: 1 }).lean(); res.json({ hotels }); } catch(e) { next(e); } });
api.post('/hotels', requireAuth, requireRoles('admin'), async (req, res, next) => {
  try { const p = hotelSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.issues[0]?.message }); const hotel = await Hotel.create(p.data); await AuditEvent.create({ actorId: req.user!.id, hotelId: hotel._id, action: 'hotel.created', targetType: 'Hotel', targetId: String(hotel._id) }); res.status(201).json({ hotel }); } catch(e) { next(e); }
});

api.patch('/hotels/:hotelId', requireAuth, requireRoles('admin'), async (req, res, next) => {
  try {
    const updateSchema = z.object({
      name: z.string().trim().min(2).max(100),
      city: z.string().trim().min(2).max(100),
      description: z.string().trim().max(1000)
    });

    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Invalid hotel details'
      });
    }

    const hotel = await Hotel.findByIdAndUpdate(
      req.params.hotelId,
      { $set: parsed.data },
      { new: true, runValidators: true }
    );

    if (!hotel) {
      return res.status(404).json({ error: 'Property not found' });
    }

    await AuditEvent.create({
      actorId: req.user!.id,
      hotelId: hotel._id,
      action: 'hotel.updated',
      targetType: 'Hotel',
      targetId: String(hotel._id)
    });

    res.json({ hotel });
  } catch (e) {
    next(e);
  }
});

api.get('/hotels/:hotelId/rooms', async (req, res, next) => { try { const rooms = await Room.find({ hotelId: req.params.hotelId }).sort({ roomNumber: 1 }).lean(); res.json({ rooms }); } catch(e) { next(e); } });
api.post('/rooms', requireAuth, requireRoles('admin','manager','staff','receptionist'), async (req, res, next) => {
  try { const p = roomSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.issues[0]?.message }); if (!canAccessHotel(req, p.data.hotelId)) return res.status(403).json({ error: 'No access to this property' }); const room = await Room.create(p.data); res.status(201).json({ room }); } catch(e) { next(e); }
});
api.patch('/rooms/:roomId/status', requireAuth, requireRoles('admin','manager','staff','receptionist','housekeeping'), async (req, res, next) => {
  try { const status = z.enum(['available','occupied','cleaning','maintenance']).safeParse(req.body.status); if (!status.success) return res.status(400).json({ error: 'Invalid room status' }); const room = await Room.findById(req.params.roomId); if (!room) return res.status(404).json({ error: 'Room not found' }); if (!canAccessHotel(req, String(room.hotelId))) return res.status(403).json({ error: 'No access to this property' }); room.status = status.data; await room.save(); res.json({ room }); } catch(e) { next(e); }
});

api.get('/bookings', requireAuth, async (req, res, next) => {
  try { const filter = req.user!.role === 'admin' ? {} : req.user!.role === 'guest' ? { guestId: req.user!.id } : { hotelId: { $in: req.user!.hotelIds } }; const bookings = await Booking.find(filter).populate('hotelId','name city').populate('roomId','roomNumber type').populate('guestId','name email').sort({ createdAt: -1 }).limit(100).lean(); res.json({ bookings }); } catch(e) { next(e); }
});
api.post('/bookings', requireAuth, async (req, res, next) => {
  try {
    const p = bookingSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.issues[0]?.message ?? 'Invalid booking details' });
    const { hotelId, roomId, checkIn, checkOut, guests } = p.data;
    if (req.user!.role !== 'guest' && !canAccessHotel(req, hotelId)) return res.status(403).json({ error: 'No access to this property' });
    const room = await Room.findOne({ _id: roomId, hotelId, status: { $ne: 'maintenance' } }); if (!room) return res.status(404).json({ error: 'Room not found or unavailable for booking' }); if (guests > room.capacity) return res.status(400).json({ error: 'Guest count exceeds room capacity' });
    const now = new Date(); if (checkIn < new Date(now.toDateString())) return res.status(400).json({ error: 'Check-in cannot be in the past' });
    const conflict = await Booking.exists({ roomId, status: { $in: ['pending_payment','confirmed','checked_in'] }, checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } }); if (conflict) return res.status(409).json({ error: 'This room is already booked for part of those dates' });
    const nights = Math.ceil((checkOut.getTime()-checkIn.getTime())/86400000); const totalAmount = nights * room.pricePerNight;
    const booking = await Booking.create({ bookingCode: `HP-${randomBytes(4).toString('hex').toUpperCase()}`, hotelId, roomId, guestId: req.user!.id, checkIn, checkOut, guests, totalAmount, currency: 'INR', status: 'pending_payment', paymentStatus: 'unpaid' });
    res.status(201).json({ booking });
  } catch(e) { next(e); }
});
api.post('/bookings/:bookingId/mock-payment', requireAuth, async (req, res, next) => {
  try {
    const outcome = z.enum(['success','failure']).default('success').safeParse(req.body.outcome ?? 'success'); if (!outcome.success) return res.status(400).json({ error: 'Invalid mock payment outcome' });
    const booking = await Booking.findById(req.params.bookingId); if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const allowed = req.user!.role === 'admin' || String(booking.guestId) === req.user!.id || canAccessHotel(req, String(booking.hotelId)); if (!allowed) return res.status(403).json({ error: 'Access denied' });
    if (booking.status !== 'pending_payment') return res.status(409).json({ error: 'Booking is not awaiting payment' });
    const success = outcome.data === 'success'; const reference = `MOCK-${randomBytes(8).toString('hex').toUpperCase()}`;
    await Payment.create({ bookingId: booking._id, amount: booking.totalAmount, currency: booking.currency, status: success ? 'succeeded' : 'failed', reference });
    if (success) { booking.paymentStatus = 'paid'; booking.status = 'confirmed'; await booking.save(); }
    res.json({ booking, payment: { provider: 'mock', status: success ? 'succeeded' : 'failed', reference, amount: booking.totalAmount, currency: booking.currency } });
  } catch(e) { next(e); }
});
api.patch('/bookings/:bookingId/status', requireAuth, requireRoles('admin','manager','staff','receptionist'), async (req, res, next) => {
  try { const status = z.enum(['confirmed','checked_in','checked_out','cancelled']).safeParse(req.body.status); if (!status.success) return res.status(400).json({ error: 'Invalid booking status' }); const booking = await Booking.findById(req.params.bookingId); if (!booking) return res.status(404).json({ error: 'Booking not found' }); if (!canAccessHotel(req, String(booking.hotelId))) return res.status(403).json({ error: 'No access to this property' }); if (booking.status === 'cancelled' || booking.status === 'checked_out') return res.status(409).json({ error: 'This booking is already closed' }); booking.status = status.data; await booking.save(); res.json({ booking }); } catch(e) { next(e); }
});
api.get('/analytics/summary', requireAuth, requireRoles('admin','manager'), async (req, res, next) => {
  try { const filter = req.user!.role === 'admin' ? {} : { hotelId: { $in: req.user!.hotelIds } }; const roomFilter = req.user!.role === 'admin' ? {} : { hotelId: { $in: req.user!.hotelIds } }; const [totalBookings, confirmedBookings, revenueAgg, roomCount, hotelsCount] = await Promise.all([Booking.countDocuments(filter), Booking.countDocuments({ ...filter, status: { $in: ['confirmed','checked_in','checked_out'] } }), Booking.aggregate([{ $match: { ...filter, paymentStatus: 'paid' } }, { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }]), Room.countDocuments(roomFilter), req.user!.role === 'admin' ? Hotel.countDocuments({ active: true }) : Promise.resolve(req.user!.hotelIds.length)]); res.json({ totalBookings, confirmedBookings, revenue: revenueAgg[0]?.revenue ?? 0, roomCount, hotelsCount }); } catch(e) { next(e); }
});
