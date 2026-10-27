import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from './config/env.js';
import { Hotel, Room, User } from './models/index.js';

async function seed() {
  await mongoose.connect(env.MONGODB_URI);
  const adminEmail = 'admin@hotelpro.local';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) admin = await User.create({ name: 'HotelPro Admin', email: adminEmail, passwordHash: await bcrypt.hash('ChangeMe123!', 12), role: 'admin' });
  let hotel = await Hotel.findOne({ slug: 'hotelpro-demo' });
  if (!hotel) hotel = await Hotel.create({ name: 'HotelPro Demo Hotel', slug: 'hotelpro-demo', city: 'Indore', country: 'India', description: 'Demo property for local development.' });
  if (!admin.hotelIds.some(id => String(id) === String(hotel!._id))) { admin.hotelIds.push(hotel._id); await admin.save(); }
  const rooms = [
    { roomNumber: '101', type: 'Standard', capacity: 2, pricePerNight: 2500, description: 'Comfortable standard room', amenities: ['Wi-Fi','Air conditioning'] },
    { roomNumber: '201', type: 'Deluxe', capacity: 2, pricePerNight: 3800, description: 'Spacious deluxe room', amenities: ['Wi-Fi','Air conditioning','Breakfast'] },
    { roomNumber: '301', type: 'Suite', capacity: 4, pricePerNight: 6500, description: 'Premium suite with living area', amenities: ['Wi-Fi','Air conditioning','Breakfast','Living area'] }
  ];
  for (const room of rooms) await Room.updateOne({ hotelId: hotel._id, roomNumber: room.roomNumber }, { $setOnInsert: { ...room, hotelId: hotel._id, status: 'available' } }, { upsert: true });
  console.log('Demo data ready. Login: admin@hotelpro.local / ChangeMe123!');
  console.log('Change the demo password before any deployment.');
  await mongoose.disconnect();
}
seed().catch(async e => { console.error(e); await mongoose.disconnect(); process.exit(1); });
