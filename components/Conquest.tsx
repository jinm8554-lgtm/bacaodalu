
import React, { useState, useEffect, useRef } from 'react';
import { GameState, Level, BattleStrategy, Character } from '../types';
import { simulateBattle, sweepBattle } from '../services/gameService';
import { CHARACTER_DB } from '../constants';
import ContractModal from './ContractModal';
import WorldMap from './WorldMap';

interface Props {
    state: GameState;
    updateState: (s: Partial<GameState>) => void;
}

// Region-specific Background Music Mapping
// Using raw.githubusercontent.com for direct audio streaming
const NATION_BGMS: Record<string, string> = {
    'n1': "https://raw.githubusercontent.com/jinm8554-lgtm/kkk/main/(%E7%9A%87%E5%9F%8E%EF%BC%89Bright%20Trumpet%20fanfare.mp3", // 洛伦帝国 (Loren)
    'n2': "https://raw.githubusercontent.com/jinm8554-lgtm/kkk/main/0207.MP3", // 伊弗曼苏丹国 (Iverman)
    'n3': "https://raw.githubusercontent.com/jinm8554-lgtm/kkk/main/(%E6%B5%B7%E5%B2%9B%EF%BC%89Sound%20of%20gentle%20ocean%20waves.mp3", // 卡利安联邦 (Kalian)
    'n4': "https://raw.githubusercontent.com/jinm8554-lgtm/kkk/main/(%E5%A6%96%E7%B2%BE%E7%9A%84%E6%A3%AE%E6%9E%97%EF%BC%89Soft%20wind%20blowing%20through%20leaves.mp3", // 艾尔芬加德 (Elfengard)
    'n5': "https://raw.githubusercontent.com/jinm8554-lgtm/kkk/main/(%E6%95%99%E5%BB%B7%EF%BC%89Massive%20Pipe%20Organ%20chord%20holds.mp3" // 神圣教国 (Theocracy)
};

const Conquest: React.FC<Props> = ({ state, updateState }) => {
    const nations = Array.isArray(state.nations) ? state.nations : [];
    const [selectedNationId, setSelectedNationId] = useState<string>(nations[0]?.id || 'n1');
    const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
    const [battleLog, setBattleLog] = useState<string[]>([]);
    const [inBattle, setInBattle] = useState(false);
    const [battleResult, setBattleResult] = useState<any>(null);
    const [strategy, setStrategy] = useState<BattleStrategy>('GOLD');
    const [contractTarget, setContractTarget] = useState<Character | null>(null);

    // Audio Reference for BGM
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Effect: Handle BGM switching when nation changes
    useEffect(() => {
        if (!audioRef.current) return;
        
        const track = NATION_BGMS[selectedNationId];
        
        if (track) {
            // If the track is different or not playing, switch to it
            // Using getAttribute('src') to compare relative/absolute paths correctly
            if (audioRef.current.getAttribute('src') !== track) {
                audioRef.current.src = track;
                audioRef.current.volume = 0.4; // Slightly lower volume for map ambiance
                audioRef.current.play().catch(e => console.log("Map BGM auto-play prevented:", e));
            } else if (audioRef.current.paused) {
                 audioRef.current.play().catch(e => console.log("Map BGM resume prevented:", e));
            }
        } else {
            // If no BGM for this region, pause and clear
            if (!audioRef.current.paused) {
                // Optional: Fade out logic could go here
                audioRef.current.pause();
            }
            audioRef.current.src = "";
        }
    }, [selectedNationId]);

    const handleStartBattle = () => {
        if (!selectedLevel) return;
        const partyChars = state.roster.filter(c => state.party.includes(c.id));
        if (partyChars.length === 0) {
            alert("主人~ 请先配置队伍！（后宫 -> 编队）主人~");
            return;
        }

        setInBattle(true);
        setBattleLog([]);
        setBattleResult(null);

        const enemyPower = selectedLevel.difficulty * 25;
        const result = simulateBattle(partyChars, enemyPower, selectedLevel.bossId, strategy);
        
        let currentLogIndex = 0;
        const interval = setInterval(() => {
            if (currentLogIndex >= result.logs.length) {
                clearInterval(interval);
                setBattleResult(result);
                
                const newRoster = state.roster.map(originalChar => {
                    const updatedChar = result.updatedParty.find(c => c.id === originalChar.id);
                    return updatedChar ? updatedChar : originalChar;
                });

                if (result.victory) {
                    const newGold = state.gold + result.rewards.gold;
                    const newNations = state.nations.map(n => ({
                        ...n,
                        levels: n.levels.map(l => l.id === selectedLevel.id ? { ...l, isCleared: true } : l)
                    }));

                    if (result.rewards.capturedId) {
                        const target = CHARACTER_DB.find(c => c.id === result.rewards.capturedId);
                        if (target) setContractTarget(target);
                    }
                    
                    updateState({ gold: newGold, nations: newNations, roster: newRoster });
                } else {
                     updateState({ roster: newRoster });
                }
            } else {
                setBattleLog(prev => [...prev, result.logs[currentLogIndex]]);
                currentLogIndex++;
            }
        }, 600);
    };

    const handleSweep = () => {
        if (!selectedLevel || !selectedLevel.isCleared) return;
        const rewards = sweepBattle(selectedLevel.difficulty, strategy);
        const newGold = state.gold + rewards.gold;
        updateState({ gold: newGold, inventory: [...state.inventory, ...rewards.items] });
        alert(`🧹 扫荡完毕，主人~\n获得金币: ${rewards.gold}\n获得经验: ${rewards.exp}\n物品: ${rewards.items.length > 0 ? rewards.items.map(i=>i.name).join(', ') : '无'}`);
    };

    const resetBattleState = () => {
        setInBattle(false);
        setBattleLog([]);
        setBattleResult(null);
    };

    if (contractTarget) {
        return (
            <div className="fixed inset-0 z-[200]">
                <ContractModal 
                    character={contractTarget} 
                    modelKey={state.settings.model}
                    voiceEnabled={state.settings.voiceEnabled ?? true}
                    onUpdateCharacter={(updatedChar) => {
                        // For captured bosses, we just update the local target state until close
                        setContractTarget(updatedChar);
                    }}
                    onClose={(success) => {
                        if (success) {
                            // Save captured char with history
                            const newRoster = [...state.roster, { ...contractTarget, isOwned: true, bond: 10, level: 1, exp: 0 }];
                            updateState({ roster: newRoster });
                        }
                        setContractTarget(null);
                        resetBattleState();
                        setSelectedLevel(null);
                    }} 
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full text-main overflow-hidden relative">
            {/* Background Music Player */}
            <audio ref={audioRef} loop className="hidden" />

            <div className={`absolute inset-0 z-0 transition-transform duration-500 ${selectedLevel ? 'scale-110 opacity-20 filter blur-sm pointer-events-none' : 'scale-100 opacity-100'} p-4 bg-core/40`}>
                <WorldMap 
                    nations={nations}
                    selectedNationId={selectedNationId}
                    onSelectNation={setSelectedNationId}
                    onSelectLevel={(level) => { setSelectedLevel(level); resetBattleState(); }}
                    currentLevelId={selectedLevel?.id}
                />
            </div>

            {selectedLevel && (
                <div className="absolute inset-0 z-10 animate-fade-in glass-panel-heavy flex flex-col">
                    <div className="h-full flex flex-col animate-slide-up">
                        {/* Top Bar */}
                        <div className="px-6 py-4 border-b border-glass flex justify-between items-center bg-black/40 shadow-lg">
                            <button 
                                onClick={() => { setSelectedLevel(null); resetBattleState(); }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-glass hover:bg-white/10 transition-colors group text-dim hover:text-white"
                            >
                                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                                <span className="text-xs font-black uppercase tracking-widest">返回地图</span>
                            </button>
                            
                            <div className="text-right">
                                <div className="flex items-center gap-3 justify-end">
                                    <h2 className="text-2xl font-black uppercase tracking-tight text-white neon-text">{selectedLevel.name}</h2>
                                    {selectedLevel.isCleared && <span className="text-[10px] bg-primary/20 text-primary border border-primary/50 px-2 py-0.5 rounded font-black tracking-widest">已征服</span>}
                                </div>
                                <div className="flex text-primary text-sm gap-0.5 justify-end mt-1">
                                    {Array.from({length: selectedLevel.difficulty}).map((_,i) => <span key={i}>💀</span>)}
                                </div>
                            </div>
                        </div>

                        {/* Battle/Command Content */}
                        <div className="flex-1 p-8 overflow-hidden flex items-center justify-center">
                            {!inBattle ? (
                                <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <p className="text-lg text-dim font-serif italic border-l-4 border-primary pl-4 py-2 bg-primary/5">
                                                "{selectedLevel.desc}"
                                            </p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button 
                                                    onClick={() => setStrategy('GOLD')}
                                                    className={`p-6 rounded-2xl border transition-all duration-300 group flex flex-col items-center justify-center ${strategy === 'GOLD' ? 'border-primary bg-primary/10 shadow-[0_0_15px_var(--primary-glow)]' : 'glass-panel border-glass hover:border-primary/50'}`}
                                                >
                                                    <span className="text-3xl mb-3 grayscale group-hover:grayscale-0">🪙</span>
                                                    <span className="text-xs font-bold uppercase tracking-widest text-main">掠夺金币</span>
                                                </button>
                                                <button 
                                                    onClick={() => setStrategy('LOOT')}
                                                    className={`p-6 rounded-2xl border transition-all duration-300 group flex flex-col items-center justify-center ${strategy === 'LOOT' ? 'border-primary bg-primary/10 shadow-[0_0_15px_var(--primary-glow)]' : 'glass-panel border-glass hover:border-primary/50'}`}
                                                >
                                                    <span className="text-3xl mb-3 grayscale group-hover:grayscale-0">⚔️</span>
                                                    <span className="text-xs font-bold uppercase tracking-widest text-main">搜刮装备</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <div className="relative group cursor-pointer" onClick={handleStartBattle}>
                                            <div className="absolute inset-0 bg-primary blur-2xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse" />
                                            <button 
                                                className="relative w-full py-6 bg-primary hover:brightness-110 text-white font-black uppercase tracking-[0.3em] rounded-2xl shadow-[0_0_30px_var(--primary-glow)] transition-all active:scale-95 text-xl flex items-center justify-center gap-4 border border-white/20"
                                            >
                                                <span>⚔️</span> 开始征服
                                            </button>
                                        </div>
                                        
                                        {selectedLevel.isCleared && (
                                            <button 
                                                onClick={handleSweep}
                                                className="w-full py-4 glass-panel hover:bg-white/5 border border-primary/30 text-primary font-bold uppercase tracking-[0.2em] rounded-xl transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                                            >
                                                <span>🧹</span> 快速支配
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full max-w-4xl h-[600px] glass-panel rounded-2xl border border-glass overflow-hidden flex flex-col relative shadow-2xl">
                                    <div className="p-3 bg-black/40 border-b border-glass flex justify-between items-center px-6">
                                        <span className="text-xs font-mono text-primary animate-pulse uppercase flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                                            实时战况反馈
                                        </span>
                                        <button onClick={resetBattleState} className="text-[10px] underline hover:text-white opacity-60 uppercase tracking-wider">终止行动</button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-2 custom-scrollbar bg-black/40 text-dim">
                                        {battleLog.map((log, i) => (
                                            <div key={i} className="animate-slide-up whitespace-pre-wrap leading-relaxed border-l-2 border-white/5 pl-3 py-1">{log}</div>
                                        ))}
                                        <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                                    </div>

                                    {/* Result Overlay */}
                                    {battleResult && (
                                        <div className="absolute bottom-0 left-0 right-0 p-6 glass-panel-heavy border-t border-primary backdrop-blur-xl animate-slide-up flex justify-between items-center">
                                            <div>
                                                <div className="text-3xl font-black italic uppercase mb-2">
                                                    {battleResult.victory ? <span className="text-primary neon-text">征服成功</span> : <span className="text-gray-500">征服失败</span>}
                                                </div>
                                                {battleResult.victory && (
                                                    <div className="text-xs space-x-6 font-mono text-gray-300 flex">
                                                        <span className="flex items-center gap-2"><span className="text-yellow-500">●</span> 金币: <b className="text-yellow-400">+{battleResult.rewards.gold}</b></span>
                                                        <span className="flex items-center gap-2"><span className="text-blue-500">●</span> 经验: <b className="text-blue-400">+{battleResult.rewards.exp}</b></span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-4">
                                                <button onClick={resetBattleState} className="px-6 py-3 border border-glass hover:bg-white/10 text-xs font-bold uppercase rounded-lg transition-colors text-white">
                                                    关闭报告
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Conquest;
