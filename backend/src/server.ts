import mongoose from 'mongoose';
import { env } from './config/env.js';
import { createApp } from './app.js';

async function main() {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const app = createApp();
  const server = app.listen(env.PORT, () => console.log(`HotelPro API listening on http://localhost:${env.PORT}`));
  const shutdown = async () => { server.close(); await mongoose.disconnect(); process.exit(0); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}
main().catch(error => { console.error('Failed to start HotelPro API:', error); process.exit(1); });
