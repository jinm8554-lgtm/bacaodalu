
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GameState, Character, Item, Rarity } from '../types';
import { CHARACTER_DB } from '../constants';
import { pullCharacter, pullEquipment, upgradeItem } from '../services/gameService';
import ContractModal from './ContractModal';

interface Props {
    state: GameState;
    updateState: (s: Partial<GameState>) => void;
}

type HaremView = 'ROSTER' | 'INVENTORY' | 'FORGE' | 'GACHA';
type CharTab = 'PROFILE' | 'ARCHIVE' | 'EQUIP'; 
type GachaPhase = 'IDLE' | 'CHANNELING' | 'EXPLODE' | 'RESULT';

const HAREM_BGM = "https://raw.githubusercontent.com/jinm8554-lgtm/kkk/main/(Sound%20of%20ice%20clinking%20in%20a%20glass).mp3";

const Harem: React.FC<Props> = ({ state, updateState }) => {
    const [view, setView] = useState<HaremView>('ROSTER');
    const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
    const [charTab, setCharTab] = useState<CharTab>('PROFILE');
    const [gachaType, setGachaType] = useState<'CHAR' | 'ITEM'>('CHAR');
    const [showContract, setShowContract] = useState(false);
    const [voiceLoading, setVoiceLoading] = useState<string | null>(null);
    
    // Lightbox state
    const [showLightbox, setShowLightbox] = useState(false);

    // Filter
    const [filterRarity, setFilterRarity] = useState<Rarity | 'ALL'>('ALL');

    // Gacha FX
    const [gachaPhase, setGachaPhase] = useState<GachaPhase>('IDLE');
    const [gachaResults, setGachaResults] = useState<{char?: Character, item?: Item, isNew?: boolean, reward?: number}[]>([]);
    const [gachaHighestRarity, setGachaHighestRarity] = useState<Rarity>('R');
    
    // Forge
    const [selectedForgeItem, setSelectedForgeItem] = useState<Item | null>(null);
    const [forgeMessage, setForgeMessage] = useState<string>("");

    // Equipment Selection
    const [equippingSlot, setEquippingSlot] = useState<{charId: string, slot: 'WEAPON' | 'ARMOR' | 'ACCESSORY' | 'BOOTS'} | null>(null);

    // Soul Import
    const soulImportRef = useRef<HTMLInputElement>(null);

    // Audio Context for Voice Lines
    const voiceEnabled = state.settings.voiceEnabled ?? true;
    const audioContextRef = useRef<AudioContext | null>(null);

    // Background Music Ref
    const bgmRef = useRef<HTMLAudioElement | null>(null);

    // Effect: Auto-play BGM on mount
    useEffect(() => {
        if (bgmRef.current) {
            bgmRef.current.volume = 0.4; // 40% volume for ambient feel
            bgmRef.current.play().catch(e => console.log("Harem BGM autoplay prevented:", e));
        }
    }, []);

    const handlePlayVoice = async (textOrUrl: string) => {
        if (!voiceEnabled || !textOrUrl || !textOrUrl.startsWith('http')) return;
        setVoiceLoading(textOrUrl);
        try {
            if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            const response = await fetch(textOrUrl);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
            if (buffer) {
                const source = audioContextRef.current.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContextRef.current.destination);
                source.start(0);
            }
        } catch (e) {
            console.error("Audio playback failed, Master~", e);
        } finally {
            setVoiceLoading(null);
        }
    };

    const handleEquip = (item: Item | null) => {
        if (!equippingSlot) return;
        
        const targetCharIndex = state.roster.findIndex(c => c.id === equippingSlot.charId);
        if (targetCharIndex === -1) return;

        const targetChar = state.roster[targetCharIndex];
        // Cast to any to access dynamic slot property safely
        const currentEquip = (targetChar.equipment as any)[equippingSlot.slot] as Item | undefined;

        let newInventory = [...state.inventory];
        
        // 1. Remove new item from inventory if equipping
        if (item) {
            newInventory = newInventory.filter(i => i.id !== item.id);
        }

        // 2. Return old item to inventory if exists
        if (currentEquip) {
            newInventory.push(currentEquip);
        }

        // 3. Update Character
        const newChar = {
            ...targetChar,
            equipment: {
                ...targetChar.equipment,
                [equippingSlot.slot]: item || undefined
            }
        };

        // 4. Update State
        const newRoster = [...state.roster];
        newRoster[targetCharIndex] = newChar;

        updateState({
            roster: newRoster,
            inventory: newInventory
        });

        setEquippingSlot(null);
    };

    const handleExportSoul = (char: Character) => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(char));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${char.name}_Soul.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        alert(`【${char.name}】的灵魂已提取为晶石 (JSON)，请妥善保管，主人~`);
    };

    const handleImportSoul = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                // Simple validation
                if (json.name && json.rarity && json.baseStats) {
                    const newChar = { ...json, id: `import_${Date.now()}`, isOwned: true };
                    updateState({ roster: [...state.roster, newChar] });
                    alert(`成功唤醒异界灵魂：【${newChar.name}】已加入后宫，主人~`);
                } else {
                    alert("灵魂晶石已破损 (格式错误)，无法唤醒...");
                }
            } catch (err) {
                alert("无法解析灵魂结构...");
            }
        };
        reader.readAsText(file);
    };

    const ownedCharacters = state.roster.filter(c => c.isOwned);
    const filteredRoster = ownedCharacters.filter(c => filterRarity === 'ALL' || c.rarity === filterRarity);
    const selectedChar = ownedCharacters.find(c => c.id === selectedCharId);

    const GLOW_COLORS = {
        UR: 'shadow-[0_0_150px_#ff0055] border-[#ff0055]', 
        SSR: 'shadow-[0_0_150px_#fbbf24] border-[#fbbf24]',
        SR: 'shadow-[0_0_120px_#a855f7] border-[#a855f7]',
        R: 'shadow-[0_0_100px_#3b82f6] border-[#3b82f6]',
    };

    const handleGacha = (count: number) => {
        if (state.gold < count * 200) {
            alert("主人~ 金币不足，请去征服更多领土吧~");
            return;
        }

        updateState({ gold: state.gold - count * 200 });
        setGachaPhase('CHANNELING');
        setGachaResults([]);

        const results = [];
        let newRoster = [...state.roster];
        let newInventory = [...state.inventory];
        let rewardGold = 0;
        let maxRarity: Rarity = 'R';
        const rarityWeights = { UR: 4, SSR: 3, SR: 2, R: 1 };

        for (let i = 0; i < count; i++) {
            if (gachaType === 'CHAR') {
                const { char, isNew, reward } = pullCharacter(newRoster);
                results.push({ char, isNew, reward });
                if (isNew) {
                    newRoster.push(char);
                } else {
                    const charIndex = newRoster.findIndex(c => c.id === char.id);
                    if (charIndex >= 0) {
                        newRoster[charIndex] = { ...newRoster[charIndex], bond: newRoster[charIndex].bond + reward };
                    }
                }
                if (rarityWeights[char.rarity] > rarityWeights[maxRarity]) maxRarity = char.rarity;
            } else {
                const item = pullEquipment();
                results.push({ item });
                newInventory.push(item);
                if (rarityWeights[item.rarity] > rarityWeights[maxRarity]) maxRarity = item.rarity;
            }
        }

        setGachaHighestRarity(maxRarity);

        setTimeout(() => {
            setGachaPhase('EXPLODE');
            setTimeout(() => {
                updateState({ roster: newRoster, inventory: newInventory, gold: state.gold - (count * 200) + rewardGold }); 
                setGachaResults(results);
                setGachaPhase('RESULT');
            }, 800);
        }, 1500);
    };

    const handleForge = () => {
        if (!selectedForgeItem) return;
        const result = upgradeItem(selectedForgeItem, state.gold);
        if (result.success && result.newItem) {
            const newInventory = state.inventory.map(i => i.id === selectedForgeItem.id ? result.newItem! : i);
            updateState({ inventory: newInventory, gold: result.newGold! });
            setSelectedForgeItem(result.newItem);
            setForgeMessage(result.message);
        } else {
            setForgeMessage(result.message);
        }
    };

    const toggleVoice = () => {
        updateState({ settings: { ...state.settings, voiceEnabled: !voiceEnabled } });
    };

    const renderExpBar = (current: number, max: number, color: string = "bg-primary") => (
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${Math.min(100, (current / max) * 100)}%` }} />
        </div>
    );

    return (
        <div className="absolute inset-0 flex flex-col bg-core/30 overflow-hidden">
            {/* Harem Ambient BGM */}
            <audio ref={bgmRef} src={HAREM_BGM} loop className="hidden" />

            {/* Header with Sub-Nav */}
            <div className="px-6 py-4 glass-panel border-b border-glass flex justify-between items-center z-30">
                <div className="flex gap-4">
                    <button onClick={() => setView('ROSTER')} className={`text-xs font-black uppercase tracking-widest ${view === 'ROSTER' ? 'text-primary neon-text border-b border-primary' : 'text-dim hover:text-white'}`}>魔将录</button>
                    <button onClick={() => setView('INVENTORY')} className={`text-xs font-black uppercase tracking-widest ${view === 'INVENTORY' ? 'text-primary neon-text border-b border-primary' : 'text-dim hover:text-white'}`}>宝库</button>
                    <button onClick={() => setView('FORGE')} className={`text-xs font-black uppercase tracking-widest ${view === 'FORGE' ? 'text-primary neon-text border-b border-primary' : 'text-dim hover:text-white'}`}>炼金坊</button>
                    <button onClick={() => setView('GACHA')} className={`text-xs font-black uppercase tracking-widest ${view === 'GACHA' ? 'text-primary neon-text border-b border-primary' : 'text-dim hover:text-white'}`}>召唤阵</button>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={toggleVoice}
                        title={voiceEnabled ? "关闭魔力传音" : "开启魔力传音"}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg glass-panel transition-all ${voiceEnabled ? 'text-primary neon-border bg-primary/5 shadow-[0_0_10px_var(--primary-glow)]' : 'text-dim hover:text-white'}`}
                    >
                        {voiceEnabled ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {view === 'ROSTER' && (
                    <div className="flex h-full animate-fade-in">
                        {/* List & Filter */}
                        <div className="w-1/3 border-r border-glass flex flex-col bg-black/20">
                            <div className="p-3 border-b border-glass flex gap-2 overflow-x-auto custom-scrollbar">
                                {['ALL', 'UR', 'SSR', 'SR', 'R'].map(r => (
                                    <button 
                                        key={r} 
                                        onClick={() => setFilterRarity(r as any)}
                                        className={`px-3 py-1 rounded-full text-[10px] font-black transition-all whitespace-nowrap ${filterRarity === r ? 'bg-primary text-white shadow-[0_0_10px_var(--primary-glow)]' : 'glass-panel text-dim hover:text-white'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                                {filteredRoster.map(c => (
                                    <button 
                                        key={c.id} 
                                        onClick={() => setSelectedCharId(c.id)}
                                        className={`w-full p-4 rounded-xl glass-panel transition-all flex items-center gap-4 group ${selectedCharId === c.id ? 'border-primary ring-1 ring-primary/50' : 'hover:bg-white/5'}`}
                                    >
                                        <div className={`w-12 h-12 rounded-full border-2 overflow-hidden shrink-0 ${c.rarity === 'UR' ? 'border-primary shadow-[0_0_10px_var(--primary-glow)]' : 'border-glass'}`}>
                                            <img src={c.imageUrl || "https://picsum.photos/seed/harem/200/200"} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <div className="text-xs font-black uppercase text-white truncate">{c.name}</div>
                                            <div className="text-[9px] text-dim font-mono tracking-widest mt-1">{c.rarity} • LV.{c.level}</div>
                                        </div>
                                        {state.party.includes(c.id) && <div className="text-[8px] bg-primary/20 text-primary px-1.5 rounded border border-primary/30 font-black">出战中</div>}
                                    </button>
                                ))}
                                {filteredRoster.length === 0 && <div className="text-center text-dim text-xs py-8">无符合条件的魔将</div>}
                                
                                <div className="border-t border-glass mt-2 pt-4 px-2">
                                     <button 
                                        onClick={() => soulImportRef.current?.click()}
                                        className="w-full py-3 glass-panel hover:bg-white/5 text-[10px] text-dim uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all hover:text-primary border border-glass"
                                     >
                                        <span>📥</span> 唤醒异界灵魂 (导入)
                                     </button>
                                     <input type="file" ref={soulImportRef} onChange={handleImportSoul} className="hidden" accept=".json" />
                                </div>
                            </div>
                        </div>
                        
                        {/* Detail */}
                        <div className="flex-1 flex flex-col relative overflow-hidden">
                            {selectedChar ? (
                                <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar">
                                    <div className="flex gap-8 mb-8">
                                        <div className="w-48 h-72 rounded-3xl overflow-hidden border border-glass shadow-2xl shrink-0 group relative cursor-pointer" onClick={() => setShowLightbox(true)}>
                                            <img src={selectedChar.imageUrl || "https://picsum.photos/seed/harem/300/400"} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
                                            <div className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full pointer-events-none">
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h2 className="text-4xl font-black text-white uppercase tracking-tight neon-text">{selectedChar.name}</h2>
                                                    <div className="text-xs text-primary font-bold tracking-widest uppercase mt-1 opacity-80">{selectedChar.title}</div>
                                                </div>
                                                <button 
                                                    onClick={() => handleExportSoul(selectedChar)}
                                                    className="px-3 py-1.5 glass-panel text-[9px] font-black uppercase tracking-wider text-dim hover:text-primary hover:border-primary transition-all rounded-lg flex items-center gap-2"
                                                    title="将角色数据(含调教记忆)导出为文件"
                                                >
                                                    <span>📤</span> 提取灵魂
                                                </button>
                                            </div>
                                            
                                            <p className="text-xs text-dim italic leading-relaxed border-l-2 border-primary/30 pl-4 py-2 bg-primary/5 rounded-r-xl">"{selectedChar.desc}"</p>
                                            
                                            <div className="space-y-3 pt-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[9px] text-dim w-8">等级</span>
                                                    <span className="text-xs font-bold text-white w-8 text-right">{selectedChar.level}</span>
                                                    <div className="flex-1">{renderExpBar(selectedChar.exp || 0, selectedChar.level * 100, "bg-blue-500")}</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[9px] text-dim w-8">羁绊</span>
                                                    <span className="text-xs font-bold text-pink-500 w-8 text-right">♥ {selectedChar.bond}</span>
                                                    <div className="flex-1">{renderExpBar(selectedChar.bond || 0, 100, "bg-pink-500")}</div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-3 pt-2">
                                                <div className="glass-panel p-2 rounded-xl border border-glass flex flex-col items-center">
                                                    <span className="text-[9px] text-dim uppercase tracking-widest">攻击</span>
                                                    <span className="text-lg font-black text-white">{selectedChar.baseStats.ATK}</span>
                                                </div>
                                                <div className="glass-panel p-2 rounded-xl border border-glass flex flex-col items-center">
                                                    <span className="text-[9px] text-dim uppercase tracking-widest">防御</span>
                                                    <span className="text-lg font-black text-white">{selectedChar.baseStats.DEF}</span>
                                                </div>
                                                <div className="glass-panel p-2 rounded-xl border border-glass flex flex-col items-center">
                                                    <span className="text-[9px] text-dim uppercase tracking-widest">魅力</span>
                                                    <span className="text-lg font-black text-white">{selectedChar.baseStats.CHM}</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-3 pt-4">
                                                <button 
                                                    onClick={() => {
                                                        const inParty = state.party.includes(selectedChar.id);
                                                        const newParty = inParty 
                                                            ? state.party.filter(id => id !== selectedChar.id) 
                                                            : (state.party.length < 4 ? [...state.party, selectedChar.id] : state.party);
                                                        updateState({ party: newParty });
                                                    }}
                                                    className={`flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all border ${state.party.includes(selectedChar.id) ? 'bg-primary border-white/20 shadow-[0_0_15px_var(--primary-glow)]' : 'glass-panel border-glass hover:border-primary/50 text-dim'}`}
                                                >
                                                    {state.party.includes(selectedChar.id) ? '已出战' : '编入队伍'}
                                                </button>
                                                <button 
                                                    onClick={() => setShowContract(true)}
                                                    className="flex-1 py-4 bg-transparent border-2 border-primary text-primary hover:bg-primary/10 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_10px_rgba(255,0,85,0.2)]"
                                                >
                                                    进入调教房
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Tabs */}
                                    <div className="flex-1 flex flex-col min-h-[300px]">
                                        <div className="flex gap-6 border-b border-glass mb-6 pb-2">
                                            {/* Tab Switcher */}
                                            <button onClick={() => setCharTab('PROFILE')} className={`text-[10px] font-black uppercase tracking-widest ${charTab === 'PROFILE' ? 'text-primary' : 'text-dim opacity-50'}`}>资料</button>
                                            <button onClick={() => setCharTab('ARCHIVE')} className={`text-[10px] font-black uppercase tracking-widest ${charTab === 'ARCHIVE' ? 'text-primary' : 'text-dim opacity-50'}`}>档案</button>
                                            <button onClick={() => setCharTab('EQUIP')} className={`text-[10px] font-black uppercase tracking-widest ${charTab === 'EQUIP' ? 'text-primary' : 'text-dim opacity-50'}`}>着装</button>
                                        </div>
                                        <div className="flex-1">
                                            {charTab === 'PROFILE' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                                                    <div className="space-y-4">
                                                        <div className="text-[10px] text-primary uppercase font-black">基本信息</div>
                                                        <div className="space-y-2 text-xs">
                                                            <div className="flex justify-between border-b border-glass pb-1"><span className="text-dim">种族:</span> <span className="text-main font-bold">{selectedChar.race}</span></div>
                                                            <div className="flex justify-between border-b border-glass pb-1"><span className="text-dim">职阶:</span> <span className="text-main font-bold">{selectedChar.charClass || selectedChar.job}</span></div>
                                                            <div className="flex justify-between border-b border-glass pb-1"><span className="text-dim">专属武器:</span> <span className="text-main font-bold">{selectedChar.weapon}</span></div>
                                                            <div className="flex justify-between border-b border-glass pb-1"><span className="text-dim">稀有度:</span> <span className="text-main font-bold">{selectedChar.rarity}</span></div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="text-[10px] text-primary uppercase font-black">性格与技能</div>
                                                        <p className="text-xs text-dim leading-relaxed mb-2">{selectedChar.personality}</p>
                                                        <div className="space-y-2">
                                                            {selectedChar.skills.map((s, idx) => {
                                                                const parts = s.split('：');
                                                                const title = parts[0];
                                                                const desc = parts[1] || '';
                                                                return (
                                                                    <div key={idx} className="glass-panel p-2 rounded-lg border border-glass">
                                                                        <div className="text-[10px] font-black text-primary">{title}</div>
                                                                        {desc && <div className="text-[9px] text-dim mt-1">{desc}</div>}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* 新增：档案页面 (Appearance & Background & Voice) */}
                                            {charTab === 'ARCHIVE' && (
                                                <div className="animate-fade-in space-y-8">
                                                    <div>
                                                        <div className="text-[10px] text-primary uppercase font-black mb-2">外貌特征</div>
                                                        <div className="glass-panel p-4 rounded-xl border border-glass text-xs leading-relaxed text-dim font-serif tracking-wide">
                                                            {selectedChar.appearance || "数据收集中..."}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] text-primary uppercase font-black mb-2">身世背景</div>
                                                        <div className="glass-panel p-4 rounded-xl border border-glass text-xs leading-relaxed text-dim font-serif tracking-wide">
                                                            {selectedChar.background || "档案缺失..."}
                                                        </div>
                                                    </div>
                                                    <div>
                                                         <div className="text-[10px] text-primary uppercase font-black mb-2">语音记录</div>
                                                         <div className="space-y-2">
                                                             {selectedChar.gachaLines?.map((line, idx) => (
                                                                 <div key={idx} className="glass-panel p-3 rounded-lg border border-glass flex gap-3 items-start group hover:border-primary/30 transition-colors">
                                                                     <button 
                                                                        onClick={() => handlePlayVoice(line)}
                                                                        className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center border transition-all ${voiceLoading === line ? 'animate-spin border-primary text-primary' : 'border-white/10 text-dim group-hover:text-white group-hover:border-primary'}`}
                                                                        title="播放"
                                                                     >
                                                                         {voiceLoading === line ? '↻' : '🔊'}
                                                                     </button>
                                                                     <p className="text-xs text-dim italic group-hover:text-main transition-colors">"{line}"</p>
                                                                 </div>
                                                             ))}
                                                             {(!selectedChar.gachaLines || selectedChar.gachaLines.length === 0) && <div className="text-xs text-dim opacity-50 italic">暂无录音记录...</div>}
                                                         </div>
                                                    </div>
                                                </div>
                                            )}

                                            {charTab === 'EQUIP' && (
                                                <div className="animate-fade-in grid grid-cols-2 gap-4">
                                                    {['WEAPON', 'ARMOR', 'ACCESSORY', 'BOOTS'].map((slot) => {
                                                        const equipped = (selectedChar.equipment as any)[slot];
                                                        return (
                                                            <div 
                                                                key={slot} 
                                                                onClick={() => setEquippingSlot({ charId: selectedChar.id, slot: slot as any })}
                                                                className="glass-panel p-4 rounded-2xl border border-glass flex items-center gap-4 relative group hover:border-primary/50 transition-colors cursor-pointer"
                                                            >
                                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-black/40 shadow-inner ${equipped ? 'text-white' : 'text-dim opacity-20'}`}>
                                                                    {slot === 'WEAPON' ? '⚔️' : slot === 'ARMOR' ? '🛡️' : slot === 'ACCESSORY' ? '💍' : '👢'}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-[9px] text-dim font-black uppercase tracking-widest">{slot}</div>
                                                                    <div className={`text-xs font-bold truncate ${equipped ? 'text-white' : 'text-dim opacity-50'}`}>
                                                                        {equipped ? equipped.name : '空'}
                                                                    </div>
                                                                    {equipped && <div className="text-[9px] text-primary mt-1">LV.{equipped.level} • {equipped.rarity}</div>}
                                                                </div>
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-[2px] rounded-2xl pointer-events-none">
                                                                    <span className="text-[9px] uppercase tracking-widest text-white">{equipped ? '更换' : '装备'}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-dim uppercase tracking-[0.4em] font-black opacity-20 text-4xl">选择魔将</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Lightbox Overlay */}
                {showLightbox && selectedChar && (
                    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center animate-fade-in" onClick={() => setShowLightbox(false)}>
                        <div className="relative max-h-[90vh] max-w-[90vw]">
                            <img src={selectedChar.imageUrl || "https://picsum.photos/seed/harem/600/800"} className="max-h-[85vh] object-contain rounded-lg shadow-[0_0_50px_var(--primary-glow)] border border-primary/20" />
                            <div className="absolute bottom-4 left-0 right-0 text-center">
                                <h2 className="text-3xl font-black text-white uppercase neon-text tracking-widest">{selectedChar.name}</h2>
                                <p className="text-sm text-dim uppercase tracking-[0.5em] mt-2">{selectedChar.title}</p>
                            </div>
                            <button className="absolute -top-12 right-0 text-white hover:text-primary transition-colors">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>
                )}

                {view === 'GACHA' && (
                    <div className="h-full flex flex-col items-center justify-center p-8 animate-fade-in relative bg-void overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent pointer-events-none" />
                        
                        {gachaPhase === 'IDLE' && (
                            <div className="text-center space-y-12 max-w-lg relative z-10">
                                <div className="space-y-2">
                                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter neon-text">招募仪式</h2>
                                    <p className="text-xs text-dim tracking-widest">献祭灵魂与金币，从虚空中召唤您的忠犬。</p>
                                </div>
                                
                                <div className="flex justify-center gap-4">
                                    <button onClick={() => setGachaType('CHAR')} className={`px-8 py-3 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${gachaType === 'CHAR' ? 'bg-primary text-white border-primary shadow-[0_0_20px_var(--primary-glow)]' : 'glass-panel border-glass text-dim'}`}>魔将召唤</button>
                                    <button onClick={() => setGachaType('ITEM')} className={`px-8 py-3 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${gachaType === 'ITEM' ? 'bg-primary text-white border-primary shadow-[0_0_20px_var(--primary-glow)]' : 'glass-panel border-glass text-dim'}`}>圣遗物召唤</button>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <button onClick={() => handleGacha(1)} className="group relative">
                                        <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-all" />
                                        <div className="relative glass-panel-heavy p-6 rounded-3xl border border-glass hover:border-primary transition-all active:scale-95 flex flex-col items-center">
                                            <span className="text-3xl mb-2">💎</span>
                                            <span className="text-xs font-black text-white uppercase tracking-widest">单次共鸣</span>
                                            <span className="text-[10px] text-dim mt-2 font-mono">200 金币</span>
                                        </div>
                                    </button>
                                    <button onClick={() => handleGacha(10)} className="group relative">
                                        <div className="absolute inset-0 bg-primary/40 blur-2xl opacity-0 group-hover:opacity-100 transition-all" />
                                        <div className="relative glass-panel-heavy p-6 rounded-3xl border border-primary/50 shadow-[0_0_20px_rgba(255,0,85,0.1)] hover:border-primary transition-all active:scale-95 flex flex-col items-center">
                                            <span className="text-3xl mb-2">🔥</span>
                                            <span className="text-xs font-black text-white uppercase tracking-widest">十连召唤</span>
                                            <span className="text-[10px] text-dim mt-2 font-mono">2000 金币</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {gachaPhase === 'CHANNELING' && (
                            <div className="flex flex-col items-center justify-center animate-pulse z-10">
                                <div className="w-32 h-32 rounded-full border-4 border-primary border-t-transparent animate-spin mb-8 shadow-[0_0_40px_var(--primary-glow)]" />
                                <div className="text-2xl font-black text-primary uppercase tracking-[0.5em] neon-text">魔力汇聚中...</div>
                            </div>
                        )}

                        {gachaPhase === 'EXPLODE' && (
                            <div className={`absolute inset-0 flex items-center justify-center bg-white/10 z-50 animate-shake-hard`}>
                                <div className={`w-1 h-1 rounded-full bg-white transition-all duration-300 animate-ping-fast ${GLOW_COLORS[gachaHighestRarity]}`} style={{ width: '100%', height: '100%', opacity: 0.8 }} />
                                <div className="absolute text-6xl font-black text-white animate-bounce uppercase tracking-widest mix-blend-overlay">
                                    {gachaHighestRarity}!!
                                </div>
                            </div>
                        )}

                        {gachaPhase === 'RESULT' && (
                            <div className="w-full h-full p-8 flex flex-col items-center justify-center animate-fade-in overflow-y-auto z-10">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-4xl">
                                    {gachaResults.map((res, i) => (
                                        <div key={i} className="animate-slide-up group" style={{ animationDelay: `${i * 0.1}s` }}>
                                            {res.char ? (
                                                <div className={`p-1 rounded-2xl border-2 transition-transform hover:scale-105 ${res.char.rarity === 'UR' ? 'border-primary shadow-[0_0_15px_var(--primary-glow)] animate-pulse' : 'border-glass'}`}>
                                                    <div className="aspect-[3/4] rounded-xl overflow-hidden relative">
                                                        <img src={res.char.imageUrl || "https://picsum.photos/seed/gacha/200/300"} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                                                        <div className="absolute bottom-2 inset-x-2 text-center">
                                                            <div className="text-[10px] font-black text-white uppercase truncate">{res.char.name}</div>
                                                            <div className="text-[8px] text-primary font-bold">{res.char.rarity}</div>
                                                            {res.isNew ? (
                                                                <div className="absolute top-1 right-1 bg-primary text-white text-[8px] px-1 rounded font-black">NEW</div>
                                                            ) : (
                                                                // 显示 BOND UP 特效，主人~
                                                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-pink-600/90 text-white text-[10px] px-2 py-1 rounded font-black shadow-lg animate-bounce whitespace-nowrap border border-pink-400">
                                                                    ♥ BOND UP! +{res.reward}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : res.item ? (
                                                <div className="p-3 glass-panel rounded-2xl border border-glass flex flex-col items-center aspect-square justify-center text-center">
                                                    <span className="text-2xl mb-1">⚔️</span>
                                                    <span className="text-[10px] font-black text-white uppercase">{res.item.name}</span>
                                                    <span className="text-[8px] text-dim mt-1">{res.item.rarity}</span>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => setGachaPhase('IDLE')} className="mt-16 px-12 py-4 bg-primary text-white font-black uppercase tracking-[0.3em] rounded-full shadow-[0_0_30px_var(--primary-glow)] hover:scale-105 transition-all active:scale-95 text-xs">接受命运</button>
                            </div>
                        )}
                    </div>
                )}

                {view === 'INVENTORY' && (
                    <div className="p-8 h-full overflow-y-auto custom-scrollbar animate-fade-in">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {state.inventory.map(item => (
                                <div key={item.id} className="glass-panel p-4 rounded-2xl border border-glass hover:border-primary transition-all relative group cursor-default">
                                    <div className="w-full aspect-square rounded-xl bg-black/40 flex items-center justify-center text-3xl mb-3 shadow-inner">
                                        {item.type === 'WEAPON' ? '⚔️' : item.type === 'ARMOR' ? '🛡️' : item.type === 'ACCESSORY' ? '💍' : '👢'}
                                    </div>
                                    <div className="text-xs font-black text-white uppercase tracking-wider truncate">{item.name}</div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-[9px] text-dim uppercase">Lv.{item.level}</span>
                                        <span className={`text-[9px] font-bold ${item.rarity === 'UR' ? 'text-primary' : 'text-dim opacity-60'}`}>{item.rarity}</span>
                                    </div>
                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md p-4 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between z-10">
                                        <div className="text-[10px] space-y-1">
                                            {Object.entries(item.stats).map(([k, v]) => (
                                                <div key={k} className="flex justify-between border-b border-white/5 pb-1">
                                                    <span className="text-dim">{k}:</span>
                                                    <span className="text-primary font-bold">+{v}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={() => { setSelectedForgeItem(item); setView('FORGE'); }} className="w-full py-2 bg-primary/20 border border-primary text-[10px] text-primary font-black uppercase rounded-lg">前往锻造</button>
                                    </div>
                                </div>
                            ))}
                            {state.inventory.length === 0 && <div className="col-span-full py-32 text-center text-dim opacity-20 uppercase tracking-[0.5em] font-black text-2xl">宝库空空如也</div>}
                        </div>
                    </div>
                )}

                {view === 'FORGE' && (
                    <div className="h-full flex items-center justify-center p-8 animate-fade-in">
                        <div className="w-full max-w-4xl glass-panel-heavy rounded-[40px] border border-glass overflow-hidden flex h-[600px] shadow-2xl relative">
                            {/* Left: Forge Controls */}
                            <div className="w-1/2 p-10 border-r border-glass flex flex-col justify-between bg-black/20">
                                <div>
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">禁忌锻造</h2>
                                    <p className="text-xs text-dim mb-8">使用黑暗金币，提升装备中沉睡的魔力。主人~</p>
                                    
                                    {selectedForgeItem ? (
                                        <div className="space-y-8 animate-slide-up">
                                            <div className="flex items-center gap-6">
                                                <div className="w-24 h-24 rounded-3xl bg-black border border-primary flex items-center justify-center text-4xl shadow-[0_0_20px_var(--primary-glow)]">
                                                    {selectedForgeItem.type === 'WEAPON' ? '⚔️' : '🛡️'}
                                                </div>
                                                <div>
                                                    <div className="text-xl font-black text-white uppercase">{selectedForgeItem.name}</div>
                                                    <div className="text-xs text-primary font-mono mt-1">状态: Lv.{selectedForgeItem.level}</div>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-3">
                                                <div className="text-[10px] text-dim uppercase tracking-widest font-black">属性预览</div>
                                                <div className="glass-panel p-4 rounded-2xl border border-glass space-y-2">
                                                    {Object.entries(selectedForgeItem.stats).map(([k, v]) => (
                                                        <div key={k} className="flex justify-between items-center text-xs">
                                                            <span className="text-dim uppercase">{k}</span>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-white font-bold">{v}</span>
                                                                <span className="text-primary">→</span>
                                                                <span className="text-primary font-black neon-text">{Math.floor(Number(v || 0) * (selectedForgeItem.rarity === 'UR' ? 1.5 : 1.2) + 5)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-20 text-center text-dim italic opacity-40">请从左侧列表选择要强化的装备，主人~</div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {forgeMessage && <div className="text-[10px] text-primary bg-primary/10 p-3 rounded-lg border border-primary/20 text-center animate-pulse">{forgeMessage}</div>}
                                    <button 
                                        onClick={handleForge}
                                        disabled={!selectedForgeItem}
                                        className="w-full py-5 bg-primary hover:bg-opacity-80 text-white font-black uppercase tracking-[0.4em] rounded-2xl shadow-[0_0_30px_var(--primary-glow)] transition-all active:scale-95 disabled:opacity-20 disabled:grayscale"
                                    >
                                        开始强化
                                    </button>
                                    {selectedForgeItem && (
                                        <div className="text-center text-[10px] text-dim font-mono">
                                            消耗: <span className="text-primary font-bold">{(selectedForgeItem.level * 200).toLocaleString()} 金币</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Right: Quick List */}
                            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-void">
                                <div className="text-[10px] text-dim opacity-60 mb-6 uppercase tracking-widest font-black border-b border-glass pb-2">装备列表</div>
                                <div className="grid grid-cols-2 gap-4">
                                    {state.inventory.map(item => (
                                        <button 
                                            key={item.id} 
                                            onClick={() => { setSelectedForgeItem(item); setForgeMessage(""); }}
                                            className={`p-4 rounded-2xl border transition-all text-left group ${selectedForgeItem?.id === item.id ? 'bg-primary/10 border-primary shadow-[0_0_15px_var(--primary-glow)]' : 'glass-panel border-glass hover:bg-white/5'}`}
                                        >
                                            <div className="text-xs font-bold text-white uppercase truncate">{item.name}</div>
                                            <div className="text-[9px] text-dim font-mono mt-1">LV.{item.level} • {item.rarity}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Equipment Selection Modal */}
            {equippingSlot && (
                <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center animate-fade-in p-4">
                    <div className="w-full max-w-md glass-panel-heavy rounded-2xl border border-primary/30 shadow-[0_0_50px_var(--primary-glow)] flex flex-col max-h-[80vh] overflow-hidden">
                        <div className="p-4 border-b border-glass flex justify-between items-center bg-primary/10">
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">选择装备: {equippingSlot.slot}</h3>
                            <button onClick={() => setEquippingSlot(null)} className="text-dim hover:text-white">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                             {/* Unequip Option */}
                             <button 
                                onClick={() => handleEquip(null)}
                                className="w-full p-3 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2"
                             >
                                <span>🚫</span> 卸下当前装备
                             </button>
                             
                             <div className="h-[1px] bg-white/10 my-2" />

                             {/* Available Items */}
                             {state.inventory.filter(i => i.type === equippingSlot.slot).map(item => (
                                 <button 
                                    key={item.id}
                                    onClick={() => handleEquip(item)}
                                    className="w-full glass-panel p-3 rounded-xl border border-glass hover:border-primary flex items-center gap-4 group text-left transition-all hover:bg-white/5"
                                 >
                                     <div className="w-12 h-12 bg-black/40 rounded-lg flex items-center justify-center text-2xl shadow-inner border border-white/5">
                                        {item.type === 'WEAPON' ? '⚔️' : item.type === 'ARMOR' ? '🛡️' : item.type === 'ACCESSORY' ? '💍' : '👢'}
                                     </div>
                                     <div className="flex-1">
                                         <div className="flex justify-between items-start">
                                            <div className="text-xs font-bold text-white uppercase">{item.name}</div>
                                            <span className={`text-[9px] font-black ${item.rarity === 'UR' ? 'text-primary' : 'text-dim'}`}>{item.rarity}</span>
                                         </div>
                                         <div className="text-[9px] text-dim font-mono mt-0.5">LV.{item.level}</div>
                                         <div className="flex gap-2 mt-2">
                                            {Object.entries(item.stats).map(([k, v]) => (
                                                <span key={k} className="text-[8px] bg-white/5 px-1.5 py-0.5 rounded text-primary border border-white/5">{k} +{v}</span>
                                            ))}
                                         </div>
                                     </div>
                                 </button>
                             ))}
                             {state.inventory.filter(i => i.type === equippingSlot.slot).length === 0 && (
                                 <div className="text-center text-dim text-xs py-8 opacity-50 flex flex-col items-center">
                                    <span className="text-2xl mb-2">📦</span>
                                    <span>背包中没有可用的 {equippingSlot.slot}</span>
                                    <span className="text-[9px] mt-1">请前往召唤阵或征服关卡获取</span>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            )}

            {/* Ritual Room Modal */}
            {showContract && selectedChar && (
                <ContractModal 
                    character={selectedChar} 
                    modelKey={state.settings.model} 
                    voiceEnabled={voiceEnabled} 
                    onUpdateCharacter={(updatedChar) => {
                        // Persist character history updates to global state
                        const newRoster = state.roster.map(c => c.id === updatedChar.id ? updatedChar : c);
                        updateState({ roster: newRoster });
                    }}
                    onClose={(success) => {
                        if (success) {
                            // Bonus bond on successful completion
                            const newRoster = state.roster.map(c => c.id === selectedChar.id ? { ...c, bond: c.bond + 50 } : c);
                            updateState({ roster: newRoster });
                        }
                        setShowContract(false);
                    }} 
                />
            )}
            
            <style>{`
                @keyframes shake-hard {
                    0% { transform: translate(1px, 1px) rotate(0deg); }
                    10% { transform: translate(-3px, -2px) rotate(-1deg); }
                    20% { transform: translate(-6px, 0px) rotate(1deg); }
                    30% { transform: translate(3px, 2px) rotate(0deg); }
                    40% { transform: translate(1px, -1px) rotate(1deg); }
                    50% { transform: translate(-1px, 2px) rotate(-1deg); }
                    60% { transform: translate(-3px, 1px) rotate(0deg); }
                    70% { transform: translate(3px, 1px) rotate(-1deg); }
                    80% { transform: translate(-1px, -1px) rotate(1deg); }
                    90% { transform: translate(1px, 2px) rotate(0deg); }
                    100% { transform: translate(1px, -2px) rotate(-1deg); }
                }
                .animate-shake-hard { animation: shake-hard 0.1s infinite; }
                .animate-ping-fast { animation: ping 0.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
            `}</style>
        </div>
    );
};

export default Harem;
