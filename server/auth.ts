import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db';

const secret = process.env.AUTH_SECRET || 'change-this-local-secret';
const cookieName = 'sanctuary_session';

export type AuthUser = { id: number; username: string; role: 'member' | 'admin' };

export function setSession(res: Response, user: AuthUser) {
  const token = jwt.sign(user, secret, { expiresIn: '7d' });
  res.cookie(cookieName, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 86400000 });
}

export function clearSession(res: Response) { res.clearCookie(cookieName); }

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const raw = req.cookies?.[cookieName];
  if (!raw) return res.status(401).json({ error: '请先登录' });
  try {
    const user = jwt.verify(raw, secret) as AuthUser;
    const row = db.prepare('SELECT id, username, role, status FROM users WHERE id = ?').get(user.id) as any;
    if (!row || row.status !== 'active') return res.status(401).json({ error: '账号不可用' });
    req.user = { id: row.id, username: row.username, role: row.role };
    next();
  } catch { return res.status(401).json({ error: '登录已过期' }); }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: '需要 GM 权限' });
  next();
}

declare global { namespace Express { interface Request { user?: AuthUser } } }
