import React, { useEffect, useState } from 'react';

const GMPage: React.FC = () => {
  const [overview, setOverview] = useState<any>(null);
  const [config, setConfig] = useState({ baseUrl: '', model: '', apiKey: '' });
  const [message, setMessage] = useState('');
  const [tokenForm, setTokenForm] = useState({ userId: '', amount: '' });

  const load = async () => {
    const [stats, ai] = await Promise.all([fetch('/api/gm/overview'), fetch('/api/gm/ai-config')]);
    if (!stats.ok) return setMessage('需要 GM 权限');
    setOverview(await stats.json());
    const current = await ai.json();
    setConfig(c => ({ ...c, baseUrl: current.baseUrl || '', model: current.model || '' }));
  };
  useEffect(() => { load(); }, []);

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage('');
    const response = await fetch('/api/gm/ai-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
    setMessage(response.ok ? 'AI 配置已保存' : (await response.json()).error || '保存失败');
  };
  const adjustTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/gm/tokens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: Number(tokenForm.userId), amount: Number(tokenForm.amount) }) });
    setMessage(response.ok ? 'Token 已调整' : (await response.json()).error || '调整失败');
    if (response.ok) load();
  };

  return <div className="min-h-screen bg-core text-main p-8 space-y-8">
    <div><div className="text-primary text-xs font-black tracking-[0.3em]">SANCTUARY GM</div><h1 className="text-3xl font-black mt-2">管理后台</h1></div>
    {message && <div className="glass-panel p-3 rounded-xl text-sm text-primary">{message}</div>}
    {overview && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[['用户', overview.users], ['有效会员', overview.activeMembers], ['AI 调用', overview.aiCalls], ['消耗 Token', overview.tokensUsed]].map(([label, value]) => <div className="glass-panel rounded-xl p-5" key={String(label)}><div className="text-xs text-dim">{label}</div><div className="text-2xl font-black text-primary mt-2">{value}</div></div>)}</div>}
    <div className="grid md:grid-cols-2 gap-6">
      <form onSubmit={saveConfig} className="glass-panel-heavy rounded-2xl p-6 space-y-4"><h2 className="font-black text-lg">AI 服务配置</h2><input required value={config.baseUrl} onChange={e => setConfig({ ...config, baseUrl: e.target.value })} placeholder="Base URL" className="w-full bg-black/40 border border-glass rounded-xl px-4 py-3" /><input required value={config.model} onChange={e => setConfig({ ...config, model: e.target.value })} placeholder="模型 ID" className="w-full bg-black/40 border border-glass rounded-xl px-4 py-3" /><input required type="password" value={config.apiKey} onChange={e => setConfig({ ...config, apiKey: e.target.value })} placeholder="API Key（仅 GM 可见）" className="w-full bg-black/40 border border-glass rounded-xl px-4 py-3" /><button className="w-full bg-primary rounded-xl py-3 font-black">保存配置</button></form>
      <form onSubmit={adjustTokens} className="glass-panel-heavy rounded-2xl p-6 space-y-4"><h2 className="font-black text-lg">调整会员 Token</h2><input required type="number" value={tokenForm.userId} onChange={e => setTokenForm({ ...tokenForm, userId: e.target.value })} placeholder="用户 ID" className="w-full bg-black/40 border border-glass rounded-xl px-4 py-3" /><input required type="number" value={tokenForm.amount} onChange={e => setTokenForm({ ...tokenForm, amount: e.target.value })} placeholder="数量，可填负数" className="w-full bg-black/40 border border-glass rounded-xl px-4 py-3" /><button className="w-full bg-primary rounded-xl py-3 font-black">提交调整</button></form>
    </div>
  </div>;
};
export default GMPage;
