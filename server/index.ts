import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { db, now } from './db';
import { clearSession, requireAdmin, requireAuth, setSession } from './auth';

const app = express();
app.use(express.json({ limit: '512kb' }));
app.use(cookieParser());

const { INITIAL_GOLD, CHARACTER_DB, NATIONS_DB } = await import('../constants');
function createInitialGameState() {
  const lilithTemplate = CHARACTER_DB.find((c: any) => c.id === '2') || CHARACTER_DB[0];
  const initialRoster = [{ ...JSON.parse(JSON.stringify(lilithTemplate)), isOwned: true }];
  return {
    gold: INITIAL_GOLD,
    roster: initialRoster,
    inventory: [],
    party: [initialRoster[0].id],
    nations: JSON.parse(JSON.stringify(NATIONS_DB)),
    chatHistory: [{ id: 'init', senderId: '2', senderName: '莉莉丝', content: '主人~ 莉莉丝已经在圣殿等候多时了。请尽情地命令我吧，主人~', timestamp: Date.now() }],
    conversationSummary: '圣殿的主人降临，首席魅魔莉莉丝接驾。',
    logs: [],
    settings: { model: 'grok-4-1-thinking-1129', availableModels: ['grok-4-1-thinking-1129', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'], volume: 50, chatFontSize: 14, voiceEnabled: true, responseLength: 2000, autoModeEnabled: false, activeCharacterIds: ['2'] }
  };
}
const initialGameState = createInitialGameState();

function ensureAccount(userId: number) {
  db.prepare('INSERT OR IGNORE INTO token_accounts(user_id, balance) VALUES (?, 0)').run(userId);
  db.prepare('INSERT OR IGNORE INTO memberships(user_id, plan, expires_at) VALUES (?, ?, ?)').run(userId, 'free', null);
}

function normalizeProfile(profile: any) {
  const defaults = createInitialGameState();
  if (!profile || typeof profile !== 'object') return defaults;
  const needsRoster = !Array.isArray(profile.roster) || profile.roster.length === 0;
  const needsNations = !Array.isArray(profile.nations) || profile.nations.length === 0;
  return {
    ...defaults,
    ...profile,
    roster: needsRoster ? defaults.roster : profile.roster,
    party: needsRoster ? defaults.party : (Array.isArray(profile.party) && profile.party.length ? profile.party : defaults.party),
    nations: needsNations ? defaults.nations : profile.nations,
    chatHistory: Array.isArray(profile.chatHistory) && profile.chatHistory.length ? profile.chatHistory : defaults.chatHistory,
    settings: { ...defaults.settings, ...(profile.settings || {}) }
  };
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/auth/register', async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (!/^[\w.-]{3,32}$/.test(username) || password.length < 7) return res.status(400).json({ error: '用户名至少 3 位，密码至少 7 位' });
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare('INSERT INTO users(username, password_hash, created_at) VALUES (?, ?, ?)').run(username, hash, now());
    ensureAccount(Number(result.lastInsertRowid));
    db.prepare('INSERT INTO game_profiles(user_id, state_json, updated_at) VALUES (?, ?, ?)').run(result.lastInsertRowid, JSON.stringify(initialGameState), now());
    const user = { id: Number(result.lastInsertRowid), username, role: 'member' as const };
    setSession(res, user);
    res.json({ user, profile: initialGameState, membership: { plan: 'free', expiresAt: null }, tokens: 0 });
  } catch { res.status(409).json({ error: '用户名已存在' }); }
});

app.post('/api/auth/login', async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const row = db.prepare('SELECT id, username, password_hash, role, status FROM users WHERE username = ?').get(username) as any;
  if (!row || row.status !== 'active' || !(await bcrypt.compare(password, row.password_hash))) return res.status(401).json({ error: '用户名或密码错误' });
  ensureAccount(row.id);
  setSession(res, { id: row.id, username: row.username, role: row.role });
  res.json(await accountPayload(row.id, row.username, row.role));
});

app.post('/api/auth/logout', (_req, res) => { clearSession(res); res.json({ ok: true }); });

async function accountPayload(userId: number, username?: string, role?: string) {
  const user = (db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(userId) as any) || { id: userId, username, role };
  const membership = db.prepare('SELECT plan, expires_at as expiresAt FROM memberships WHERE user_id = ?').get(userId) || { plan: 'free', expiresAt: null };
  const tokens = db.prepare('SELECT balance FROM token_accounts WHERE user_id = ?').get(userId) as any;
  const profile = db.prepare('SELECT state_json, revision, updated_at as updatedAt FROM game_profiles WHERE user_id = ?').get(userId) as any;
  const normalized = normalizeProfile(profile ? JSON.parse(profile.state_json) : null);
  if (profile && JSON.stringify(normalized) !== profile.state_json) db.prepare('UPDATE game_profiles SET state_json = ?, revision = revision + 1, updated_at = ? WHERE user_id = ?').run(JSON.stringify(normalized), now(), userId);
  return { user, membership, tokens: tokens?.balance || 0, profile: normalized, profileMeta: profile ? { revision: profile.revision, updatedAt: profile.updatedAt } : null };
}

app.get('/api/me', requireAuth, async (req, res) => res.json(await accountPayload(req.user!.id)));

app.get('/api/game/profile', requireAuth, async (req, res) => res.json((await accountPayload(req.user!.id)).profile));
app.put('/api/game/profile', requireAuth, (req, res) => {
  const state = req.body?.state;
  if (!state || typeof state !== 'object' || !Array.isArray(state.roster) || !Array.isArray(state.nations)) return res.status(400).json({ error: '游戏档案格式无效' });
  const result = db.prepare('UPDATE game_profiles SET state_json = ?, revision = revision + 1, updated_at = ? WHERE user_id = ?').run(JSON.stringify(state), now(), req.user!.id);
  if (!result.changes) db.prepare('INSERT INTO game_profiles(user_id, state_json, updated_at) VALUES (?, ?, ?)').run(req.user!.id, JSON.stringify(state), now());
  res.json({ ok: true });
});

function requireAiAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  const membership = db.prepare('SELECT plan, expires_at FROM memberships WHERE user_id = ?').get(req.user!.id) as any;
  const tokens = db.prepare('SELECT balance FROM token_accounts WHERE user_id = ?').get(req.user!.id) as any;
  const active = membership?.plan !== 'free' && (!membership.expires_at || membership.expires_at > now());
  if (!active) return res.status(402).json({ error: '当前账号没有有效会员资格' });
  if ((tokens?.balance || 0) <= 0) return res.status(402).json({ error: 'Token 余额不足' });
  next();
}

async function callProvider(body: any) {
  const config = db.prepare('SELECT base_url as baseUrl, api_key as apiKey, model FROM ai_config WHERE id = 1').get() as any;
  if (!config?.baseUrl || !config.apiKey || !config.model) throw new Error('GM 尚未配置 AI 服务');
  const base = String(config.baseUrl).replace(/\/+$/, '');
  const url = base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, model: config.model }), signal: AbortSignal.timeout(60000) });
  const text = await response.text();
  if (!response.ok) throw new Error(`AI 服务错误 ${response.status}: ${text.slice(0, 200)}`);
  return { data: JSON.parse(text), model: config.model };
}

app.post('/api/game/ai', requireAuth, requireAiAccess, async (req, res) => {
  const estimated = Math.min(500, Math.max(1, Number(req.body?.max_tokens) || 100));
  const account = db.prepare('SELECT balance FROM token_accounts WHERE user_id = ?').get(req.user!.id) as any;
  if (account.balance < estimated) return res.status(402).json({ error: 'Token 余额不足' });
  try {
    const result = await callProvider(req.body);
    const used = Math.max(1, Math.ceil(JSON.stringify(result.data).length / 4));
    const cost = Math.min(account.balance, used);
    const tx = db.transaction(() => {
      db.prepare('UPDATE token_accounts SET balance = balance - ? WHERE user_id = ?').run(cost, req.user!.id);
      db.prepare('INSERT INTO token_ledger(user_id, amount, reason, created_at) VALUES (?, ?, ?, ?)').run(req.user!.id, -cost, 'AI 调用', now());
      db.prepare('INSERT INTO ai_requests(user_id, model, tokens, status, created_at) VALUES (?, ?, ?, ?, ?)').run(req.user!.id, result.model, cost, 'success', now());
    });
    tx();
    res.json({ ...result.data, usage: { tokens: cost } });
  } catch (error: any) {
    db.prepare('INSERT INTO ai_requests(user_id, model, tokens, status, created_at) VALUES (?, ?, ?, ?, ?)').run(req.user!.id, 'unknown', 0, 'error', now());
    res.status(502).json({ error: error.message || 'AI 服务暂不可用' });
  }
});

app.get('/api/gm/overview', requireAuth, requireAdmin, (_req, res) => {
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  const activeMembers = db.prepare("SELECT COUNT(*) as count FROM memberships WHERE plan != 'free' AND (expires_at IS NULL OR expires_at > ?)").get(now()) as any;
  const calls = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(tokens), 0) as tokens FROM ai_requests').get() as any;
  res.json({ users: users.count, activeMembers: activeMembers.count, aiCalls: calls.count, tokensUsed: calls.tokens });
});

app.get('/api/gm/ai-config', requireAuth, requireAdmin, (_req, res) => {
  const config = db.prepare('SELECT base_url as baseUrl, model, CASE WHEN api_key = \'\' THEN 0 ELSE 1 END as configured FROM ai_config WHERE id = 1').get() || { baseUrl: '', model: '', configured: 0 };
  res.json(config);
});
app.put('/api/gm/ai-config', requireAuth, requireAdmin, (req, res) => {
  const baseUrl = String(req.body?.baseUrl || '').trim();
  const model = String(req.body?.model || '').trim();
  const apiKey = String(req.body?.apiKey || '').trim();
  if (!baseUrl || !model || !apiKey) return res.status(400).json({ error: 'Base URL、模型和密钥不能为空' });
  db.prepare('INSERT INTO ai_config(id, base_url, api_key, model, updated_at) VALUES (1, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET base_url=excluded.base_url, api_key=excluded.api_key, model=excluded.model, updated_at=excluded.updated_at').run(baseUrl, apiKey, model, now());
  res.json({ ok: true });
});

app.post('/api/gm/tokens', requireAuth, requireAdmin, (req, res) => {
  const userId = Number(req.body?.userId); const amount = Math.floor(Number(req.body?.amount));
  if (!Number.isInteger(userId) || !Number.isInteger(amount) || amount === 0) return res.status(400).json({ error: '用户和 Token 数量无效' });
  ensureAccount(userId);
  db.transaction(() => { db.prepare('UPDATE token_accounts SET balance = MAX(0, balance + ?) WHERE user_id = ?').run(amount, userId); db.prepare('INSERT INTO token_ledger(user_id, amount, reason, created_at) VALUES (?, ?, ?, ?)').run(userId, amount, 'GM 调整', now()); })();
  res.json({ ok: true });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, '0.0.0.0', () => console.log(`API server listening on http://localhost:${port}`));
