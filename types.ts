
export type Rarity = 'R' | 'SR' | 'SSR' | 'UR';
export type StatType = 'ATK' | 'DEF' | 'CHM';
export type Job = 'WARRIOR' | 'MAGE' | 'ARCHER' | 'SUPPORT' | 'ASSASSIN' | 'TANK' | 'RULER' | 'MAID' | 'ALCHEMIST';

export interface Item {
    id: string;
    name: string;
    type: 'WEAPON' | 'ARMOR' | 'ACCESSORY' | 'BOOTS';
    rarity: Rarity;
    stats: { [key in StatType]?: number };
    level: number;
    description: string;
}

export interface ContractHistoryEntry {
    narrative: string;
    npcReply: string;
    timestamp: number;
}

export interface Character {
    id: string;
    name: string;
    title: string;
    rarity: Rarity;
    // 兼容字段，对应 JSON 中的 "class"
    charClass: string; 
    job: Job | string; // 保留原有逻辑兼容
    weapon: string;
    race: 'SUCCUBUS' | 'HUMAN' | 'ELF' | 'DEMON' | 'BEASTKIN' | 'SLIME' | 'ANGEL';
    
    // 详细文本资料
    desc: string; 
    appearance: string; // 外貌描写
    background: string; // 身世背景
    personality: string;
    
    // AI 行为控制
    boundaries?: string;
    consentStyle?: string;
    
    // 数值
    baseStats: { [key in StatType]: number };
    level: number;
    exp: number;
    bond: number;
    
    skills: string[];
    equipment: {
        WEAPON?: Item;
        ARMOR?: Item;
        ACCESSORY?: Item;
        BOOTS?: Item;
    };
    isOwned: boolean;
    imageUrl?: string;
    gachaLines?: string[]; // 角色台词
    
    // 调教记忆缓存
    contractHistory?: { [key: string]: ContractHistoryEntry };
}

export interface ChatApiResponse {
    mode: "chat";
    safety: { allowed: boolean; reason: string };
    participants: { id: string; name: string }[];
    messages: {
        speakerId: string;
        speakerName: string;
        toneTags: string[];
        content: string;
    }[];
    summaryDelta: string;
    clientDirectives: {
        suggestedNextUserPrompts: string[];
        cooldownMs: number;
    };
}

export interface ContractApiResponse {
    mode: "contract";
    safety: { allowed: boolean; reason: string };
    scene: {
        narrative: string;
        npcReply: string;
        fadeLine: string;
    };
    choices: {
        id: "A" | "B" | "C";
        text: string;
        outcome: "correct" | "neutral";
    }[];
    effects: {
        trustDelta: { A: number; B: number; C: number };
        resonanceDelta: { A: number; B: number; C: number };
    };
    clientDirectives: {
        endScene: boolean;
        nextStepHint: string;
    };
}

export interface Level {
    id: string;
    name: string;
    type: 'TOWN' | 'FORT' | 'CAPITAL';
    difficulty: 1 | 2 | 3 | 4 | 5;
    desc: string;
    bossId?: string;
    isCleared?: boolean;
}

export interface Nation {
    id: string;
    name: string;
    desc: string;
    levels: Level[];
    progress: number;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: number;
    toneTags?: string[];
}

export interface LogEntry {
    id: string;
    type: 'BATTLE' | 'CONTRACT' | 'SYSTEM' | 'GACHA';
    content: string;
    timestamp: number;
    details?: any;
}

export interface GameState {
    gold: number;
    roster: Character[];
    inventory: Item[];
    party: string[];
    nations: Nation[];
    chatHistory: ChatMessage[];
    conversationSummary: string;
    logs: LogEntry[];
    settings: {
        // OpenAI Compatible Settings
        model: string; // Dynamic model ID
        availableModels: string[]; // List of models fetched from API
        
        volume: number;
        chatFontSize?: number;
        voiceEnabled?: boolean;
        responseLength?: number;
        autoModeEnabled?: boolean;
        activeCharacterIds?: string[];
    };
}

export type BattleStrategy = 'GOLD' | 'LOOT';
