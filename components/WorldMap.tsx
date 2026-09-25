import React, { useMemo } from 'react';
import { Nation, Level } from '../types';

interface VisualNode {
    levelId: string;
    x: number; 
    y: number; 
    bossAvatarColor: string;
    bossMeasurements: string; 
    bossLine: string;
    bossImage?: string; 
}

interface NationVisuals {
    id: string;
    themeColor: string; 
    nodes: VisualNode[];
}

const NATION_VISUAL_DB: NationVisuals[] = [
    {
        id: 'n1', 
        themeColor: 'emerald',
        nodes: [
            { 
                levelId: 'l1-1', x: 15, y: 80, bossAvatarColor: 'bg-emerald-300', 
                bossMeasurements: 'B82/W58/H84', bossLine: "新兵？哼，别被我的长矛刺穿了。", bossImage: "https://picsum.photos/seed/vera/200/300" 
            },
            { 
                levelId: 'l1-2', x: 35, y: 65, bossAvatarColor: 'bg-emerald-500', 
                bossMeasurements: 'B90/W60/H88', bossLine: "要塞的大门只为强者敞开...或者变态。", bossImage: "https://picsum.photos/seed/fort/200/300"
            },
            { 
                levelId: 'l1-3', x: 25, y: 40, bossAvatarColor: 'bg-emerald-400', 
                bossMeasurements: 'B78/W55/H80', bossLine: "森林里可是很危险的，大哥哥~", bossImage: "https://picsum.photos/seed/forest/200/300"
            },
            { 
                levelId: 'l1-4', x: 60, y: 50, bossAvatarColor: 'bg-emerald-600', 
                bossMeasurements: 'B78/W55/H80', bossLine: "嘘，猎物上钩了。", bossImage: "https://picsum.photos/seed/hunt/200/300"
            },
            { 
                levelId: 'l1-5', x: 80, y: 25, bossAvatarColor: 'bg-emerald-700', 
                bossMeasurements: 'B85/W56/H86', bossLine: "就算是维拉，也不会轻易屈服的！", bossImage: "https://picsum.photos/seed/boss1/200/300"
            },
        ]
    },
    {
        id: 'n2', 
        themeColor: 'amber',
        nodes: [
            { 
                levelId: 'l2-1', x: 15, y: 75, bossAvatarColor: 'bg-amber-300', 
                bossMeasurements: 'B88/W60/H90', bossLine: "这沙漠的热度，比得上你的欲望吗？", bossImage: "https://picsum.photos/seed/sand/200/300"
            },
            { 
                levelId: 'l2-2', x: 30, y: 50, bossAvatarColor: 'bg-amber-500', 
                bossMeasurements: 'B92/W62/H94', bossLine: "迷失在沙暴中，或者迷失在我怀里。", bossImage: "https://picsum.photos/seed/scorp/200/300"
            },
            { 
                levelId: 'l2-3', x: 55, y: 65, bossAvatarColor: 'bg-amber-400', 
                bossMeasurements: 'B90/W60/H88', bossLine: "只要价格合适，什么都可以卖哦~", bossImage: "https://picsum.photos/seed/market/200/300"
            },
            { 
                levelId: 'l2-4', x: 65, y: 35, bossAvatarColor: 'bg-pink-400', 
                bossMeasurements: 'B85/W56/H85', bossLine: "啊哈...要来打一针吗？很舒服的...", bossImage: "https://picsum.photos/seed/poison/200/300"
            },
            { 
                levelId: 'l2-5', x: 85, y: 20, bossAvatarColor: 'bg-amber-600', 
                bossMeasurements: 'B96/W58/H92', bossLine: "想看我的肚皮舞？那是给征服者的奖励。", bossImage: "https://picsum.photos/seed/dancer/200/300"
            },
        ]
    },
    {
        id: 'n3',
        themeColor: 'cyan',
        nodes: [
            { 
                levelId: 'l3-1', x: 20, y: 80, bossAvatarColor: 'bg-cyan-300', 
                bossMeasurements: 'B85/W58/H88', bossLine: "想过这片海，得先留下买路财...或者你的身体。", bossImage: "https://picsum.photos/seed/port/200/300" 
            },
            { 
                levelId: 'l3-2', x: 45, y: 70, bossAvatarColor: 'bg-cyan-500', 
                bossMeasurements: 'B88/W60/H90', bossLine: "珊瑚会割破你的皮肤，就像我会割破你的钱包。", bossImage: "https://picsum.photos/seed/reef/200/300" 
            },
            { 
                levelId: 'l3-3', x: 30, y: 45, bossAvatarColor: 'bg-cyan-400', 
                bossMeasurements: 'Unknown', bossLine: "咕噜咕噜...好温暖...", bossImage: "https://picsum.photos/seed/slime/200/300" 
            },
            { 
                levelId: 'l3-4', x: 65, y: 55, bossAvatarColor: 'bg-cyan-600', 
                bossMeasurements: 'B90/W62/H92', bossLine: "深海的压力，你承受得住吗？", bossImage: "https://picsum.photos/seed/deepsea/200/300" 
            },
            { 
                levelId: 'l3-5', x: 80, y: 30, bossAvatarColor: 'bg-cyan-700', 
                bossMeasurements: 'B86/W58/H88', bossLine: "这笔交易，我会让你连灵魂都赔进去。", bossImage: "https://picsum.photos/seed/coco/200/300" 
            },
        ]
    },
    {
        id: 'n4', 
        themeColor: 'lime',
        nodes: [
            { 
                levelId: 'l4-1', x: 15, y: 85, bossAvatarColor: 'bg-lime-300', 
                bossMeasurements: 'B80/W55/H82', bossLine: "迷雾会带走你的理智，只剩下最原始的本能。", bossImage: "https://picsum.photos/seed/mist/200/300" 
            },
            { 
                levelId: 'l4-2', x: 35, y: 60, bossAvatarColor: 'bg-lime-500', 
                bossMeasurements: 'B84/W58/H86', bossLine: "我的箭，可是涂了媚药的哦。", bossImage: "https://picsum.photos/seed/tree/200/300" 
            },
            { 
                levelId: 'l4-3', x: 55, y: 75, bossAvatarColor: 'bg-lime-400', 
                bossMeasurements: 'B105/W65/H100', bossLine: "要来喝点...我的奶吗？", bossImage: "https://picsum.photos/seed/cow/200/300" 
            },
            { 
                levelId: 'l4-4', x: 70, y: 40, bossAvatarColor: 'bg-lime-600', 
                bossMeasurements: 'B88/W60/H88', bossLine: "如果你被树根缠住，我可不负责~", bossImage: "https://picsum.photos/seed/roots/200/300" 
            },
            { 
                levelId: 'l4-5', x: 85, y: 20, bossAvatarColor: 'bg-lime-700', 
                bossMeasurements: 'B78/W54/H80', bossLine: "嘻嘻，我们姐妹俩会好好招待你的！", bossImage: "https://picsum.photos/seed/twins/200/300" 
            },
        ]
    },
    {
        id: 'n5',
        themeColor: 'purple',
        nodes: [
            { 
                levelId: 'l5-1', x: 50, y: 85, bossAvatarColor: 'bg-purple-300', 
                bossMeasurements: 'B85/W60/H88', bossLine: "为了信仰献身...是我的荣幸。", bossImage: "https://picsum.photos/seed/pilgrim/200/300" 
            },
            { 
                levelId: 'l5-2', x: 25, y: 65, bossAvatarColor: 'bg-purple-500', 
                bossMeasurements: 'B88/W58/H90', bossLine: "痛苦...是通往极乐的捷径。", bossImage: "https://picsum.photos/seed/kage/200/300" 
            },
            { 
                levelId: 'l5-3', x: 75, y: 65, bossAvatarColor: 'bg-purple-400', 
                bossMeasurements: 'B90/W62/H92', bossLine: "你的罪孽...就让我用身体来洗刷吧。", bossImage: "https://picsum.photos/seed/hall/200/300" 
            },
            { 
                levelId: 'l5-4', x: 50, y: 45, bossAvatarColor: 'bg-purple-600', 
                bossMeasurements: 'B86/W59/H88', bossLine: "违反校规的话，可是要接受惩罚的哦。", bossImage: "https://picsum.photos/seed/violet/200/300" 
            },
            { 
                levelId: 'l5-5', x: 50, y: 20, bossAvatarColor: 'bg-purple-700', 
                bossMeasurements: 'B92/W60/H94', bossLine: "神啊，请原谅我...啊...不，请惩罚我！", bossImage: "https://picsum.photos/seed/sera/200/300" 
            },
        ]
    }
];

interface Props {
    nations: Nation[];
    selectedNationId: string;
    onSelectNation: (id: string) => void;
    onSelectLevel: (level: Level) => void;
    currentLevelId: string | undefined;
}

const WorldMap: React.FC<Props> = ({ nations, selectedNationId, onSelectNation, onSelectLevel, currentLevelId }) => {
    
    const selectedNation = nations.find(n => n.id === selectedNationId);
    const visuals = NATION_VISUAL_DB.find(v => v.id === selectedNationId) || NATION_VISUAL_DB[0];

    // SVG maps kept as they were, but wrapper div updated to use glass classes.
    const renderLorenMap = () => (
        <svg className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
                <linearGradient id="lorenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#064e3b" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#022c22" stopOpacity="0.9" />
                </linearGradient>
                <pattern id="grassPattern" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 0 10 L 5 0 L 10 10" fill="none" stroke="#10b981" strokeWidth="0.5" opacity="0.1"/>
                </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#lorenGrad)" />
            <rect width="100" height="100" fill="url(#grassPattern)" />
            <path d="M -10 80 Q 20 70 35 65 T 60 50 T 80 25" fill="none" stroke="#34d399" strokeWidth="0.5" opacity="0.3" className="animate-pulse" />
            <path d="M 15 80 L 35 65 L 60 50 L 80 25" fill="none" stroke="#059669" strokeWidth="1.5" strokeDasharray="1 1" opacity="0.3" />
        </svg>
    );

    const renderIvermanMap = () => (
        <svg className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
                <linearGradient id="ivermanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#78350f" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#451a03" stopOpacity="0.95" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" fill="url(#ivermanGrad)" />
            <path d="M 0 60 Q 30 40 60 60 T 100 50 L 100 100 L 0 100 Z" fill="#92400e" opacity="0.3" />
            <path d="M 0 80 Q 40 60 80 80 T 120 70 L 120 100 L 0 100 Z" fill="#b45309" opacity="0.4" />
            <path d="M 10 20 H 90" stroke="#fcd34d" strokeWidth="0.2" opacity="0.2" className="animate-shimmer" />
            <path d="M 20 30 H 80" stroke="#fcd34d" strokeWidth="0.2" opacity="0.2" className="animate-shimmer" style={{animationDelay: '1s'}} />
            <path d="M 15 75 Q 30 50 55 65 T 85 20" fill="none" stroke="#fcd34d" strokeWidth="1" strokeDasharray="2 1" opacity="0.2" />
        </svg>
    );

    const renderKalianMap = () => (
        <svg className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
                <linearGradient id="kalianGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#083344" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
                </linearGradient>
                <radialGradient id="islandGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#155e75" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#155e75" stopOpacity="0" />
                </radialGradient>
            </defs>
            <rect width="100" height="100" fill="url(#kalianGrad)" />
            <circle cx="20" cy="80" r="10" fill="url(#islandGrad)" />
            <circle cx="45" cy="70" r="12" fill="url(#islandGrad)" />
            <circle cx="30" cy="45" r="8" fill="url(#islandGrad)" />
            <circle cx="65" cy="55" r="10" fill="url(#islandGrad)" />
            <circle cx="80" cy="30" r="15" fill="url(#islandGrad)" />
            <path d="M 20 80 Q 30 75 45 70 T 80 30" fill="none" stroke="#22d3ee" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
            <path d="M 30 45 Q 50 50 65 55 T 80 30" fill="none" stroke="#22d3ee" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
        </svg>
    );

    const renderElfMap = () => (
        <svg className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
                <linearGradient id="elfGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1a2e05" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#365314" stopOpacity="0.8" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" fill="url(#elfGrad)" />
            <circle cx="10" cy="90" r="20" fill="#a3e635" filter="blur(20px)" opacity="0.1" className="animate-pulse" />
            <circle cx="90" cy="10" r="25" fill="#a3e635" filter="blur(20px)" opacity="0.1" className="animate-pulse" style={{animationDelay: '1.5s'}} />
            <path d="M 15 85 C 30 70, 50 80, 85 20" fill="none" stroke="#65a30d" strokeWidth="1" opacity="0.2" />
            <path d="M 85 20 C 60 40, 40 30, 15 85" fill="none" stroke="#84cc16" strokeWidth="0.5" opacity="0.3" strokeDasharray="5 5" />
        </svg>
    );

    const renderHolyMap = () => (
        <svg className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
                <linearGradient id="holyGrad" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#2e1065" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#581c87" stopOpacity="0.8" />
                </linearGradient>
                <pattern id="crossPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 V 20 M 0 10 H 20" stroke="#a855f7" strokeWidth="0.2" opacity="0.1" />
                </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#holyGrad)" />
            <rect width="100" height="100" fill="url(#crossPattern)" />
            <path d="M 50 85 L 50 20" fill="none" stroke="#d8b4fe" strokeWidth="2" opacity="0.1" />
            <path d="M 25 65 Q 50 50 75 65" fill="none" stroke="#d8b4fe" strokeWidth="0.5" opacity="0.2" />
            <circle cx="50" cy="20" r="10" fill="#d8b4fe" filter="blur(15px)" opacity="0.2" className="animate-pulse" />
        </svg>
    );

    return (
        <div className="flex flex-col md:flex-row h-full rounded-2xl overflow-hidden shadow-2xl bg-black border border-glass">
            {/* Left Sidebar: Nations */}
            <div className="w-full md:w-1/4 glass-panel border-r border-glass flex flex-col z-20">
                <div className="p-4 border-b border-glass bg-black/20">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Target Region</h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {nations.map(nation => (
                        <button
                            key={nation.id}
                            onClick={() => onSelectNation(nation.id)}
                            className={`w-full text-left p-4 border-b border-glass transition-all duration-300 relative overflow-hidden group ${
                                selectedNationId === nation.id 
                                    ? 'bg-gradient-to-r from-primary/30 to-transparent text-white' 
                                    : 'text-dim hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <div className="relative z-10 flex justify-between items-center">
                                <div>
                                    <div className={`text-sm font-bold uppercase tracking-wider ${selectedNationId === nation.id ? 'text-shadow-glow' : ''}`}>{nation.name}</div>
                                    <div className="text-[9px] opacity-60 font-mono mt-1">Conquest: {nation.progress}%</div>
                                </div>
                                {selectedNationId === nation.id && <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_var(--primary-glow)]" />}
                            </div>
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Main: Map & Nodes */}
            <div className="flex-1 relative overflow-hidden bg-core group select-none">
                {/* 1. Dynamic Background */}
                <div className="absolute inset-0 transition-opacity duration-700">
                    {selectedNationId === 'n1' ? renderLorenMap() : 
                     selectedNationId === 'n2' ? renderIvermanMap() : 
                     selectedNationId === 'n3' ? renderKalianMap() :
                     selectedNationId === 'n4' ? renderElfMap() :
                     selectedNationId === 'n5' ? renderHolyMap() :
                     <div className="absolute inset-0 w-full h-full bg-void-900/80" />}
                     
                    {/* Grid Overlay for Cyberpunk feel */}
                    <div className="absolute inset-0 opacity-10" 
                         style={{ backgroundImage: 'linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                    </div>
                </div>

                {/* 2. Map Title Overlay */}
                <div className="absolute top-6 left-6 z-10 pointer-events-none">
                    <h2 className="text-4xl font-black text-white/10 uppercase tracking-tighter scale-150 origin-top-left transform">{selectedNation?.name || 'Unknown'}</h2>
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest drop-shadow-xl absolute top-0 left-0 neon-text">{selectedNation?.name}</h2>
                    <div className="h-1 w-20 bg-primary mt-2 shadow-[0_0_10px_var(--primary-glow)]" />
                    <p className="text-xs text-primary/80 font-mono mt-2 max-w-xs">{selectedNation?.desc}</p>
                </div>

                {/* 3. Level Nodes */}
                <div className="absolute inset-0 z-20">
                    {selectedNation?.levels.map((level) => {
                        const vNode = visuals.nodes.find(n => n.levelId === level.id);
                        const posX = vNode ? vNode.x : 50;
                        const posY = vNode ? vNode.y : 50;
                        const isSelected = currentLevelId === level.id;

                        return (
                            <div 
                                key={level.id}
                                className="absolute group/node"
                                style={{ top: `${posY}%`, left: `${posX}%`, transform: 'translate(-50%, -50%)' }}
                            >
                                <div className="absolute top-1/2 left-1/2 w-32 h-[1px] bg-gradient-to-r from-primary/50 to-transparent -z-10 origin-left rotate-45 opacity-0 group-hover/node:opacity-100 transition-opacity duration-500" />

                                <button 
                                    onClick={() => onSelectLevel(level)}
                                    className={`relative flex items-center justify-center transition-all duration-300 ${isSelected ? 'scale-125' : 'hover:scale-110'}`}
                                >
                                    <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${isSelected ? 'bg-primary' : 'bg-gray-500'} duration-[3s]`} />
                                    
                                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)] z-20 transition-colors ${
                                        isSelected 
                                        ? 'bg-primary/20 border-primary text-primary' 
                                        : level.isCleared 
                                            ? 'bg-emerald-900/80 border-emerald-500 text-emerald-300' 
                                            : 'glass-panel border-glass text-dim group-hover/node:border-primary group-hover/node:text-primary'
                                    }`}>
                                        <span className="text-xl filter drop-shadow-md">💀</span>
                                    </div>
                                    
                                    <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border border-white/20 shadow-lg z-30 ${vNode?.bossAvatarColor || 'bg-gray-500'} flex items-center justify-center`}>
                                        <span className="text-[10px]">😈</span>
                                    </div>

                                    <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 flex gap-0.5 whitespace-nowrap">
                                        {Array.from({length: level.difficulty}).map((_, i) => (
                                            <span key={i} className="text-[6px] text-primary">★</span>
                                        ))}
                                    </div>
                                </button>

                                {/* Hover Tooltip */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 w-56 opacity-0 group-hover/node:opacity-100 translate-y-2 group-hover/node:translate-y-0 transition-all duration-300 pointer-events-none z-50">
                                    <div className="glass-panel-heavy border border-primary/30 rounded-xl p-3 shadow-[0_0_30px_var(--primary-glow)] relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-[1px] bg-primary animate-shimmer opacity-50" />
                                        
                                        <div className="flex gap-3">
                                            <div className="w-16 h-24 bg-black rounded-lg overflow-hidden shrink-0 border border-white/10 relative">
                                                <img src={vNode?.bossImage || "https://picsum.photos/seed/boss/200/300"} className="w-full h-full object-cover opacity-80" />
                                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent h-1/2" />
                                            </div>
                                            
                                            <div className="flex-1 flex flex-col justify-between py-1">
                                                <div>
                                                    <div className="text-[8px] text-primary uppercase font-black tracking-widest">Target Analysis</div>
                                                    <div className="text-xs text-white font-bold leading-tight mt-0.5">{level.name}</div>
                                                </div>
                                                
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[9px] text-gray-400 font-mono border-b border-white/10 pb-0.5">
                                                        <span>Measurements</span>
                                                    </div>
                                                    <div className="text-[10px] text-primary font-mono tracking-wider">
                                                        {vNode?.bossMeasurements || '???/???/???'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-3 bg-primary/10 p-2 rounded border-l-2 border-primary relative">
                                            <div className="text-[9px] text-main italic font-serif leading-relaxed">
                                                "{vNode?.bossLine || '敢踏入这里，就做好被榨干的准备吧...'}"
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-3 h-3 bg-black border-r border-b border-primary/30 transform rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default WorldMap;