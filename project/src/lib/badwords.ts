/**
 * badwords.ts — centralised profanity & abuse word list
 *
 * HOW TO ADD MORE WORDS:
 *   Simply add to the arrays below and save. The censorText() function
 *   in store.tsx imports this file and will pick up changes automatically.
 *
 * Covers: English abuses, common Indian English abuses, Hindi abuses
 * (romanised), and leet-speak variants.
 */

/* ── English ─────────────────────────────────────────────────────────── */
const EN: string[] = [
  // mild
  "damn",
  "hell",
  "crap",
  "piss",
  "ass",
  "arse",
  "bloody",
  "bastard",
  // moderate
  "bitch",
  "dick",
  "cock",
  "pussy",
  "tit",
  "tits",
  "boob",
  "boobs",
  "butt",
  "cunt",
  "slut",
  "whore",
  "hoe",
  "skank",
  "twat",
  "wanker",
  "tosser",
  "prick",
  // strong
  "shit",
  "fuck",
  "fucker",
  "fucking",
  "fucked",
  "motherfucker",
  "motherfucking",
  "asshole",
  "arsehole",
  "bullshit",
  "horseshit",
  "dumbass",
  "jackass",
  "smartass",
  "dipshit",
  "shithead",
  "fuckhead",
  "fuckface",
  "douchebag",
  "douche",
  // slurs (always block regardless of context)
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "retard",
  "spastic",
  "chink",
  "gook",
  "kike",
  "wetback",
  "spic",
  "cracker",
  "redneck",
];

/* ── Hindi / Hinglish (romanised) ──────────────────────────────────────
   Common abuses typed in English letters by Indian users              */
const HI: string[] = [
  "madarchod",
  "mc",
  "bhosdike",
  "bhosadike",
  "bhosadi",
  "chutiya",
  "chutiye",
  "chut",
  "loda",
  "lund",
  "lauda",
  "gaand",
  "gand",
  "behen",
  "behenchod",
  "bc",
  "saala",
  "saali",
  "randi",
  "randwa",
  "harami",
  "haraamzaada",
  "haramzada",
  "kamina",
  "kamine",
  "kutte",
  "kutiya",
  "kutta",
  "ullu",
  "ulluke",
  "gadha",
  "gadhaa",
  "maderchod",
  "madarchod",
  "teri maa",
  "teri behen",
  "teri gaand",
  "chodu",
  "chod",
  "chodna",
  "chodne",
  "chodta",
  "chodti",
  "bhadwa",
  "bhadwe",
  "chakka",
  "hijra",
  "hijde",
  "bhosad",
  "bhenchod",
  "benchod",
];

/* ── Leet-speak / common bypass attempts ───────────────────────────── */
const LEET: string[] = [
  "f4ck",
  "fvck",
  "f*ck",
  "sh1t",
  "sh!t",
  "a55",
  "a$$",
  "b1tch",
  "b!tch",
  "d1ck",
  "c0ck",
  "p*ssy",
  "s1ut",
  "wh0re",
  "fuk",
  "phuck",
  "phuk",
  "sheit",
];

/* ── Merge and deduplicate ─────────────────────────────────────────── */
export const BANNED_WORDS: string[] = [
  ...new Set([...EN, ...HI, ...LEET].map((w) => w.toLowerCase())),
];

/**
 * Returns true if the text contains any banned word.
 * Checks whole words AND substrings (catches "fuckwit", "shitty" etc).
 */
export function containsBannedWord(text: string): boolean {
  const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  return BANNED_WORDS.some((w) => lower.includes(w));
}

/**
 * Replaces each banned word in text with asterisks.
 * Returns { text, flagged }.
 */
export function censorText(raw: string): { text: string; flagged: boolean } {
  let flagged = false;
  // First pass: whole-word replacement with \b boundaries
  let out = raw.replace(/\b\w+\b/g, (word) => {
    if (BANNED_WORDS.includes(word.toLowerCase())) {
      flagged = true;
      return "*".repeat(word.length);
    }
    return word;
  });
  // Second pass: substring replacement for words without clear boundaries
  // (covers "chutiya123", "mc_bhosdike", etc.)
  BANNED_WORDS.forEach((bad) => {
    const re = new RegExp(bad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (re.test(out)) {
      flagged = true;
      out = out.replace(re, (m) => "*".repeat(m.length));
    }
  });
  return { text: out, flagged };
}
