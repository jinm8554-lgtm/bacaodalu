import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { db, now } from './db';
import { clearSession, requireAdmin, requireAuth, setSession } from './auth';

const app = express();
app.use(express.json({ limit: '8mb' }));
app.use(cookieParser());

const { INITIAL_GOLD, CHARACTER_DB, NATIONS_DB } = await import('../constants');

// 将项目内置角色纳入 GM 人物库。仅补充不存在的角色，避免覆盖 GM 已编辑的档案。
const seedBuiltInCharacters = db.transaction(() => {
  const insert = db.prepare('INSERT OR IGNORE INTO gm_characters(id, data_json, image_url, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
  const timestamp = now();
  for (const character of CHARACTER_DB as any[]) {
    const data = JSON.parse(JSON.stringify(character));
    insert.run(String(data.id), JSON.stringify(data), String(data.imageUrl || ''), 'published', timestamp, timestamp);
  }
});
seedBuiltInCharacters();

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
    settings: { model: '', availableModels: [], volume: 50, chatFontSize: 14, voiceEnabled: true, responseLength: 2000, autoModeEnabled: false, activeCharacterIds: ['2'] }
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

function syncPublishedCharacters(profile: any) {
  const rows = db.prepare('SELECT data_json as dataJson, image_url as imageUrl FROM gm_characters').all() as any[];
  const published = rows.map(row => {
    const data = JSON.parse(row.dataJson);
    return { ...data, imageUrl: row.imageUrl || data.imageUrl || '' };
  });
  const existing = new Map((Array.isArray(profile.roster) ? profile.roster : []).map((character: any) => [String(character.id), character]));
  for (const template of published) {
    const current = existing.get(String(template.id));
    if (!current) {
      profile.roster.push({ ...template, level: Number(template.level) || 1, exp: Number(template.exp) || 0, bond: Number(template.bond) || 0, equipment: template.equipment || {}, isOwned: false });
      continue;
    }
    existing.set(String(template.id), {
      ...template,
      level: current.level,
      exp: current.exp,
      bond: current.bond,
      equipment: current.equipment || {},
      isOwned: current.isOwned,
      contractHistory: current.contractHistory
    });
  }
  profile.roster = profile.roster.map((character: any) => existing.get(String(character.id)) || character);
  return profile;
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/ai/model', requireAuth, (_req, res) => {
  const config = db.prepare('SELECT model FROM ai_config WHERE id = 1').get() as any;
  res.json({ model: config?.model || '' });
});

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
    res.json(await accountPayload(Number(result.lastInsertRowid), username, 'member'));
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
  const normalized = syncPublishedCharacters(normalizeProfile(profile ? JSON.parse(profile.state_json) : null));
  const aiConfig = db.prepare('SELECT model FROM ai_config WHERE id = 1').get() as any;
  const configuredModel = String(aiConfig?.model || '');
  normalized.settings = { ...normalized.settings, model: configuredModel, availableModels: configuredModel ? [configuredModel] : [] };
  if (profile && JSON.stringify(normalized) !== profile.state_json) db.prepare('UPDATE game_profiles SET state_json = ?, revision = revision + 1, updated_at = ? WHERE user_id = ?').run(JSON.stringify(normalized), now(), userId);
  return { user, membership, tokens: tokens?.balance || 0, profile: normalized, profileMeta: profile ? { revision: profile.revision, updatedAt: profile.updatedAt } : null };
}

app.get('/api/me', requireAuth, async (req, res) => res.json(await accountPayload(req.user!.id)));

app.get('/api/game/profile', requireAuth, async (req, res) => res.json((await accountPayload(req.user!.id)).profile));
app.get('/api/game/characters', requireAuth, (_req, res) => {
  const rows = db.prepare('SELECT data_json as dataJson, image_url as imageUrl, status, updated_at as updatedAt FROM gm_characters ORDER BY id').all() as any[];
  res.json(rows.map(row => {
    const data = JSON.parse(row.dataJson);
    return { ...data, imageUrl: row.imageUrl || data.imageUrl || '', status: row.status, updatedAt: row.updatedAt };
  }));
});
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
  const estimated = Math.min(8192, Math.max(1, Number(req.body?.max_tokens) || 100));
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
app.post('/api/gm/ai-models', requireAuth, requireAdmin, async (req, res) => {
  const baseUrl = String(req.body?.baseUrl || '').trim().replace(/\/+$/, '');
  const apiKey = String(req.body?.apiKey || '').trim();
  if (!baseUrl) return res.status(400).json({ error: '请先填写 Base URL' });
  const modelsUrl = baseUrl.endsWith('/v1') ? `${baseUrl}/models` : `${baseUrl}/v1/models`;
  try {
    const headers: Record<string, string> = {};
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const response = await fetch(modelsUrl, { headers, signal: AbortSignal.timeout(30000) });
    const text = await response.text();
    let payload: any;
    try { payload = JSON.parse(text); } catch { payload = null; }
    if (!response.ok) return res.status(502).json({ error: `模型接口返回 ${response.status}${payload?.error?.message ? `：${payload.error.message}` : ''}` });
    const models = Array.isArray(payload?.data)
      ? payload.data.map((item: any) => typeof item === 'string' ? item : item?.id || item?.name).filter((id: any): id is string => Boolean(id))
      : [];
    if (!models.length) return res.status(502).json({ error: '模型接口未返回可用模型' });
    res.json({ models: [...new Set(models)] });
  } catch (error: any) {
    res.status(502).json({ error: error?.message || '无法连接模型接口' });
  }
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

function validateCharacter(input: any) {
  const required = ['id', 'rarity', 'name', 'title', 'charClass', 'job', 'weapon', 'race', 'desc', 'appearance', 'background', 'personality', 'baseStats', 'skills', 'gachaLines'];
  if (!input || typeof input !== 'object' || required.some(key => input[key] === undefined)) return '人物档案缺少必要字段';
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(String(input.id))) return '角色 ID 只能包含字母、数字、下划线、点或短横线';
  if (!['R', 'SR', 'SSR', 'UR'].includes(input.rarity)) return '稀有度无效';
  if (!Array.isArray(input.skills) || input.skills.length !== 2) return '技能必须正好有 2 个';
  if (!Array.isArray(input.gachaLines) || input.gachaLines.length !== 3) return '角色台词必须正好有 3 条';
  for (const stat of ['ATK', 'DEF', 'CHM']) if (!Number.isFinite(Number(input.baseStats?.[stat]))) return '基础属性必须包含 ATK、DEF、CHM 数值';
  return null;
}

app.get('/api/gm/characters', requireAuth, requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT id, data_json as dataJson, image_url as imageUrl, status, created_at as createdAt, updated_at as updatedAt FROM gm_characters ORDER BY updated_at DESC').all() as any[];
  res.json(rows.map(row => ({ ...JSON.parse(row.dataJson), imageUrl: row.imageUrl || JSON.parse(row.dataJson).imageUrl || '', status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt })));
});

app.post('/api/gm/characters', requireAuth, requireAdmin, (req, res) => {
  const character = { ...req.body, imageUrl: String(req.body?.imageUrl || '') };
  const error = validateCharacter(character);
  if (error) return res.status(400).json({ error });
  const timestamp = now();
  try {
    db.prepare('INSERT INTO gm_characters(id, data_json, image_url, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(character.id, JSON.stringify(character), character.imageUrl, character.status === 'published' ? 'published' : 'draft', timestamp, timestamp);
    res.status(201).json(character);
  } catch { res.status(409).json({ error: '角色 ID 已存在' }); }
});

app.put('/api/gm/characters/:id', requireAuth, requireAdmin, (req, res) => {
  const character = { ...req.body, id: req.params.id, imageUrl: String(req.body?.imageUrl || '') };
  const error = validateCharacter(character);
  if (error) return res.status(400).json({ error });
  const result = db.prepare('UPDATE gm_characters SET data_json = ?, image_url = ?, status = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(character), character.imageUrl, character.status === 'published' ? 'published' : 'draft', now(), req.params.id);
  if (!result.changes) return res.status(404).json({ error: '角色不存在' });
  res.json(character);
});

app.delete('/api/gm/characters/:id', requireAuth, requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM gm_characters WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: '角色不存在' });
  res.json({ ok: true });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, '0.0.0.0', () => console.log(`API server listening on http://localhost:${port}`));
