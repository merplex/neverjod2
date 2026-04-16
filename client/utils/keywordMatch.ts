import { getTransactionsList } from "./transactionData";
import { lk } from "./ledgerStorage";

export interface MatchResult {
  categoryId?: string;
  accountId?: string;
  amount?: number;
  description: string;
}

// Default categories — keywords are managed by the user via the Categories management page
const defaultCategoriesWithKeywords: Record<string, { name: string; keywords: string[] }> = {
  food:      { name: "Food-sample",      keywords: ["อาหาร"] },
  transport: { name: "Transport-sample", keywords: ["ค่ารถ"] },
  shopping:  { name: "Shopping-sample",  keywords: ["ผลาญเงิน"] },
  house:     { name: "House-sample",     keywords: ["ของใช้ในบ้าน"] },
  travel:    { name: "Travel-sample",    keywords: ["เที่ยว"] },
  salary:    { name: "Salary-sample",    keywords: ["เงินเดือน"] },
};

// Fallback keywords for known built-in category IDs when localStorage has empty keywords
const builtinCategoryKeywords: Record<string, string[]> = {
  food:      ["อาหาร"],
  transport: ["ค่ารถ"],
  shopping:  ["ผลาญเงิน"],
  house:     ["ของใช้ในบ้าน"],
  travel:    ["เที่ยว"],
  salary:    ["เงินเดือน"],
};

// Default accounts — keywords are managed by the user via the Accounts management page
const defaultAccountsWithKeywords: Record<string, { name: string; keywords: string[] }> = {
  kbank: { name: "K-Bank-sample", keywords: ["กสิกร", "kbank"] },
  scb: { name: "SCB-sample", keywords: ["ไทยพาณิชย์", "scb"] },
  bbl: { name: "Bangkok Bank-sample", keywords: ["แบงค์กรุงเทพ", "กรุงเทพ", "bbl"] },
};

// Fallback keywords for known built-in account IDs when localStorage has empty keywords
const builtinAccountKeywords: Record<string, string[]> = {
  kbank: ["กสิกร", "kbank"],
  scb: ["ไทยพาณิชย์", "scb"],
  bbl: ["แบงค์กรุงเทพ", "กรุงเทพ", "bbl"],
};

// Normalize a string to NFC and lowercase — handles iOS vs Android speech recognition differences
function norm(s: string): string {
  return s.normalize("NFC").toLowerCase();
}

// Always include the entity's name as a keyword alongside user-defined keywords
function buildKeywordMap(
  source: Record<string, { name: string; keywords: string[] }>
): Record<string, { name: string; keywords: string[] }> {
  const result: Record<string, { name: string; keywords: string[] }> = {};
  for (const [id, { name, keywords }] of Object.entries(source)) {
    result[id] = { name, keywords: [...keywords, norm(name)] };
  }
  return result;
}

const FREE_CAT_LIMIT = 6;
const FREE_ACC_LIMIT = 3;

// Get categories from localStorage or use defaults, filtering over-limit items for free tier
function getCategoriesWithKeywords(): Record<string, { name: string; keywords: string[] }> {
  try {
    const stored = localStorage.getItem(lk("app_categories"));
    if (stored) {
      const isPremium = localStorage.getItem("app_premium") === "true";
      const categories = JSON.parse(stored);
      const reorderable = categories.filter((c: any) => c.id !== "nocat");
      const active = isPremium ? reorderable : reorderable.slice(0, FREE_CAT_LIMIT);
      const raw: Record<string, { name: string; keywords: string[] }> = {};
      for (const cat of active) {
        const stored = cat.keywords && cat.keywords.length > 0 ? cat.keywords : [];
        const fallback = stored.length === 0 ? (builtinCategoryKeywords[cat.id] || []) : [];
        raw[cat.id] = { name: cat.name, keywords: [...stored, ...fallback] };
      }
      return buildKeywordMap(raw);
    }
  } catch (e) {
    console.log("Could not load categories from localStorage");
  }
  return buildKeywordMap(defaultCategoriesWithKeywords);
}

// Get accounts from localStorage or use defaults, filtering over-limit items for free tier
function getAccountsWithKeywords(): Record<string, { name: string; keywords: string[] }> {
  try {
    const stored = localStorage.getItem(lk("app_accounts"));
    if (stored) {
      const isPremium = localStorage.getItem("app_premium") === "true";
      const accounts = JSON.parse(stored);
      const reorderable = accounts.filter((a: any) => a.id !== "account_deleted");
      const active = isPremium ? reorderable : reorderable.slice(0, FREE_ACC_LIMIT);
      const raw: Record<string, { name: string; keywords: string[] }> = {};
      for (const acc of active) {
        const stored = acc.keywords && acc.keywords.length > 0 ? acc.keywords : [];
        const fallback = stored.length === 0 ? (builtinAccountKeywords[acc.id] || []) : [];
        raw[acc.id] = { name: acc.name, keywords: [...stored, ...fallback] };
      }
      return buildKeywordMap(raw);
    }
  } catch (e) {
    console.log("Could not load accounts from localStorage");
  }
  return buildKeywordMap(defaultAccountsWithKeywords);
}

// Fix encoding variants and phonetic aliases before number parsing.
// Only risky aliases (common Thai words like ร้าน, แสง) are gated behind a digit/digit-word prefix
// so they don't corrupt non-number text (e.g. "ร้านอาหาร").
function normalizeThaiNumber(text: string): string {
  // Digit or Thai digit word — used as a prefix guard for ambiguous unit aliases
  const dPre = '((?:หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|เอ็ด|ยี่|\\d+(?:\\.\\d+)?))';
  let t = text.normalize('NFC');

  // Fix sara-ae encoding: เเ (two U+0E40) mistakenly used instead of แ (U+0E41)
  t = t.replace(/เเ/g, 'แ');

  // หนึ่ง spoken quickly/unclearly — safe globally (these forms have no other meaning)
  t = t.replace(/นึ่ง|นึง|อึ่ง|หนืง/g, 'หนึ่ง');

  // เอ็ด aliases (units digit = 1, e.g. สิบเอ็ด = 11)
  t = t.replace(/เอด|เอะ/g, 'เอ็ด');

  // ยี่ aliases (tens digit = 2, e.g. ยี่สิบ = 20)
  t = t.replace(/ยี้/g, 'ยี่');
  t = t.replace(/ยี(?!่)/g, 'ยี่');

  // ล้าน aliases
  t = t.replace(/laan/gi, 'ล้าน');
  t = t.replace(/\blan\b/gi, 'ล้าน');
  // ร้าน/ร้า/ลาน/ราน are also common Thai words — only replace after a digit/digit-word
  t = t.replace(new RegExp(`${dPre}\\s*(?:ร้าน|ร้า|ลาน|ราน)`, 'g'), '$1ล้าน');
  t = t.replace(new RegExp(`${dPre}\\s*ล้า(?!น)`, 'g'), '$1ล้าน');

  // แสน aliases — also gated (แสง = light, เสน = sinew, etc.)
  t = t.replace(new RegExp(`${dPre}\\s*(?:แหลน|แสง|เสน|แซน)`, 'g'), '$1แสน');
  t = t.replace(new RegExp(`${dPre}\\s*แส(?!น)`, 'g'), '$1แสน');
  // English phonetic aliases for แสน: ASR sometimes outputs "sand"/"saen" for /sɛ̌ːn/
  t = t.replace(new RegExp(`${dPre}\\s*(?:sand|saen)(?![a-zA-Z])`, 'gi'), '$1แสน');

  // หมื่น aliases — none have common other meanings, safe globally
  t = t.replace(/หมึ่ง|หมึง|หมึน|หมืน|มื่น|หมุ่น|หมุน/g, 'หมื่น');
  // หมือน = "like/similar" — gated
  t = t.replace(new RegExp(`${dPre}\\s*หมือน`, 'g'), '$1หมื่น');

  // พัน aliases — ฝัน (dream), ผัน (change) are real words → gated; พัณ safe globally
  t = t.replace(/พัณ/g, 'พัน');
  t = t.replace(new RegExp(`${dPre}\\s*(?:ฝัน|ผัน|พั(?!น))`, 'g'), '$1พัน');

  // ร้อย aliases — รอย (mark/scar) is a real word → gated
  t = t.replace(new RegExp(`${dPre}\\s*(?:รอย|ร้อ(?!ย)|ร้วย)`, 'g'), '$1ร้อย');

  // สิบ aliases — ซิบ/ซิป/ศิบ not common words, safe globally
  t = t.replace(/ซิบ|ซิป|ศิบ/g, 'สิบ');
  // สิ (truncated) — gated to avoid eating real words
  t = t.replace(new RegExp(`${dPre}\\s*สิ(?!บ|[่้๊๋็ิ])`, 'g'), '$1สิบ');

  return t;
}

export function extractNumberFromText(text: string): number | undefined {
  // Normalize encoding variants and phonetic aliases first
  const t = normalizeThaiNumber(text);

  // If text contains Thai unit words, route to Thai parser first —
  // direct numeric match would grab a stray digit (e.g. "2" from "2ล้าน") and return wrong value.
  // parseThaiNumberText already handles mixed digit+Thai like "2ล้าน5พัน" → 2,005,000.
  const thaiUnits = ['ล้าน', 'แสน', 'หมื่น', 'พัน', 'ร้อย', 'สิบ'];
  if (thaiUnits.some(u => t.includes(u))) {
    const thaiResult = parseThaiNumberText(t);
    if (thaiResult !== undefined) return thaiResult;
  }

  // Direct numeric — comma-thousands pattern first (+ not * so "300015" stays one token),
  // then plain integers. If all matched values are strictly descending, sum them:
  // speech recognition often splits "แปดหมื่นสามสิบ" into ["80000", "30"] → 80,030.
  const numberMatches = t.match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g);
  if (numberMatches && numberMatches.length > 0) {
    const values = numberMatches.map(n => parseFloat(n.replace(/,/g, "")));
    // Only sum descending values when the largest is ≥ 1000 (ASR splits large numbers like "80000 30").
    // Avoid summing small digits like "44 4" = 48 which came from ASR collapsing a large number.
    const allDescending = values.length > 1 && values[0] >= 1000 && values.every((v, i) => i === 0 || v < values[i - 1]);
    if (allDescending) return values.reduce((s, v) => s + v, 0);
    return Math.max(...values);
  }

  // Pure Thai digit words fallback (e.g. "สามร้อยสิบห้า" with no prior unit match)
  const thaiResult = parseThaiNumberText(t);
  if (thaiResult !== undefined) return thaiResult;

  // English word numbers
  const englishWordNumbers: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    hundred: 100, thousand: 1000, million: 1000000,
  };

  const lowerText = t.toLowerCase();
  let result = 0;
  let current = 0;

  for (const word of lowerText.split(/\s+/)) {
    const cleanWord = word.replace(/[^\w]/g, '');
    const num = englishWordNumbers[cleanWord];
    if (num !== undefined) {
      if (num >= 1000) { result += current * num; current = 0; }
      else if (num === 100) { current *= num; }
      else { current += num; }
    }
  }

  const total = result + current;
  if (total > 0) return total;

  // Chinese number words fallback
  const chineseResult = parseChineseNumberText(t);
  if (chineseResult !== undefined) return chineseResult;

  // Japanese number words (いち、じゅう、ひゃく、せん、まん)
  const japaneseResult = parseJapaneseNumberText(t);
  if (japaneseResult !== undefined) return japaneseResult;

  // Korean number words (일, 이, 십, 백, 천, 만)
  const koreanResult = parseKoreanNumberText(t);
  if (koreanResult !== undefined) return koreanResult;

  // French number words (un, deux, cent, mille, million)
  const frenchResult = parseFrenchNumberText(t);
  if (frenchResult !== undefined) return frenchResult;

  // German number words (eins, zwei, hundert, tausend)
  const germanResult = parseGermanNumberText(t);
  if (germanResult !== undefined) return germanResult;

  // Spanish number words (uno, dos, cien, mil, millón)
  const spanishResult = parseSpanishNumberText(t);
  if (spanishResult !== undefined) return spanishResult;

  // Portuguese number words (um, dois, cem, mil, milhão)
  const portugueseResult = parsePortugueseNumberText(t);
  if (portugueseResult !== undefined) return portugueseResult;

  // Vietnamese number words (một, hai, mười, trăm, nghìn, triệu)
  const vietnameseResult = parseVietnameseNumberText(t);
  if (vietnameseResult !== undefined) return vietnameseResult;

  // Malay number words (satu, dua, sepuluh, ratus, ribu, juta)
  const malayResult = parseMalayNumberText(t);
  if (malayResult !== undefined) return malayResult;

  return undefined;
}

function parseChineseNumberText(text: string): number | undefined {
  const digits: Record<string, number> = {
    '零':0,'〇':0,'一':1,'二':2,'三':3,'四':4,'五':5,
    '六':6,'七':7,'八':8,'九':9,'两':2,'俩':2,
  };
  const units: Record<string, number> = {
    '十':10,'拾':10,'百':100,'佰':100,
    '千':1000,'仟':1000,'万':10000,'萬':10000,
    '亿':100000000,'億':100000000,
  };
  // Must contain at least one Chinese digit or unit
  const allKeys = [...Object.keys(digits), ...Object.keys(units)];
  if (!allKeys.some(k => text.includes(k))) return undefined;

  // Replace Arabic digits mixed in (e.g. "5千" → treat 5 as digit coefficient)
  // Tokenise into [value, isUnit] pairs
  let i = 0;
  const tokens: Array<{ v: number; isUnit: boolean }> = [];
  while (i < text.length) {
    const ch = text[i];
    if (digits[ch] !== undefined) { tokens.push({ v: digits[ch], isUnit: false }); i++; continue; }
    if (units[ch] !== undefined) { tokens.push({ v: units[ch], isUnit: true });  i++; continue; }
    // Arabic numeral run
    let numStr = '';
    while (i < text.length && /\d/.test(text[i])) { numStr += text[i++]; }
    if (numStr) { tokens.push({ v: parseInt(numStr, 10), isUnit: false }); continue; }
    i++;
  }
  if (tokens.length === 0) return undefined;

  // Accumulate with 万/亿 as group boundaries
  let result = 0;
  let section = 0; // value within current 万/亿 group
  let cur = 0;     // pending digit coefficient

  for (const tok of tokens) {
    if (!tok.isUnit) {
      cur = tok.v;
    } else {
      const u = tok.v;
      if (u >= 100000000) {          // 亿
        section += cur || 1;
        result += section * u;
        section = 0; cur = 0;
      } else if (u === 10000) {      // 万
        section += cur || 1;
        result += section * u;
        section = 0; cur = 0;
      } else if (u === 10 && cur === 0 && section === 0 && result === 0) {
        // Leading 十 (e.g. "十五" = 15, not 0*10+5)
        section += u;
        cur = 0;
      } else {
        section += (cur || 1) * u;
        cur = 0;
      }
    }
  }
  section += cur;
  result += section;
  return result > 0 ? result : undefined;
}

// ── Japanese number parser (いち、じゅう、ひゃく、せん、まん、おく) ─────────────
function parseJapaneseNumberText(text: string): number | undefined {
  const digits: Record<string, number> = {
    'ぜろ':0,'れい':0,'いち':1,'に':2,'さん':3,'し':4,'よん':4,
    'ご':5,'ろく':6,'なな':7,'しち':7,'はち':8,'きゅう':9,'く':9,
  };
  const units: [string, number][] = [
    ['おく', 100000000], // 億
    ['まん', 10000],     // 万
    ['ぜん', 1000], ['せん', 1000], // 千
    ['びゃく', 100], ['ぴゃく', 100], ['ひゃく', 100], // 百
    ['じゅう', 10], ['じゅっ', 10], // 十
  ];
  // Also support kanji units (same as Chinese but with Japanese reading context)
  const kanjiDigits: Record<string, number> = {
    '零':0,'一':1,'二':2,'三':3,'四':4,'五':5,
    '六':6,'七':7,'八':8,'九':9,
  };
  const kanjiUnits: [string, number][] = [
    ['億', 100000000], ['万', 10000], ['千', 1000], ['百', 100], ['十', 10],
  ];

  // Check if text contains any Japanese number words
  const allDigitKeys = Object.keys(digits);
  const allUnitWords = units.map(u => u[0]);
  const hasJapanese = [...allDigitKeys, ...allUnitWords].some(k => text.includes(k));
  const hasKanji = [...Object.keys(kanjiDigits), ...kanjiUnits.map(u => u[0])].some(k => text.includes(k));
  if (!hasJapanese && !hasKanji) return undefined;
  // If kanji only, let Chinese parser handle it
  if (hasKanji && !hasJapanese) return undefined;

  // Tokenize: longest match first
  const sortedDigits = allDigitKeys.sort((a, b) => b.length - a.length);
  const sortedUnits = [...units].sort((a, b) => b[0].length - a[0].length);
  const tokens: Array<{ v: number; isUnit: boolean }> = [];
  let i = 0;
  while (i < text.length) {
    let matched = false;
    for (const [w, val] of sortedUnits) {
      if (text.startsWith(w, i)) { tokens.push({ v: val, isUnit: true }); i += w.length; matched = true; break; }
    }
    if (matched) continue;
    for (const w of sortedDigits) {
      if (text.startsWith(w, i)) { tokens.push({ v: digits[w], isUnit: false }); i += w.length; matched = true; break; }
    }
    if (matched) continue;
    // Arabic digit run
    let numStr = '';
    while (i < text.length && /\d/.test(text[i])) { numStr += text[i++]; }
    if (numStr) { tokens.push({ v: parseInt(numStr, 10), isUnit: false }); continue; }
    i++;
  }
  if (tokens.length === 0) return undefined;

  // Accumulate (same algorithm as Chinese)
  let result = 0, section = 0, cur = 0;
  for (const tok of tokens) {
    if (!tok.isUnit) { cur = tok.v; }
    else {
      const u = tok.v;
      if (u >= 100000000) { section += cur || 1; result += section * u; section = 0; cur = 0; }
      else if (u === 10000) { section += cur || 1; result += section * u; section = 0; cur = 0; }
      else { section += (cur || 1) * u; cur = 0; }
    }
  }
  section += cur;
  result += section;
  return result > 0 ? result : undefined;
}

// ── Korean number parser (일, 이, 삼...십, 백, 천, 만, 억) ─────────────────
function parseKoreanNumberText(text: string): number | undefined {
  const digits: Record<string, number> = {
    '영':0,'일':1,'이':2,'삼':3,'사':4,
    '오':5,'육':6,'칠':7,'팔':8,'구':9,
  };
  const units: [string, number][] = [
    ['억', 100000000], ['만', 10000], ['천', 1000], ['백', 100], ['십', 10],
  ];
  const allKeys = [...Object.keys(digits), ...units.map(u => u[0])];
  if (!allKeys.some(k => text.includes(k))) return undefined;

  const tokens: Array<{ v: number; isUnit: boolean }> = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (digits[ch] !== undefined) { tokens.push({ v: digits[ch], isUnit: false }); i++; continue; }
    let unitMatched = false;
    for (const [w, val] of units) {
      if (text.startsWith(w, i)) { tokens.push({ v: val, isUnit: true }); i += w.length; unitMatched = true; break; }
    }
    if (unitMatched) continue;
    let numStr = '';
    while (i < text.length && /\d/.test(text[i])) { numStr += text[i++]; }
    if (numStr) { tokens.push({ v: parseInt(numStr, 10), isUnit: false }); continue; }
    i++;
  }
  if (tokens.length === 0) return undefined;

  let result = 0, section = 0, cur = 0;
  for (const tok of tokens) {
    if (!tok.isUnit) { cur = tok.v; }
    else {
      const u = tok.v;
      if (u >= 100000000) { section += cur || 1; result += section * u; section = 0; cur = 0; }
      else if (u === 10000) { section += cur || 1; result += section * u; section = 0; cur = 0; }
      else { section += (cur || 1) * u; cur = 0; }
    }
  }
  section += cur;
  result += section;
  return result > 0 ? result : undefined;
}

// ── Word-based number parser for European / Latin-script languages ────────────
// Shared helper: splits text into words, maps them to values, accumulates with multipliers.
function parseWordBasedNumber(
  text: string,
  wordMap: Record<string, number>,
  multipliers: Record<string, number>,
): number | undefined {
  const lc = text.toLowerCase().replace(/[-]/g, ' ');
  const allKeys = [...Object.keys(wordMap), ...Object.keys(multipliers)];
  if (!allKeys.some(k => lc.includes(k))) return undefined;

  const words = lc.split(/[\s,]+/).filter(Boolean);
  let result = 0;
  let current = 0;

  for (const w of words) {
    const clean = w.replace(/[^\p{L}\p{N}]/gu, '');
    if (multipliers[clean] !== undefined) {
      const m = multipliers[clean];
      if (m >= 1000000) {
        result += (current || 1) * m;
        current = 0;
      } else if (m >= 1000) {
        result += (current || 1) * m;
        current = 0;
      } else if (m === 100) {
        current = (current || 1) * m;
      }
    } else if (wordMap[clean] !== undefined) {
      current += wordMap[clean];
    }
  }
  result += current;
  return result > 0 ? result : undefined;
}

// ── French ────────────────────────────────────────────────────────────────────
function parseFrenchNumberText(text: string): number | undefined {
  const words: Record<string, number> = {
    'zéro':0,'zero':0,'un':1,'une':1,'deux':2,'trois':3,'quatre':4,'cinq':5,
    'six':6,'sept':7,'huit':8,'neuf':9,'dix':10,'onze':11,'douze':12,
    'treize':13,'quatorze':14,'quinze':15,'seize':16,
    'vingt':20,'trente':30,'quarante':40,'cinquante':50,
    'soixante':60,'septante':70,'huitante':80,'nonante':90,
    // soixante-dix (70), quatre-vingts (80), quatre-vingt-dix (90) handled by accumulation
  };
  const multipliers: Record<string, number> = {
    'cent':100,'cents':100,'mille':1000,'million':1000000,'millions':1000000,
  };
  return parseWordBasedNumber(text, words, multipliers);
}

// ── German ────────────────────────────────────────────────────────────────────
function parseGermanNumberText(text: string): number | undefined {
  const words: Record<string, number> = {
    'null':0,'eins':1,'ein':1,'eine':1,'zwei':2,'drei':3,'vier':4,'fünf':5,'fuenf':5,
    'sechs':6,'sieben':7,'acht':8,'neun':9,'zehn':10,'elf':11,'zwölf':12,'zwoelf':12,
    'dreizehn':13,'vierzehn':14,'fünfzehn':15,'fuenfzehn':15,'sechzehn':16,
    'siebzehn':17,'achtzehn':18,'neunzehn':19,
    'zwanzig':20,'dreißig':30,'dreissig':30,'vierzig':40,'fünfzig':50,'fuenfzig':50,
    'sechzig':60,'siebzig':70,'achtzig':80,'neunzig':90,
  };
  const multipliers: Record<string, number> = {
    'hundert':100,'tausend':1000,'million':1000000,'millionen':1000000,
  };
  return parseWordBasedNumber(text, words, multipliers);
}

// ── Spanish ───────────────────────────────────────────────────────────────────
function parseSpanishNumberText(text: string): number | undefined {
  const words: Record<string, number> = {
    'cero':0,'uno':1,'una':1,'dos':2,'tres':3,'cuatro':4,'cinco':5,
    'seis':6,'siete':7,'ocho':8,'nueve':9,'diez':10,'once':11,'doce':12,
    'trece':13,'catorce':14,'quince':15,'dieciséis':16,'dieciseis':16,
    'diecisiete':17,'dieciocho':18,'diecinueve':19,
    'veinte':20,'veintiuno':21,'veintidós':22,'veintidos':22,'veintitrés':23,'veintitres':23,
    'veinticuatro':24,'veinticinco':25,'veintiséis':26,'veintiseis':26,
    'veintisiete':27,'veintiocho':28,'veintinueve':29,
    'treinta':30,'cuarenta':40,'cincuenta':50,'sesenta':60,'setenta':70,'ochenta':80,'noventa':90,
  };
  const multipliers: Record<string, number> = {
    'cien':100,'ciento':100,'cientos':100,'mil':1000,
    'millón':1000000,'millon':1000000,'millones':1000000,
  };
  return parseWordBasedNumber(text, words, multipliers);
}

// ── Portuguese ────────────────────────────────────────────────────────────────
function parsePortugueseNumberText(text: string): number | undefined {
  const words: Record<string, number> = {
    'zero':0,'um':1,'uma':1,'dois':2,'duas':2,'três':3,'tres':3,'quatro':4,'cinco':5,
    'seis':6,'sete':7,'oito':8,'nove':9,'dez':10,'onze':11,'doze':12,
    'treze':13,'catorze':14,'quatorze':14,'quinze':15,'dezesseis':16,'dezasseis':16,
    'dezessete':17,'dezassete':17,'dezoito':18,'dezenove':19,'dezanove':19,
    'vinte':20,'trinta':30,'quarenta':40,'cinquenta':50,
    'sessenta':60,'setenta':70,'oitenta':80,'noventa':90,
  };
  const multipliers: Record<string, number> = {
    'cem':100,'cento':100,'centos':100,'mil':1000,
    'milhão':1000000,'milhao':1000000,'milhões':1000000,'milhoes':1000000,
  };
  return parseWordBasedNumber(text, words, multipliers);
}

// ── Vietnamese ────────────────────────────────────────────────────────────────
function parseVietnameseNumberText(text: string): number | undefined {
  const words: Record<string, number> = {
    'không':0,'một':1,'mot':1,'hai':2,'ba':3,'bốn':4,'bon':4,'năm':5,'nam':5,
    'sáu':6,'sau':6,'bảy':7,'bay':7,'tám':8,'tam':8,'chín':9,'chin':9,
    'mười':10,'muoi':10,'mươi':10,
  };
  const multipliers: Record<string, number> = {
    'trăm':100,'tram':100,
    'nghìn':1000,'nghin':1000,'ngàn':1000,'ngan':1000,
    'triệu':1000000,'trieu':1000000,
    'tỷ':1000000000,'ty':1000000000,
  };
  return parseWordBasedNumber(text, words, multipliers);
}

// ── Malay ─────────────────────────────────────────────────────────────────────
function parseMalayNumberText(text: string): number | undefined {
  const words: Record<string, number> = {
    'kosong':0,'sifar':0,'satu':1,'se':1,'dua':2,'tiga':3,'empat':4,'lima':5,
    'enam':6,'tujuh':7,'lapan':8,'sembilan':9,
    'sepuluh':10,'sebelas':11,
    'belas':10, // suffix: dua belas = 12
    'puluh':10, // suffix: dua puluh = 20
  };
  const multipliers: Record<string, number> = {
    'ratus':100,'seratus':100,
    'ribu':1000,'seribu':1000,
    'juta':1000000,'sejuta':1000000,
  };
  return parseWordBasedNumber(text, words, multipliers);
}

function parseThaiNumberText(text: string): number | undefined {
  const thaiDigitMap: Record<string, number> = {
    'ศูนย์': 0, 'หนึ่ง': 1, 'สอง': 2, 'สาม': 3, 'สี่': 4,
    'ห้า': 5, 'หก': 6, 'เจ็ด': 7, 'แปด': 8, 'เก้า': 9,
    'เอ็ด': 1, 'ยี่': 2,
  };
  const thaiUnits = ['ล้าน', 'แสน', 'หมื่น', 'พัน', 'ร้อย', 'สิบ'];

  const hasThai = [...Object.keys(thaiDigitMap), ...thaiUnits].some(k => text.includes(k));
  if (!hasThai) return undefined;

  // Sort digit keys longest-first to avoid partial matches
  const sortedDigitKeys = Object.keys(thaiDigitMap).sort((a, b) => b.length - a.length);

  // Get numeric coefficient from a fragment (digit word or Arabic numeral)
  function getCoeff(str: string): number {
    str = str.trim();
    if (!str) return 1;
    const n = parseFloat(str.replace(/,/g, ''));
    if (!isNaN(n)) return n;
    for (const key of sortedDigitKeys) {
      if (str.includes(key)) return thaiDigitMap[key];
    }
    return 1;
  }

  // Parse a sub-million segment (handles แสน หมื่น พัน ร้อย สิบ + trailing digit)
  function parseSegment(str: string): number {
    const units = [
      { name: 'แสน', value: 100000 },
      { name: 'หมื่น', value: 10000 },
      { name: 'พัน', value: 1000 },
      { name: 'ร้อย', value: 100 },
      { name: 'สิบ', value: 10 },
    ];
    let val = 0;
    let remaining = str;
    for (const { name, value } of units) {
      const idx = remaining.indexOf(name);
      if (idx !== -1) {
        const before = remaining.substring(0, idx);
        val += getCoeff(before) * value;
        remaining = remaining.substring(idx + name.length);
      }
    }
    // Remaining is the units digit
    remaining = remaining.trim();
    if (remaining) {
      const n = parseFloat(remaining.replace(/,/g, ''));
      if (!isNaN(n)) {
        val += n;
      } else {
        for (const key of sortedDigitKeys) {
          if (remaining.includes(key)) { val += thaiDigitMap[key]; break; }
        }
      }
    }
    return val;
  }

  // Split by ล้าน (million boundary)
  const laanIdx = text.indexOf('ล้าน');
  if (laanIdx !== -1) {
    const beforeLaan = text.substring(0, laanIdx);
    const afterLaan = text.substring(laanIdx + 'ล้าน'.length);
    const millions = parseSegment(beforeLaan) || getCoeff(beforeLaan);
    return millions * 1000000 + parseSegment(afterLaan);
  }

  const result = parseSegment(text);
  return result > 0 ? result : undefined;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
    }
  }
  return dp[m][n];
}

function wordMatchesKeyword(word: string, keyword: string, threshold = 0.7): boolean {
  if (word === keyword) return true;
  // Short keywords (1-3 chars) require exact match only
  if (keyword.length <= 3) return word === keyword;
  const dist = levenshtein(word, keyword);
  return 1 - dist / Math.max(word.length, keyword.length) >= threshold;
}

export function matchKeyword(text: string, keywords: string[]): boolean {
  return matchKeywordBestScore(text, keywords) > 0;
}

// Returns a score for the best-matching keyword (0 = no match).
// Exact substring match scores length * 1000 so it ALWAYS beats any fuzzy match,
// regardless of keyword length. Fuzzy match scores length only.
// Example: say "scb" → exact hits keyword "scb" (score 3000),
//          fuzzy might hit "jscb" (score 4) → exact wins correctly.
function matchKeywordBestScore(text: string, keywords: string[]): number {
  const lowerText = norm(text).trim();
  const condensedText = lowerText.replace(/\s+/g, "");
  const words = lowerText.split(/\s+/);
  let best = 0;

  for (const keyword of keywords) {
    const lowerKeyword = norm(keyword);
    const condensedKeyword = lowerKeyword.replace(/\s+/g, "");

    // 1. Exact substring match — high-priority score
    if (lowerText.includes(lowerKeyword) || condensedText.includes(condensedKeyword)) {
      best = Math.max(best, lowerKeyword.length * 1000);
      continue;
    }

    // 2. Per-word fuzzy match (~70% similarity) — low-priority score
    for (const word of words) {
      if (word.length < 2) continue;
      if (wordMatchesKeyword(word, lowerKeyword)) {
        best = Math.max(best, lowerKeyword.length);
        break;
      }
    }
  }

  return best;
}

export function matchCategory(text: string): string | undefined {
  const categoriesWithKeywords = getCategoriesWithKeywords();
  let bestId: string | undefined;
  let bestScore = 0;
  for (const [categoryId, { keywords }] of Object.entries(categoriesWithKeywords)) {
    const score = matchKeywordBestScore(text, keywords);
    if (score > bestScore) { bestScore = score; bestId = categoryId; }
  }
  return bestId;
}

export function matchAccount(text: string): string | undefined {
  const accountsWithKeywords = getAccountsWithKeywords();
  let bestId: string | undefined;
  let bestScore = 0;
  for (const [accountId, { keywords }] of Object.entries(accountsWithKeywords)) {
    const score = matchKeywordBestScore(text, keywords);
    if (score > bestScore) { bestScore = score; bestId = accountId; }
  }
  return bestId;
}

// Match category against a specific list (visible on screen) — screen is source of truth
export function matchCategoryFromList(
  text: string,
  list: { id: string; name: string; keywords?: string[] }[]
): string | undefined {
  const raw: Record<string, { name: string; keywords: string[] }> = {};
  for (const cat of list) {
    if (!cat.id || cat.id === "__voice_status__" || cat.id === "nocat") continue;
    const stored = cat.keywords && cat.keywords.length > 0 ? cat.keywords : [];
    const fallback = stored.length === 0 ? (builtinCategoryKeywords[cat.id] || []) : [];
    raw[cat.id] = { name: cat.name, keywords: [...stored, ...fallback] };
  }
  const map = buildKeywordMap(raw);
  let bestId: string | undefined;
  let bestScore = 0;
  for (const [id, { keywords }] of Object.entries(map)) {
    const score = matchKeywordBestScore(text, keywords);
    if (score > bestScore) { bestScore = score; bestId = id; }
  }
  return bestId;
}

// Match account against a specific list (visible on screen) — screen is source of truth
export function matchAccountFromList(
  text: string,
  list: { id: string; name: string; keywords?: string[] }[]
): string | undefined {
  const raw: Record<string, { name: string; keywords: string[] }> = {};
  for (const acc of list) {
    if (!acc.id || acc.id === "account_deleted") continue;
    const stored = acc.keywords && acc.keywords.length > 0 ? acc.keywords : [];
    const fallback = stored.length === 0 ? (builtinAccountKeywords[acc.id] || []) : [];
    raw[acc.id] = { name: acc.name, keywords: [...stored, ...fallback] };
  }
  const map = buildKeywordMap(raw);
  let bestId: string | undefined;
  let bestScore = 0;
  for (const [id, { keywords }] of Object.entries(map)) {
    const score = matchKeywordBestScore(text, keywords);
    if (score > bestScore) { bestScore = score; bestId = id; }
  }
  return bestId;
}

export function parseVoiceInput(transcript: string): MatchResult {
  // Try to match category and account from the transcript
  const categoryId = matchCategory(transcript);
  const accountId = matchAccount(transcript);
  const amount = extractNumberFromText(transcript);

  return {
    categoryId,
    accountId,
    amount,
    description: transcript,
  };
}
