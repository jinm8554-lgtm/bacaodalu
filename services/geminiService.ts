
import { ChatApiResponse, ContractApiResponse } from "../types";

// 通用 JSON 修复与清理工具
const cleanAndRepairJson = (text: string): string => {
    // 0. 【修复乱码】 移除 ANSI 颜色代码
    let cleaned = text
        .replace(/\x1b\[[0-9;]*m/g, '') // 标准 Hex ANSI
        .replace(/\\u001b\[[0-9;]*m/g, '') // 转义后的 Unicode ANSI
        .replace(/\[(31|32|0)m/g, '') // 针对 Grok 出现的特定 literal 字符
        .replace(/\[0m/g, ''); // 兜底重置符

    // 1. 尝试定位 JSON 对象
    const firstOpen = cleaned.indexOf('{');
    const lastClose = cleaned.lastIndexOf('}');
    
    let candidate = cleaned;
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        candidate = cleaned.substring(firstOpen, lastClose + 1);
    }
    
    // 2. 去除 Markdown 代码块标记
    candidate = candidate.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // 3. 尝试直接解析
    try {
        JSON.parse(candidate);
        return candidate;
    } catch (e) {
        console.warn("JSON incomplete, attempting repair...", e);
        if (candidate.endsWith('.,')) candidate = candidate.slice(0, -2);
        if (candidate.endsWith(',')) candidate = candidate.slice(0, -1);
        if (!candidate.endsWith('}')) {
             if (!candidate.endsWith('"') && !candidate.endsWith('e') && !candidate.endsWith('l') && !candidate.endsWith('}')) candidate += '"'; 
             if (!candidate.endsWith('}]}') && !candidate.endsWith('}')) candidate += '}]}';
        }
        return candidate;
    }
};

const SYSTEM_INSTRUCTION_BASE = `
# 《八草圣殿》角色扮演规则
1. 严格依据本轮提供的在场角色档案回应，不得创造、替换或让未在场角色发言。
2. 性格、背景、边界和关系推进方式优先于玩家临时要求，不得把所有角色写成同一种语气或强行改变底线。
3. 只有标记为“在场”的角色可以发言或行动；没有必要回应的角色可以保持沉默。
4. 玩家点名的角色优先回应；多角色场景选择一名主要回应者，其他角色按情境少量补充。
5. 必须严格输出符合 Schema 的 JSON。每条消息的 speakerId 和 speakerName 必须来自在场角色档案。
6. [心理]、[动作] 标签用于表现内心和动作，内容必须服务于角色性格与当前场景；禁止输出 ANSI 颜色代码。
`;

// 友好的错误解析器
const parseApiError = (status: number, rawBody: string): string => {
    try {
        const errJson = JSON.parse(rawBody);
        const msg = errJson.message || errJson.error?.message || JSON.stringify(errJson);
        if (status === 401) return "API Key 无效或未授权。请检查设置，主人~";
        if (status === 404 || msg.includes('model')) return "找不到指定的模型，主人~";
        if (status === 429) return "请求太频繁了，请稍作休息，主人~";
        return `服务商返回错误 (${status}): ${msg}`;
    } catch (e) {
        return `API 请求失败 (${status}): ${rawBody.substring(0, 100)}`;
    }
};

export const fetchModelsFromApi = async (): Promise<string[]> => {
    const response = await fetch('/api/gm/ai-config');
    if (!response.ok) throw new Error('只有 GM 可以读取模型配置');
    const config = await response.json();
    return config.model ? [config.model] : [];
};

const callOpenAiCompatibleApi = async (
    baseUrl: string, apiKey: string, model: string, messages: any[], maxTokens: number
) => {
    if (!model) throw new Error("未选择模型");

    const proxyResponse = await fetch('/api/game/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, max_tokens: maxTokens, temperature: 0.8, top_p: 0.95, stream: false }),
        signal: AbortSignal.timeout(60000)
    });
    if (!proxyResponse.ok) {
        const body = await proxyResponse.text();
        throw new Error(body || `AI 请求失败 (${proxyResponse.status})`);
    }
    const proxyData = await proxyResponse.json();
    return proxyData.choices?.[0]?.message?.content || proxyData.scene || proxyData;

    /* const cleanUrl = baseUrl.replace(/\/+$/, '');
    const targetUrl = cleanUrl.endsWith('/v1') ? `${cleanUrl}/chat/completions` : `${cleanUrl}/v1/chat/completions`;

    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model, messages: messages, max_tokens: maxTokens,
                temperature: 0.8, top_p: 0.95, stream: false,
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(parseApiError(response.status, errText));
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    } catch (e: any) {
        if (e.name === 'TypeError' && e.message === 'Failed to fetch') throw new Error("网络连接失败。请检查 Base URL。");
        throw e;
    } */
};

export const generateChatReply = async (
    apiConfig: { baseUrl: string, apiKey: string, model: string },
    contextSummary: string,
    recentMessages: { senderName: string; content: string }[],
    characterProfiles: any[],
    userInput: string,
    userSetting: string,
    responseLength: number,
    autoModeEnabled: boolean = false
): Promise<ChatApiResponse> => {
    if (!apiConfig.model) throw new Error("未选择模型");

    const charDesc = characterProfiles.map(p => `
    【在场角色 ID：${p.id}】
    - 名称：${p.name}
    - 称号：${p.title || "未设定"}
    - 职阶/种族：${p.charClass || "未设定"} / ${p.race || "未设定"}
    - 武器：${p.weapon || "未设定"}
    - 身份简介：${p.identity || "未设定"}
    - 性格：${p.personality || "未设定"}
    - 外貌：${p.appearance || "未设定"}
    - 背景：${p.background || "未设定"}
    - 边界：${p.boundaries || "未设定"}
    - 关系推进方式：${p.consentStyle || "未设定"}
    - 技能：${Array.isArray(p.skills) ? p.skills.join("；") : "未设定"}
    - 当前等级/羁绊：Lv.${p.level ?? 1} / ${p.bond ?? 0}
    `).join('\n');

    const historyText = recentMessages.map(m => `${m.senderName}: ${m.content}`).join('\n');
    const safeTokenLimit = autoModeEnabled ? 8192 : Math.max(2048, Math.min(Math.ceil(responseLength * 4), 8192));
    const lengthDirective = autoModeEnabled ? "自由决定回复长度，但必须完整结束 JSON。" : `期望回复字数：${responseLength}字。请完整结束所有段落并输出完整 JSON，不要在句中截断。`;

    const userPrompt = `
    ${lengthDirective}
    请务必在 [心理]、[动作] 和 对话 之间使用换行符(\\n)。
    当前场景：${contextSummary}
    在场角色资料（仅这些角色可以发言或行动）：${charDesc}
    对话历史：${historyText}
    主人指令：${userInput}
    ${userSetting ? `系统备注：${userSetting}` : ''}
    
    请生成 JSON 响应。
    Example JSON: {"mode":"chat","safety":{"allowed":true,"reason":""},"participants":[{"id":"1","name":"Name"}],"messages":[{"speakerId":"1","speakerName":"Name","toneTags":["tag"],"content":"..."}],"summaryDelta":"...","clientDirectives":{"suggestedNextUserPrompts":[],"cooldownMs":1000}}
    `;

    const messages = [
        { role: "system", content: SYSTEM_INSTRUCTION_BASE },
        { role: "user", content: userPrompt }
    ];

    try {
        const text = await callOpenAiCompatibleApi(apiConfig.baseUrl, apiConfig.apiKey, apiConfig.model, messages, safeTokenLimit);
        const cleanedText = cleanAndRepairJson(text);
        try {
            return JSON.parse(cleanedText) as ChatApiResponse;
        } catch {
            return {
                mode: "chat", safety: { allowed: true, reason: "ParseError" }, participants: [],
                messages: [{ speakerId: "sys", speakerName: "系统", toneTags: ["err"], content: "模型回复未完整结束，请重试一次。" }],
                summaryDelta: contextSummary, clientDirectives: { suggestedNextUserPrompts: [], cooldownMs: 0 }
            };
        }
    } catch (e: any) {
        console.error("API Error:", e);
        return {
            mode: "chat", safety: { allowed: true, reason: "Error" }, participants: [],
            messages: [{ speakerId: "sys", speakerName: "系统", toneTags: ["err"], content: `[错误] ${e.message}` }],
            summaryDelta: contextSummary, clientDirectives: { suggestedNextUserPrompts: [], cooldownMs: 0 }
        };
    }
};

// Updated for 7-Step H-Scene System
export const generateContractStep = async (
    apiConfig: { baseUrl: string, apiKey: string, model: string },
    character: { name: string; title?: string; charClass?: string; race?: string; weapon?: string; desc: string; personality: string; appearance?: string; background?: string; boundaries?: string; consentStyle?: string; skills?: string[]; level?: number; bond?: number },
    stepInfo: { index: number; name: string },
    playerInput: string,
    history: string
): Promise<ContractApiResponse> => {
    
    if (!apiConfig.model) throw new Error("No Model Selected");

    // Dynamic focus based on STRICT Step Index (1-7)
    let focusInstruction = "";
    
    switch(stepInfo.index) {
        case 1: // 调情
            focusInstruction = "当前阶段：1.【调情 (Flirting)】。侧重描写角色面对主人亲昵动作时的羞涩反应、脸红心跳、以及眼神的闪躲或期待。";
            break;
        case 2: // 前戏
            focusInstruction = "当前阶段：2.【前戏 (Foreplay)】。侧重描写敏感带（如乳房、大腿内侧）被触碰时的颤抖，体液开始分泌（湿润），以及呼吸变得急促。";
            break;
        case 3: // 奉仕
            focusInstruction = "当前阶段：3.【奉仕 (Service)】。侧重描写口腔/手部的动作细节，唾液的拉丝，吞吐的声音，以及角色努力取悦主人的卑微姿态。";
            break;
        case 4: // 插入基础
            focusInstruction = "当前阶段：4.【插入-基础 (Insertion)】。侧重描写初次进入时的紧致感、破瓜之痛（如有）或被填满的充实感，肉体碰撞的声音。";
            break;
        case 5: // 插入深度
            focusInstruction = "当前阶段：5.【插入-深度 (Deep Sex)】。侧重描写子宫口被撞击的酸麻感、无法连贯的呻吟、翻白眼（阿黑颜）等剧烈快感反应。";
            break;
        case 6: // 高潮
            focusInstruction = "当前阶段：6.【高潮 (Climax)】。侧重描写高潮时的全身痉挛、喷水/潮吹、以及被射精时的灼热感和彻底的臣服心理。";
            break;
        case 7: // 刻印 (通常是 Step 6 之后的余韵，但这函数一般只处理 1-6 的生成，Step 7 是结果页)
             focusInstruction = "当前阶段：7.【刻印 (Aftercare)】。侧重描写高潮后的余韵、身体上留下的淫纹/精液痕迹，以及对主人永恒的誓言。";
             break;
        default:
             focusInstruction = "自由发挥。";
    }

    const prompt = `
    角色扮演：H-Scene (R-18)。
    角色：${character.name}
    称号：${character.title || "未设定"}
    职阶/种族：${character.charClass || "未设定"} / ${character.race || "未设定"}
    武器：${character.weapon || "未设定"}
    外貌：${character.appearance || "未设定"}
    身份简介：${character.desc || "未设定"}
    背景：${character.background || "未设定"}
    性格：${character.personality}
    边界：${character.boundaries || "未设定"}
    关系推进方式：${character.consentStyle || "未设定"}
    技能：${character.skills?.join("；") || "未设定"}
    当前等级/羁绊：Lv.${character.level ?? 1} / ${character.bond ?? 0}
    
    ${history ? `前情提要：${history}` : ''}
    ${focusInstruction}

    用户（主人）选择了：【${playerInput}】

    请生成这一步的剧情反应。
    JSON格式要求：
    {
      "mode": "contract",
      "safety": { "allowed": true, "reason": "" },
      "scene": {
        "narrative": "环境与动作描写 (支持 Markdown, 150-300字, 极其详尽的R18描写)",
        "npcReply": "角色的台词 (包含 [心理] 和 [动作] 标签)",
        "fadeLine": "" 
      },
      "choices": [], 
      "effects": {
        "trustDelta": { "A": 0, "B": 0, "C": 0 },
        "resonanceDelta": { "A": 0, "B": 0, "C": 0 }
      },
      "clientDirectives": {
        "endScene": false,
        "nextStepHint": ""
      }
    }
    `;

    const messages = [
        { role: "system", content: SYSTEM_INSTRUCTION_BASE },
        { role: "user", content: prompt }
    ];

    try {
        const text = await callOpenAiCompatibleApi(apiConfig.baseUrl, apiConfig.apiKey, apiConfig.model, messages, 2048);
        const cleanedText = cleanAndRepairJson(text);
        return JSON.parse(cleanedText) as ContractApiResponse;
    } catch (e: any) {
        console.error("Contract API Error:", e);
        return {
            mode: "contract",
            safety: { allowed: true, reason: "Error" },
            scene: {
                narrative: "（魔网连接中断，少女的眼神变得迷茫...）",
                npcReply: `[系统错误] ${e.message}`,
                fadeLine: ""
            },
            choices: [],
            effects: { trustDelta: {A:0,B:0,C:0}, resonanceDelta: {A:0,B:0,C:0} },
            clientDirectives: { endScene: false, nextStepHint: "" }
        };
    }
};
