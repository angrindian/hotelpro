import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { loadUser } from './middleware/auth.js';
import { api } from './routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(session({
    name: env.SESSION_COOKIE_NAME, secret: env.SESSION_SECRET, resave: false, saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: env.MONGODB_URI, collectionName: 'sessions', ttl: 60 * 60 * 8 }),
    cookie: { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 }
  }));
  app.use((req, res, next) => {
    if (['POST','PUT','PATCH','DELETE'].includes(req.method) && req.headers.origin && req.headers.origin !== env.CLIENT_ORIGIN) return res.status(403).json({ error: 'Untrusted request origin' });
    next();
  });
  app.get('/api/health', (_req, res) => res.status(200).json({ status: 'ok', service: 'hotelpro-api' }));
  app.use('/api', loadUser, api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
