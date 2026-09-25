
import React, { useState, useEffect } from 'react';
import { GameState } from './types';
import { CHARACTER_DB, NATIONS_DB, INITIAL_GOLD } from './constants';
import { saveGame, loadGame } from './services/gameService';
import { fetchModelsFromApi } from './services/geminiService';
import Sanctuary from './components/Sanctuary';
import Harem from './components/Harem';
import Conquest from './components/Conquest';
import Library from './components/Library';

const IconSanctuary = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>;
const IconHarem = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>;
const IconConquest = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconLibrary = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;

const App = () => {
    const [tab, setTab] = useState<'SANCTUARY' | 'HAREM' | 'CONQUEST' | 'LIBRARY'>('SANCTUARY');
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [themeClass, setThemeClass] = useState('');
    const [showSettings, setShowSettings] = useState(false);

    // Settings Temp State
    const [tempBaseUrl, setTempBaseUrl] = useState('');
    const [tempApiKey, setTempApiKey] = useState('');
    const [tempModel, setTempModel] = useState('');
    const [tempAvailableModels, setTempAvailableModels] = useState<string[]>([]);
    const [isFetchingModels, setIsFetchingModels] = useState(false);

    useEffect(() => {
        const saved = loadGame();
        
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
                apiBaseUrl: 'https://blog.tuiwen.xyz/v1',
                apiKey: 'sk-JveWu0TcxSbm2KZWbQsX47ytSaEbSv1bgydPMm3qHN2KWhUM',
                model: 'grok-4-1-thinking-1129',
                availableModels: ['grok-4-1-thinking-1129', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
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
            let finalBaseUrl = saved.settings.apiBaseUrl || defaultState.settings.apiBaseUrl;
            // If user was on the old default OpenAI URL, switch them to the new default
            if (finalBaseUrl === 'https://api.openai.com') {
                finalBaseUrl = defaultState.settings.apiBaseUrl;
            }

            // Merge saved state
            const mergedSettings = {
                ...defaultState.settings,
                ...saved.settings,
                apiBaseUrl: finalBaseUrl,
                // Only use saved key if it exists, otherwise use the new default key
                apiKey: saved.settings.apiKey || defaultState.settings.apiKey,
                // Only use saved model if it exists, otherwise use new default model
                model: saved.settings.model || defaultState.settings.model,
                availableModels: saved.settings.availableModels?.length ? saved.settings.availableModels : defaultState.settings.availableModels,
            };

            // PATCH: Sync character data from DB to loaded roster to support hot-updates of assets and lore
            let loadedRoster = (saved.roster && saved.roster.length > 0) ? saved.roster : defaultState.roster;
            loadedRoster = loadedRoster.map(char => {
                const dbChar = CHARACTER_DB.find(c => c.id === char.id);
                if (dbChar) {
                    return { 
                        ...char, 
                        imageUrl: dbChar.imageUrl,
                        appearance: dbChar.appearance,
                        background: dbChar.background,
                        desc: dbChar.desc,
                        personality: dbChar.personality
                    };
                }
                return char;
            });

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
        } else {
            setGameState(defaultState);
        }
    }, []);

    useEffect(() => {
        if (gameState) {
            saveGame(gameState);
        }
    }, [gameState]);

    const openSettings = () => {
        if (!gameState) return;
        setTempBaseUrl(gameState.settings.apiBaseUrl);
        setTempApiKey(gameState.settings.apiKey);
        setTempModel(gameState.settings.model);
        setTempAvailableModels(gameState.settings.availableModels || []);
        setShowSettings(true);
    };

    const handleFetchModels = async () => {
        if (!tempBaseUrl || !tempApiKey) return alert("请先填写完整的地址和密钥，主人~");
        setIsFetchingModels(true);
        try {
            const models = await fetchModelsFromApi(tempBaseUrl, tempApiKey);
            if (models.length > 0) {
                // Update local temp state immediately so user can see list in modal
                setTempAvailableModels(models);
                setTempModel(models[0]); // Default to first
                alert(`探测成功！发现了 ${models.length} 个虚空节点（模型）。\n请在下方的下拉菜单中选择您想使用的模型。`);
            } else {
                alert("未发现任何模型，请检查节点地址，或直接手动输入模型ID，主人~");
            }
        } catch (e: any) {
            alert(`探测失败：${e.message}\n\n提示：如果您的服务商(如Azure/Vertx/私有部署)不支持 /models 列表获取 (403/404)，请直接在下方手动输入模型ID并保存。`);
        } finally {
            setIsFetchingModels(false);
        }
    };

    const saveSettings = () => {
        if (gameState) {
            // Ensure manual entry is added to list if not present
            let newAvailable = [...tempAvailableModels];
            if (tempModel && !newAvailable.includes(tempModel)) {
                newAvailable = [tempModel, ...newAvailable];
            }
            // If list is empty but we have a model, make sure it's in there
            if (newAvailable.length === 0 && tempModel) {
                newAvailable = [tempModel];
            }

            updateState({ 
                settings: { 
                    ...gameState.settings, 
                    apiBaseUrl: tempBaseUrl, 
                    apiKey: tempApiKey,
                    model: tempModel,
                    availableModels: newAvailable
                } 
            });
            setShowSettings(false);
        }
    };

    if (!gameState) return <div className="h-screen flex items-center justify-center bg-black text-pink-500 font-serif animate-pulse">系统初始化中...</div>;

    const updateState = (partial: Partial<GameState>) => {
        setGameState(prev => prev ? ({ ...prev, ...partial }) : null);
    };

    return (
        <div className={`flex h-screen overflow-hidden font-serif selection:bg-primary selection:text-white ${themeClass}`}>
            {/* Sidebar with Glass Effect */}
            <div className={`${sidebarCollapsed ? 'w-20' : 'w-64'} glass-panel border-r border-glass flex flex-col z-50 transition-all duration-300 relative`}>
                <button 
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="absolute -right-3 top-24 w-6 h-6 rounded-full flex items-center justify-center border border-primary bg-core text-primary z-50 transition-all hover:scale-110"
                >
                    <svg className={`w-3 h-3 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>

                <div className={`h-20 flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-6'} border-b border-glass`}>
                    <button 
                        onClick={openSettings}
                        className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent border border-primary flex items-center justify-center font-bold text-xs shadow-[0_0_15px_var(--primary-glow)] shrink-0 text-white hover:scale-110 transition-transform group"
                        title="魔网调律 (API设置)"
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
                {/* Model Selector Floating Header */}
                <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-center z-40 pointer-events-none">
                    <div className="pointer-events-auto flex items-center gap-3 px-6 py-2 rounded-full glass-panel border-glass shadow-2xl transition-all duration-500 hover:neon-border bg-black/50 backdrop-blur-sm">
                        <div className="w-2 h-2 rounded-full animate-pulse bg-primary shadow-[0_0_10px_var(--primary)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-dim opacity-60 hidden md:block">核心:</span>
                        
                        {/* Main Header Dropdown */}
                        <div className="relative group">
                            <select 
                                value={gameState.settings.model} 
                                onChange={(e) => updateState({ settings: { ...gameState.settings, model: e.target.value } })}
                                className="appearance-none bg-transparent text-xs font-black uppercase tracking-widest outline-none cursor-pointer text-main hover:text-primary transition-colors max-w-[150px] pr-4 text-center"
                            >
                                {gameState.settings.availableModels.map(m => (
                                    <option key={m} value={m} className="bg-black text-main">{m}</option>
                                ))}
                            </select>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-dim opacity-50 text-[8px]">▼</div>
                        </div>

                        <button 
                             onClick={openSettings}
                             className="text-dim hover:text-white transition-colors"
                        >
                            ⚙️
                        </button>
                    </div>
                </div>

                <div className="relative z-10 flex-1 overflow-hidden pt-12">
                    {tab === 'SANCTUARY' && <Sanctuary state={gameState} updateState={updateState} />}
                    {tab === 'HAREM' && <Harem state={gameState} updateState={updateState} />}
                    {tab === 'CONQUEST' && <Conquest state={gameState} updateState={updateState} />}
                    {tab === 'LIBRARY' && <Library state={gameState} updateState={updateState} />}
                </div>
            </div>

            {/* API Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center animate-fade-in p-4">
                    <div className="w-full max-w-lg glass-panel-heavy rounded-2xl border border-primary/30 shadow-[0_0_50px_var(--primary-glow)] flex flex-col overflow-hidden max-h-[90vh]">
                        <div className="p-6 border-b border-glass bg-primary/10 flex justify-between items-center">
                            <h2 className="text-xl font-black text-white uppercase tracking-wider neon-text">魔网调律 (System Config)</h2>
                            <button onClick={() => setShowSettings(false)} className="text-dim hover:text-white">✕</button>
                        </div>
                        <div className="p-8 space-y-6 overflow-y-auto">
                            <div className="space-y-2">
                                <label className="text-xs text-primary font-black uppercase tracking-widest">Base URL (主站节点)</label>
                                <input 
                                    type="text" 
                                    value={tempBaseUrl}
                                    onChange={e => setTempBaseUrl(e.target.value)}
                                    placeholder="https://blog.tuiwen.xyz/v1"
                                    className="w-full bg-black/50 border border-glass rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:outline-none placeholder-dim/30 font-mono"
                                />
                                <p className="text-[10px] text-dim opacity-60">支持 OpenAI, DeepSeek, SiliconFlow 等兼容接口。请勿包含末尾的斜杠。</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-primary font-black uppercase tracking-widest">API Key (灵魂密钥)</label>
                                <input 
                                    type="password" 
                                    value={tempApiKey}
                                    onChange={e => setTempApiKey(e.target.value)}
                                    placeholder="sk-..."
                                    className="w-full bg-black/50 border border-glass rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:outline-none placeholder-dim/30 font-mono"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-primary font-black uppercase tracking-widest">Model ID (模型代号)</label>
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={tempModel}
                                            onChange={e => setTempModel(e.target.value)}
                                            placeholder="例如: gpt-4o, deepseek-chat"
                                            className="flex-1 bg-black/50 border border-glass rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:outline-none placeholder-dim/30 font-mono"
                                        />
                                    </div>
                                    
                                    {/* 下拉菜单选择器 - 仅当有模型列表时显示 */}
                                    {tempAvailableModels.length > 0 && (
                                        <div className="relative animate-slide-up">
                                            <select 
                                                value={tempModel} 
                                                onChange={(e) => setTempModel(e.target.value)}
                                                className="w-full appearance-none bg-primary/10 border border-primary/50 rounded-xl px-4 py-3 text-sm text-primary font-bold focus:outline-none cursor-pointer hover:bg-primary/20 transition-colors [&>option]:bg-black [&>option]:text-white"
                                            >
                                                {tempAvailableModels.map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-primary text-xs">▼</div>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-dim opacity-60">
                                    {tempAvailableModels.length > 0 
                                        ? "已成功获取列表，请从下拉菜单选择，或手动输入。" 
                                        : "如果无法自动探测 (403/404)，请手动输入模型名称。"}
                                </p>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-glass">
                                <button 
                                    onClick={handleFetchModels}
                                    disabled={isFetchingModels}
                                    className="flex-1 py-3 glass-panel border border-glass hover:border-primary hover:text-primary transition-all rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 group"
                                >
                                    {isFetchingModels ? <span className="animate-spin">↻</span> : <span className="group-hover:scale-125 transition-transform">📡</span>}
                                    探测虚空 (自动)
                                </button>
                                <button 
                                    onClick={saveSettings}
                                    className="flex-1 py-3 bg-primary hover:bg-primary/80 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_0_20px_var(--primary-glow)] transition-all active:scale-95"
                                >
                                    保存设置
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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

export default App;
