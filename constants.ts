
import { Character, Nation, Rarity } from './types';

export const INITIAL_GOLD = 2000;

export const RARITY_RATES = {
    UR: 0.02,
    SSR: 0.08,
    SR: 0.20,
    R: 0.70
};

// 角色数据库 - 扩充版
export const CHARACTER_DB: Character[] = [
  // === UR ===
  {
    id: "1",
    rarity: "UR",
    name: "阿斯莫德雅 (Asmodea)",
    title: "原初之欲·魔界女皇",
    charClass: "统治者 (Ruler)",
    job: "RULER",
    weapon: "活体荆棘王座",
    appearance: "身高185cm，拥有一头仿佛流淌着岩浆的暗红长发，金色的竖瞳散发着让万物发情的威压。穿着仅由黑色皮革条带和金属环扣组成的‘皇袍’，巨大的双峰几乎完全裸露，下身是开叉到腰际的黑丝长裙，身后有六只巨大的黑色羽翼。",
    desc: "所有魅魔的始祖，魔界的顶点。",
    background: "所有魅魔的始祖，魔界的顶点。她不需要通过性爱来获取能量，因为她的存在本身就是欲望的黑洞。她降临人间只有一个目的：寻找一个能让她那无底洞般的子宫感到满足的雄性。",
    personality: "极度傲慢、女王属性、施虐狂。她不认为自己在‘侍奉’，而是在‘临幸’。只有在极度高潮时才会露出少女般的羞涩。",
    skills: [
      "【万物发情领域】：使全场敌人强制进入‘高潮’状态，防御力归零，每秒流失大量体液。",
      "【子宫榨取】：用双腿夹住敌人头部，造成999%的真实伤害，并将敌人造成的伤害转化为自己的快感值。"
    ],
    race: "DEMON",
    baseStats: { ATK: 99, DEF: 85, CHM: 100 },
    level: 1, exp: 0, bond: 0, equipment: {}, isOwned: false,
    imageUrl: "https://i.postimg.cc/DZcMdfpp/xia-zai-(3).png",
    gachaLines: [
      "跪下！能看到我这对尊贵的乳房，是你几辈子修来的福分，还不快把你的脸埋进来？主人~",
      "哦？这根东西看起来还算硬朗……希望它能坚持到我高潮的那一刻，别让我失望，主人~",
      "本王准许你射在里面……作为奖赏，我会把你的精气全部榨干，一滴都不许剩，主人~"
    ]
  },

  // === SSR ===
  {
    id: "2",
    rarity: "SSR",
    name: "莉莉丝 (Lilith)",
    title: "完美侍奉·首席魅魔",
    charClass: "全能女仆 (Maid)",
    job: "MAID",
    weapon: "爱之锁链 / 扫除用具",
    appearance: "银色长发编成温柔的侧马尾，紫水晶般的眼眸时刻注视着主人。身穿经过‘特殊改造’的黑白女仆装，胸口处挖空露出深邃的乳沟，超短裙下是吊带白丝袜，大腿内侧纹着主人的名字。",
    desc: "为了主人可以牺牲一切。",
    background: "圣殿的第一位住户，也是主人的私人女仆。据说她在魔界时曾是高阶贵族，但为了追随魔王（您）而放弃了一切。除了照料主人的起居，她也是管理整个后宫的‘大总管’。",
    personality: "极度忠诚、温柔体贴、有些许M倾向。把主人的快乐视为自己生存的唯一意义。对于任何试图伤害主人的存在，会瞬间展现出残暴的一面。",
    skills: [
      "【究极奉仕】：恢复我方全体体力，并解除所有异常状态。若主人在场，额外提升全属性。",
      "【爱之拘束】：用锁链束缚敌人，使其无法行动，并持续抽取生命值供给主人。"
    ],
    race: "SUCCUBUS",
    baseStats: { ATK: 75, DEF: 80, CHM: 95 },
    level: 1, exp: 0, bond: 50,
    equipment: {}, isOwned: true,
    imageUrl: "https://pub-9256c687f7ad40139828469d8a431c2b.r2.dev/grok/98241f66-66ef-4239-b9cd-04bfe7dda404.jpg",
    gachaLines: [
      "早安，主人。今天想先享用早餐，还是……先享用莉莉丝呢？主人~",
      "这种程度的污渍，只要稍微舔一下就干净了……啊，不是说地板，是说您身上……主人~",
      "只要是为了主人，哪怕是堕入更深的地狱，莉莉丝也甘之如饴。请尽情使用我吧，主人~"
    ]
  },
  {
    id: "3",
    rarity: "SSR",
    name: "塞拉菲娜 (Seraphina)",
    title: "堕落圣女·折翼天使",
    charClass: "异端审判官 (Inquisitor)",
    job: "MAGE",
    weapon: "染血的圣经",
    appearance: "曾经洁白的羽翼如今一半染黑，一半残破。身穿破碎的修女服，露出大片苍白的肌肤和圣痕。脖子上戴着象征奴役的项圈，金色的长发凌乱地散落在肩头，眼神中混杂着神圣与淫靡。",
    desc: "在信仰与欲望之间崩溃的圣女。",
    background: "曾是神圣教国最受敬仰的圣女，为了封印魔王（您）而孤身潜入，却被魔王的魔力彻底侵蚀。现在的她，一边念诵着圣经，一边在主人的跨下寻求救赎。",
    personality: "病娇、自我厌恶、崩坏。在‘我是罪人’和‘这感觉太棒了’之间反复横跳。喜欢被惩罚，认为只有痛苦和快感才能洗刷她的罪孽。",
    skills: [
        "【堕天之泪】：对敌方造成光属性伤害，同时降低敌方全体命中率，因为她的哭声太凄惨了。",
        "【圣痕觉醒】：消耗自身生命值，大幅提升攻击力，并使自己在接下来的回合中处于‘亢奋’状态。"
    ],
    race: "ANGEL",
    baseStats: { ATK: 90, DEF: 60, CHM: 85 },
    level: 1, exp: 0, bond: 0, equipment: {}, isOwned: false,
    imageUrl: "https://picsum.photos/seed/angel/300/400",
    gachaLines: [
        "神啊……如果您抛弃了我，那我只能在魔王的怀抱中寻找温暖了……主人~",
        "请惩罚我……请用您那肮脏的魔力，填满我这具原本属于神的身体吧……主人~",
        "我是不知廉耻的修女，是背叛信仰的罪人……所以，请更用力地使用我吧……主人~"
    ]
  },
  {
    id: "4",
    rarity: "SSR",
    name: "玉藻前 (Tamamo)",
    title: "九尾妖狐·倾国妖姬",
    charClass: "咒术师 (Caster)",
    job: "MAGE",
    weapon: "杀生石·扇",
    appearance: "拥有九条蓬松巨大的金色狐尾，身穿华丽且暴露的和服，香肩和酥胸半遮半掩。兽耳会随着心情抖动，嘴角总是挂着捉摸不透的媚笑。",
    desc: "想要把主人榨干的坏狐狸。",
    background: "来自东方异邦的千年大妖。听说西方有一位魔力无边的魔王，特地跨海而来‘切磋’房中术。对于她来说，征服世界太无聊了，征服男人的身心才是有趣的游戏。",
    personality: "腹黑、溺爱、御姐。喜欢用长辈的口吻调戏主人，但一旦动了真情，就会展现出极为贤妻良母（且沉重）的一面。",
    skills: [
        "【魅惑妖术】：大概率使敌方男性角色陷入‘魅惑’状态，倒戈攻击自己的队友。",
        "【九尾盛宴】：召唤九条尾巴同时缠绕攻击敌人，并吸取大量体力回复自身。"
    ],
    race: "BEASTKIN",
    baseStats: { ATK: 85, DEF: 70, CHM: 98 },
    level: 1, exp: 0, bond: 0, equipment: {}, isOwned: false,
    imageUrl: "https://picsum.photos/seed/fox/300/400",
    gachaLines: [
        "哎呀哎呀，这里有一位可爱的小魔王呢。要让妾身来好好疼爱你吗？主人~",
        "妾身的尾巴摸起来很舒服？哼哼，那里可是敏感带哦……若是弄湿了，您要负责清理干净呢，主人~",
        "今晚的月色真美，不做点什么‘坏事’，岂不是辜负了这良辰美景？主人~"
    ]
  },

  // === SR ===
  {
    id: "101",
    rarity: "SR",
    name: "希尔达 (Hilda)",
    title: "不屈之壁·亡国女骑士",
    charClass: "重装卫士 (Guardian)",
    job: "TANK",
    weapon: "破碎的誓约之盾",
    appearance: "银色短发，身材健美，有着清晰的马甲线。身上的铠甲已经残破不堪，只剩下关键部位的护甲，其余部分用锁链代替。",
    desc: "嘴上说着不要，身体却很诚实。",
    background: "曾是洛伦帝国的骑士团长，在抵抗魔王军时战败被俘。虽然经过了无数次的调教，但依然保留着最后一丝骑士的尊严——至少她自己是这么认为的。",
    personality: "傲娇、坚韧、闷骚。每次被命令做羞耻的事情时都会红着脸反抗，但执行起来比谁都认真。",
    skills: [
        "【绝对防御】：嘲讽所有敌人攻击自己，并在本回合内大幅提升防御力。",
        "【耻辱反击】：受到伤害时，有概率因羞愤而进行反击。"
    ],
    race: "HUMAN",
    baseStats: { ATK: 60, DEF: 90, CHM: 50 },
    level: 1, exp: 0, bond: 0, equipment: {}, isOwned: false,
    imageUrl: "https://picsum.photos/seed/knight/300/400",
    gachaLines: [
        "咕……杀了我吧！我是绝对不会屈服于你的淫威的！……如果你非要命令我的话……主人~",
        "别、别误会！穿成这样只是因为盔甲坏了！才不是为了取悦你！主人~",
        "既然输给了你，这就没办法了……我会履行奴隶的义务，但我的心永远属于帝国！大概……主人~"
    ]
  },
  {
    id: "102",
    rarity: "SR",
    name: "米奥 (Mio)",
    title: "流体史莱姆·拟态少女",
    charClass: "变身者 (Shifter)",
    job: "ASSASSIN",
    weapon: "自身体液",
    appearance: "通体呈半透明的淡蓝色，身体轮廓可以随意改变，但在主人面前通常维持着丰满少女的形态。体内可以看到核心在跳动。",
    desc: "无论什么形状都可以适应。",
    background: "诞生于卡利安海沟的变异史莱姆，智力不高，全凭本能行动。因为发现魔王的魔力非常美味而一路尾随，最终成为了后宫的一员。",
    personality: "天然呆、粘人、无节操。没有人类的羞耻观，觉得裸露和交配就像吃饭喝水一样自然。喜欢把自己包裹在主人身上。",
    skills: [
        "【物理免疫】：液态身体使她免疫大部分物理攻击。",
        "【粘液拘束】：分裂身体包裹敌人，使其窒息并降低速度。"
    ],
    race: "SLIME",
    baseStats: { ATK: 65, DEF: 65, CHM: 70 },
    level: 1, exp: 0, bond: 0, equipment: {}, isOwned: false,
    imageUrl: "https://picsum.photos/seed/slimegirl/300/400",
    gachaLines: [
        "咕噜咕噜……主人看起来很好吃……米奥可以钻进去吗？主人~",
        "米奥变成什么样子都可以哦！无论是这么大的，还是那么小的……只要主人喜欢~",
        "身体……变得热热的……要融化了……好舒服……主人~"
    ]
  },
  {
    id: "103",
    rarity: "SR",
    name: "希尔维亚 (Sylvia)",
    title: "森之射手·高傲精灵",
    charClass: "游侠 (Ranger)",
    job: "ARCHER",
    weapon: "翠风长弓",
    appearance: "金发碧眼，有着尖尖的耳朵。身穿绿色的游侠轻甲，大腿修长有力。因为被魔王种下了‘服从藤蔓’，身上缠绕着会蠕动的魔法植物。",
    desc: "高傲的自尊心在快感面前不堪一击。",
    background: "艾尔芬加德的巡林者队长，极度厌恶肮脏的魔族。但在一次巡逻中不幸落入魔王的陷阱，被种下了寄生藤蔓，必须定期接受魔王的‘浇灌’才能缓解痛苦。",
    personality: "高冷、种族主义（初期）、敏感。最开始对主角恶语相向，但随着藤蔓的发作，会变得极度渴求。",
    skills: [
        "【精准射击】：必中攻击，对飞行单位造成额外伤害。",
        "【藤蔓缠绕】：身上的藤蔓失控伸向敌人，造成束缚效果。"
    ],
    race: "ELF",
    baseStats: { ATK: 80, DEF: 40, CHM: 60 },
    level: 1, exp: 0, bond: 0, equipment: {}, isOwned: false,
    imageUrl: "https://picsum.photos/seed/elf/300/400",
    gachaLines: [
        "别碰我，你这肮脏的魔族！……呃，等等，别走……藤蔓……又开始动了……主人~",
        "如果你以为这种下流的手段就能让我屈服……啊！不、不要碰那里……！主人~",
        "这种感觉……我不承认……我绝对不承认……呜呜……请再给我一点……主人~"
    ]
  },
  {
    id: "104",
    rarity: "SR",
    name: "神乐 (Kagura)",
    title: "鬼族武姬·豪快酒豪",
    charClass: "狂战士 (Berserker)",
    job: "WARRIOR",
    weapon: "鬼金棒",
    appearance: "小麦色皮肤，头顶双角，身材极为火爆，肌肉线条流畅。穿着缠胸布和兜裆布，豪放地展示着自己的肉体。背上背着巨大的酒葫芦。",
    desc: "酒后乱性的典范。",
    background: "东方鬼族的公主，为了寻找最烈的酒和最强的男人而流浪。在和魔王拼酒输掉后，根据鬼族的规矩，将自己作为战利品献给了魔王。",
    personality: "豪爽、大姐姐、酒鬼。平时像个好哥们，喝醉后会变得极度色情和主动，体力无限，经常把主人榨干。",
    skills: [
        "【醉酒狂暴】：攻击力大幅提升，但命中率下降。",
        "【鬼神怪力】：对单体敌人造成巨大的物理伤害，有概率造成眩晕。"
    ],
    race: "DEMON",
    baseStats: { ATK: 88, DEF: 50, CHM: 65 },
    level: 1, exp: 0, bond: 0, equipment: {}, isOwned: false,
    imageUrl: "https://picsum.photos/seed/oni/300/400",
    gachaLines: [
        "哟！听说你的那活儿很厉害？来，陪老娘喝一杯，然后战个痛快！主人~",
        "这点程度就不行了？鬼族的夜晚可是很漫长的哦……还没结束呢！主人~",
        "只要有好酒和好男人，哪里就是天堂！从此以后，我的角只为你而磨，主人~"
    ]
  },
  {
    id: "105",
    rarity: "SR",
    name: "可可 (Coco)",
    title: "见习魅魔·努力家",
    charClass: "咒术学徒 (Student)",
    job: "SUPPORT",
    weapon: "巨大的爱心抱枕",
    appearance: "身材娇小，翅膀还没有完全长开。穿着粉红色的睡衣风格服装，总是抱着一个比自己还大的枕头。看起来人畜无害，其实正在努力学习榨精知识。",
    desc: "虽然技术很烂，但是很努力。",
    background: "魔界魅魔学院的吊车尾学生，因为业绩不达标差点被退学。被莉莉丝捡回来作为魔王的练习对象。虽然理论知识丰富，但实战经验为零。",
    personality: "认真、冒失、纯情。会拿着小本本记录主人的敏感点，经常因为害羞而导致魅惑术失败。",
    skills: [
        "【笨拙的诱惑】：小概率魅惑敌人，大概率因为平地摔而使敌人发笑（降低敌方攻击力）。",
        "【学习笔记】：找出敌人的弱点，提升我方全体暴击率。"
    ],
    race: "SUCCUBUS",
    baseStats: { ATK: 40, DEF: 40, CHM: 80 },
    level: 1, exp: 0, bond: 0, equipment: {}, isOwned: false,
    imageUrl: "https://picsum.photos/seed/succubus/300/400",
    gachaLines: [
        "那、那个……书上说，这种时候应该先脱掉……哎呀！扣子卡住了！呜呜……主人~",
        "虽然我还不够成熟，但我会努力学习让您舒服的技巧的！请多指教，主人~",
        "莉莉丝姐姐教了我一招新的……虽然很害羞，但是……想试给您看……主人~"
    ]
  },
  {
    id: "106",
    rarity: "SR",
    name: "奈奈 (Nana)",
    title: "暗夜猫娘·宝藏猎人",
    charClass: "盗贼 (Thief)",
    job: "ASSASSIN",
    weapon: "猫爪拳套",
    appearance: "拥有黑色的猫耳和猫尾，皮肤黝黑，穿着便于行动的紧身皮衣，脖子上挂着铃铛。性格像猫一样反复无常。",
    desc: "会偷走你的心和钱包。",
    background: "流浪在伊弗曼苏丹国的神偷，因为试图偷窃魔王的内裤而被当场抓获。现在作为专属宠物被饲养在后宫中，最喜欢吃鱼和睡懒觉。",
    personality: "任性、贪财、小恶魔。高兴的时候会蹭你，不高兴的时候会挠你。对会动的东西（包括主人的那部分）充满好奇心。",
    skills: [
        "【猫之敏捷】：极高的闪避率，闪避成功时会偷取敌人少量金币。",
        "【疯狂乱抓】：对敌人造成多次连击，附带流血效果。"
    ],
    race: "BEASTKIN",
    baseStats: { ATK: 70, DEF: 30, CHM: 75 },
    level: 1, exp: 0, bond: 0, equipment: {}, isOwned: false,
    imageUrl: "https://picsum.photos/seed/catgirl/300/400",
    gachaLines: [
        "喵？这根逗猫棒看起来很好玩的样子……可以让我咬一口吗？主人~",
        "只要给我小鱼干，摸哪里都可以哦……但是仅限今天！喵~主人~",
        "既然被你抓住了，那就没办法了。以后我的铃铛，只有你可以摇响哦……主人~"
    ]
  }
];

// 世界地图数据
export const NATIONS_DB: Nation[] = [
    {
        id: 'n1',
        name: '洛伦帝国 (Loren)',
        desc: '绿意盎然的平原帝国，看似和平，实则暗流涌动。这里的女骑士们以高傲著称。',
        progress: 0,
        levels: [
            { id: 'l1-1', name: '边境哨站', type: 'FORT', difficulty: 1, desc: '帝国边境的防御工事，驻扎着年轻的女兵。', isCleared: false },
            { id: 'l1-2', name: '铁壁要塞', type: 'FORT', difficulty: 2, desc: '通往腹地的必经之路，守备森严。', isCleared: false },
            { id: 'l1-3', name: '迷雾森林', type: 'TOWN', difficulty: 2, desc: '容易迷失方向的森林，据说有妖精出没。', isCleared: false },
            { id: 'l1-4', name: '皇家猎场', type: 'TOWN', difficulty: 3, desc: '贵族们狩猎的场所，充满了陷阱。', isCleared: false },
            { id: 'l1-5', name: '帝都维拉', type: 'CAPITAL', difficulty: 4, desc: '洛伦的心脏，女皇居住的宫殿。', bossId: '1', isCleared: false },
        ]
    },
    {
        id: 'n2',
        name: '伊弗曼苏丹国 (Iverman)',
        desc: '燥热的沙漠国度，充满异域风情。这里的舞娘和刺客都令人防不胜防。',
        progress: 0,
        levels: [
             { id: 'l2-1', name: '灼热沙丘', type: 'TOWN', difficulty: 2, desc: '连空气都在燃烧的沙漠入口。', isCleared: false },
             { id: 'l2-2', name: '蝎尾峡谷', type: 'FORT', difficulty: 3, desc: '毒蝎与盗贼盘踞的险地。', isCleared: false },
             { id: 'l2-3', name: '黄金集市', type: 'TOWN', difficulty: 3, desc: '只要有钱，什么都能买到的黑市。', isCleared: false },
             { id: 'l2-4', name: '剧毒绿洲', type: 'TOWN', difficulty: 4, desc: '美丽的水源下隐藏着致命的诱惑。', isCleared: false },
             { id: 'l2-5', name: '苏丹皇宫', type: 'CAPITAL', difficulty: 5, desc: '沙漠明珠，奢华淫靡的顶点。', isCleared: false },
        ]
    },
    {
        id: 'n3',
        name: '卡利安联邦 (Kalian)',
        desc: '蔚蓝的海洋联邦，贸易发达。水手和海盗们性格豪爽开放。',
        progress: 0,
        levels: [
            { id: 'l3-1', name: '自由港', type: 'TOWN', difficulty: 2, desc: '鱼龙混杂的港口，罪恶的温床。', isCleared: false },
            { id: 'l3-2', name: '珊瑚迷宫', type: 'TOWN', difficulty: 3, desc: '美丽而危险的水下迷宫。', isCleared: false },
            { id: 'l3-3', name: '史莱姆海沟', type: 'TOWN', difficulty: 3, desc: '粘液生物聚集的深渊。', isCleared: false },
            { id: 'l3-4', name: '深海监牢', type: 'FORT', difficulty: 4, desc: '关押着最危险犯人的海底监狱。', isCleared: false },
            { id: 'l3-5', name: '海上王座', type: 'CAPITAL', difficulty: 5, desc: '统治七海的霸主所在地。', isCleared: false },
        ]
    },
    {
        id: 'n4',
        name: '艾尔芬加德 (Elfengard)',
        desc: '古老的精灵之森，排外且神秘。这里的精灵们高傲而纯洁。',
        progress: 0,
        levels: [
            { id: 'l4-1', name: '迷雾结界', type: 'FORT', difficulty: 3, desc: '阻挡外来者的第一道防线。', isCleared: false },
            { id: 'l4-2', name: '世界树根', type: 'TOWN', difficulty: 3, desc: '巨大的树根错综复杂。', isCleared: false },
            { id: 'l4-3', name: '丰饶牧场', type: 'TOWN', difficulty: 3, desc: '据说这里的乳牛族非常特别。', isCleared: false },
            { id: 'l4-4', name: '自然神殿', type: 'TOWN', difficulty: 4, desc: '供奉自然女神的圣地。', isCleared: false },
            { id: 'l4-5', name: '双子圣树', type: 'CAPITAL', difficulty: 5, desc: '精灵女王的寝宫，位于树冠之巅。', isCleared: false },
        ]
    },
    {
        id: 'n5',
        name: '神圣教国 (Theocracy)',
        desc: '信仰光明的宗教国家，表面圣洁。修女和圣骑士们为了信仰可以献身。',
        progress: 0,
        levels: [
            { id: 'l5-1', name: '朝圣之路', type: 'TOWN', difficulty: 3, desc: '信徒们三步一跪的道路。', isCleared: false },
            { id: 'l5-2', name: '苦修院', type: 'FORT', difficulty: 4, desc: '通过肉体痛苦来洗刷罪孽的地方。', isCleared: false },
            { id: 'l5-3', name: '审判大厅', type: 'TOWN', difficulty: 4, desc: '决定异端命运的场所。', isCleared: false },
            { id: 'l5-4', name: '管教学校', type: 'TOWN', difficulty: 5, desc: '专门矫正不听话少女的学校。', isCleared: false },
            { id: 'l5-5', name: '大圣堂', type: 'CAPITAL', difficulty: 5, desc: '离神最近的地方，也是离欲望最近的地方。', isCleared: false },
        ]
    }
];
