
import React, { useState, useRef, useEffect } from 'react';
import { GameState, ChatMessage, Character } from '../types';
import { generateChatReply } from '../services/geminiService';

interface Props {
    state: GameState;
    updateState: (s: Partial<GameState>) => void;
}

const PLAYLIST = [
    "https://cdn1.suno.ai/c74acf00-160a-4fac-90ca-72eee59876c0.mp3",
    "https://cdn1.suno.ai/963c9d30-cff9-45af-b559-26f868b804dd.mp3"
];

const Sanctuary: React.FC<Props> = ({ state, updateState }) => {
    const [input, setInput] = useState('');
    const [settingInput, setSettingInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showFontControl, setShowFontControl] = useState(false);
    const [showPresenceControl, setShowPresenceControl] = useState(false);
    const [showLengthControl, setShowLengthControl] = useState(false);
    const [activeModel, setActiveModel] = useState('');
    
    // Music Player State
    const [currentTrack, setCurrentTrack] = useState(() => PLAYLIST[Math.floor(Math.random() * PLAYLIST.length)]);
    const [musicPlaying, setMusicPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    
    const fontSize = state.settings.chatFontSize || 14;
    const responseLength = state.settings.responseLength || 2000;
    const activeIds = state.settings.activeCharacterIds || [];
    const autoMode = state.settings.autoModeEnabled ?? false;
    
    const ownedCharacters = state.roster.filter(c => c.isOwned);

    useEffect(() => {
        let alive = true;
        const loadModel = async () => {
            try {
                const response = await fetch('/api/ai/model');
                if (!response.ok) return;
                const data = await response.json();
                if (alive) setActiveModel(data.model || '');
            } catch { /* Keep the last known model while the server is temporarily unavailable. */ }
        };
        loadModel();
        const timer = window.setInterval(loadModel, 10000);
        return () => { alive = false; window.clearInterval(timer); };
    }, []);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [state.chatHistory, fontSize]);

    // Handle Track Change Effect
    useEffect(() => {
        if (musicPlaying && audioRef.current) {
            audioRef.current.play().catch(e => console.error("Playback interrupted", e));
        }
    }, [currentTrack]);

    // Auto-play music on mount
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = 0.5; // Default volume 50%
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => setMusicPlaying(true))
                    .catch(error => {
                        console.log("Autoplay prevented by browser policy:", error);
                        setMusicPlaying(false);
                    });
            }
        }
    }, []);

    const toggleMusic = () => {
        if (!audioRef.current) return;
        if (musicPlaying) {
            audioRef.current.pause();
            setMusicPlaying(false);
        } else {
            audioRef.current.play();
            setMusicPlaying(true);
        }
    };

    const handleNextTrack = () => {
        let nextTrack;
        // Try to pick a different song if possible
        do {
            nextTrack = PLAYLIST[Math.floor(Math.random() * PLAYLIST.length)];
        } while (nextTrack === currentTrack && PLAYLIST.length > 1);
        setCurrentTrack(nextTrack);
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        // Check if API key is set
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            senderId: 'PLAYER',
            senderName: '主人',
            content: input,
            timestamp: Date.now()
        };

        const currentHistory = state.chatHistory || [];
        const newHistory = [...currentHistory, userMsg];
        updateState({ chatHistory: newHistory });
        setInput('');
        setLoading(true);

        try {
            const charProfiles = ownedCharacters
                .filter(c => activeIds.includes(c.id))
                .map(c => ({
                    id: c.id,
                    name: c.name,
                    title: c.title,
                    charClass: c.charClass,
                    race: c.race,
                    weapon: c.weapon,
                    personality: c.personality || '渴望爱慕',
                    identity: c.desc,
                    appearance: c.appearance, // Pass appearance data
                    background: c.background, // Pass background data
                    boundaries: c.boundaries,
                    consentStyle: c.consentStyle,
                    skills: c.skills,
                    level: c.level,
                    bond: c.bond
                }));

            if (charProfiles.length === 0) {
                updateState({ chatHistory: [...newHistory, {
                    id: `${Date.now()}-system`,
                    senderId: 'SYSTEM',
                    senderName: '系统',
                    content: '当前没有在场角色。请先在“在场角色”中勾选至少一名已拥有角色。',
                    timestamp: Date.now(),
                    toneTags: ['system']
                }] });
                setLoading(false);
                return;
            }

            // EXPLICITLY LOGGING THE USED MODEL FOR DEBUGGING
            const response = await generateChatReply(
                {
                    baseUrl: '',
                    model: activeModel
                },
                state.conversationSummary || "圣殿大厅。",
                newHistory.slice(-20).map(m => ({ senderName: m.senderName, content: m.content })),
                charProfiles,
                input,
                settingInput,
                responseLength,
                autoMode // Pass autoMode flag
            );

            const activeProfileIds = new Set(charProfiles.map(profile => profile.id));
            const activeProfilesById = new Map(charProfiles.map(profile => [profile.id, profile]));
            const replyMessages: ChatMessage[] = (response.messages || [])
                .filter(m => activeProfileIds.has(String(m.speakerId)))
                .map((m, i) => ({
                id: (Date.now() + i + 1).toString(),
                senderId: m.speakerId,
                senderName: activeProfilesById.get(String(m.speakerId))!.name,
                content: m.content,
                timestamp: Date.now(),
                toneTags: m.toneTags
            }));
            const systemReply = (response.messages || []).find(m => String(m.speakerId) === 'sys');
            if (replyMessages.length === 0 && systemReply) {
                replyMessages.push({
                    id: `${Date.now()}-system-reply`,
                    senderId: 'SYSTEM',
                    senderName: '系统',
                    content: systemReply.content,
                    timestamp: Date.now(),
                    toneTags: ['system']
                });
            }

            updateState({ 
                chatHistory: [...newHistory, ...replyMessages],
                conversationSummary: response.summaryDelta
            });
        } catch (e: any) {
            console.error(e);
            updateState({ chatHistory: [...newHistory, {
                id: `${Date.now()}-error`,
                senderId: 'SYSTEM',
                senderName: '系统',
                content: `本次回复未完成：${e?.message || 'AI 服务暂时不可用'}。请重试。`,
                timestamp: Date.now(),
                toneTags: ['error']
            }] });
        } finally {
            setLoading(false);
        }
    };

    const togglePresence = (id: string) => {
        const newIds = activeIds.includes(id) 
            ? activeIds.filter(aid => aid !== id) 
            : [...activeIds, id];
        updateState({ settings: { ...state.settings, activeCharacterIds: newIds } });
    };

    const handleLengthChange = (val: number) => {
        updateState({ settings: { ...state.settings, responseLength: val } });
    };

    const toggleAutoMode = () => {
        updateState({ settings: { ...state.settings, autoModeEnabled: !autoMode } });
    };

    // Helper to render text mixed with markdown images
    const renderTextWithImages = (text: string, baseStyle: React.CSSProperties, className: string) => {
        // Split by markdown image syntax ![alt](url)
        const parts = text.split(/(!\[.*?\]\(.*?\))/g);
        return (
            <div className={className} style={baseStyle}>
                {parts.map((part, idx) => {
                    const imgMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
                    if (imgMatch) {
                        return (
                            <div key={idx} className="my-3 rounded-lg overflow-hidden border border-primary/30 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                                <img src={imgMatch[2]} alt={imgMatch[1]} className="w-full h-auto object-cover max-h-96" loading="lazy" />
                            </div>
                        );
                    }
                    return <span key={idx} className="whitespace-pre-wrap">{part}</span>;
                })}
            </div>
        );
    };

    // Robust content parser to handle styles correctly even if AI mixes them on one line
    const renderContent = (content: string) => {
        if (!content) return null;

        // Regex explanation:
        // 1. (\[心理\](?:(?!\[|\[).)*  -> Capture [心理] followed by text until next [
        // 2. (\[动作\](?:(?!\[|\[).)*  -> Capture [动作] followed by text until next [
        const chunks = content.split(/(\[心理\](?:(?!\[|\[).)*|\[动作\](?:(?!\[|\[).)*)/g).filter(s => s && s.trim());

        return (
            <div className="space-y-1">
                {chunks.map((chunk, i) => {
                    if (chunk.startsWith('[心理]')) {
                        return renderTextWithImages(
                            chunk, 
                            { fontSize: `${Math.max(10, fontSize - 1)}px` }, 
                            "text-red-400 italic opacity-90 leading-relaxed"
                        );
                    }
                    if (chunk.startsWith('[动作]')) {
                        return renderTextWithImages(
                            chunk,
                            { fontSize: `${Math.max(10, fontSize - 1)}px` },
                            "text-green-400 italic opacity-90 leading-relaxed"
                        );
                    }
                    // Pure dialogue - White, Normal font
                    return renderTextWithImages(
                        chunk,
                        { fontSize: `${fontSize}px` },
                        "text-white text-shadow-sm leading-relaxed"
                    );
                })}
            </div>
        );
    };

    return (
        <div className="absolute inset-0 flex flex-col">
            <audio 
                ref={audioRef} 
                src={currentTrack} 
                onEnded={handleNextTrack}
                // Removed loop to allow auto-shuffle
            />

            {/* Glass Header */}
            <div className="relative z-30 px-6 py-4 glass-panel flex justify-between items-center shadow-lg">
                <div className="flex flex-col">
                    <span className="text-xs text-primary uppercase tracking-widest font-black neon-text">圣殿大厅</span>
                    <div className="flex gap-2 items-center mt-0.5">
                        <span className="text-[9px] text-dim font-mono uppercase">Soul Link:</span>
                        <span className="text-[9px] font-mono font-bold text-green-400 animate-pulse border border-green-900 bg-green-900/20 px-1 rounded">
                            {activeModel || "DISCONNECTED"}
                        </span>
                    </div>
                </div>
                
                <div className="flex gap-2 items-center">
                    
                    {/* Music Player Control */}
                    <div className="flex items-center gap-1 bg-black/20 rounded-full p-1 border border-white/5 mr-1">
                        <button 
                            onClick={toggleMusic}
                            className={`h-7 flex items-center gap-2 px-3 rounded-full border transition-all duration-300 ${
                                musicPlaying 
                                ? 'bg-primary/20 border-primary shadow-[0_0_10px_var(--primary-glow)]' 
                                : 'glass-panel border-glass hover:bg-white/10'
                            }`}
                            title={musicPlaying ? "暂停 BGM" : "播放 BGM"}
                        >
                            <div className={`flex gap-0.5 items-end h-3 ${musicPlaying ? '' : 'opacity-50'}`}>
                                <div className={`w-0.5 bg-primary rounded-full transition-all duration-300 ${musicPlaying ? 'h-3 animate-pulse' : 'h-1'}`} style={{ animationDuration: '0.4s' }} />
                                <div className={`w-0.5 bg-primary rounded-full transition-all duration-300 ${musicPlaying ? 'h-2 animate-pulse' : 'h-1'}`} style={{ animationDuration: '0.6s' }} />
                                <div className={`w-0.5 bg-primary rounded-full transition-all duration-300 ${musicPlaying ? 'h-3 animate-pulse' : 'h-1'}`} style={{ animationDuration: '0.5s' }} />
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-wider ${musicPlaying ? 'text-primary neon-text' : 'text-dim'}`}>
                                {musicPlaying ? "ON AIR" : "BGM"}
                            </span>
                        </button>
                        <button 
                            onClick={handleNextTrack}
                            className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-dim hover:text-white transition-colors"
                            title="切歌 (Next Random Track)"
                        >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                        </button>
                    </div>

                    <div className="w-[1px] h-6 bg-white/10 mx-1" />

                    {/* Presence Selector */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowPresenceControl(!showPresenceControl)}
                            className="px-3 py-1 flex items-center gap-2 rounded-lg glass-panel hover:bg-white/10 transition-colors text-dim hover:text-primary text-[10px] font-black uppercase tracking-wider h-8"
                        >
                            👥 在场角色
                        </button>
                        {showPresenceControl && (
                            <div className="absolute top-10 right-0 p-4 rounded-2xl glass-panel-heavy w-64 max-h-80 overflow-y-auto z-50 animate-fade-in custom-scrollbar border border-primary/30 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                                <div className="text-[10px] text-dim opacity-60 mb-3 uppercase tracking-widest font-black border-b border-glass pb-1">召集已征服角色</div>
                                <div className="space-y-1">
                                    {ownedCharacters.map(c => (
                                        <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group">
                                            <input 
                                                type="checkbox" 
                                                checked={activeIds.includes(c.id)} 
                                                onChange={() => togglePresence(c.id)}
                                                className="w-4 h-4 accent-primary rounded border-glass bg-core"
                                            />
                                            <div className="flex flex-col">
                                                <span className={`text-xs font-bold ${activeIds.includes(c.id) ? 'text-primary neon-text' : 'text-dim'}`}>{c.name}</span>
                                                <span className="text-[8px] text-dim opacity-40 uppercase">{c.rarity} • {c.race}</span>
                                            </div>
                                        </label>
                                    ))}
                                    {ownedCharacters.length === 0 && <div className="text-[10px] text-dim opacity-40 text-center py-4 italic">尚未征服任何角色...</div>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Word Count Slider Toggle */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowLengthControl(!showLengthControl)}
                            className="glass-panel text-[10px] text-dim rounded-lg px-2 py-1 outline-none font-black uppercase tracking-wider cursor-pointer hover:border-primary transition-colors flex items-center gap-1 min-w-[60px] justify-center h-8"
                        >
                            <span>📝</span> {autoMode ? "AUTO" : `${responseLength}字`}
                        </button>
                        
                        {showLengthControl && (
                            <div className="absolute top-10 right-0 p-4 rounded-xl glass-panel-heavy w-64 z-50 animate-fade-in border border-primary/30 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex flex-col gap-3">
                                <div className="flex justify-between items-center border-b border-glass pb-2">
                                    <span className="text-[10px] text-primary font-black uppercase tracking-widest">回复长度控制</span>
                                    {autoMode ? (
                                        <span className="text-xs font-bold text-green-400 font-mono animate-pulse">AUTO MODE</span>
                                    ) : (
                                        <span className="text-xs font-bold text-white font-mono">{responseLength} 字</span>
                                    )}
                                </div>
                                
                                {/* Auto Mode Toggle */}
                                <div className="flex items-center justify-between px-1 py-1 bg-white/5 rounded-lg border border-white/5 mb-2">
                                    <span className="text-[9px] text-dim uppercase tracking-wider font-bold pl-1">🤖 自动判断</span>
                                    <button 
                                        onClick={toggleAutoMode}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${autoMode ? 'bg-primary' : 'bg-white/20'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${autoMode ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                {/* Slider (Disabled if Auto Mode is on) */}
                                <div className={`px-1 py-2 transition-opacity ${autoMode ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                                    <input 
                                        type="range" 
                                        min="500" 
                                        max="10000" 
                                        step="100" 
                                        value={responseLength} 
                                        onChange={(e) => handleLengthChange(Number(e.target.value))}
                                        className="w-full accent-primary h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[8px] text-dim mt-2 opacity-60 font-mono">
                                        <span>500 (短语)</span>
                                        <span>10000 (长篇)</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Font Control */}
                    <button 
                        onClick={() => setShowFontControl(!showFontControl)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg glass-panel text-dim hover:text-primary hover:border-primary transition-colors"
                    >
                        <span className="text-xs font-serif font-bold">Aa</span>
                    </button>
                    {showFontControl && (
                        <div className="absolute top-14 right-6 p-3 rounded-xl glass-panel-heavy w-48 flex items-center gap-2 z-50 animate-fade-in border border-glass">
                            <span className="text-[10px] text-dim">A</span>
                            <input 
                                type="range" min="12" max="24" step="1" 
                                value={fontSize} onChange={(e) => updateState({ settings: { ...state.settings, chatFontSize: Number(e.target.value) } })}
                                className="flex-1 accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-sm font-bold text-main">A</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth" ref={scrollRef}>
                <div className="max-w-3xl mx-auto space-y-8 pb-4">
                    {(state.chatHistory || []).map((msg) => (
                        <div key={msg.id} className={`flex ${msg.senderId === 'PLAYER' ? 'justify-end' : 'justify-start'} animate-fade-in group`}>
                            <div className={`max-w-[85%] md:max-w-[75%] p-6 relative transition-all duration-300 backdrop-blur-sm ${
                                msg.senderId === 'PLAYER' 
                                    ? 'bg-[var(--bubble-user)] text-white rounded-2xl rounded-tr-sm shadow-[0_0_12px_var(--primary-glow)] border border-white/20' 
                                    : 'bg-[var(--bubble-ai)] border-l-2 border-primary text-main rounded-r-2xl shadow-lg'
                            }`}>
                                {msg.senderId !== 'PLAYER' && (
                                    <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-2">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border border-primary bg-core text-primary shadow-[0_0_8px_var(--primary-glow)]">
                                            {msg.senderName.charAt(0)}
                                        </div>
                                        <span className="text-xs font-black tracking-widest uppercase text-primary neon-text">{msg.senderName}</span>
                                        {(msg.toneTags || []).map(tag => (
                                            <span key={tag} className="text-[9px] text-dim opacity-60 px-2 py-0.5 rounded border border-white/10 uppercase tracking-wider font-bold">{tag}</span>
                                        ))}
                                    </div>
                                )}
                                <div className="space-y-1">
                                    {msg.senderId === 'PLAYER' ? (
                                        <div className="leading-relaxed font-serif tracking-wide" style={{ fontSize: `${fontSize}px` }}>{msg.content}</div>
                                    ) : (
                                        renderContent(msg.content)
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start items-center gap-4 animate-pulse pl-4">
                            <div className="w-8 h-8 rounded-full animate-spin border-t-2 border-primary bg-transparent" />
                            <div className="glass-panel rounded-full px-5 py-2 text-primary text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_10px_var(--primary-glow)]">魔力共鸣中...</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Input Area */}
            <div className="p-6 glass-panel-heavy border-t border-glass sticky bottom-0 z-20">
                <div className="max-w-3xl mx-auto space-y-3">
                    <div className="flex gap-3 items-center bg-black/40 rounded-xl px-4 py-2 border border-white/5 transition-colors focus-within:border-primary/50">
                        <span className="text-[9px] text-primary font-black uppercase tracking-widest whitespace-nowrap">系统指令:</span>
                        <input 
                            value={settingInput}
                            onChange={e => setSettingInput(e.target.value)}
                            placeholder="重写行为矩阵..."
                            className="flex-1 bg-transparent text-xs text-dim focus:outline-none opacity-80 font-bold font-mono placeholder-white/20"
                        />
                    </div>

                    <div className="flex gap-4 items-center">
                        <input 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="向虚空低语您的命令..."
                            className="flex-1 glass-panel rounded-full px-6 py-4 text-base text-main placeholder-dim/50 focus:outline-none focus:border-primary focus:shadow-[0_0_15px_var(--primary-glow)] transition-all"
                        />
                        <button 
                            onClick={handleSend}
                            disabled={loading}
                            className="bg-primary hover:bg-opacity-80 text-white w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-[0_0_20px_var(--primary-glow)] border border-white/20 group"
                        >
                            <svg className="w-6 h-6 rotate-90 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sanctuary;
