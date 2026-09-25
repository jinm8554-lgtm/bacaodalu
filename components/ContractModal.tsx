
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Character } from '../types';
import { generateContractStep } from '../services/geminiService';

interface Props {
    character: Character;
    modelKey: any; 
    voiceEnabled: boolean;
    onClose: (success: boolean) => void;
    onUpdateCharacter?: (char: Character) => void;
}

// 主人钦定的顶级音源
const LILITH_EX_MOAN_URL = "https://files.catbox.moe/xmwq0v.MP3";

const SCENE_DESC_POOL = [
    "空气中弥漫着粘稠的魔力甜香，汗水顺着她起伏的胸脯滑入深邃的沟壑。",
    "她的眼神开始涣散，由于极度的快感，脚趾紧紧地扣在一起。",
    "圣殿的灯光在肉色与欲望交织中变得朦胧，娇喘声在石柱间回荡。",
    "她温软的身体微微颤抖着，由于主人的侵略，皮肤泛起了诱人的潮红。"
];

const ContractModal: React.FC<Props> = ({ character, modelKey, voiceEnabled, onClose, onUpdateCharacter }) => {
    // State Machine: 0=INTRO, 1-6=ACTIONS, 7=CLIMAX/SEAL
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [currentNarrative, setCurrentNarrative] = useState('');
    const [currentReply, setCurrentReply] = useState('');
    const [voiceLoading, setVoiceLoading] = useState(false);
    const [shake, setShake] = useState(false);

    // Pleasure bar visual (Calculated from step)
    const pleasure = Math.min(100, Math.floor((step / 6) * 100));

    // Audio Ref
    const audioCtxRef = useRef<AudioContext | null>(null);
    const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

    useEffect(() => {
        return () => {
            if (activeSourceRef.current) {
                try { activeSourceRef.current.stop(); } catch (e) {}
            }
            if (audioCtxRef.current) {
                audioCtxRef.current.close();
            }
        };
    }, []);

    const getApiConfig = () => ({ baseUrl: '', apiKey: '', model: modelKey });

    const playVoice = async (url: string) => {
        if (!voiceEnabled || !url || !url.startsWith('http')) return;
        
        // Simple distinct play logic
        if (activeSourceRef.current) {
            try { activeSourceRef.current.stop(); } catch(e){}
        }

        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') await ctx.resume();

            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await ctx.decodeAudioData(arrayBuffer);
            
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
            activeSourceRef.current = source;
        } catch (e) {
            console.error("Audio Error", e);
        }
    };

    const triggerStep = async (choiceId: string, choiceText: string) => {
        setLoading(true);
        setShake(true);
        setTimeout(() => setShake(false), 300);

        const nextStep = step + 1;
        
        // --- Memory Key: CharID_Step_ChoiceID ---
        const cacheKey = `C${character.id}_S${nextStep}_${choiceId}`;

        // 1. Check Memory
        if (character.contractHistory && character.contractHistory[cacheKey]) {
            console.log(`[Memory] Loading cached scene: ${cacheKey}`);
            const memory = character.contractHistory[cacheKey];
            setCurrentNarrative(memory.narrative);
            setCurrentReply(memory.npcReply);
            setStep(nextStep);
            setLoading(false);
            if (nextStep >= 4 && character.id === '2') playVoice(LILITH_EX_MOAN_URL);
            return;
        }

        // 2. API Call
        const apiConfig = getApiConfig();
        try {
            // Map step number to phase name for AI context
            const stepNames = ["", "调情", "前戏", "奉仕", "插入(基础)", "插入(深度)", "高潮"];
            const phaseName = stepNames[nextStep] || "高潮";

            // Add previous context if available (simple concat)
            const contextHistory = currentNarrative ? `上一阶段剧情：${currentNarrative.substring(0, 50)}...` : "";

            const response = await generateContractStep(
                apiConfig,
                { name: character.name, desc: character.desc, personality: character.personality, appearance: character.appearance },
                { index: nextStep, name: phaseName },
                choiceText,
                contextHistory
            );

            setCurrentNarrative(response.scene.narrative);
            setCurrentReply(response.scene.npcReply);
            
            // 3. Save to Memory
            if (onUpdateCharacter) {
                const newHistory = { 
                    ...(character.contractHistory || {}),
                    [cacheKey]: {
                        narrative: response.scene.narrative,
                        npcReply: response.scene.npcReply,
                        timestamp: Date.now()
                    }
                };
                onUpdateCharacter({ ...character, contractHistory: newHistory });
            }

            setStep(nextStep);
            if (nextStep >= 4 && character.id === '2') playVoice(LILITH_EX_MOAN_URL);

        } catch (e) {
            console.error(e);
            setCurrentNarrative(SCENE_DESC_POOL[Math.floor(Math.random() * SCENE_DESC_POOL.length)]);
            setCurrentReply(`[心理]（意识模糊中）\n“哈啊...主人...我... (API Error)”`);
            setStep(nextStep);
        } finally {
            setLoading(false);
        }
    };

    const startRitual = () => {
        setStep(1); // Jump to Step 1 directly (Intro is Step 0)
        // We can optionally auto-trigger a "Start" text, but let's let user choose first interaction.
        setCurrentNarrative("仪式开始了。她羞涩地站在你面前，等待着你的处置...");
        setCurrentReply("“主、主人...请温柔一点...”");
    };

    // --- CHOICE DEFINITIONS (The 7-Step Logic) ---
    const choices = useMemo(() => {
        switch (step) {
            case 1: // Step 1: 调情
                return [
                    { id: 'A', text: "轻吻双唇" },
                    { id: 'B', text: "爱抚脸颊" },
                    { id: 'C', text: "耳边低语" }
                ];
            case 2: // Step 2: 前戏
                return [
                    { id: 'A', text: "揉捏乳房" },
                    { id: 'B', text: "指尖挑逗私处" },
                    { id: 'C', text: "舔她的身体和私处" }
                ];
            case 3: // Step 3: 奉仕
                return [
                    { id: 'A', text: "口交侍奉" },
                    { id: 'B', text: "乳交侍奉" },
                    { id: 'C', text: "手淫侍奉" }
                ];
            case 4: // Step 4: 插入 - 基础
                return [
                    { id: 'A', text: "正常位 (Missionary)" },
                    { id: 'B', text: "骑乘位 (Cowgirl)" },
                    { id: 'C', text: "后入位 (Doggy)" }
                ];
            case 5: // Step 5: 插入 - 深度
                return [
                    { id: 'A', text: "抬腿位 (Mating Press)" },
                    { id: 'B', text: "侧入位 (Spoon)" },
                    { id: 'C', text: "站立位 (Standing)" }
                ];
            case 6: // Step 6: 高潮
                return [
                    { id: 'A', text: "子宫内射 (Creampie)" },
                    { id: 'B', text: "颜射 (Facial)" },
                    { id: 'C', text: "体外射精 (Outside)" }
                ];
            default:
                return [];
        }
    }, [step]);

    return (
        <div className={`fixed inset-0 z-[200] bg-black text-pink-100 flex flex-col font-serif animate-fade-in overflow-hidden ${shake ? 'animate-shake' : ''}`}>
            {/* Ambient Background */}
            <div className={`absolute inset-0 transition-all duration-1000 opacity-20 pointer-events-none ${step >= 4 ? 'bg-red-900 shadow-[inset_0_0_100px_rgba(255,0,0,0.6)]' : 'bg-purple-900'}`} />
            
            {/* Top Bar */}
            <div className="bg-gray-950/95 p-4 border-b border-pink-500/30 backdrop-blur-xl z-10">
                <div className="max-w-xl mx-auto space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-pink-500 animate-pulse">
                            {step >= 6 ? '🔥 绝顶升天 (CLIMAX)' : step >= 4 ? '🔞 深度结合 (PENETRATION)' : '💋 调教仪式 (FOREPLAY)'}
                        </span>
                        <span className="text-xl font-black text-white italic">{pleasure}%</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-900/50 h-2 rounded-full overflow-hidden border border-white/5 p-[1px]">
                        <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-600 h-full transition-all duration-700 shadow-[0_0_15px_var(--primary-glow)]" style={{ width: `${pleasure}%` }} />
                    </div>
                    {/* Steps Indicator */}
                    <div className="flex justify-between px-1 pt-1">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className={`h-1 flex-1 mx-[1px] rounded-full transition-colors ${i <= step ? 'bg-pink-500 shadow-[0_0_5px_var(--primary)]' : 'bg-white/10'}`} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center custom-scrollbar relative pb-32">
                
                {/* Step 0: Intro Card */}
                {step === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-10 animate-fade-in max-w-sm mt-10">
                        <div className="relative group">
                            <img src={character.imageUrl || "https://picsum.photos/seed/harem/300/400"} className="w-64 h-96 object-cover rounded-[2rem] border-2 border-pink-500/40 shadow-[0_0_50px_rgba(255,0,85,0.3)] group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            <div className="absolute bottom-6 left-0 right-0">
                                <h2 className="text-4xl font-black text-white tracking-tighter uppercase neon-text">{character.name}</h2>
                                <p className="text-xs text-pink-300 uppercase tracking-widest mt-1">Lv.{character.level} {character.title}</p>
                            </div>
                        </div>
                        <div className="space-y-4 w-full">
                            <button onClick={startRitual} className="w-full py-5 bg-pink-600 hover:bg-pink-500 rounded-2xl shadow-[0_0_30px_var(--primary-glow)] font-black tracking-[0.5em] text-white active:scale-95 transition-all text-sm border border-white/20 uppercase">
                                开始调教
                            </button>
                            <button onClick={() => onClose(false)} className="text-[10px] text-dim hover:text-white uppercase tracking-widest w-full py-2">
                                暂时离开
                            </button>
                        </div>
                    </div>
                )}

                {/* Steps 1-6: Interaction */}
                {(step >= 1 && step <= 6) && (
                    <div className="w-full max-w-xl flex-1 flex flex-col space-y-6 animate-slide-up pt-4">
                        {/* Narrative Box */}
                        <div className="text-[13px] text-pink-100/90 italic text-center leading-loose px-6 py-5 bg-white/5 rounded-3xl border border-white/5 shadow-inner backdrop-blur-sm min-h-[80px] flex items-center justify-center">
                            {loading ? <span className="animate-pulse tracking-widest text-pink-500">正在生成感官反馈...</span> : currentNarrative || "..."}
                        </div>
                        
                        {/* Character Dialogue Box */}
                        <div className="bg-gray-900/90 border-l-4 border-pink-600 p-8 rounded-2xl relative shadow-2xl group transition-all hover:bg-black min-h-[120px]">
                            <div className="absolute -top-3 left-6 bg-pink-600 text-[8px] px-4 py-1.5 rounded-full text-white font-black uppercase tracking-widest shadow-lg">RESPONSE</div>
                            <div className="space-y-3">
                                {loading ? (
                                    <div className="flex gap-1 items-center h-8 justify-center opacity-50">
                                        <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                        <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                        <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                    </div>
                                ) : (
                                    currentReply.split('\n').map((line, i) => (
                                        <p key={i} className={line.startsWith('[心理]') || line.startsWith('[内心') ? "text-[11px] text-pink-400/70 italic opacity-80" : "text-white leading-relaxed text-lg drop-shadow-md font-medium"}>
                                            {line}
                                        </p>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Choices Grid */}
                        <div className="space-y-2 pt-4">
                            <div className="text-[10px] text-center text-dim uppercase tracking-widest mb-4 opacity-50">Step {step} / 6 - 选择行动</div>
                            <div className="grid grid-cols-1 gap-3">
                                {choices.map((choice) => (
                                    <button 
                                        key={choice.id} 
                                        onClick={() => triggerStep(choice.id, choice.text)}
                                        disabled={loading}
                                        className="w-full p-4 bg-white/5 hover:bg-pink-600/20 border border-white/10 rounded-2xl transition-all text-xs text-left flex items-center gap-5 group active:scale-[0.98] hover:border-pink-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-black shadow-inner transition-colors ${loading ? 'bg-gray-800 text-gray-600' : 'bg-pink-900/40 border border-pink-500/40 text-pink-500 group-hover:bg-pink-500 group-hover:text-white'}`}>
                                            {choice.id}
                                        </span>
                                        <span className="text-white/90 group-hover:text-white transition-colors font-bold tracking-wide text-sm">{choice.text}</span>
                                        
                                        {/* Memory Indicator */}
                                        {character.contractHistory?.[`C${character.id}_S${step+1}_${choice.id}`] && (
                                            <span className="ml-auto text-[9px] text-green-400 font-mono opacity-50 border border-green-500/30 px-1.5 py-0.5 rounded uppercase">已解锁</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 7: Final Seal / Climax Result */}
                {step === 7 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-10 animate-fade-in px-8 mt-10">
                        <div className="relative">
                             <div className="absolute inset-0 bg-pink-600 blur-[60px] opacity-40 animate-pulse" />
                             <div className="relative z-10 bg-black/50 p-6 rounded-full border-2 border-pink-500 shadow-[0_0_50px_var(--primary-glow)]">
                                <span className="text-6xl animate-bounce block">💦</span>
                             </div>
                        </div>
                        
                        <div className="space-y-6 max-w-md">
                            <h2 className="text-5xl font-black text-white uppercase tracking-tighter neon-text animate-pulse">契约达成</h2>
                            
                            {/* Final Narrative Display */}
                            <div className="bg-black/80 p-6 rounded-3xl border border-pink-500/30 backdrop-blur-xl shadow-2xl text-left">
                                <p className="text-sm text-pink-200/80 italic mb-4 leading-relaxed border-b border-white/5 pb-4">
                                    {currentNarrative}
                                </p>
                                <p className="text-lg text-white font-medium">
                                    {currentReply}
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={() => onClose(true)} 
                            className="w-full max-w-xs py-5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-full text-white font-black tracking-[0.4em] shadow-[0_0_60px_rgba(255,0,85,0.6)] hover:scale-105 active:scale-95 transition-all text-sm border-2 border-white/20 uppercase"
                        >
                            Seal the Pact (完成)
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translate(0, 0); }
                    25% { transform: translate(-3px, 3px); }
                    50% { transform: translate(3px, -3px); }
                    75% { transform: translate(-3px, -3px); }
                }
                .animate-shake { animation: shake 0.2s ease-in-out; }
            `}</style>
        </div>
    );
};

export default ContractModal;
