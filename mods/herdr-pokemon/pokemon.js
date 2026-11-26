// Curated Multi-Gen Pokedex (Gen 1 complete #1-#151 + ~109 iconic Gen 2-9 fan favorites),
// elemental types, type effectiveness chart, Space -> Poke Ball assignments,
// individual body-size variation, Shiny support, Evolution Lock,
// and TRUE ON-DEMAND PMDCollab 2D sprite / portrait / icon loader!

import { exec, appHome, shared, setShared } from "herdr";
import * as fs from "fs/promises";
import { BALL_TYPES, SPACE_BALLS_KEY, lang, isZh, tr } from "./kit.js";

// Gen 1 (#1-#151) dense list
export const NAMES = [
  "Bulbasaur", "Ivysaur", "Venusaur", "Charmander", "Charmeleon", "Charizard",
  "Squirtle", "Wartortle", "Blastoise", "Caterpie", "Metapod", "Butterfree",
  "Weedle", "Kakuna", "Beedrill", "Pidgey", "Pidgeotto", "Pidgeot", "Rattata", "Raticate",
  "Spearow", "Fearow", "Ekans", "Arbok", "Pikachu", "Raichu", "Sandshrew", "Sandslash",
  "Nidoran♀", "Nidorina", "Nidoqueen", "Nidoran♂", "Nidorino", "Nidoking",
  "Clefairy", "Clefable", "Vulpix", "Ninetales", "Jigglypuff", "Wigglytuff",
  "Zubat", "Golbat", "Oddish", "Gloom", "Vileplume", "Paras", "Parasect",
  "Venonat", "Venomoth", "Diglett", "Dugtrio", "Meowth", "Persian", "Psyduck", "Golduck",
  "Mankey", "Primeape", "Growlithe", "Arcanine", "Poliwag", "Poliwhirl", "Poliwrath",
  "Abra", "Kadabra", "Alakazam", "Machop", "Machoke", "Machamp",
  "Bellsprout", "Weepinbell", "Victreebel", "Tentacool", "Tentacruel",
  "Geodude", "Graveler", "Golem", "Ponyta", "Rapidash", "Slowpoke", "Slowbro",
  "Magnemite", "Magneton", "Farfetch'd", "Doduo", "Dodrio", "Seel", "Dewgong",
  "Grimer", "Muk", "Shellder", "Cloyster", "Gastly", "Haunter", "Gengar", "Onix",
  "Drowzee", "Hypno", "Krabby", "Kingler", "Voltorb", "Electrode", "Exeggcute", "Exeggutor",
  "Cubone", "Marowak", "Hitmonlee", "Hitmonchan", "Lickitung", "Koffing", "Weezing",
  "Rhyhorn", "Rhydon", "Chansey", "Tangela", "Kangaskhan", "Horsea", "Seadra",
  "Goldeen", "Seaking", "Staryu", "Starmie", "Mr. Mime", "Scyther", "Jynx",
  "Electabuzz", "Magmar", "Pinsir", "Tauros", "Magikarp", "Gyarados", "Lapras", "Ditto",
  "Eevee", "Vaporeon", "Jolteon", "Flareon", "Porygon", "Omanyte", "Omastar",
  "Kabuto", "Kabutops", "Aerodactyl", "Snorlax", "Articuno", "Zapdos", "Moltres",
  "Dratini", "Dragonair", "Dragonite", "Mewtwo", "Mew",
];

// Official Simplified Chinese names for Gen 1 (#1-#151)
const NAMES_ZH = [
  "妙蛙种子", "妙蛙草", "妙蛙花", "小火龙", "火恐龙", "喷火龙",
  "杰尼龟", "卡咪龟", "水箭龟", "绿毛虫", "铁甲蛹", "巴大蝶",
  "独角虫", "铁壳蛹", "大针蜂", "波波", "比比鸟", "大比鸟", "小拉达", "拉达",
  "烈雀", "大嘴雀", "阿柏蛇", "阿柏怪", "皮卡丘", "雷丘", "穿山鼠", "穿山王",
  "尼多兰", "尼多娜", "尼多后", "尼多朗", "尼多力诺", "尼多王",
  "皮皮", "皮可西", "六尾", "九尾", "胖丁", "胖可丁",
  "超音蝠", "大嘴蝠", "走路草", "臭臭花", "霸王花", "派拉斯", "派拉斯特",
  "毛球", "摩鲁蛾", "地鼠", "三地鼠", "喵喵", "猫老大", "可达鸭", "哥达鸭",
  "猴怪", "火暴猴", "卡蒂狗", "风速狗", "蚊香蝌蚪", "蚊香君", "蚊香泳士",
  "凯西", "勇基拉", "胡地", "腕力", "豪力", "怪力",
  "喇叭芽", "口呆花", "大食花", "玛瑙水母", "毒刺水母",
  "小拳石", "隆隆石", "隆隆岩", "小火马", "烈焰马", "呆呆兽", "呆壳兽",
  "小磁怪", "三合一磁怪", "大葱鸭", "嘟嘟", "嘟嘟利", "小海狮", "白海狮",
  "臭泥", "臭臭泥", "大舌贝", "刺甲贝", "鬼斯", "鬼斯通", "耿鬼", "大岩蛇",
  "催眠貘", "引梦貘人", "大钳蟹", "巨钳蟹", "霹雳电球", "顽皮雷弹", "蛋蛋", "椰蛋树",
  "卡拉卡拉", "嘎啦嘎啦", "飞腿郎", "快拳郎", "大舌头", "瓦斯弹", "双弹瓦斯",
  "独角犀牛", "钻角犀兽", "吉利蛋", "蔓藤怪", "袋兽", "墨海马", "海刺龙",
  "角金鱼", "金鱼王", "海星星", "宝石海星", "魔墙人偶", "飞天螳螂", "迷唇姐",
  "电击兽", "鸭嘴火兽", "凯罗斯", "肯泰罗", "鲤鱼王", "暴鲤龙", "拉普拉斯", "百变怪",
  "伊布", "水伊布", "雷伊布", "火伊布", "多边兽", "菊石兽", "多刺菊石兽",
  "化石盔", "镰刀盔", "化石翼龙", "卡比兽", "急冻鸟", "闪电鸟", "火焰鸟",
  "迷你龙", "哈克龙", "快龙", "超梦", "梦幻",
];

// Official Simplified Chinese names for Gen 2-9 curated roster
const EXTRA_ZH = {
  152: "菊草叶", 153: "月桂叶", 154: "大竺葵",
  155: "火球鼠", 156: "火岩鼠", 157: "火暴兽",
  158: "小锯鳄", 159: "蓝鳄", 160: "大力鳄",
  169: "叉字蝠", 172: "皮丘", 175: "波克比", 176: "波克基古",
  183: "玛力露", 184: "玛力露丽", 194: "乌波", 195: "沼王",
  196: "太阳伊布", 197: "月亮伊布", 208: "大钢蛇", 212: "巨钳螳螂", 214: "赫拉克罗斯",
  246: "幼基拉斯", 247: "沙基拉斯", 248: "班基拉斯",
  249: "洛奇亚", 250: "凤王", 251: "时拉比",
  252: "木守宫", 253: "森林蜥蜴", 254: "蜥蜴王",
  255: "火稚鸡", 256: "力壮鸡", 257: "火焰鸡",
  258: "水跃鱼", 259: "沼跃鱼", 260: "巨沼怪",
  280: "拉鲁拉丝", 281: "奇鲁莉安", 282: "沙奈朵",
  302: "勾魂眼", 330: "沙漠蜻蜓", 359: "阿勃梭鲁",
  371: "宝贝龙", 372: "甲壳龙", 373: "暴飞龙",
  374: "铁哑铃", 375: "金属怪", 376: "巨金怪",
  380: "拉帝亚斯", 381: "拉帝欧斯", 384: "烈空坐", 385: "基拉祈",
  387: "草苗龟", 388: "树林龟", 389: "土台龟",
  390: "小火焰猴", 391: "猛火猴", 392: "烈焰猴",
  393: "波加曼", 394: "波皇子", 395: "帝王拿波",
  403: "小猫怪", 404: "勒克猫", 405: "伦琴猫",
  443: "圆陆鲨", 444: "尖牙陆鲨", 445: "烈咬陆鲨",
  447: "利欧路", 448: "路卡利欧",
  468: "波克基斯", 470: "叶伊布", 471: "冰伊布", 475: "艾路雷朵", 491: "达克莱伊",
  495: "藤藤蛇", 501: "水水獭", 570: "索罗亚", 571: "索罗亚克",
  607: "烛光灵", 608: "灯火幽灵", 609: "水晶灯火灵",
  635: "三首恶龙", 637: "火神蛾",
  656: "呱呱泡蛙", 657: "呱头蛙", 658: "甲贺忍蛙",
  700: "仙子伊布", 704: "黏黏宝", 706: "黏美龙",
  722: "木木枭", 723: "投羽枭", 724: "狙射树枭",
  778: "谜拟丘", 813: "炎兔儿", 815: "闪焰王牌",
  821: "稚山雀", 823: "钢铠鸦", 885: "多龙梅西亚", 887: "多龙巴鲁托",
  906: "新叶喵", 908: "魔幻假面喵", 909: "呆火鳄", 911: "骨纹巨声鳄",
  935: "炭小侍", 937: "苍炎刃鬼", 957: "小锻匠", 959: "巨锻匠", 980: "土王",
};

// Curated popular Gen 2-9 roster (all verified present in PMDCollab/SpriteCollab!)
// Each entry: [nationalDexId, name, genGroup]
const EXTRA_POKEMON = [
  // Gen 2 (Johto)
  [152, "Chikorita", "gen2"], [153, "Bayleef", "gen2"], [154, "Meganium", "gen2"],
  [155, "Cyndaquil", "gen2"], [156, "Quilava", "gen2"], [157, "Typhlosion", "gen2"],
  [158, "Totodile", "gen2"], [159, "Croconaw", "gen2"], [160, "Feraligatr", "gen2"],
  [169, "Crobat", "gen2"], [172, "Pichu", "gen2"],
  [175, "Togepi", "gen2"], [176, "Togetic", "gen2"],
  [183, "Marill", "gen2"], [184, "Azumarill", "gen2"],
  [194, "Wooper", "gen2"], [195, "Quagsire", "gen2"],
  [196, "Espeon", "gen2"], [197, "Umbreon", "gen2"],
  [208, "Steelix", "gen2"], [212, "Scizor", "gen2"], [214, "Heracross", "gen2"],
  [246, "Larvitar", "gen2"], [247, "Pupitar", "gen2"], [248, "Tyranitar", "gen2"],
  [249, "Lugia", "gen2"], [250, "Ho-Oh", "gen2"], [251, "Celebi", "gen2"],
  // Gen 3 (Hoenn)
  [252, "Treecko", "gen3"], [253, "Grovyle", "gen3"], [254, "Sceptile", "gen3"],
  [255, "Torchic", "gen3"], [256, "Combusken", "gen3"], [257, "Blaziken", "gen3"],
  [258, "Mudkip", "gen3"], [259, "Marshtomp", "gen3"], [260, "Swampert", "gen3"],
  [280, "Ralts", "gen3"], [281, "Kirlia", "gen3"], [282, "Gardevoir", "gen3"],
  [302, "Sableye", "gen3"], [330, "Flygon", "gen3"], [359, "Absol", "gen3"],
  [371, "Bagon", "gen3"], [372, "Shelgon", "gen3"], [373, "Salamence", "gen3"],
  [374, "Beldum", "gen3"], [375, "Metang", "gen3"], [376, "Metagross", "gen3"],
  [380, "Latias", "gen3"], [381, "Latios", "gen3"], [384, "Rayquaza", "gen3"], [385, "Jirachi", "gen3"],
  // Gen 4 (Sinnoh)
  [387, "Turtwig", "gen4"], [388, "Grotle", "gen4"], [389, "Torterra", "gen4"],
  [390, "Chimchar", "gen4"], [391, "Monferno", "gen4"], [392, "Infernape", "gen4"],
  [393, "Piplup", "gen4"], [394, "Prinplup", "gen4"], [395, "Empoleon", "gen4"],
  [403, "Shinx", "gen4"], [404, "Luxio", "gen4"], [405, "Luxray", "gen4"],
  [443, "Gible", "gen4"], [444, "Gabite", "gen4"], [445, "Garchomp", "gen4"],
  [447, "Riolu", "gen4"], [448, "Lucario", "gen4"],
  [468, "Togekiss", "gen4"], [470, "Leafeon", "gen4"], [471, "Glaceon", "gen4"],
  [475, "Gallade", "gen4"], [491, "Darkrai", "gen4"],
  // Gen 5-6 (Unova & Kalos)
  [495, "Snivy", "gen56"], [501, "Oshawott", "gen56"],
  [570, "Zorua", "gen56"], [571, "Zoroark", "gen56"],
  [607, "Litwick", "gen56"], [608, "Lampent", "gen56"], [609, "Chandelure", "gen56"],
  [635, "Hydreigon", "gen56"], [637, "Volcarona", "gen56"],
  [656, "Froakie", "gen56"], [657, "Frogadier", "gen56"], [658, "Greninja", "gen56"],
  [700, "Sylveon", "gen56"], [704, "Goomy", "gen56"], [706, "Goodra", "gen56"],
  // Gen 7-9 (Alola, Galar & Paldea)
  [722, "Rowlet", "gen79"], [723, "Dartrix", "gen79"], [724, "Decidueye", "gen79"],
  [778, "Mimikyu", "gen79"],
  [813, "Scorbunny", "gen79"], [815, "Cinderace", "gen79"],
  [821, "Rookidee", "gen79"], [823, "Corviknight", "gen79"],
  [885, "Dreepy", "gen79"], [887, "Dragapult", "gen79"],
  [906, "Sprigatito", "gen79"], [908, "Meowscarada", "gen79"],
  [909, "Fuecoco", "gen79"], [911, "Skeledirge", "gen79"],
  [935, "Charcadet", "gen79"], [937, "Ceruledge", "gen79"],
  [957, "Tinkatink", "gen79"], [959, "Tinkaton", "gen79"],
  [980, "Clodsire", "gen79"],
];

// Official Japanese & Korean names for iconic Pokédex entries (Gen 1 starters/favorites + Gen 2–9 icons)
const NAMES_JA = {
  1:"フシギダネ",2:"フシギソウ",3:"フシギバナ",4:"ヒトカゲ",5:"リザード",6:"リザードン",
  7:"ゼニガメ",8:"カメール",9:"カメックス",10:"キャタピー",12:"バタフリー",16:"ポッポ",18:"ピジョット",
  25:"ピカチュウ",26:"ライチュウ",27:"サンド",35:"ピッピ",36:"ピクシー",37:"ロコン",38:"キュウコン",
  39:"プリン",40:"プクリン",52:"ニャース",54:"コダック",58:"ガーディ",59:"ウインディ",63:"ケーシィ",
  65:"フーディン",68:"カイリキー",79:"ヤドン",81:"コイル",92:"ゴース",93:"ゴースト",94:"ゲンガー",
  104:"カラカラ",113:"ラッキー",116:"タッツー",118:"トサキント",121:"スターミー",123:"ストライク",
  125:"エレブー",126:"ブーバー",129:"コイキング",130:"ギャラドス",131:"ラプラス",132:"メタモン",
  133:"イーブイ",134:"シャワーズ",135:"サンダース",136:"ブースター",137:"ポリゴン",143:"カビゴン",
  144:"フリーザー",145:"サンダー",146:"ファイヤー",147:"ミニリュウ",149:"カイリュー",150:"ミュウツー",151:"ミュウ",
  152:"チコリータ",154:"メガニウム",155:"ヒノアラシ",157:"バクフーン",158:"ワニノコ",160:"オーダイル",
  172:"ピチュー",175:"トゲピー",183:"マリル",194:"ウパー",195:"ヌオー",196:"エーフィ",197:"ブラッキー",
  212:"ハッサム",249:"ルギア",250:"ホウオウ",251:"セレビィ",252:"キモリ",254:"ジュカイン",
  255:"アチャモ",257:"バシャーモ",258:"ミズゴロウ",260:"ラグラージ",282:"サーナイト",330:"フライゴン",
  359:"アブソル",376:"メタグロス",384:"レックウザ",385:"ジラーチ",387:"ナエトル",390:"ヒコザル",
  393:"ポッチャマ",403:"コリンク",445:"ガブリアス",448:"ルカリオ",470:"リーフィア",471:"グレイシア",
  491:"ダークライ",495:"ツタージャ",501:"ミジュマル",570:"ゾロア",609:"シャンデラ",635:"サザンドラ",
  656:"ケロマツ",658:"ゲッコウガ",700:"ニンフィア",722:"モクロー",778:"ミミッキュ",813:"ヒバニー",
  887:"ドラパルト",906:"ニャオハ",909:"ホゲータ",957:"カヌチャン",959:"デカヌチャン",980:"ドオー",
};
const NAMES_KO = {
  1:"이상해씨",2:"이상해풀",3:"이상해꽃",4:"파이리",5:"리자드",6:"리자몽",
  7:"꼬부기",8:"어니부기",9:"거북왕",10:"캐터피",12:"버터플",16:"구구",18:"피죤투",
  25:"피카츄",26:"라이츄",27:"모래두지",35:"삐삐",36:"픽시",37:"식스테일",38:"나인테일",
  39:"푸린",40:"푸크린",52:"나옹",54:"고라파덕",58:"가디",59:"윈디",63:"캐이시",
  65:"후딘",68:"괴력몬",79:"야돈",81:"코일",92:"고오스",93:"고우스트",94:"팬텀",
  104:"탕구리",113:"럭키",116:"쏘드라",118:"콘치",121:"아쿠스타",123:"스라크",
  125:"에레브",126:"마그마",129:"잉어킹",130:"갸라도스",131:"라프라스",132:"메타몽",
  133:"이브이",134:"샤미드",135:"쥬피썬더",136:"부스터",137:"폴리곤",143:"잠만보",
  144:"프리져",145:"썬더",146:"파이어",147:"미뇽",149:"망나뇽",150:"뮤츠",151:"뮤",
  152:"치코리타",154:"메가니움",155:"브케인",157:"블레이범",158:"리아코",160:"장크로다일",
  172:"피츄",175:"토게피",183:"마릴",194:"우파",195:"누오",196:"에브이",197:"블래키",
  212:"핫삼",249:"루기아",250:"칠색조",251:"세레비",252:"나무지기",254:"나무킹",
  255:"아차모",257:"번치코",258:"물짱이",260:"대짱이",282:"가디안",330:"플라이곤",
  359:"앱솔",376:"메타그로스",384:"레쿠쟈",385:"지라치",387:"모부기",390:"불꽃숭이",
  393:"팽도리",403:"꼬링크",445:"한카리아스",448:"루카리오",470:"리피아",471:"글레이시아",
  491:"다크라이",495:"주리비얀",501:"수댕이",570:"조로아",609:"샹델라",635:"삼삼드래",
  656:"개구마르",658:"개굴닌자",700:"님피아",722:"나몰빼미",778:"따라큐",813:"염버니",
  887:"드래펄트",906:"나오하",909:"뜨아거",957:"어리짱",959:"두드리짱",980:"토오",
};

export const GEN_TABS = [
  { id: "gen1",  label: "Gen 1",   cn: "关都",      ja: "カントー",     ko: "관동" },
  { id: "gen2",  label: "Gen 2",   cn: "城都",      ja: "ジョウト",     ko: "성도" },
  { id: "gen3",  label: "Gen 3",   cn: "丰缘",      ja: "ホウエン",     ko: "호연" },
  { id: "gen4",  label: "Gen 4",   cn: "神奥",      ja: "シンオウ",     ko: "신오" },
  { id: "gen56", label: "Gen 5–6", cn: "合众/卡洛斯", ja: "イッシュ・カロス", ko: "하나·칼로스" },
  { id: "gen79", label: "Gen 7–9", cn: "阿罗拉–帕底亚", ja: "アローラ〜パルデア", ko: "알로라–팔데아" },
];

export const DEX_MAP = new Map();
export const DEX_IDS = [];
for (let i = 1; i <= NAMES.length; i++) {
  DEX_MAP.set(i, { id: i, name: NAMES[i - 1], zh: NAMES_ZH[i - 1] ?? NAMES[i - 1], ja: NAMES_JA[i] ?? NAMES[i - 1], ko: NAMES_KO[i] ?? NAMES[i - 1], gen: "gen1" });
  DEX_IDS.push(i);
}
for (const [id, name, gen] of EXTRA_POKEMON) {
  DEX_MAP.set(id, { id, name, zh: EXTRA_ZH[id] ?? name, ja: NAMES_JA[id] ?? name, ko: NAMES_KO[id] ?? name, gen });
  DEX_IDS.push(id);
}

export const COUNT = DEX_IDS.length;
export const hasDexId = (id) => DEX_MAP.has(id);
export const nameEnOf = (id) => DEX_MAP.get(id)?.name ?? `#${id}`;
export const nameZhOf = (id) => DEX_MAP.get(id)?.zh ?? nameEnOf(id);
export const nameOf = (id) => {
  const e = DEX_MAP.get(id);
  if (!e) return `#${id}`;
  const l = lang();
  if (l === "zh") return e.zh ?? e.name;
  if (l === "ja") return e.ja ?? e.name;
  if (l === "ko") return e.ko ?? e.name;
  return e.name;
};
export const genOf = (id) => DEX_MAP.get(id)?.gen ?? "gen1";

const FIRE_IDS = new Set([
  4,5,6,37,38,58,59,77,78,126,136,146,
  155,156,157,250,255,256,257,390,391,392,607,608,609,637,813,815,909,911,935,937,
]);
const WATER_IDS = new Set([
  7,8,9,54,55,60,61,62,72,73,79,80,86,87,90,91,98,99,116,117,118,119,120,121,129,130,131,134,138,139,140,141,144,
  158,159,160,183,184,194,195,249,258,259,260,393,394,395,471,501,656,657,658,704,706,
]);
const ELEC_IDS = new Set([
  25,26,81,82,100,101,125,135,145,
  172,403,404,405,
]);
const GRASS_IDS = new Set([
  1,2,3,10,11,12,43,44,45,46,47,48,49,69,70,71,102,103,114,123,
  152,153,154,212,214,251,252,253,254,387,388,389,470,495,722,723,724,906,908,
]);
const PSYCHIC_IDS = new Set([
  35,36,39,40,63,64,65,92,93,94,96,97,122,124,137,147,148,149,150,151,
  175,176,196,197,280,281,282,302,359,374,375,376,380,381,384,385,468,475,491,
  570,571,635,700,778,885,887,957,959,
]);

// Natural habitat traits (used by 2D terrain-aware overworld roaming & airborne flight!)
const SWIMMER_IDS = new Set([
  7,8,9, 54,55, 60,61,62, 72,73, 79,80, 86,87, 90,91, 98,99,
  116,117, 118,119, 120,121, 129,130, 131, 134, 138,139, 140,141, 147,148,
  158,159,160, 183,184, 194,195, 258,259,260, 393,394,395, 501, 656,657,658, 704,706, 980,
]);
// Species whose native Walk animation is ALREADY continuous mid-air flapping/floating
const ALWAYS_AIR_IDS = new Set([
  12, 15, 22, 41,42, 49, 81,82, 92,93, 109,110, 130, 142, 144,145,146, 150,151,
  169, 249, 250, 251, 330, 374, 380, 381, 384, 385, 468, 491, 608, 609, 635, 637, 885, 887,
]);
// Pure levitators without legs/perching feet (only rest when sleeping)
const PURE_FLOAT_IDS = new Set([
  81,82, 92,93, 109,110, 130,
  251, 374, 380, 381, 384, 385, 491, 608, 609, 635, 885, 887,
]);
// Winged birds & dragons that soar in the sky (~80%) and occasionally perch/walk on land (~20%)
const PERCH_FLYER_IDS = new Set([
  6, 16,17,18, 21, 83, 94, 123, 149,
  176, 212, 373, 722, 723, 724, 821, 823,
]);
const FLYER_IDS = new Set([...ALWAYS_AIR_IDS, ...PERCH_FLYER_IDS]);
const DRAGON_FLY_IDS = new Set([6, 149, 373]);
// Ground & Rock types that can burrow halfway underground with a pixel dirt mound!
const BURROWER_IDS = new Set([
  27,28, 31,34, 50,51, 74,75,76, 95, 104,105, 111,112,
  208, 246,247, 443,444,445, 980,
]);
const DEEP_BURROW_IDS = new Set([50, 51]); // Diglett & Dugtrio love staying burrowed!
const FOREST_IDS = new Set([
  1,2,3, 10,11,12, 13,14,15, 16,17,18, 21,22, 25,26,
  43,44,45, 46,47, 48,49, 69,70,71, 83, 102,103, 114, 123, 127, 133,
  152,153,154, 172, 212, 214, 252,253,254, 280,281,282, 387,388,389,
  470, 495, 570,571, 722,723,724, 778, 906,908,
]);

export function habitatOf(id) {
  const canSwim = SWIMMER_IDS.has(id);
  const canFly = FLYER_IDS.has(id);
  const alwaysAir = ALWAYS_AIR_IDS.has(id);
  const pureFloat = PURE_FLOAT_IDS.has(id);
  const canBurrow = BURROWER_IDS.has(id);
  const deepBurrow = DEEP_BURROW_IDS.has(id);
  const prefers = canSwim ? "water" : (canFly || FOREST_IDS.has(id)) ? "forest" : "land";
  return { canSwim, canFly, alwaysAir, pureFloat, canBurrow, deepBurrow, prefers };
}

// ---- Complete Curated Multi-Gen Evolution Chains & Work-XP Progression ----
export const EVOLUTIONS = {
  // Gen 1 (+ cross-gen evolutions!)
  1: 2, 2: 3, 4: 5, 5: 6, 7: 8, 8: 9,
  10: 11, 11: 12, 13: 14, 14: 15, 16: 17, 17: 18,
  19: 20, 21: 22, 23: 24, 172: 25, 25: 26, 27: 28,
  29: 30, 30: 31, 32: 33, 33: 34, 35: 36, 37: 38, 39: 40,
  41: 42, 42: 169, 43: 44, 44: 45, 46: 47, 48: 49, 50: 51, 52: 53,
  54: 55, 56: 57, 58: 59, 60: 61, 61: 62, 63: 64, 64: 65,
  66: 67, 67: 68, 69: 70, 70: 71, 72: 73, 74: 75, 75: 76,
  77: 78, 79: 80, 81: 82, 84: 85, 86: 87, 88: 89, 90: 91,
  92: 93, 93: 94, 95: 208, 96: 97, 98: 99, 100: 101, 102: 103, 104: 105,
  109: 110, 111: 112, 116: 117, 118: 119, 120: 121, 123: 212, 129: 130,
  133: [134, 135, 136, 196, 197, 470, 471, 700], // All 8 Eeveelutions!
  138: 139, 140: 141, 147: 148, 148: 149,
  // Gen 2
  152: 153, 153: 154, 155: 156, 156: 157, 158: 159, 159: 160,
  175: 176, 176: 468, 183: 184, 194: 195,
  246: 247, 247: 248,
  // Gen 3
  252: 253, 253: 254, 255: 256, 256: 257, 258: 259, 259: 260,
  280: 281, 281: [282, 475],
  371: 372, 372: 373, 374: 375, 375: 376,
  // Gen 4
  387: 388, 388: 389, 390: 391, 391: 392, 393: 394, 394: 395,
  403: 404, 404: 405, 443: 444, 444: 445, 447: 448,
  // Gen 5-6
  570: 571, 607: 608, 608: 609, 656: 657, 657: 658, 704: 706,
  // Gen 7-9
  722: 723, 723: 724, 813: 815, 821: 823, 885: 887,
  906: 908, 909: 911, 935: 937, 957: 959,
};

// Reverse evolution map so subagent mini-followers can appear as the parent's cute baby/base form!
const PRE_EVO = new Map();
for (const [fromStr, to] of Object.entries(EVOLUTIONS)) {
  const from = Number(fromStr);
  for (const t of Array.isArray(to) ? to : [to]) PRE_EVO.set(t, from);
}

export function baseFormOf(id) {
  let cur = id;
  for (let i = 0; i < 4 && PRE_EVO.has(cur); i++) cur = PRE_EVO.get(cur);
  return cur;
}

const EVOLVED_SET = new Set(Object.values(EVOLUTIONS).flat());
const LEGENDARY_SET = new Set([144, 145, 146, 150, 151, 249, 250, 251, 380, 381, 384, 385, 491]);

// Pool of authentic Stage-1 baby/unevolved forms for newly initialized agents
export const BASE_STARTER_IDS = DEX_IDS.filter(
  (id) => !EVOLVED_SET.has(id) && !LEGENDARY_SET.has(id) && Boolean(EVOLUTIONS[id]),
);

export const XP_KEY = "herdr-pokemon.xp";
export const SHINY_KEY = "herdr-pokemon.shiny";
export const EVO_LOCK_KEY = "herdr-pokemon.evo-lock";

export function nextEvolution(id, slot = "") {
  const target = EVOLUTIONS[id];
  if (!target) return null;
  const nextId = Array.isArray(target) ? target[hashStr(slot || String(id)) % target.length] : target;
  // Balanced real-work pacing (~1.2 XP/sec working + 28 XP per completed turn):
  // - 3-stage line: Stage 1->2 = 900 XP (~12-15m active work), Stage 2->3 = 1800 XP (~25-30m more)
  // - 2-stage line: Stage 1->Final = 1500 XP (~18-25m active work)
  const isStage2 = EVOLVED_SET.has(id);
  const hasThirdStage = Boolean(EVOLUTIONS[nextId]);
  const needXp = isStage2 ? 1800 : hasThirdStage ? 900 : 1500;
  return { nextId, needXp, isStage2 };
}

export function savedXpMap() {
  const m = shared(XP_KEY);
  return m && typeof m === "object" && !Array.isArray(m) ? m : {};
}

export function slotXpOf(slot) {
  const rec = savedXpMap()[slot];
  return rec && typeof rec === "object"
    ? { xp: Number(rec.xp) || 0, total: Number(rec.total) || 0, turns: Number(rec.turns) || 0 }
    : { xp: 0, total: 0, turns: 0 };
}

export function saveXpBatch(updates) {
  const next = { ...savedXpMap(), ...updates };
  const keys = Object.keys(next);
  for (let i = 0; i < keys.length - 300; i++) delete next[keys[i]];
  setShared(XP_KEY, next);
}

export function resetSlotXp(slot) {
  if (!slot) return;
  const cur = savedXpMap();
  if (!cur[slot]) return;
  saveXpBatch({ [slot]: { xp: 0, total: 0, turns: 0 } });
}

export function levelInfo(id, slot) {
  const rec = slotXpOf(slot);
  const locked = isEvoLocked(slot);
  const evo = locked ? null : nextEvolution(id, slot);
  const baseLv = EVOLVED_SET.has(id) ? (evo ? 16 : 36) : 5;
  const lv = evo
    ? Math.min(baseLv + 19, baseLv + Math.floor((rec.xp / evo.needXp) * (evo.isStage2 ? 20 : 11)))
    : Math.min(100, baseLv + Math.floor(rec.xp / 180));
  const pct = evo ? Math.min(100, Math.round((rec.xp / evo.needXp) * 100)) : 100;
  return {
    level: lv,
    xp: Math.round(rec.xp),
    needXp: evo?.needXp ?? null,
    nextId: evo?.nextId ?? null,
    pct,
    locked,
  };
}

// ---- Individual Random Body Size Variation per Agent Slot (lightweight & deterministic!) ----
// Ensures even if every agent is Pikachu, each individual has its own natural height/build (0.86x ~ 1.16x)!
export function sizeScaleOf(slot) {
  if (!slot) return 1.0;
  const t = (hashStr(`size:${slot}`) % 1001) / 1000;
  return Math.round((0.86 + t * 0.30) * 1000) / 1000;
}

export function sizeLabelOf(scale) {
  if (scale < 0.91) return "XS";
  if (scale < 0.97) return "S";
  if (scale <= 1.04) return "M";
  if (scale <= 1.10) return "L";
  return "XL";
}

// ---- Authentic Rare Shiny ✨ Encounter System (purely random 1/64 ≈ 1.56% — never manually toggled!) ----
export const SHINY_ODDS = 64;

function savedShinyMap() {
  const m = shared(SHINY_KEY);
  return m && typeof m === "object" && !Array.isArray(m) ? m : {};
}

export function isShiny(slot) {
  if (!slot) return false;
  const m = savedShinyMap();
  if (slot in m) return Boolean(m[slot]);
  return hashStr(`shiny:${slot}`) % SHINY_ODDS === 0;
}

export function rollShinyForSlot(slot) {
  if (!slot) return false;
  const hit = Math.random() < (1 / SHINY_ODDS);
  const next = { ...savedShinyMap(), [slot]: hit };
  const keys = Object.keys(next);
  for (let i = 0; i < keys.length - 300; i++) delete next[keys[i]];
  setShared(SHINY_KEY, next);
  return hit;
}

// ---- Lightweight Evolution Lock per Agent Slot (keeps Pikachu/Charmander from auto-evolving) ----
function savedEvoLockMap() {
  const m = shared(EVO_LOCK_KEY);
  return m && typeof m === "object" && !Array.isArray(m) ? m : {};
}

export function isEvoLocked(slot) {
  if (!slot) return false;
  return Boolean(savedEvoLockMap()[slot]);
}

export function setEvoLocked(slot, val) {
  if (!slot) return;
  const next = { ...savedEvoLockMap() };
  if (val) next[slot] = true;
  else delete next[slot];
  const keys = Object.keys(next);
  for (let i = 0; i < keys.length - 300; i++) delete next[keys[i]];
  setShared(EVO_LOCK_KEY, next);
}

export function elementOf(id) {
  if (FIRE_IDS.has(id)) return "fire";
  if (WATER_IDS.has(id)) return "water";
  if (ELEC_IDS.has(id)) return "electric";
  if (GRASS_IDS.has(id)) return "grass";
  if (PSYCHIC_IDS.has(id)) return "psychic";
  return "impact";
}

export const MOVE_POOL = {
  fire:     [{ name: "喷射火焰", en: "Flamethrower", ranged: true, count: 3 }, { name: "火焰轮", en: "Flame Wheel", ranged: false }, { name: "大字爆炎", en: "Fire Blast", ranged: true, count: 2 }],
  water:    [{ name: "水之波动", en: "Water Pulse", ranged: true, count: 3 }, { name: "水流喷射", en: "Aqua Jet", ranged: false }, { name: "水炮", en: "Hydro Pump", ranged: true, count: 2 }],
  electric: [{ name: "十万伏特", en: "Thunderbolt", ranged: true, count: 2 }, { name: "伏特攻击", en: "Volt Tackle", ranged: false }, { name: "电球连射", en: "Spark Volley", ranged: true, count: 3 }],
  grass:    [{ name: "飞叶快刀", en: "Razor Leaf", ranged: true, count: 3 }, { name: "叶刃", en: "Leaf Blade", ranged: false }, { name: "日光束", en: "Solar Beam", ranged: true, count: 2 }],
  psychic:  [{ name: "幻象光线", en: "Psybeam", ranged: true, count: 3 }, { name: "暗影球", en: "Shadow Ball", ranged: true, count: 2 }, { name: "意念头锤", en: "Zen Headbutt", ranged: false }],
  impact:   [{ name: "电光一闪", en: "Quick Attack", ranged: false }, { name: "高速星星", en: "Swift", ranged: true, count: 3 }, { name: "必杀门牙", en: "Hyper Fang", ranged: false }],
};

export const ULTIMATE_MOVES = {
  fire:     { name: "爆炸烈焰", en: "Blast Burn",    ranged: true,  count: 5 },
  water:    { name: "加农水炮", en: "Hydro Cannon",  ranged: true,  count: 5 },
  electric: { name: "雷霆风暴", en: "Volt Storm",    ranged: true,  count: 5 },
  grass:    { name: "疯狂植物", en: "Frenzy Plant",  ranged: true,  count: 5 },
  psychic:  { name: "精神击破", en: "Psystrike",     ranged: true,  count: 5 },
  impact:   { name: "终极冲击", en: "Giga Impact",   ranged: false, count: 4 },
};

export const ELEMENT_LABELS = {
  fire:     "火",
  water:    "水",
  electric: "电",
  grass:    "草",
  psychic:  "超能",
  impact:   "一般",
};

export const ELEMENT_LABELS_EN = {
  fire:     "Fire",
  water:    "Water",
  electric: "Elec",
  grass:    "Grass",
  psychic:  "Psych",
  impact:   "Norm",
};

export const ELEMENT_LABELS_JA = { fire: "ほのお", water: "みず", electric: "でんき", grass: "くさ", psychic: "エスパー", impact: "ノーマル" };
export const ELEMENT_LABELS_KO = { fire: "불꽃", water: "물", electric: "전기", grass: "풀", psychic: "에스퍼", impact: "노말" };

const MOVE_JA = {
  flamethrower:"かえんほうしゃ", "fire-punch":"ほのおのパンチ", "lava-plume":"ふんえん", "fire-blast":"だいもんじ",
  "flare-blitz":"フレアドライブ", overheat:"オーバーヒート", "flame-charge":"ニトロチャージ", "quick-slash":"でんこうせっか",
  "morning-sun":"あさのひざし", protect:"まもる", surf:"なみのり", scald:"ねっとう", waterfall:"たきのぼり",
  "hydro-pump":"ハイドロポンプ", "hydro-cannon":"ハイドロカノン", liquidation:"アクアブレイク", "aqua-jet":"アクアジェット",
  "water-shuri":"みずしゅりけん", "ice-beam":"れいとうビーム", "aqua-ring":"アクアリング", thunderbolt:"10まんボルト",
  discharge:"ほうでん", "spark-strike":"ワイルドボルト", thunder:"かみなり", "volt-tackle":"ボルテッカー",
  "zap-cannon":"でんじほう", "electro-ball":"エレキボール", "zippy-zap":"ばちばちアクセル", "leaf-blade":"リーフブレード",
  "energy-ball":"エナジーボール", "razor-leaf":"はっぱカッター", "solar-beam":"ソーラービーム", "leaf-storm":"リーフストーム",
  "wood-hammer":"ウッドハンマー", "grassy-glide":"グラススライダー", synthesis:"こうごうせい", psychic:"サイコキネシス",
  "shadow-ball":"シャドーボール", "psycho-cut":"サイコカッター", psystrike:"サイコブレイク", "dragon-pulse":"りゅうのはどう",
  "shadow-sneak":"かげうち", "calm-mind":"めいそう", recover:"じこさいせい", "body-slam":"のしかかり",
  "iron-tail":"アイアンテール", "air-slash":"エアスラッシュ", "giga-impact":"ギガインパクト", "hyper-beam":"はかいこうせん",
  earthquake:"じしん", "close-combat":"インファイト", "quick-attack":"でんこうせっか", "extreme-spd":"しんそく",
  "swords-dance":"つるぎのまい", "pika-volt":"10まんボルト", "rai-volt":"ボルテッカー", "zard-blast":"ブラストバーン",
  "blast-hydro":"ハイドロカノン", "venu-frenzy":"ハードプラント", "geng-shadow":"シャドーボール",
  "m2-strike":"サイコブレイク", "snor-giga":"ギガインパクト", "luca-aura":"はどうだん", "gren-shuri":"みずしゅりけん",
  "ray-ascent":"ガリョウテンセイ",
};
const MOVE_KO = {
  flamethrower:"화염방사", "fire-punch":"불꽃펀치", "lava-plume":"분연", "fire-blast":"불대문자",
  "flare-blitz":"플레어드라이브", overheat:"오버히트", "flame-charge":"니트로차지", "quick-slash":"전광석화",
  "morning-sun":"아침햇살", protect:"방어", surf:"파도타기", scald:"열탕", waterfall:"폭포오르기",
  "hydro-pump":"하이드로펌프", "hydro-cannon":"하이드로캐논", liquidation:"아쿠아브레이크", "aqua-jet":"아쿠아제트",
  "water-shuri":"물수리검", "ice-beam":"냉동빔", "aqua-ring":"아쿠아링", thunderbolt:"10만볼트",
  discharge:"방전", "spark-strike":"와일드볼트", thunder:"번개", "volt-tackle":"볼트태클",
  "zap-cannon":"전자포", "electro-ball":"일렉트릭볼", "zippy-zap":"파찌파찌액셀", "leaf-blade":"리프블레이드",
  "energy-ball":"에너지볼", "razor-leaf":"잎날가르기", "solar-beam":"솔라빔", "leaf-storm":"리프스톰",
  "wood-hammer":"우드해머", "grassy-glide":"그래스슬라이더", synthesis:"광합성", psychic:"사이코키네시스",
  "shadow-ball":"섀도볼", "psycho-cut":"사이코커터", psystrike:"사이코브레이크", "dragon-pulse":"용의파동",
  "shadow-sneak":"야습", "calm-mind":"명상", recover:"HP회복", "body-slam":"누르기",
  "iron-tail":"아이언테일", "air-slash":"에어슬래시", "giga-impact":"기가임팩트", "hyper-beam":"파괴광선",
  earthquake:"지진", "close-combat":"인파이트", "quick-attack":"전광석화", "extreme-spd":"신속",
  "swords-dance":"칼춤", "pika-volt":"10만볼트", "rai-volt":"볼트태클", "zard-blast":"블러스트번",
  "blast-hydro":"하이드로캐논", "venu-frenzy":"하드플랜트", "geng-shadow":"섀도볼",
  "m2-strike":"사이코브레이크", "snor-giga":"기가임팩트", "luca-aura":"파동탄", "gren-shuri":"물수리검",
  "ray-ascent":"화룡점정",
};

export const elemLabel = (elem) => {
  const l = lang();
  if (l === "zh") return ELEMENT_LABELS[elem] ?? "一般";
  if (l === "ja") return ELEMENT_LABELS_JA[elem] ?? "ノーマル";
  if (l === "ko") return ELEMENT_LABELS_KO[elem] ?? "노말";
  return ELEMENT_LABELS_EN[elem] ?? "Norm";
};
export const moveName = (m) => {
  const l = lang();
  if (l === "zh") return m.name;
  if (l === "ja") return MOVE_JA[m.id] ?? m.en ?? m.name;
  if (l === "ko") return MOVE_KO[m.id] ?? m.en ?? m.name;
  return m.en ?? m.name;
};

// Rich authentic Pokemon move library grouped by element & tactical slot (reliable / heavy / speed / tactic)
// so each Pokemon rolls 4 unique species-fitting moves per battle!
const BATTLE_MOVES_BY_ELEM = {
  fire: {
    reliable: [
      { id: "flamethrower", name: "喷射火焰", en: "Flamethrower", elem: "fire", power: 78, pp: 10, ranged: true, count: 3, desc: "稳定高热火焰吐息" },
      { id: "fire-punch",   name: "火焰拳",   en: "Fire Punch",   elem: "fire", power: 75, pp: 10, ranged: false, desc: "灼热拳击，易会心" },
      { id: "lava-plume",   name: "喷烟",     en: "Lava Plume",   elem: "fire", power: 76, pp: 10, ranged: true, count: 3, desc: "滚烫火柱席卷对手" },
    ],
    heavy: [
      { id: "fire-blast",   name: "大字爆炎", en: "Fire Blast",   elem: "fire", power: 108, pp: 4, acc: 86, ranged: true, count: 4, desc: "超大威力烈焰（命中86%）" },
      { id: "flare-blitz",  name: "闪焰冲锋", en: "Flare Blitz",  elem: "fire", power: 112, pp: 4, recoil: 0.16, ranged: false, desc: "舍身烈火猛撞（少量反伤）" },
      { id: "overheat",     name: "过热",     en: "Overheat",     elem: "fire", power: 115, pp: 3, acc: 88, ranged: true, count: 5, desc: "极限高温爆发" },
    ],
    speed: [
      { id: "flame-charge", name: "蓄能焰袭", en: "Flame Charge", elem: "fire", power: 58, pp: 12, priority: 1, ranged: false, desc: "先制突袭，抢占先手" },
      { id: "ember-volley", name: "火花连射", en: "Ember Volley", elem: "fire", power: 62, pp: 12, critBoost: 0.35, ranged: true, count: 3, desc: "高频火星，极易暴击" },
      { id: "quick-slash",  name: "电光一闪", en: "Quick Attack", elem: "impact", power: 54, pp: 15, priority: 1, ranged: false, desc: "必定先制攻击" },
    ],
    tactic: [
      { id: "sunny-boost",  name: "炽热冥想", en: "Flame Focus",  elem: "fire", kind: "buff", pp: 5, desc: "攻击力 +35%" },
      { id: "morning-sun",  name: "晨光",     en: "Morning Sun",  elem: "fire", kind: "heal", pp: 4, desc: "回复 36% 最大HP" },
      { id: "protect",      name: "守住",     en: "Protect",      elem: "impact", kind: "guard", pp: 5, desc: "本回合减伤 75% 并蓄力" },
    ],
  },
  water: {
    reliable: [
      { id: "surf",         name: "冲浪",     en: "Surf",         elem: "water", power: 80, pp: 10, ranged: true, count: 3, desc: "汹涌巨浪正面冲击" },
      { id: "scald",        name: "热水",     en: "Scald",        elem: "water", power: 76, pp: 10, ranged: true, count: 3, desc: "滚烫水流稳定输出" },
      { id: "waterfall",    name: "攀瀑",     en: "Waterfall",    elem: "water", power: 78, pp: 10, ranged: false, desc: "借瀑布之势强力突进" },
    ],
    heavy: [
      { id: "hydro-pump",   name: "水炮",     en: "Hydro Pump",   elem: "water", power: 108, pp: 4, acc: 86, ranged: true, count: 4, desc: "高压激流炮轰（命中86%）" },
      { id: "hydro-cannon", name: "加农水炮", en: "Hydro Cannon", elem: "water", power: 118, pp: 3, acc: 85, ranged: true, count: 5, desc: "终极水系奥义爆发" },
      { id: "liquidation",  name: "水流裂破", en: "Liquidation",  elem: "water", power: 96, pp: 5, ranged: false, critBoost: 0.25, desc: "高压水刃劈裂防御" },
    ],
    speed: [
      { id: "aqua-jet",     name: "水流喷射", en: "Aqua Jet",     elem: "water", power: 58, pp: 14, priority: 1, ranged: false, desc: "高速水箭先制攻击" },
      { id: "water-shuri",  name: "水手里剑", en: "Water Shuriken", elem: "water", power: 60, pp: 12, priority: 1, critBoost: 0.25, ranged: true, count: 3, desc: "先制连发水刃" },
      { id: "ice-beam",     name: "冰冻光束", en: "Ice Beam",     elem: "water", power: 72, pp: 8, critBoost: 0.28, ranged: true, count: 2, desc: "寒冰射线，暴击率提升" },
    ],
    tactic: [
      { id: "aqua-ring",    name: "水流环",   en: "Aqua Ring",    elem: "water", kind: "heal", pp: 4, desc: "水流滋养，回复 36% HP" },
      { id: "rain-focus",   name: "求雨蓄势", en: "Rain Surge",   elem: "water", kind: "buff", pp: 5, desc: "攻击力 +35%" },
      { id: "protect",      name: "守住",     en: "Protect",      elem: "impact", kind: "guard", pp: 5, desc: "本回合减伤 75% 并蓄力" },
    ],
  },
  electric: {
    reliable: [
      { id: "thunderbolt",  name: "十万伏特", en: "Thunderbolt",  elem: "electric", power: 82, pp: 10, ranged: true, count: 3, desc: "招牌强力电击" },
      { id: "discharge",    name: "放电",     en: "Discharge",    elem: "electric", power: 76, pp: 10, ranged: true, count: 3, desc: "全场电弧倾泻" },
      { id: "spark-strike", name: "疯狂伏特", en: "Wild Charge",  elem: "electric", power: 84, pp: 8, ranged: false, desc: "缠绕电流高速撞击" },
    ],
    heavy: [
      { id: "thunder",      name: "打雷",     en: "Thunder",      elem: "electric", power: 112, pp: 4, acc: 84, ranged: true, count: 4, desc: "天降落雷超高伤害（命中84%）" },
      { id: "volt-tackle",  name: "伏特攻击", en: "Volt Tackle",  elem: "electric", power: 116, pp: 4, recoil: 0.16, ranged: false, desc: "极限电光冲撞（少量反伤）" },
      { id: "zap-cannon",   name: "电磁炮",   en: "Zap Cannon",   elem: "electric", power: 114, pp: 3, acc: 85, ranged: true, count: 5, desc: "高能电磁粒子炮" },
    ],
    speed: [
      { id: "electro-ball", name: "电球",     en: "Electro Ball", elem: "electric", power: 64, pp: 12, priority: 1, ranged: true, count: 2, desc: "极速雷球先制打击" },
      { id: "zippy-zap",    name: "电电加速", en: "Zippy Zap",    elem: "electric", power: 58, pp: 12, priority: 1, critBoost: 0.45, ranged: false, desc: "先制必高暴击突击" },
      { id: "iron-tail",    name: "铁尾",     en: "Iron Tail",    elem: "impact", power: 78, pp: 8, critBoost: 0.25, ranged: false, desc: "钢铁甩尾重击" },
    ],
    tactic: [
      { id: "charge",       name: "充电",     en: "Charge",       elem: "electric", kind: "buff", pp: 5, desc: "蓄积电能，攻击力 +35%" },
      { id: "parabolic",    name: "抛物面充能", en: "Parabolic Heal", elem: "electric", kind: "heal", pp: 4, desc: "汲取电流，回复 36% HP" },
      { id: "protect",      name: "守住",     en: "Protect",      elem: "impact", kind: "guard", pp: 5, desc: "本回合减伤 75% 并蓄力" },
    ],
  },
  grass: {
    reliable: [
      { id: "energy-ball",  name: "能量球",   en: "Energy Ball",  elem: "grass", power: 80, pp: 10, ranged: true, count: 3, desc: "凝聚自然之力发射" },
      { id: "leaf-blade",   name: "叶刃",     en: "Leaf Blade",   elem: "grass", power: 82, pp: 10, critBoost: 0.28, ranged: false, desc: "锋利翠刃，极易要害" },
      { id: "razor-leaf",   name: "飞叶快刀", en: "Razor Leaf",   elem: "grass", power: 74, pp: 12, critBoost: 0.25, ranged: true, count: 3, desc: "连发飞叶切割对手" },
    ],
    heavy: [
      { id: "solar-beam",   name: "日光束",   en: "Solar Beam",   elem: "grass", power: 112, pp: 4, acc: 88, ranged: true, count: 5, desc: "炽烈光束穿透打击" },
      { id: "leaf-storm",   name: "飞叶风暴", en: "Leaf Storm",   elem: "grass", power: 115, pp: 3, acc: 86, ranged: true, count: 5, desc: "漫天叶刃龙卷轰击" },
      { id: "wood-hammer",  name: "木槌",     en: "Wood Hammer",  elem: "grass", power: 110, pp: 4, recoil: 0.15, ranged: false, desc: "全力猛击（少量反伤）" },
    ],
    speed: [
      { id: "grassy-glide", name: "青草滑梯", en: "Grassy Glide", elem: "grass", power: 62, pp: 12, priority: 1, ranged: false, desc: "贴地飞驰先制打击" },
      { id: "bullet-seed",  name: "种子机关枪", en: "Bullet Seed", elem: "grass", power: 66, pp: 12, critBoost: 0.30, ranged: true, count: 4, desc: "高频连射种子弹幕" },
      { id: "magical-leaf", name: "魔法叶",   en: "Magical Leaf", elem: "grass", power: 68, pp: 12, ranged: true, count: 3, desc: "必定命中的追踪叶" },
    ],
    tactic: [
      { id: "synthesis",    name: "光合作用", en: "Synthesis",    elem: "grass", kind: "heal", pp: 4, desc: "沐浴阳光，回复 38% HP" },
      { id: "growth",       name: "生长",     en: "Growth",       elem: "grass", kind: "buff", pp: 5, desc: "攻击力 +35%" },
      { id: "protect",      name: "守住",     en: "Protect",      elem: "impact", kind: "guard", pp: 5, desc: "本回合减伤 75% 并蓄力" },
    ],
  },
  psychic: {
    reliable: [
      { id: "psychic",      name: "精神强念", en: "Psychic",      elem: "psychic", power: 82, pp: 10, ranged: true, count: 3, desc: "强力念动波压制对手" },
      { id: "shadow-ball",  name: "暗影球",   en: "Shadow Ball",  elem: "psychic", power: 80, pp: 10, ranged: true, count: 3, desc: "幽暗能量球轰击" },
      { id: "zen-headbutt", name: "意念头锤", en: "Zen Headbutt", elem: "psychic", power: 78, pp: 10, ranged: false, desc: "集中念力猛烈头槌" },
    ],
    heavy: [
      { id: "psystrike",    name: "精神击破", en: "Psystrike",    elem: "psychic", power: 112, pp: 4, acc: 90, ranged: true, count: 5, desc: "实体化念力光炮" },
      { id: "moonblast",    name: "月亮之力", en: "Moonblast",    elem: "psychic", power: 104, pp: 4, ranged: true, count: 4, desc: "借月光之力重创对手" },
      { id: "dragon-pulse", name: "龙之波动", en: "Dragon Pulse", elem: "psychic", power: 100, pp: 5, ranged: true, count: 4, desc: "澎湃冲击波贯穿全场" },
    ],
    speed: [
      { id: "shadow-sneak", name: "影子偷袭", en: "Shadow Sneak", elem: "psychic", power: 58, pp: 14, priority: 1, ranged: false, desc: "潜影先制奇袭" },
      { id: "psycho-cut",   name: "精神利刃", en: "Psycho Cut",   elem: "psychic", power: 70, pp: 12, critBoost: 0.38, ranged: true, count: 2, desc: "念力飞刃，高暴击" },
      { id: "swift-star",   name: "高速星星", en: "Swift",        elem: "impact", power: 64, pp: 12, priority: 1, ranged: true, count: 3, desc: "必中星芒先制射出" },
    ],
    tactic: [
      { id: "calm-mind",    name: "冥想",     en: "Calm Mind",    elem: "psychic", kind: "buff", pp: 5, desc: "凝神聚气，攻击力 +35%" },
      { id: "recover",      name: "自我再生", en: "Recover",      elem: "psychic", kind: "heal", pp: 4, desc: "重组细胞，回复 38% HP" },
      { id: "protect",      name: "守住",     en: "Protect",      elem: "impact", kind: "guard", pp: 5, desc: "本回合减伤 75% 并蓄力" },
    ],
  },
  impact: {
    reliable: [
      { id: "body-slam",    name: "泰山压顶", en: "Body Slam",    elem: "impact", power: 82, pp: 10, ranged: false, desc: "厚重身躯全力压制" },
      { id: "earthquake",   name: "地震",     en: "Earthquake",   elem: "impact", power: 88, pp: 8, ranged: true, count: 3, desc: "剧烈震波席卷地面" },
      { id: "aura-sphere",  name: "波导弹",   en: "Aura Sphere",  elem: "psychic", power: 80, pp: 10, ranged: true, count: 3, desc: "必中波导能量弹" },
    ],
    heavy: [
      { id: "giga-impact",  name: "终极冲击", en: "Giga Impact",  elem: "impact", power: 116, pp: 3, acc: 86, ranged: false, desc: "拼尽全力终极冲撞" },
      { id: "close-combat", name: "近身战",   en: "Close Combat", elem: "impact", power: 112, pp: 4, recoil: 0.14, ranged: false, desc: "狂风骤雨般连打" },
      { id: "hyper-beam",   name: "破坏光线", en: "Hyper Beam",   elem: "impact", power: 118, pp: 3, acc: 85, ranged: true, count: 5, desc: "经典高能破坏光束" },
    ],
    speed: [
      { id: "extreme-spd",  name: "神速",     en: "Extreme Speed", elem: "impact", power: 66, pp: 10, priority: 1, ranged: false, desc: "目不暇接的先制神速" },
      { id: "quick-attack", name: "电光一闪", en: "Quick Attack", elem: "impact", power: 58, pp: 14, priority: 1, ranged: false, desc: "迅捷先制出招" },
      { id: "air-slash",    name: "空气之刃", en: "Air Slash",    elem: "impact", power: 72, pp: 10, critBoost: 0.30, ranged: true, count: 3, desc: "疾风利刃，易出暴击" },
    ],
    tactic: [
      { id: "swords-dance", name: "剑舞",     en: "Swords Dance", elem: "impact", kind: "buff", pp: 5, desc: "战意沸腾，攻击力 +38%" },
      { id: "roost-rest",   name: "休整回复", en: "Rest & Heal",  elem: "impact", kind: "heal", pp: 4, desc: "调整呼吸，回复 38% HP" },
      { id: "protect",      name: "守住",     en: "Protect",      elem: "impact", kind: "guard", pp: 5, desc: "本回合减伤 75% 并蓄力" },
    ],
  },
};

// Signature iconic moves that certain beloved Pokemon have a high chance to roll!
const SIGNATURE_MOVES = {
  25:  { id: "pika-volt",   name: "十万伏特", en: "Thunderbolt", elem: "electric", power: 86, pp: 10, critBoost: 0.25, ranged: true, count: 3, desc: "皮卡丘招牌强力电击" },
  26:  { id: "rai-volt",    name: "伏特攻击", en: "Volt Tackle", elem: "electric", power: 116, pp: 4, recoil: 0.14, ranged: false, desc: "雷丘高能电光冲刺" },
  6:   { id: "zard-blast",  name: "爆炸烈焰", en: "Blast Burn",  elem: "fire", power: 118, pp: 3, acc: 88, ranged: true, count: 5, desc: "喷火龙炽热终极炎爆" },
  9:   { id: "blast-hydro", name: "加农水炮", en: "Hydro Cannon", elem: "water", power: 118, pp: 3, acc: 88, ranged: true, count: 5, desc: "水箭龟双炮全力齐射" },
  3:   { id: "venu-frenzy", name: "疯狂植物", en: "Frenzy Plant", elem: "grass", power: 118, pp: 3, acc: 88, ranged: true, count: 5, desc: "妙蛙花巨藤风暴爆发" },
  94:  { id: "geng-shadow", name: "暗影球",   en: "Shadow Ball", elem: "psychic", power: 88, pp: 10, critBoost: 0.25, ranged: true, count: 3, desc: "耿鬼标志性幽影弹" },
  150: { id: "m2-strike",   name: "精神击破", en: "Psystrike",   elem: "psychic", power: 120, pp: 4, acc: 92, ranged: true, count: 5, desc: "超梦专属究极念力" },
  143: { id: "snor-giga",   name: "终极冲击", en: "Giga Impact", elem: "impact", power: 120, pp: 4, acc: 88, ranged: false, desc: "卡比兽排山倒海重击" },
  448: { id: "luca-aura",   name: "波导弹",   en: "Aura Sphere", elem: "psychic", power: 92, pp: 10, ranged: true, count: 3, desc: "路卡利欧必中波导" },
  658: { id: "gren-shuri",  name: "飞水手里剑", en: "Water Shuriken", elem: "water", power: 74, pp: 12, priority: 1, critBoost: 0.35, ranged: true, count: 4, desc: "甲贺忍蛙先制连斩" },
  384: { id: "ray-ascent",  name: "画龙点睛", en: "Dragon Ascent", elem: "psychic", power: 122, pp: 4, acc: 92, ranged: false, desc: "烈空坐天际俯冲奥义" },
};

// Flat lookup of every battle move by ID so each Pokemon slot can persist its fixed 4 moves!
const MOVE_BY_ID = new Map();
for (const groups of Object.values(BATTLE_MOVES_BY_ELEM)) {
  for (const arr of Object.values(groups)) {
    for (const m of arr) MOVE_BY_ID.set(m.id, m);
  }
}
for (const m of Object.values(SIGNATURE_MOVES)) MOVE_BY_ID.set(m.id, m);

export const MOVES_KEY = "herdr-pokemon.moves";

function savedMovesMap() {
  const m = shared(MOVES_KEY);
  return m && typeof m === "object" && !Array.isArray(m) ? m : {};
}

function saveMovesMap(next) {
  const keys = Object.keys(next);
  for (let i = 0; i < keys.length - 300; i++) delete next[keys[i]];
  setShared(MOVES_KEY, next);
}

// Roll 4 distinct, balanced, species-appropriate moves for a Pokemon!
export function rollBattleMoves(dexId) {
  const elem = elementOf(dexId);
  const pool = BATTLE_MOVES_BY_ELEM[elem] ?? BATTLE_MOVES_BY_ELEM.impact;
  const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clone = (m) => ({ ...m, maxPp: m.pp, curPp: m.pp });

  const mRel = clone(pickOne(pool.reliable));
  const mHeavy = clone(pickOne(pool.heavy));
  const mSpd = clone(pickOne(pool.speed));
  const mTac = clone(pickOne(pool.tactic));

  const sig = SIGNATURE_MOVES[dexId];
  if (sig) {
    if (sig.priority) return [mRel, mHeavy, clone(sig), mTac];
    if ((sig.power ?? 0) >= 105) return [mRel, clone(sig), mSpd, mTac];
    return [clone(sig), mHeavy, mSpd, mTac];
  }
  return [mRel, mHeavy, mSpd, mTac];
}

// Persistent fixed 4 moves per agent slot: generated & locked when the Pokemon is first created,
// and automatically re-rolled only when the user switches to a different Pokemon (or evolves)!
export function movesForSlot(slot, dexId) {
  const clone = (m) => ({ ...m, maxPp: m.pp, curPp: m.pp });
  if (slot) {
    const all = savedMovesMap();
    const rec = all[slot];
    if (rec && rec.dexId === dexId && Array.isArray(rec.ids) && rec.ids.length === 4) {
      const resolved = rec.ids.map((id) => MOVE_BY_ID.get(id)).filter(Boolean);
      if (resolved.length === 4) return resolved.map(clone);
    }
    const rolled = rollBattleMoves(dexId);
    saveMovesMap({ ...all, [slot]: { dexId, ids: rolled.map((m) => m.id) } });
    return rolled;
  }
  return rollBattleMoves(dexId);
}

export function resetSlotMoves(slot) {
  if (!slot) return;
  const all = savedMovesMap();
  if (!(slot in all)) return;
  const next = { ...all };
  delete next[slot];
  saveMovesMap(next);
}

// On-demand official Pokemon GBA/NDS Battle Front & Back Sprite Loader (strictly cached on disk!).
// - Player (side="back"): classic over-the-shoulder back sprite facing diagonally up-right!
// - Opponent (side="front"): classic front battle sprite facing diagonally down-left!
const POKEAPI_BW_ANIM = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated";
const POKEAPI_SPRITE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

export async function ensureBattleSprite(id, side = "front", { shiny = false } = {}) {
  const dir = `${DATA()}/battle`;
  const tag = `${id}${shiny ? "_s" : ""}_${side}`;
  for (const ext of ["gif", "png"]) {
    const f = `${dir}/${tag}.${ext}`;
    if (await fs.exists(f).catch(() => false)) {
      return `${DATA_REL}/battle/${tag}.${ext}`;
    }
  }
  await fs.mkdir(dir, { recursive: true });
  const sub = `${side === "back" ? "back/" : ""}${shiny ? "shiny/" : ""}`;
  const candidates = [];
  if (id <= 649) candidates.push([`${dir}/${tag}.gif`, `${DATA_REL}/battle/${tag}.gif`, `${POKEAPI_BW_ANIM}/${sub}${id}.gif`]);
  candidates.push([`${dir}/${tag}.png`, `${DATA_REL}/battle/${tag}.png`, `${POKEAPI_SPRITE}/${sub}${id}.png`]);
  if (shiny) {
    const normSub = side === "back" ? "back/" : "";
    if (id <= 649) candidates.push([`${dir}/${tag}.gif`, `${DATA_REL}/battle/${tag}.gif`, `${POKEAPI_BW_ANIM}/${normSub}${id}.gif`]);
    candidates.push([`${dir}/${tag}.png`, `${DATA_REL}/battle/${tag}.png`, `${POKEAPI_SPRITE}/${normSub}${id}.png`]);
  }
  for (const [file, rel, url] of candidates) {
    const r = await exec("curl", ["-sfL", "--retry", "1", "--connect-timeout", "8", "-o", file, url]).catch(() => null);
    if (r?.code === 0 && (await fs.exists(file).catch(() => false))) {
      // Trim static PNGs tightly so Gen 6-9 sprites scale crisply onto the battle platform
      if (file.endsWith(".png") && (await imageMagick())) {
        await im("convert", [file, "-trim", "+repage", "-scale", "200%", file]).catch(() => null);
      }
      return rel;
    }
    await exec("rm", ["-f", file]).catch(() => null);
  }
  return null;
}

// ---- Token Consumption -> Battle Damage Multiplier ----
// Reads real local session token usage (Claude Code / Codex) when available, and falls back seamlessly
// to Herdr's real live terminal `turn` count + persisted `Work-XP` (works for Antigravity/agy & every agent!).
export function tokenDamageMult(tokens) {
  const t = Math.max(0, Number(tokens) || 0);
  // Smooth logarithmic curve: 0 -> 1.00x, 25k -> 1.13x, 200k -> 1.40x, 1.5M -> 1.75x, 5M+ -> ~2.00x (cap 2.25x)
  const raw = 1.0 + Math.log10(1 + t / 25000) * 0.42;
  return Math.round(Math.max(1.0, Math.min(2.25, raw)) * 100) / 100;
}

export function formatTokens(tokens) {
  const t = Math.max(0, Math.round(Number(tokens) || 0));
  const l = lang();
  if (l === "zh" || l === "ja") {
    const bil = l === "zh" ? "亿" : "億";
    if (t >= 100000000) return `${(t / 100000000).toFixed(2)}${bil}`;
    if (t >= 10000) return `${(t / 10000).toFixed(t >= 1000000 ? 0 : 1)}万`;
    if (t >= 1000) return `${(t / 1000).toFixed(1)}千`;
    return String(t);
  }
  if (l === "ko") {
    if (t >= 100000000) return `${(t / 100000000).toFixed(2)}억`;
    if (t >= 10000) return `${(t / 10000).toFixed(t >= 1000000 ? 0 : 1)}만`;
    if (t >= 1000) return `${(t / 1000).toFixed(1)}천`;
    return String(t);
  }
  if (t >= 1000000) return `${(t / 1000000).toFixed(t >= 10000000 ? 1 : 2)}M`;
  if (t >= 1000) return `${Math.round(t / 1000)}k`;
  return String(t);
}

export function estimateTokensFromActivity(term, slot) {
  const turns = Math.max(0, Number(term?.turn) || 0);
  const xpRec = slotXpOf(slot);
  const xpTotal = Math.max(0, Number(xpRec.total) || 0);
  const est = Math.round(turns * 18500 + xpTotal * 420);
  return { tokens: est, turns, source: "turns" };
}

// Async helper: ultra-lightweight, strictly on-demand (called ONLY once when a VS Battle opens — ZERO background polling!).
// Supports real local session token logs for all 4 mainstream coding agents:
//   - Claude Code (cc / claude):  ~/.claude/projects/<encoded-cwd>/*.jsonl
//   - Codex (codex):              ~/.codex/sessions/.../rollout-*.jsonl (tail 32KB cumulative total_tokens!)
//   - Pi (pi):                    ~/.pi/agent/sessions/--<encoded-cwd>--/*.jsonl
//   - Antigravity (agy):          ~/.gemini/antigravity-cli/history.jsonl -> brain/<id>/.system_generated/logs/transcript.jsonl
// All reads are strictly bounded (<=2MB tail cap) so even huge logs finish in ~10-20ms!
// Automatically falls back to live Herdr `turn` count + Work-XP if no matching log exists.
const TOKEN_READER_PY = `
import glob, json, os, re, sys

agent = (sys.argv[1] or "").lower()
cwd = os.path.realpath(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else ""
home = os.path.expanduser("~")
MAX_READ = 2 * 1024 * 1024

def read_tail(path, limit=MAX_READ):
    try:
        sz = os.path.getsize(path)
        with open(path, "rb") as f:
            if sz > limit:
                f.seek(sz - limit)
                f.readline()
            return f.read().decode("utf-8", errors="ignore")
    except Exception:
        return ""

def latest_file(pattern):
    files = glob.glob(pattern)
    if not files:
        return None
    return max(files, key=lambda p: os.path.getmtime(p))

def sum_claude(cwd_path):
    if not cwd_path:
        return 0
    enc = re.sub(r"[^a-zA-Z0-9]", "-", cwd_path)
    f = latest_file(os.path.join(home, ".claude", "projects", enc, "*.jsonl"))
    if not f:
        return 0
    tot = 0
    for line in read_tail(f).splitlines():
        if '"usage"' not in line:
            continue
        try:
            obj = json.loads(line)
            u = (obj.get("message") or {}).get("usage") or obj.get("usage")
            if isinstance(u, dict):
                tot += int(u.get("input_tokens", 0)) + int(u.get("output_tokens", 0))
                tot += int(u.get("cache_read_input_tokens", 0)) + int(u.get("cache_creation_input_tokens", 0))
        except Exception:
            pass
    return tot

def sum_codex(cwd_path):
    files = glob.glob(os.path.join(home, ".codex", "sessions", "*", "*", "*", "rollout-*.jsonl"))
    if not files:
        return 0
    files.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    target = None
    for f in files[:16]:
        try:
            with open(f, "r", encoding="utf-8", errors="ignore") as fh:
                head = fh.readline()
            m = re.search(r'"cwd":"([^"]+)"', head)
            if m and cwd_path and os.path.realpath(m.group(1)) == cwd_path:
                target = f
                break
        except Exception:
            pass
    if not target:
        return 0
    tail = read_tail(target, 65536)
    matches = re.findall(r'"total_token_usage":\\{[^}]*"total_tokens":(\\d+)', tail)
    return int(matches[-1]) if matches else 0

def sum_pi(cwd_path):
    if not cwd_path:
        return 0
    slug = "--" + cwd_path.lstrip("/").replace("/", "-") + "--"
    f = latest_file(os.path.join(home, ".pi", "agent", "sessions", slug, "*.jsonl"))
    if not f:
        return 0
    tot = 0
    for line in read_tail(f).splitlines():
        if '"totalTokens"' not in line:
            continue
        for m in re.findall(r'"totalTokens":(\\d+)', line):
            tot += int(m)
    return tot

def sum_agy(cwd_path):
    if not cwd_path:
        return 0
    hist = os.path.join(home, ".gemini", "antigravity-cli", "history.jsonl")
    cid = None
    for line in reversed(read_tail(hist, 65536).splitlines()):
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
            ws = obj.get("workspace")
            if ws and os.path.realpath(ws) == cwd_path and obj.get("conversationId"):
                cid = obj["conversationId"]
                break
        except Exception:
            pass
    if not cid:
        return 0
    tf = os.path.join(home, ".gemini", "antigravity-cli", "brain", cid, ".system_generated", "logs", "transcript.jsonl")
    if not os.path.isfile(tf):
        return 0
    tot = 0
    for line in read_tail(tf).splitlines():
        if "input_tokens" not in line:
            continue
        for k in ("input_tokens", "cache_read_tokens", "output_tokens"):
            for m in re.findall(r'"' + k + r'":(\\d+)', line):
                tot += int(m)
    return tot

kind = ""
val = 0
if any(k in agent for k in ("claude", "cc")):
    kind, val = "claude-log", sum_claude(cwd)
elif "codex" in agent:
    kind, val = "codex-log", sum_codex(cwd)
elif agent == "pi" or agent.startswith("pi ") or "/pi" in agent:
    kind, val = "pi-log", sum_pi(cwd)
elif any(k in agent for k in ("agy", "antigravity")):
    kind, val = "agy-log", sum_agy(cwd)
else:
    for k, fn in (("agy-log", sum_agy), ("claude-log", sum_claude), ("codex-log", sum_codex), ("pi-log", sum_pi)):
        v = fn(cwd)
        if v > 0:
            kind, val = k, v
            break

print(json.dumps({"source": kind, "tokens": val}))
`.trim();

export async function measureAgentTokens(term, slot) {
  const fallback = estimateTokensFromActivity(term, slot);
  const cwd = term?.foreground?.cwd || term?.cwd || "";
  const fgName = String(term?.foreground?.name || term?.agent || term?.status?.app || "").toLowerCase();
  if (!cwd) return fallback;

  try {
    const r = await exec("python3", ["-c", TOKEN_READER_PY, fgName, cwd]).catch(() => null);
    const out = (r?.stdout || "").trim();
    if (out) {
      const parsed = JSON.parse(out);
      if (Number(parsed?.tokens) > 0) {
        return {
          tokens: Number(parsed.tokens),
          turns: fallback.turns,
          source: parsed.source || "log",
        };
      }
    }
  } catch {}
  return fallback;
}

export const ELEMENT_COLORS = {
  fire:     "#ea580c",
  water:    "#0284c7",
  electric: "#ca8a04",
  grass:    "#16a34a",
  psychic:  "#9333ea",
  impact:   "#475569",
};

const SUPER = {
  fire: new Set(["grass"]),
  water: new Set(["fire"]),
  grass: new Set(["water"]),
  electric: new Set(["water"]),
  psychic: new Set(["impact"]),
};
const RESIST = {
  fire: new Set(["water", "fire"]),
  water: new Set(["grass", "water"]),
  grass: new Set(["fire", "grass"]),
  electric: new Set(["grass", "electric"]),
};

export function effectiveness(atkElem, defElem) {
  if (SUPER[atkElem]?.has(defElem)) return 1.5;
  if (RESIST[atkElem]?.has(defElem)) return 0.7;
  return 1.0;
}

export const PICKS_KEY = "pokemon-agents";
export const PORTRAITS_KEY = "pokemon-agents.portraits";
export const ICONS_KEY = "pokemon-agents.icons";
export const CRY_KEY = "pokemon-agents.cries";

export const slotOf = (a) => a.pane || a.address;

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function savedPicks() {
  const s = shared(PICKS_KEY);
  return s && typeof s === "object" && s.panes && typeof s.panes === "object" ? s.panes : {};
}

export function savePicks(update) {
  const next = { ...savedPicks(), ...update };
  const keys = Object.keys(next);
  for (let i = 0; i < keys.length - 300; i++) delete next[keys[i]];
  setShared(PICKS_KEY, { panes: next });
}

export function assignPokemon(list) {
  const saved = savedPicks();
  const ids = {};
  const fresh = {};
  const used = new Set();
  for (const a of list) {
    const id = saved[slotOf(a)];
    if (hasDexId(id)) { ids[a.address] = id; used.add(id); }
  }
  for (const a of list) {
    if (ids[a.address]) continue;
    // Every newly initialized agent starts as a Stage-1 baby/unevolved Pokemon so it can grow & evolve!
    const pool = BASE_STARTER_IDS;
    let idx = hashStr(slotOf(a)) % pool.length;
    let id = pool[idx];
    for (let i = 0; i < pool.length && used.has(id); i++) id = pool[(idx + i) % pool.length];
    ids[a.address] = id;
    if (a.pane) fresh[a.pane] = id;
    used.add(id);
  }
  return { ids, fresh };
}

export function dexForPane(paneId) {
  const id = paneId && savedPicks()[paneId];
  return hasDexId(id) ? id : null;
}

export function savedBalls() {
  const b = shared(SPACE_BALLS_KEY);
  return b && typeof b === "object" && !Array.isArray(b) ? b : {};
}

export function ballForSpace(space) {
  if (!space) return "poke";
  const saved = savedBalls();
  if (saved[space.id]) return saved[space.id];
  const idx = hashStr(space.id) % BALL_TYPES.length;
  return BALL_TYPES[idx].id;
}

export function setBallForSpace(spaceId, ballId) {
  setShared(SPACE_BALLS_KEY, { ...savedBalls(), [spaceId]: ballId });
}

// ---- FAST 2-Stage PMDCollab 4-Direction + Action Sprite Cache (Normal + Shiny!) ----

export const DATA_REL = "data/pokemon-agents";
const DATA = () => `${appHome()}/${DATA_REL}`;
const PMD = "https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite";
const ICONS_G7 = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-vii/icons";
const ICONS_DEFAULT = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const PORTRAITS = "https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/portrait";
// Bump VERSION_2D to 5:
// - 2px transparent padding around every GIF frame (eliminates GPU bilinear edge-bleed lines)
// - Frame-0 anchor bbox for Attack/Hurt/Hop/Struggle so Pokemon never teleport when acting
// - Smooth readable timing + exact durMs + one-shot loop=1 for Attack/Hurt
// - Looping 'struggle' GIF for grabbed/dangling Pokemon!
export const VERSION_2D = 5;
export const FLY_VERSION = 1; // Triggers lightweight flight-frame generation for flying Pokemon only!
const PAD = 2; // 2px pure-transparent margin around each frame prevents GPU bilinear edge-bleed lines

const FLY_DIRS = [["flyD", 0], ["flyR", 2], ["flyU", 4], ["flyL", 6]];

// Essential cuts (Stage 1: ready in ~0.8s!)
const CORE_CUTS = [
  ["walkD", "Walk", 0],
  ["walkR", "Walk", 2],
  ["walkU", "Walk", 4],
  ["walkL", "Walk", 6],
  ["idleD", "Idle", 0],
  ["idleR", "Idle", 2],
  ["idleL", "Idle", 6],
];

// Extra action cuts (Stage 2: silent background upgrade!)
const EXTRA_CUTS = [
  ["idleU",    "Idle",   4],
  ["sleep",    "Sleep",  0],
  ["attackR",  "Attack", 2],
  ["attackL",  "Attack", 6],
  ["hurt",     "Hurt",   0],
  ["struggle", "Hurt",   0],
  ["hop",      "Hop",    0],
];

export const pad4 = (id) => String(id).padStart(4, "0");
export const spriteCacheKey = (id, shiny = false) => (shiny ? `${id}:s` : String(id));
export const spriteDirName = (id, shiny = false) => (shiny ? `${pad4(id)}_shiny` : pad4(id));
export const EMOTIONS = ["Normal", "Determined", "Worried", "Happy"];
export const FACE_FOR_STATUS = { working: "Determined", blocked: "Worried", done: "Happy" };
export const portraitPath = (id, emotion, shiny = false) =>
  `${DATA_REL}/portraits/${spriteDirName(id, shiny)}/${emotion}.png`;
export const menuIconPath = (id) => `${DATA_REL}/icons/${id}.png`;

// True per-ID menu icon readiness check (supports both new per-ID map and legacy boolean for Gen 1)
export function hasMenuIcon(id) {
  const m = shared(ICONS_KEY);
  if (m && typeof m === "object") return Boolean(m[id]);
  return m === true && id >= 1 && id <= 151;
}

export function portraitFor(id, status, shiny = false) {
  const all = shared(PORTRAITS_KEY);
  const key = spriteCacheKey(id, shiny);
  const haveShiny = shiny ? all?.[key] : null;
  if (Array.isArray(haveShiny) && haveShiny.length) {
    const want = FACE_FOR_STATUS[status] ?? "Normal";
    const face = haveShiny.includes(want) ? want : haveShiny.includes("Normal") ? "Normal" : haveShiny[0];
    return { kind: "portrait", path: portraitPath(id, face, true) };
  }
  const have = all?.[id] ?? all?.[String(id)];
  if (Array.isArray(have) && have.length) {
    const want = FACE_FOR_STATUS[status] ?? "Normal";
    const face = have.includes(want) ? want : have.includes("Normal") ? "Normal" : have[0];
    return { kind: "portrait", path: portraitPath(id, face, false) };
  }
  if (hasMenuIcon(id)) return { kind: "icon", path: menuIconPath(id) };
  return null;
}

let tools = null;
export async function imageMagick() {
  if (tools !== null) return tools;
  const ok = async (cmd, args) => (await exec(cmd, args).catch(() => null))?.code === 0;
  if (await ok("magick", ["-version"])) tools = { convert: ["magick"], identify: ["magick", "identify"], mogrify: ["magick", "mogrify"] };
  else if (await ok("convert", ["-version"])) tools = { convert: ["convert"], identify: ["identify"], mogrify: ["mogrify"] };
  else tools = false;
  return tools;
}

async function im(kind, args) {
  const t = await imageMagick();
  if (!t) throw new Error("ImageMagick not found");
  const [cmd, ...pre] = t[kind];
  const r = await exec(cmd, [...pre, ...args]);
  if (r.code !== 0) throw new Error(r.stderr.trim() || `${cmd} failed`);
  return r.stdout.trim();
}

async function curlParallel(pairs) {
  if (!pairs.length) return;
  const args = ["-sfL", "--retry", "2", "--connect-timeout", "10", "--parallel", "--parallel-max", "6"];
  for (const [file, url] of pairs) args.push("-o", file, url);
  await exec("curl", args).catch(() => null);
}

function parseAnims(xml) {
  const anims = {};
  for (const m of xml.matchAll(/<Anim>([\s\S]*?)<\/Anim>/g)) {
    const body = m[1];
    const get = (tag) => body.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1];
    const name = get("Name");
    if (!name) continue;
    anims[name] = {
      name,
      copyOf: get("CopyOf") ?? null,
      fw: Number(get("FrameWidth")),
      fh: Number(get("FrameHeight")),
      durations: [...body.matchAll(/<Duration>(\d+)<\/Duration>/g)].map((d) => Number(d[1])),
    };
  }
  return anims;
}

function resolveAnim(anims, name) {
  let a = anims[name];
  for (let hops = 0; a?.copyOf && hops < 4; hops++) a = anims[a.copyOf];
  return a && a.fw > 0 && a.fh > 0 ? a : null;
}

// Cuts one animation row into a clean GIF with a 2px transparent border around every frame
// (eliminates GPU subpixel texture-edge hairline artifacts during movement!).
// For action animations (Attack/Hurt/Hop), uses readable pacing, single-play loop for Attack/Hurt,
// exact total duration (durMs), and frame-0 anchor bbox so the Pokemon stays planted at its foot pivot!
async function cutSheet(sheet, sheetDims, anim, row, scale, out, opts = {}) {
  const { isAction = false, oneShot = false } = opts;
  const [w, h] = sheetDims;
  const rows = Math.max(1, Math.floor(h / anim.fh));
  const cols = Math.max(1, Math.floor(w / anim.fw));
  const y = Math.min(row, rows - 1) * anim.fh;
  const n = Math.min(cols, anim.durations.length || cols);
  const rawDurs = (anim.durations.length ? anim.durations : [10]).slice(0, n);
  const cs = rawDurs.map((d) => {
    const base = Math.round((d * 100) / 60);
    // PMDCollab Attack/Hurt frames are often 1-2 ticks at 60fps (16-33ms), which looks like frantic twitching
    // in a desktop widget; gently pace action frames to >=6cs (60ms) so every strike reads cleanly!
    return isAction ? Math.max(6, Math.round(base * 1.45)) : Math.max(4, base);
  });
  const durMs = cs.reduce((acc, c) => acc + c * 10, 0);
  const delay = cs.slice(0, -1).map((c, i) => `t==${i}?${c}:`).join("") + cs[cs.length - 1];
  const fw = anim.fw * scale + PAD * 2;
  const fh = anim.fh * scale + PAD * 2;

  await im("convert", [
    sheet,
    "-alpha", "set",
    "-crop", `${n * anim.fw}x${anim.fh}+0+${y}`, "+repage",
    "-crop", `${anim.fw}x${anim.fh}`, "+repage",
    "-scale", `${scale * 100}%`,
    "-bordercolor", "none", "-border", `${PAD}x${PAD}`, "+repage",
    "-set", "delay", `%[fx:${delay}]`,
    "-set", "dispose", "Background",
    "-loop", oneShot ? "1" : "0",
    out,
  ]);
  // For Attack/Hurt/Hop, measure frame 0 (standing/resting anchor) so lunges & jumps don't shift the base pivot!
  const boxArgs = isAction
    ? [`${out}[0]`, "-format", "%@", "info:"]
    : [out, "-coalesce", "-background", "none", "-flatten", "-format", "%@", "info:"];
  const box = await im("convert", boxArgs).catch(() => "");
  const m = box.match(/(\d+)x(\d+)\+(-?\d+)\+(-?\d+)/);
  const bb = m ? { x: +m[3], y: +m[4], w: +m[1], h: +m[2] } : { x: PAD, y: PAD, w: fw - PAD * 2, h: fh - PAD * 2 };
  return { w: fw, h: fh, box: bb, durMs };
}

// Cuts a real 2-frame mid-air wing-flapping flight GIF from a bird/dragon's Hop sheet
// (extracting downstroke & upstroke frames, centering vertically so there is zero jump!).
async function cutFlyHop(sheet, sheetDims, anim, row, scale, out, frameIndices) {
  const [w, h] = sheetDims;
  const rows = Math.max(1, Math.floor(h / anim.fh));
  const cols = Math.max(1, Math.floor(w / anim.fw));
  const y = Math.min(row, rows - 1) * anim.fh;
  const n = Math.min(cols, anim.durations.length || cols);
  const idxA = Math.min(n - 1, frameIndices[0]);
  const idxB = Math.min(n - 1, frameIndices[1]);
  const extW = Math.max(anim.fw, 36);
  const extH = Math.max(Math.min(anim.fh, 48), 36);
  const fw = extW * scale + PAD * 2;
  const fh = extH * scale + PAD * 2;

  await im("convert", [
    sheet,
    "-alpha", "set",
    "-crop", `${n * anim.fw}x${anim.fh}+0+${y}`, "+repage",
    "-crop", `${anim.fw}x${anim.fh}`, "+repage",
    "(", "-clone", String(idxA), "-trim", "+repage", ")",
    "(", "-clone", String(idxB), "-trim", "+repage", ")",
    "-delete", "0--3",
    "-gravity", "center", "-background", "none", "-extent", `${extW}x${extH}`,
    "-scale", `${scale * 100}%`,
    "-bordercolor", "none", "-border", `${PAD}x${PAD}`, "+repage",
    "-set", "delay", "14",
    "-set", "dispose", "Background",
    "-loop", "0",
    out,
  ]);
  const box = await im("convert", [out, "-coalesce", "-background", "none", "-flatten", "-format", "%@", "info:"]);
  const m = box.match(/(\d+)x(\d+)\+(-?\d+)\+(-?\d+)/);
  const bb = m ? { x: +m[3], y: +m[4], w: +m[1], h: +m[2] } : { x: PAD, y: PAD, w: fw - PAD * 2, h: fh - PAD * 2 };
  return { w: fw, h: fh, box: bb };
}

export async function loadSpriteFast(id, { shiny = false } = {}) {
  const dirName = spriteDirName(id, shiny);
  const dir = `${DATA()}/sprites/${dirName}`;
  const p = `${dir}/meta2d.json`;
  if (await fs.exists(p).catch(() => false)) {
    try {
      const meta = JSON.parse(await fs.readFile(p, "utf8"));
      if (meta.version === VERSION_2D && meta.walkR) {
        const needsFly = FLYER_IDS.has(id) && meta.flyVer !== FLY_VERSION;
        return needsFly ? { ...meta, complete: false } : meta;
      }
    } catch {}
  }
  return null;
}

// 2-Stage loader: calls onStage(meta) as soon as core Walk/Idle sprites are ready (~0.8s!),
// then finishes Attack/Hurt/Hop/Sleep (+ real 4-direction wing-flapping Fly sprites for flyers!) in parallel.
// Supports native SpriteCollab Shiny sprites (0000/0001) with automatic fallback to normal if a species lacks shiny art!
export async function loadSprite2D(id, onStage, { shiny = false } = {}) {
  const cached = await loadSpriteFast(id, { shiny });
  if (cached && cached.complete) return cached;

  let useShiny = Boolean(shiny);
  let dirName = spriteDirName(id, useShiny);
  let dir = `${DATA()}/sprites/${dirName}`;
  let base = useShiny ? `${PMD}/${pad4(id)}/0000/0001` : `${PMD}/${pad4(id)}`;
  await fs.mkdir(dir, { recursive: true });

  let xmlPath = `${dir}/AnimData.xml`;
  if (!(await fs.exists(xmlPath).catch(() => false))) {
    await curlParallel([[xmlPath, `${base}/AnimData.xml`]]);
  }
  // If shiny AnimData.xml does not exist in SpriteCollab (404), seamlessly fall back to normal sprite!
  if (useShiny && !(await fs.exists(xmlPath).catch(() => false))) {
    return loadSprite2D(id, onStage, { shiny: false });
  }

  const metaFile = `${dir}/meta2d.json`;
  const anims = parseAnims(await fs.readFile(xmlPath, "utf8"));
  const walk = resolveAnim(anims, "Walk");
  if (!walk) {
    if (useShiny) return loadSprite2D(id, onStage, { shiny: false });
    throw new Error("no walking animation");
  }
  const idle = resolveAnim(anims, "Idle") ?? walk;
  const sleep = resolveAnim(anims, "Sleep") ?? idle;
  const attack = resolveAnim(anims, "Attack") ?? resolveAnim(anims, "Strike") ?? resolveAnim(anims, "Shoot") ?? walk;
  const hurt = resolveAnim(anims, "Hurt") ?? idle;
  const hop = resolveAnim(anims, "Hop") ?? idle;
  const hover = resolveAnim(anims, "Hover");
  const charge = resolveAnim(anims, "Charge");
  const pick = { Walk: walk, Idle: idle, Sleep: sleep, Attack: attack, Hurt: hurt, Hop: hop };

  const scale = walk.fh > 64 ? 1 : 2;
  const dimsCache = new Map();
  const getDims = async (sheet) => {
    if (!dimsCache.has(sheet)) {
      const d = (await im("identify", ["-format", "%w %h", sheet])).split(" ").map(Number);
      dimsCache.set(sheet, d);
    }
    return dimsCache.get(sheet);
  };

  let meta;
  if (cached && cached.walkR && cached.attackR) {
    meta = { ...cached };
  } else {
    // ---- Stage 1: Core Walk + Idle in parallel ----
    const coreSheets = [...new Set([walk.name, idle.name])];
    const missingCore = [];
    for (const n of coreSheets) {
      const f = `${dir}/${n}.png`;
      if (!(await fs.exists(f).catch(() => false))) missingCore.push([f, `${base}/${n}-Anim.png`]);
    }
    if (missingCore.length) await curlParallel(missingCore);
    if (useShiny && !(await fs.exists(`${dir}/${walk.name}.png`).catch(() => false))) {
      return loadSprite2D(id, onStage, { shiny: false });
    }

    meta = { version: VERSION_2D, id, shiny: useShiny, scale, complete: false };
    await Promise.all(
      CORE_CUTS.map(async ([key, which, row]) => {
        let anim = pick[which];
        let sheet = `${dir}/${anim.name}.png`;
        if (!(await fs.exists(sheet).catch(() => false))) { anim = walk; sheet = `${dir}/${walk.name}.png`; }
        const dims = await getDims(sheet);
        const file = `v4_${key}.gif`;
        const size = await cutSheet(sheet, dims, anim, row, scale, `${dir}/${file}`);
        meta[key] = { path: `${DATA_REL}/sprites/${dirName}/${file}`, ...size };
      }),
    );
    await fs.writeFile(metaFile, JSON.stringify(meta));
    if (onStage) onStage({ ...meta });

    // ---- Stage 2: Extra Attack / Hurt / Hop / Sleep in parallel ----
    const extraSheets = [...new Set([sleep.name, attack.name, hurt.name, hop.name])];
    const missingExtra = [];
    for (const n of extraSheets) {
      const f = `${dir}/${n}.png`;
      if (!(await fs.exists(f).catch(() => false))) missingExtra.push([f, `${base}/${n}-Anim.png`]);
    }
    if (missingExtra.length) await curlParallel(missingExtra);

    await Promise.all(
      EXTRA_CUTS.map(async ([key, which, row]) => {
        let anim = pick[which];
        let sheet = `${dir}/${anim.name}.png`;
        if (!(await fs.exists(sheet).catch(() => false))) {
          anim = which === "Sleep" || which === "Hurt" || which === "Hop" ? idle : walk;
          sheet = `${dir}/${anim.name}.png`;
        }
        if (!(await fs.exists(sheet).catch(() => false))) { anim = walk; sheet = `${dir}/${walk.name}.png`; }
        const dims = await getDims(sheet);
        const file = `v5_${key}.gif`;
        const isStruggle = key === "struggle";
        const isAction = which === "Attack" || which === "Hurt" || which === "Hop";
        const oneShot = !isStruggle && (which === "Attack" || which === "Hurt");
        const size = await cutSheet(sheet, dims, anim, row, scale, `${dir}/${file}`, { isAction, oneShot });
        meta[key] = { path: `${DATA_REL}/sprites/${dirName}/${file}`, ...size };
      }),
    );
  }

  // ---- Stage 3 (Flyers only): Real 4-direction wing-flapping flight sprites! ----
  if (FLYER_IDS.has(id) && meta.flyVer !== FLY_VERSION) {
    if (hover) {
      const f = `${dir}/${hover.name}.png`;
      if (!(await fs.exists(f).catch(() => false))) await curlParallel([[f, `${base}/${hover.name}-Anim.png`]]);
      if (await fs.exists(f).catch(() => false)) {
        const dims = await getDims(f);
        await Promise.all(
          FLY_DIRS.map(async ([key, row]) => {
            const file = `v3_${key}.gif`;
            const size = await cutSheet(f, dims, hover, row, scale, `${dir}/${file}`);
            meta[key] = { path: `${DATA_REL}/sprites/${dirName}/${file}`, ...size };
          }),
        );
      }
    } else if (ALWAYS_AIR_IDS.has(id)) {
      meta.flyD = meta.walkD;
      meta.flyR = meta.walkR;
      meta.flyU = meta.walkU;
      meta.flyL = meta.walkL;
    } else {
      const hopSheet = `${dir}/${hop.name}.png`;
      if (!(await fs.exists(hopSheet).catch(() => false))) await curlParallel([[hopSheet, `${base}/${hop.name}-Anim.png`]]);
      const hopCols = (await fs.exists(hopSheet).catch(() => false)) ? Math.floor((await getDims(hopSheet))[0] / Math.max(1, hop.fw)) : 0;
      if (hopCols >= 7) {
        const dims = await getDims(hopSheet);
        const pair = DRAGON_FLY_IDS.has(id) ? [5, 7] : [3, 6];
        await Promise.all(
          FLY_DIRS.map(async ([key, row]) => {
            const file = `v3_${key}.gif`;
            const size = await cutFlyHop(hopSheet, dims, hop, row, scale, `${dir}/${file}`, pair);
            meta[key] = { path: `${DATA_REL}/sprites/${dirName}/${file}`, ...size };
          }),
        );
      } else if (charge) {
        const cf = `${dir}/${charge.name}.png`;
        if (!(await fs.exists(cf).catch(() => false))) await curlParallel([[cf, `${base}/${charge.name}-Anim.png`]]);
        if (await fs.exists(cf).catch(() => false)) {
          const dims = await getDims(cf);
          await Promise.all(
            FLY_DIRS.map(async ([key, row]) => {
              const file = `v3_${key}.gif`;
              const size = await cutSheet(cf, dims, charge, row, scale, `${dir}/${file}`);
              meta[key] = { path: `${DATA_REL}/sprites/${dirName}/${file}`, ...size };
            }),
          );
        }
      }
    }
    meta.flyVer = FLY_VERSION;
  }

  meta.complete = true;
  await fs.writeFile(metaFile, JSON.stringify(meta));
  return meta;
}

export async function ensurePortraits(id, { shiny = false } = {}) {
  const dirName = spriteDirName(id, shiny);
  const dir = `${DATA()}/portraits/${dirName}`;
  const haveFile = `${dir}/have.json`;
  if (await fs.exists(haveFile).catch(() => false)) {
    try { return JSON.parse(await fs.readFile(haveFile, "utf8")); } catch {}
  }
  await fs.mkdir(dir, { recursive: true });
  const baseUrl = shiny ? `${PORTRAITS}/${pad4(id)}/0000/0001` : `${PORTRAITS}/${pad4(id)}`;
  const have = [];
  await Promise.all(
    EMOTIONS.map(async (e) => {
      const r = await exec("curl", ["-sfL", "--retry", "2", "--connect-timeout", "10", "-o", `${dir}/${e}.png`, `${baseUrl}/${e}.png`]).catch(() => null);
      if (r?.code === 0) have.push(e);
    }),
  );
  if (!have.length) {
    if (shiny) return ensurePortraits(id, { shiny: false });
    throw new Error("no portraits");
  }
  await fs.writeFile(haveFile, JSON.stringify(have));
  return have;
}

// ---- TRUE ON-DEMAND MENU ICON LOADER (NEVER bulk-downloads the entire Pokedex!) ----
// Only fetches & caches the exact small list of IDs currently needed (live agents or current Picker page).
const iconInFlight = new Map();

function markIconsReady(readyIds) {
  if (!readyIds.length) return;
  const cur = shared(ICONS_KEY);
  const base = cur && typeof cur === "object" ? { ...cur } : {};
  let changed = false;
  for (const id of readyIds) {
    if (!base[id]) { base[id] = true; changed = true; }
  }
  if (changed) setShared(ICONS_KEY, base);
}

export async function ensureIconsFor(ids) {
  const unique = [...new Set((ids ?? []).filter((id) => hasDexId(id)))];
  if (!unique.length) return [];

  const dir = `${DATA()}/icons`;
  await fs.mkdir(dir, { recursive: true });

  const alreadyOnDisk = [];
  const need = [];
  const waitPromises = [];

  for (const id of unique) {
    if (iconInFlight.has(id)) {
      waitPromises.push(iconInFlight.get(id));
      continue;
    }
    const file = `${dir}/${id}.png`;
    if (await fs.exists(file).catch(() => false)) {
      alreadyOnDisk.push(id);
    } else {
      need.push(id);
    }
  }
  if (alreadyOnDisk.length) markIconsReady(alreadyOnDisk);

  if (need.length) {
    const batchPromise = (async () => {
      const g7Pairs = [];
      const hiPairs = [];
      for (const id of need) {
        const file = `${dir}/${id}.png`;
        if (id <= 807) g7Pairs.push([file, `${ICONS_G7}/${id}.png`, id]);
        else hiPairs.push([file, `${ICONS_DEFAULT}/${id}.png`, id]);
      }

      const allPairs = [...g7Pairs, ...hiPairs];
      const args = ["-sfL", "--retry", "2", "--connect-timeout", "10", "--parallel", "--parallel-max", "10"];
      for (const [file, url] of allPairs) args.push("-o", file, url);
      await exec("curl", args).catch(() => null);

      const hasIm = Boolean(await imageMagick());
      const doneIds = [];

      // Upscale Gen 1-7 crisp 40x30 icons 200% -> 80x60
      const okG7Files = [];
      for (const [file, , id] of g7Pairs) {
        if (await fs.exists(file).catch(() => false)) { okG7Files.push(file); doneIds.push(id); }
      }
      if (hasIm && okG7Files.length) {
        await im("mogrify", ["-scale", "200%", ...okG7Files]).catch(() => null);
      }

      // Normalize Gen 8-9 96x96 sprites into trimmed 80x60 4:3 icons so aspect ratio matches Gen 1-7!
      for (const [file, , id] of hiPairs) {
        if (await fs.exists(file).catch(() => false)) {
          if (hasIm) {
            await im("convert", [
              file, "-trim", "+repage",
              "-resize", "72x54>",
              "-gravity", "center", "-background", "none", "-extent", "80x60",
              file,
            ]).catch(() => null);
          }
          doneIds.push(id);
        }
      }

      if (doneIds.length) markIconsReady(doneIds);
      return doneIds;
    })().finally(() => {
      for (const id of need) iconInFlight.delete(id);
    });

    for (const id of need) iconInFlight.set(id, batchPromise);
    waitPromises.push(batchPromise);
  }

  if (waitPromises.length) await Promise.all(waitPromises);
  return unique.filter((id) => hasMenuIcon(id));
}

export const CRY_SETS = [
  { id: "letsgo", label: "Let's Go" },
  { id: "showdown", label: "Showdown" },
];
export const crySetOf = (v) => (CRY_SETS.some((s) => s.id === v) ? v : "letsgo");
const CRIES = "https://play.pokemonshowdown.com/audio/cries";
const LATEST = "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest";
const CRY_OVERRIDES = { 25: "pikachu-starter", 133: "eevee-starter" };
const cryFile = (id, set) => (CRY_OVERRIDES[id] ? `${id}-${CRY_OVERRIDES[id]}` : set === "letsgo" ? `letsgo-${id}` : String(id));
const cryName = (name) => name.toLowerCase().replace("♀", "f").replace("♂", "m").replace(/[^a-z0-9]/g, "");
const SOFT_FILTER = "aresample=44100,asetrate=46746,aresample=44100,highpass=f=150,lowpass=f=3200," +
  "acompressor=threshold=0.125:ratio=4:attack=5:release=150,loudnorm=I=-21:TP=-6:LRA=6,aresample=44100," +
  "afade=t=in:d=0.05,areverse,afade=t=in:d=0.3,areverse";

async function filteredAudio(from, to, filter) {
  const tmp = `${to}.part.mp3`;
  const r = await exec("ffmpeg", ["-y", "-loglevel", "error", "-i", from, "-af", filter, "-codec:a", "libmp3lame", "-q:a", "4", tmp]).catch(() => null);
  if (!r || r.code !== 0) return false;
  return (await exec("mv", ["-f", tmp, to])).code === 0;
}

export async function ensureCry(id, set = "letsgo") {
  set = crySetOf(set);
  const dir = `${DATA()}/cries`;
  const base = cryFile(id, set);
  const softRel = `${DATA_REL}/cries/${base}-soft1.mp3`;
  const softOut = `${dir}/${base}-soft1.mp3`;
  if (await fs.exists(softOut).catch(() => false)) return softRel;
  const rawOut = `${dir}/${base}.mp3`;
  const rawRel = `${DATA_REL}/cries/${base}.mp3`;
  if (!(await fs.exists(rawOut).catch(() => false))) {
    await fs.mkdir(dir, { recursive: true });
    const tmp = `${dir}/${base}.part`;
    if (set === "letsgo" && !CRY_OVERRIDES[id]) {
      const ogg = `${dir}/${base}.part.ogg`;
      await curlParallel([[ogg, `${LATEST}/${id}.ogg`]]);
      const r = await exec("ffmpeg", ["-y", "-loglevel", "error", "-i", ogg, "-ar", "44100", "-codec:a", "libmp3lame", "-q:a", "4", "-f", "mp3", tmp]).catch(() => null);
      await exec("rm", ["-f", ogg]);
      if (!r || r.code !== 0) throw new Error("ffmpeg cry convert failed");
    } else {
      await curlParallel([[tmp, `${CRIES}/${CRY_OVERRIDES[id] ?? cryName(nameEnOf(id))}.mp3`]]);
    }
    await exec("mv", ["-f", tmp, rawOut]);
  }
  return (await filteredAudio(rawOut, softOut, SOFT_FILTER)) ? softRel : rawRel;
}

export async function ensureChirp(id, set = "letsgo") {
  set = crySetOf(set);
  const dir = `${DATA()}/cries`;
  const base = cryFile(id, set);
  const out = `${dir}/${base}-soft1-done.mp3`;
  const rel = `${DATA_REL}/cries/${base}-soft1-done.mp3`;
  if (await fs.exists(out).catch(() => false)) return rel;
  const cry = await ensureCry(id, set);
  const ok = await filteredAudio(`${appHome()}/${cry}`, out, "aresample=44100,asetrate=57330,aresample=44100,volume=0.7,afade=t=out:st=0.45:d=0.35");
  return ok ? rel : cry;
}

export function matchPokedex(query, genTab = "all") {
  const f = (query ?? "").trim().toLowerCase().replace(/^#/, "");
  const out = [];
  for (const id of DEX_IDS) {
    const entry = DEX_MAP.get(id);
    if (!f && genTab && genTab !== "all" && entry.gen !== genTab) continue;
    const en = entry.name.toLowerCase();
    const zh = (entry.zh || "").toLowerCase();
    const ja = (entry.ja || "").toLowerCase();
    const ko = (entry.ko || "").toLowerCase();
    if (!f || en.includes(f) || zh.includes(f) || ja.includes(f) || ko.includes(f) || String(id) === f.replace(/^0+/, "") || String(id).padStart(3, "0").startsWith(f)) {
      out.push(id);
    }
  }
  return out;
}
