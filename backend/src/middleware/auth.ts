import type { NextFunction, Request, Response } from 'express';
import { User } from '../models/index.js';

export type SafeUser = { id: string; name: string; email: string; role: string; hotelIds: string[] };
declare global { namespace Express { interface Request { user?: SafeUser } } }

export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.session.userId) return next();
    const user = await User.findById(req.session.userId).lean();
    if (user && user.active) req.user = { id: String(user._id), name: user.name, email: user.email, role: user.role, hotelIds: user.hotelIds.map(String) };
    next();
  } catch (error) { next(error); }
}
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}
export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to perform this action' });
    next();
  };
}
export function canAccessHotel(req: Request, hotelId: string) {
  return req.user?.role === 'admin' || Boolean(req.user?.hotelIds.includes(hotelId));
}
