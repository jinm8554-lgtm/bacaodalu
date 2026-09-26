
import { Character, GameState, Item, Rarity, BattleStrategy } from '../types';
import { CHARACTER_DB, INITIAL_GOLD, RARITY_RATES } from '../constants';

export const RARITY_LEVEL_GROWTH: Record<Rarity, number> = {
    UR: 0.15,
    SSR: 0.12,
    SR: 0.10,
    R: 0.08
};

const getRandomRarity = (availableRarities: Rarity[] = ['UR', 'SSR', 'SR', 'R']): Rarity => {
    const configured = availableRarities.map(rarity => ({ rarity, weight: RARITY_RATES[rarity] })).filter(item => item.weight > 0);
    const total = configured.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of configured) {
        roll -= item.weight;
        if (roll < 0) return item.rarity;
    }
    return configured[configured.length - 1]?.rarity || 'SR';
};

export const pullCharacter = (roster: Character[]): { char: Character, isNew: boolean, reward: number } => {
    // 玩家档案会由 GM 发布角色接口同步，优先使用同步后的模板，保留静态角色表作为兜底。
    const templates = [...roster, ...CHARACTER_DB].filter((character, index, all) => all.findIndex(item => item.id === character.id) === index);
    const availableRarities = (['UR', 'SSR', 'SR', 'R'] as Rarity[]).filter(rarity => templates.some(character => character.rarity === rarity));
    const rarity = getRandomRarity(availableRarities);
    // 召唤池包含所有已同步的角色，不再按种族限制；稀有度由抽取结果决定。
    const pool = templates.filter(c => c.rarity === rarity);
    const template = pool[Math.floor(Math.random() * pool.length)] || templates[0] || CHARACTER_DB[0];

    const existing = roster.find(c => c.id === template.id && c.isOwned);
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

export const getCharacterStats = (character: Character) => {
    const equipment = character.equipment || {};
    const equipmentStats = (['WEAPON', 'ARMOR', 'ACCESSORY', 'BOOTS'] as const).reduce((total, slot) => {
        const stats = equipment[slot]?.stats || {};
        return {
            ATK: total.ATK + Number(stats.ATK || 0),
            DEF: total.DEF + Number(stats.DEF || 0),
            CHM: total.CHM + Number(stats.CHM || 0)
        };
    }, { ATK: 0, DEF: 0, CHM: 0 });
    return {
        base: character.baseStats,
        equipment: equipmentStats,
        total: {
            ATK: Number(character.baseStats?.ATK || 0) + equipmentStats.ATK,
            DEF: Number(character.baseStats?.DEF || 0) + equipmentStats.DEF,
            CHM: Number(character.baseStats?.CHM || 0) + equipmentStats.CHM
        }
    };
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
        let currentChar = char;
        const growthRate = RARITY_LEVEL_GROWTH[currentChar.rarity] ?? RARITY_LEVEL_GROWTH.R;
        while (newExp >= newLevel * 100) {
            newExp -= newLevel * 100;
            newLevel++;
            currentChar = {
                ...currentChar,
                baseStats: {
                    ATK: Math.max(currentChar.baseStats.ATK + 1, Math.floor(currentChar.baseStats.ATK * (1 + growthRate))),
                    DEF: Math.max(currentChar.baseStats.DEF + 1, Math.floor(currentChar.baseStats.DEF * (1 + growthRate))),
                    CHM: Math.max(currentChar.baseStats.CHM + 1, Math.floor(currentChar.baseStats.CHM * (1 + growthRate)))
                }
            };
            logs.push(`✨ [${currentChar.name}] 欲望高涨！升级到了 Lv.${newLevel}！`);
        }

        return { ...currentChar, level: newLevel, exp: newExp };
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
export const saveGame = async (state: GameState) => {
    const response = await fetch('/api/game/profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state })
    });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || '游戏档案保存失败');
};
export const loadGame = async (): Promise<GameState | null> => {
    const response = await fetch('/api/game/profile');
    if (response.status === 401) return null;
    if (!response.ok) throw new Error('游戏档案加载失败');
    return response.json();
};
