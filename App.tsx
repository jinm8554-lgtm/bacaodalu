
import React, { useState, useEffect } from 'react';
import { GameState } from './types';
import { CHARACTER_DB, NATIONS_DB, INITIAL_GOLD } from './constants';
import { saveGame, loadGame } from './services/gameService';
import Sanctuary from './components/Sanctuary';
import Harem from './components/Harem';
import Conquest from './components/Conquest';
import Library from './components/Library';
import Dashboard from './components/Dashboard';

const IconSanctuary = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>;
const IconHarem = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>;
const IconConquest = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconLibrary = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;

const App = () => {
    const [tab, setTab] = useState<'DASHBOARD' | 'SANCTUARY' | 'HAREM' | 'CONQUEST' | 'LIBRARY'>('DASHBOARD');
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [themeClass, setThemeClass] = useState('');
    const [session, setSession] = useState<any>(null);
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [authForm, setAuthForm] = useState({ username: '', password: '' });
    const [authError, setAuthError] = useState('');
    const [activeModel, setActiveModel] = useState('');
    const [authLoading, setAuthLoading] = useState(true);

    const syncPublishedCharacters = async () => {
        const response = await fetch('/api/game/characters');
        if (!response.ok) return;
        const published = await response.json();
        if (!Array.isArray(published) || published.length === 0) return;
        const byId = new Map(published.map((character: any) => [String(character.id), character]));
        setGameState(current => {
            if (!current) return current;
            let changed = false;
            const roster = current.roster.map(character => {
                const latest = byId.get(String(character.id));
                if (!latest) return character;
                // GM 档案是角色模板；保留玩家自己的等级、羁绊、装备、拥有状态和契约记录。
                const next = {
                    ...latest,
                    level: character.level,
                    exp: character.exp,
                    bond: character.bond,
                    equipment: character.equipment,
                    isOwned: character.isOwned,
                    contractHistory: character.contractHistory
                };
                if (JSON.stringify(next) !== JSON.stringify(character)) changed = true;
                return next;
            });
            const rosterIds = new Set(roster.map(character => String(character.id)));
            for (const latest of published) {
                if (rosterIds.has(String(latest.id))) continue;
                roster.push({
                    ...latest,
                    level: Number(latest.level) || 1,
                    exp: Number(latest.exp) || 0,
                    bond: Number(latest.bond) || 0,
                    equipment: latest.equipment || {},
                    isOwned: false
                });
                changed = true;
            }
            return changed ? { ...current, roster } : current;
        });
    };


    useEffect(() => {
        fetch('/api/me').then(async response => {
            if (!response.ok) return;
            const account = await response.json();
            setSession(account);
            setActiveModel(account.profile?.settings?.model || '');
            const saved = account.profile;
        
        const lilithTemplate = CHARACTER_DB.find(c => c.id === "2") || CHARACTER_DB[0];
        const initialRoster = [JSON.parse(JSON.stringify(lilithTemplate))];
        initialRoster[0].isOwned = true;

        const defaultState: GameState = {
            gold: INITIAL_GOLD,
            roster: initialRoster,
            inventory: [],
            party: [initialRoster[0].id],
            nations: JSON.parse(JSON.stringify(NATIONS_DB)),
            chatHistory: [{
                id: 'init', senderId: '2', senderName: '莉莉丝', content: '主人~ 莉莉丝已经在圣殿等候多时了。请尽情地命令我吧，主人~', timestamp: Date.now()
            }],
            conversationSummary: '圣殿的主人降临，首席魅魔莉莉丝接驾。',
            logs: [],
            settings: { 
                model: '',
                availableModels: [],
                volume: 50, 
                chatFontSize: 14,
                voiceEnabled: true,
                responseLength: 2000, 
                autoModeEnabled: false,
                activeCharacterIds: ["2"]
            }
        };

        if (saved) {
            // Intelligent Migration Logic
            // Merge saved state
            const mergedSettings = {
                ...defaultState.settings,
                ...saved.settings,
                model: saved.settings.model || defaultState.settings.model,
                availableModels: saved.settings.availableModels?.length ? saved.settings.availableModels : defaultState.settings.availableModels,
            };

            // 角色模板由服务端 GM 人物库同步，避免旧版静态常量覆盖 GM 的最新资料。
            const loadedRoster = (saved.roster && saved.roster.length > 0) ? saved.roster : defaultState.roster;

            setGameState({
                ...defaultState,
                ...saved,
                roster: loadedRoster,
                inventory: saved.inventory || [],
                chatHistory: saved.chatHistory || defaultState.chatHistory,
                party: (saved.party && saved.party.length > 0) ? saved.party : defaultState.party,
                nations: saved.nations || defaultState.nations,
                logs: saved.logs || [],
                settings: mergedSettings
            });
        } else setGameState(defaultState);
        }).catch(() => undefined).finally(() => setAuthLoading(false));
    }, []);

    useEffect(() => {
        if (!session) return;
        syncPublishedCharacters().catch(() => undefined);
        const timer = window.setInterval(() => syncPublishedCharacters().catch(() => undefined), 10000);
        return () => window.clearInterval(timer);
    }, [session]);

    useEffect(() => {
        if (!session) return;
        let alive = true;
        const loadModel = async () => {
            try {
                const response = await fetch('/api/ai/model');
                if (!response.ok) return;
                const data = await response.json();
                if (alive) setActiveModel(data.model || '');
            } catch { /* Keep the last known model during a transient network error. */ }
        };
        loadModel();
        const timer = window.setInterval(loadModel, 10000);
        return () => { alive = false; window.clearInterval(timer); };
    }, [session]);

    useEffect(() => {
        if (gameState) {
            saveGame(gameState).catch(error => console.error(error));
        }
    }, [gameState]);

    if (authLoading) return <LoadingScreen />;
    if (!session) return <AuthScreen mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm} error={authError} onSubmit={async () => {
        setAuthError('');
        const response = await fetch(`/api/auth/${authMode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(authForm) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return setAuthError(data.error || '认证失败');
        setSession(data);
        setActiveModel(data.profile?.settings?.model || '');
        setGameState(data.profile);
    }} />;
    if (!gameState) return <LoadingScreen label="正在读取会员档案..." />;

    const updateState = (partial: Partial<GameState>) => {
        setGameState(prev => prev ? ({ ...prev, ...partial }) : null);
    };

    const navigate = (next: 'SANCTUARY' | 'HAREM' | 'CONQUEST' | 'LIBRARY') => setTab(next);

    return (
        <div className={`flex h-screen overflow-hidden font-serif selection:bg-primary selection:text-white ${themeClass}`}>
            {/* Sidebar with Glass Effect */}
            <div className={`${sidebarCollapsed ? 'w-20' : 'w-64'} hidden md:flex glass-panel border-r border-glass flex-col z-50 transition-all duration-300 relative`}>
                <button 
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="absolute -right-3 top-24 w-6 h-6 rounded-full flex items-center justify-center border border-primary bg-core text-primary z-50 transition-all hover:scale-110"
                >
                    <svg className={`w-3 h-3 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>

                <div className={`h-20 flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-6'} border-b border-glass`}>
                            <button 
                        onClick={() => session?.user?.role === 'admin' ? window.open('/gm', '_blank') : undefined}
                        className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent border border-primary flex items-center justify-center font-bold text-xs shadow-[0_0_15px_var(--primary-glow)] shrink-0 text-white hover:scale-110 transition-transform group"
                        title={session?.user?.role === 'admin' ? '打开 GM 后台' : 'AI 由 GM 统一管理'}
                    >
                        <svg className="w-4 h-4 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                    {!sidebarCollapsed && (
                        <div className="ml-3 animate-fade-in">
                            <div className="text-[10px] uppercase tracking-widest font-black text-primary neon-text">SANCTUARY</div>
                            <div className="font-bold text-sm tracking-tighter text-main">征服帝国</div>
                        </div>
                    )}
                </div>

                <div className="flex-1 py-6 space-y-2">
                    <NavButton collapsed={sidebarCollapsed} active={tab === 'DASHBOARD'} onClick={() => setTab('DASHBOARD')} icon={<span className="text-lg">⌂</span>} label="总览" />
                    <NavButton collapsed={sidebarCollapsed} active={tab === 'SANCTUARY'} onClick={() => setTab('SANCTUARY')} icon={<IconSanctuary />} label="圣殿" />
                    <NavButton collapsed={sidebarCollapsed} active={tab === 'HAREM'} onClick={() => setTab('HAREM')} icon={<IconHarem />} label="后宫" />
                    <NavButton collapsed={sidebarCollapsed} active={tab === 'CONQUEST'} onClick={() => setTab('CONQUEST')} icon={<IconConquest />} label="征服" />
                    <NavButton collapsed={sidebarCollapsed} active={tab === 'LIBRARY'} onClick={() => setTab('LIBRARY')} icon={<IconLibrary />} label="档案" />
                </div>

                {/* Theme Switcher Footer */}
                <div className="p-4 border-t border-glass bg-glass-heavy backdrop-blur-md">
                     <div className="flex justify-center gap-3 mb-4">
                        <button onClick={() => setThemeClass('')} className={`w-4 h-4 rounded-full bg-[#ff0055] border border-white/20 transition-transform hover:scale-125 ${themeClass==='' ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`} title="深渊 (默认)" />
                        <button onClick={() => setThemeClass('theme-gold')} className={`w-4 h-4 rounded-full bg-[#d4af37] border border-white/20 transition-transform hover:scale-125 ${themeClass==='theme-gold' ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`} title="堕落圣所" />
                        <button onClick={() => setThemeClass('theme-venom')} className={`w-4 h-4 rounded-full bg-[#00ff9d] border border-white/20 transition-transform hover:scale-125 ${themeClass==='theme-venom' ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`} title="赛博毒液" />
                        <button onClick={() => setThemeClass('theme-blood')} className={`w-4 h-4 rounded-full bg-[#ff2a2a] border border-white/20 transition-transform hover:scale-125 ${themeClass==='theme-blood' ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`} title="猩红天鹅绒" />
                     </div>
                    <div className="glass-panel rounded-xl p-3 flex items-center justify-center gap-3 transition-all hover:neon-border group">
                        <span className="text-xl drop-shadow-lg filter grayscale opacity-80 group-hover:grayscale-0">🪙</span>
                        {!sidebarCollapsed && <span className="font-mono font-bold tracking-wider text-primary neon-text">{gameState.gold.toLocaleString()}</span>}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                <header className="flex h-16 shrink-0 items-center justify-between border-b border-glass bg-glass-heavy/80 px-4 backdrop-blur-xl sm:px-6">
                    <div><div className="text-[10px] font-black tracking-[0.3em] text-primary">SANCTUARY COMMAND</div><div className="text-sm font-bold text-white">八草圣殿 · 征服帝国</div></div>
                    <div className="flex items-center gap-2 sm:gap-4"><div className="hidden text-right sm:block"><div className="text-[10px] text-dim">契约档案</div><div className="text-xs font-bold text-white">{session?.user?.username || '会员'}</div></div><div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-black text-primary">🪙 {gameState.gold.toLocaleString()}</div></div>
                </header>
                <div className="relative z-10 flex-1 overflow-hidden">
                    {tab === 'DASHBOARD' && <Dashboard state={gameState} onNavigate={navigate} />}
                    {tab === 'SANCTUARY' && <Sanctuary state={gameState} updateState={updateState} />}
                    {tab === 'HAREM' && <Harem state={gameState} updateState={updateState} modelKey={activeModel} />}
                    {tab === 'CONQUEST' && <Conquest state={gameState} updateState={updateState} modelKey={activeModel} />}
                    {tab === 'LIBRARY' && <Library state={gameState} updateState={updateState} />}
                </div>
            </div>

        </div>
    );
};

const NavButton = ({ active, onClick, icon, label, collapsed }: any) => (
    <button 
        onClick={onClick} 
        title={collapsed ? label : ''}
        className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'px-4 md:px-6'} py-4 transition-all duration-300 group relative ${
            active 
            ? 'border-l-4 border-primary bg-primary/10 text-main' 
            : 'text-dim hover:text-primary hover:bg-white/5 border-l-4 border-transparent'
        }`}
    >
        <div className={`p-1 transition-transform group-hover:scale-110 ${active ? 'text-primary drop-shadow-[0_0_8px_var(--primary-glow)]' : ''}`}>
            {icon}
        </div>
        {!collapsed && (
            <span className="ml-4 text-xs font-black uppercase tracking-[0.2em] transition-all animate-fade-in">
                {label}
            </span>
        )}
        {active && <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent pointer-events-none" />}
    </button>
);

const AuthScreen = ({ mode, setMode, form, setForm, error, onSubmit }: any) => (
    <div className="relative min-h-screen overflow-hidden bg-core text-main">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/sanctuary-login-bg.png)' }} />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,1,10,0.18)_0%,rgba(5,1,10,0.45)_42%,rgba(5,1,10,0.9)_72%,rgba(5,1,10,0.98)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_45%,transparent_0%,rgba(5,1,10,0.25)_45%,rgba(5,1,10,0.8)_100%)]" />
        <div className="relative z-10 min-h-screen grid lg:grid-cols-[1fr_440px] items-center gap-10 px-6 py-10 lg:px-16 xl:px-24">
            <div className="hidden lg:block max-w-xl self-end pb-12 animate-slide-up">
                <div className="text-primary text-xs font-black tracking-[0.45em] uppercase neon-text">SANCTUARY · CONQUEST EMPIRE</div>
                <h1 className="mt-4 text-5xl xl:text-7xl font-black tracking-tight text-white drop-shadow-[0_0_24px_rgba(255,0,85,0.35)]">八草圣殿</h1>
                <p className="mt-3 text-xl text-white/80 tracking-[0.3em]">征服帝国</p>
                <div className="mt-7 h-px w-28 bg-primary shadow-[0_0_14px_var(--primary-glow)]" />
                <p className="mt-5 max-w-md text-sm leading-7 text-white/60">圣殿已为新的主人敞开。建立会员档案，召集魔将，踏上征服卡拉多恩的道路。</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="w-full max-w-md justify-self-center lg:justify-self-end glass-panel-heavy rounded-3xl p-7 sm:p-9 space-y-5 border border-primary/30 shadow-[0_0_60px_rgba(0,0,0,0.55),0_0_24px_rgba(255,0,85,0.12)] backdrop-blur-xl">
                <div>
                    <div className="text-primary text-xs font-black tracking-[0.35em]">SANCTUARY</div>
                    <h2 className="text-3xl font-black mt-2 text-white">{mode === 'login' ? '进入圣殿' : '建立契约档案'}</h2>
                    <p className="text-dim text-xs mt-3 leading-6">游戏档案由服务器安全保存，AI 权限由会员资格和 Token 控制。</p>
                </div>
                <div className="space-y-3">
                    <label className="block text-[10px] text-dim tracking-widest uppercase">会员 ID<input required minLength={3} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="输入会员 ID" className="mt-1 w-full bg-black/45 border border-glass rounded-xl px-4 py-3.5 outline-none focus:border-primary focus:shadow-[0_0_16px_var(--primary-glow)] transition-all" /></label>
                    <label className="block text-[10px] text-dim tracking-widest uppercase">访问密钥<input required minLength={8} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="输入访问密钥" className="mt-1 w-full bg-black/45 border border-glass rounded-xl px-4 py-3.5 outline-none focus:border-primary focus:shadow-[0_0_16px_var(--primary-glow)] transition-all" /></label>
                </div>
                {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-300 text-xs">{error}</div>}
                <button className="w-full py-3.5 bg-primary hover:brightness-110 rounded-xl font-black tracking-widest shadow-[0_0_24px_var(--primary-glow)] transition-all active:scale-[0.99]">{mode === 'login' ? '开启圣殿' : '建立会员档案'}</button>
                <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="w-full text-xs text-dim hover:text-primary transition-colors">{mode === 'login' ? '尚未建立档案？注册会员' : '已有档案？返回登录'}</button>
                <div className="pt-2 text-center text-[10px] text-white/30 tracking-wider">SECURE CLOUD ARCHIVE · AI SANCTUARY LINK</div>
            </form>
        </div>
    </div>
);

const MobileNav = ({ active, onClick, icon, label }: any) => <button onClick={onClick} className={`flex flex-col items-center gap-1 py-3 text-[10px] font-bold tracking-widest ${active ? 'text-primary' : 'text-dim'}`}><span className="text-lg leading-none">{icon}</span>{label}</button>;

const LoadingScreen = ({ label = '正在连接圣殿...' }: { label?: string }) => (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-core px-6 text-main">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,85,0.14),transparent_55%)]" />
        <div className="relative z-10 text-center">
            <div className="mx-auto mb-5 h-12 w-12 animate-pulse rounded-full border border-primary/50 bg-primary/10 shadow-[0_0_28px_var(--primary-glow)]" />
            <div className="text-xs font-black tracking-[0.3em] text-primary">SANCTUARY</div>
            <div className="mt-3 text-sm text-dim">{label}</div>
        </div>
    </div>
);

export default App;
