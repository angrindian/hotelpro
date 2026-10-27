import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['guest', 'staff', 'receptionist', 'housekeeping', 'manager', 'admin'], default: 'guest', required: true },
  hotelIds: [{ type: Schema.Types.ObjectId, ref: 'Hotel' }],
  active: { type: Boolean, default: true }
}, { timestamps: true });

const hotelSchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, default: '' },
  city: { type: String, required: true },
  country: { type: String, default: 'India' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  currency: { type: String, default: 'INR' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const roomSchema = new Schema({
  hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
  roomNumber: { type: String, required: true, trim: true },
  type: { type: String, enum: ['Standard', 'Deluxe', 'Suite', 'Family'], default: 'Standard' },
  description: { type: String, default: '' },
  capacity: { type: Number, min: 1, max: 12, default: 2 },
  pricePerNight: { type: Number, min: 0, required: true },
  status: { type: String, enum: ['available', 'occupied', 'cleaning', 'maintenance'], default: 'available' },
  amenities: [{ type: String }]
}, { timestamps: true });
roomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });

const bookingSchema = new Schema({
  bookingCode: { type: String, required: true, unique: true, index: true },
  hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  guestId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  guests: { type: Number, min: 1, max: 12, default: 1 },
  totalAmount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['pending_payment', 'confirmed', 'checked_in', 'checked_out', 'cancelled'], default: 'pending_payment', index: true },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' }
}, { timestamps: true });
bookingSchema.index({ roomId: 1, checkIn: 1, checkOut: 1, status: 1 });

const paymentSchema = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  provider: { type: String, enum: ['mock'], default: 'mock' },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['succeeded', 'failed', 'refunded'], required: true },
  reference: { type: String, required: true, unique: true }
}, { timestamps: true });

const auditSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: 'User' },
  hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel' },
  action: { type: String, required: true },
  targetType: { type: String, required: true },
  targetId: { type: String },
  details: { type: Schema.Types.Mixed }
}, { timestamps: true });

export const User =
  (mongoose.models.User as mongoose.Model<UserRecord> | undefined) ??
  mongoose.model<UserRecord>('User', userSchema);export const Hotel = mongoose.models.Hotel || mongoose.model('Hotel', hotelSchema);
export const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);
export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
export const AuditEvent = mongoose.models.AuditEvent || mongoose.model('AuditEvent', auditSchema);
export type UserRole = 'guest' | 'staff' | 'receptionist' | 'housekeeping' | 'manager' | 'admin';
export type UserRecord = InferSchemaType<typeof userSchema>;
