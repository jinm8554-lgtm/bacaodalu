
import { Character, GameState, Item, Rarity, BattleStrategy } from '../types';
import { CHARACTER_DB, INITIAL_GOLD, RARITY_RATES } from '../constants';

const getRandomRarity = (): Rarity => {
    const r = Math.random();
    if (r < RARITY_RATES.UR) return 'UR';
    if (r < RARITY_RATES.UR + RARITY_RATES.SSR) return 'SSR';
    if (r < RARITY_RATES.UR + RARITY_RATES.SSR + RARITY_RATES.SR) return 'SR';
    return 'R';
};

export const pullCharacter = (roster: Character[]): { char: Character, isNew: boolean, reward: number } => {
    const rarity = getRandomRarity();
    const pool = CHARACTER_DB.filter(c => c.race === 'SUCCUBUS' && c.rarity === rarity);
    const template = pool[Math.floor(Math.random() * pool.length)] || CHARACTER_DB[0]; 

    const existing = roster.find(c => c.id === template.id);
    if (existing) {
        // 重复角色：增加羁绊而不是金币，主人~
        const bondGain = rarity === 'UR' ? 300 : rarity === 'SSR' ? 100 : rarity === 'SR' ? 30 : 10;
        return { char: template, isNew: false, reward: bondGain }; 
    } else {
        const newChar = { ...template, isOwned: true, bond: 0, level: 1, exp: 0 };
        return { char: newChar, isNew: true, reward: 0 };
    }
};

export const pullEquipment = (): Item => {
    const rarity = getRandomRarity();
    const types = ['WEAPON', 'ARMOR', 'ACCESSORY', 'BOOTS'] as const;
    const type = types[Math.floor(Math.random() * types.length)];
    
    const typeNames = {
        'WEAPON': '魔剑', 'ARMOR': '暗甲', 'ACCESSORY': '魔戒', 'BOOTS': '战靴'
    };

    return {
        id: `item-${Date.now()}-${Math.random()}`,
        name: `${rarity}级${typeNames[type]}`,
        type,
        rarity,
        level: 1,
        stats: { ATK: 5, DEF: 5 }, 
        description: '散发着微弱的魔力。'
    };
};

export const upgradeItem = (item: Item, currentGold: number): { success: boolean, newItem?: Item, newGold?: number, message: string } => {
    const cost = item.level * 200;
    if (currentGold < cost) {
        return { success: false, message: "金币不足，无法进行强化仪式..." };
    }

    const newItem = { ...item, level: item.level + 1 };
    const multiplier = item.rarity === 'UR' ? 1.5 : item.rarity === 'SSR' ? 1.3 : 1.1;
    
    if (newItem.stats.ATK) newItem.stats.ATK = Math.floor(newItem.stats.ATK * multiplier + 5);
    if (newItem.stats.DEF) newItem.stats.DEF = Math.floor(newItem.stats.DEF * multiplier + 5);
    if (newItem.stats.CHM) newItem.stats.CHM = Math.floor(newItem.stats.CHM * multiplier + 5);

    return { success: true, newItem, newGold: currentGold - cost, message: "强化成功！装备散发出更危险的气息..." };
};

interface BattleResult {
    victory: boolean;
    logs: string[];
    rewards: { gold: number; exp: number; items: Item[]; capturedId?: string };
    updatedParty: Character[];
}

const renderHpBar = (current: number, max: number, width: number = 10) => {
    const percent = Math.max(0, Math.min(1, current / max));
    const filled = Math.floor(percent * width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
};

const ENVIRONMENTS = [
    "充满催情费洛蒙的暗紫毒雾", "士兵们衣衫不整的兵营", "挂满蕾丝内衣的贵族寝宫",
    "热浪滚滚的流沙陷阱", "散发着异域香料味的舞厅", "大汗淋漓的沙漠绿洲",
    "地面布满粘液的湿滑甲板", "充满了触手陷阱的船舱", "潮湿闷热的海底洞窟",
    "藤蔓像活物般蠕动的密林", "散发着甜腻花香的树屋", "充满粘稠树脂的古树洞",
    "回荡着娇喘声的忏悔室", "被圣水浸湿的大理石地板", "亵渎神明的地下祭坛"
];

const LILITH_COMMENTS = [
    "哎呀，这个姿势真是太下流了，主人一定会喜欢的~", "看那个敌人的表情，已经彻底坏掉了吧，嘻嘻~",
    "贝拉又在笨手笨脚了，不过弄得到处都是液体的样子也很可爱呢~", "主人~ 您的军队真是暴力又色情，奴家看得都要湿了...",
    "再用力一点！把她们的尊严彻底粉碎掉！主人万岁！", "这种程度的抵抗，只会增加征服的快感罢了~",
];

const generateSkillDesc = (charName: string, skill: string, targetName: string) => {
    const templates = [
        `${charName} 眼神迷离，使用 <${skill}> 狠狠地摩擦 ${targetName} 的敏感部位！`,
        `${charName} 发出诱人的呻吟，<${skill}> 产生的冲击波震碎了 ${targetName} 的衣物！`,
        `随着一声娇喝，${charName} 的 <${skill}> 让战场下起了粘稠的雨！`,
        `${charName} 摆出极为羞耻的姿势，<${skill}> 直接对 ${targetName} 造成了精神污染！`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
};

export const simulateBattle = (
    party: Character[], 
    enemyPower: number, 
    bossId: string | undefined, 
    strategy: BattleStrategy
): BattleResult => {
    const logs: string[] = [];
    const env = ENVIRONMENTS[Math.floor(Math.random() * ENVIRONMENTS.length)];

    let activeParty = party.map(c => ({...c}));

    let partyTotalHp = activeParty.reduce((acc, c) => acc + (c.baseStats.DEF + (c.equipment.ARMOR?.stats.DEF || 0)) * 10, 0);
    const partyMaxHp = partyTotalHp;
    
    let enemyTotalHp = enemyPower * 20;
    const enemyMaxHp = enemyTotalHp;
    
    let enemyName = "当地守备军";
    if (bossId) {
        const boss = CHARACTER_DB.find(c => c.id === bossId);
        if (boss) enemyName = `[首领] ${boss.name}`;
    }

    let round = 1;
    logs.push(`
┌───────────────────────────────────────────────┐
│ ⚔️ 战斗开始 | 📍 ${env}
├───────────────────────────────────────────────┤
│ 敌军遭遇！准备进行征服仪式...
└───────────────────────────────────────────────┘
`);

    while (partyTotalHp > 0 && enemyTotalHp > 0 && round <= 8) {
        let roundDmg = 0;
        let skillTriggered = null;

        activeParty.forEach(c => {
            const eqAtk = (c.equipment.WEAPON?.stats.ATK || 0) + (c.equipment.ACCESSORY?.stats.ATK || 0);
            const totalAtk = c.baseStats.ATK + eqAtk;

            if (Math.random() < 0.4 && !skillTriggered) {
                const skill = c.skills[Math.floor(Math.random() * c.skills.length)];
                skillTriggered = { char: c, skill };
                roundDmg += totalAtk * 1.8;
            } else {
                roundDmg += totalAtk * (0.8 + Math.random() * 0.4);
            }
        });
        
        enemyTotalHp -= roundDmg;
        const enemyHpPct = Math.max(0, Math.round((enemyTotalHp / enemyMaxHp) * 100));
        const partyHpPct = Math.max(0, Math.round((partyTotalHp / partyMaxHp) * 100));

        const actionLine = skillTriggered 
            ? `▶️ 动作: [${skillTriggered.char.name}] 发动了 <【${skillTriggered.skill}】>` 
            : `▶️ 动作: 我方全员发动了 [肉体围攻]`;
        
        const visualDesc = skillTriggered
            ? generateSkillDesc(skillTriggered.char.name, skillTriggered.skill, enemyName)
            : `无数只白皙的手臂和光滑的大腿交织在一起，将敌人淹没在肉色的海洋中！`;
        
        const damageDesc = `📉 伤害: ${Math.floor(roundDmg)} (护甲溶解/精神崩溃)`;
        const lilithWhisper = LILITH_COMMENTS[Math.floor(Math.random() * LILITH_COMMENTS.length)];

        let enemyDmgLog = "";
        if (enemyTotalHp > 0) {
            const enemyDmg = enemyPower * 10 * (Math.random() * 0.5 + 0.5);
            partyTotalHp -= enemyDmg;
            enemyDmgLog = `⚠️ 敌方反击: 造成 ${Math.floor(enemyDmg)} 点震荡伤害`;
        } else {
            enemyDmgLog = `💀 敌方已失去意识 (高潮绝顶)`;
        }

        logs.push(`
┌───────────────────────────────────────────────┐
│ ⚔️ 回合 ${round < 10 ? '0'+round : round} | 📍 ${env.substring(0, 10)}...
├───────────────────────┬───────────────────────┤
│ 😈 圣殿亲卫队         │ 🛡️ ${enemyName}
│ HP: ${renderHpBar(partyTotalHp, partyMaxHp)} ${partyHpPct}%   │ HP: ${renderHpBar(enemyTotalHp, enemyMaxHp)} ${enemyHpPct}%
│ 状态: 💧 [湿润]       │ 状态: 💢 [破防]
├───────────────────────┴───────────────────────┤
│ ${actionLine}
├───────────────────────────────────────────────┤
│ 👁️ 视觉回放:
│ ${visualDesc}
├───────────────────────────────────────────────┤
│ 💥 战况判定:
│ ${damageDesc}
│ ${enemyDmgLog}
├───────────────────────────────────────────────┤
│ 💬 莉莉丝的私语:
│ "${lilithWhisper}"
└───────────────────────────────────────────────┘
`);
        if (enemyTotalHp <= 0 || partyTotalHp <= 0) break;
        round++;
    }

    const victory = partyTotalHp > 0;
    
    logs.push(`
┌───────────────────────────────────────────────┐
│ 🏆 ${victory ? '胜利' : '失败'} | 🎉 ${victory ? '敌军已彻底溃败' : '我方体力耗尽...'}
├───────────────────────────────────────────────┤
│ 👁️ 战场清扫:
│ ${victory ? '按照您的命令，我们扒光了敌人身上最后一枚\n│ 金币。现在，这片战场属于您了。' : '姐妹们衣衫不整地撤回了圣殿...'}
└───────────────────────────────────────────────┘
`);

    let gold = victory ? 100 * selectedLevelDifficulty(enemyPower) : 10;
    let expGain = victory ? 50 * selectedLevelDifficulty(enemyPower) : 5;
    let items: Item[] = [];
    let capturedId: string | undefined = undefined;

    const updatedParty = activeParty.map(char => {
        let newExp = (char.exp || 0) + expGain;
        let newLevel = char.level;
        const expToLevel = newLevel * 100;
        
        let leveledUp = false;
        while (newExp >= expToLevel) {
            newExp -= expToLevel;
            newLevel++;
            leveledUp = true;
        }

        let newStats = { ...char.baseStats };
        if (leveledUp) {
            newStats.ATK = Math.floor(newStats.ATK * 1.1);
            newStats.DEF = Math.floor(newStats.DEF * 1.1);
            newStats.CHM = Math.floor(newStats.CHM * 1.1);
            logs.push(`✨ [${char.name}] 欲望高涨！升级到了 Lv.${newLevel}！`);
        }

        return { ...char, level: newLevel, exp: newExp, baseStats: newStats };
    });

    if (victory) {
        if (strategy === 'GOLD') {
            gold = Math.floor(gold * 1.5);
        } else {
            expGain = Math.floor(expGain * 1.2);
            if (Math.random() < 0.3) items.push(pullEquipment());
        }

        if (bossId) {
            const captureChance = 0.3;
            if (Math.random() < captureChance) {
                capturedId = bossId;
                const bossName = CHARACTER_DB.find(c=>c.id===bossId)?.name || "首领";
                logs.push(`【大捷】敌方首领 [${bossName}] 被俘获！`);
            }
        }
    }

    return { victory, logs, rewards: { gold, exp: expGain, items, capturedId }, updatedParty };
};

export const sweepBattle = (
    difficulty: number,
    strategy: BattleStrategy
): { gold: number, exp: number, items: Item[] } => {
    let gold = 100 * difficulty;
    let exp = 50 * difficulty;
    let items: Item[] = [];

    if (strategy === 'GOLD') {
        gold = Math.floor(gold * 1.5);
    } else {
        exp = Math.floor(exp * 1.2);
        if (Math.random() < 0.3) items.push(pullEquipment());
    }
    gold = Math.floor(gold * (0.9 + Math.random() * 0.2));

    return { gold, exp, items };
};

const selectedLevelDifficulty = (power: number) => Math.floor(power / 25);
export const saveGame = (state: GameState) => { localStorage.setItem('EIGHT_GRASS_SAVE_V1', JSON.stringify(state)); };
export const loadGame = (): GameState | null => {
    const raw = localStorage.getItem('EIGHT_GRASS_SAVE_V1');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
};
export const exportSave = (state: GameState, filename: string) => {
    const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
};
