// Basic Arabic → Latin transliteration utility.
// This is a lightweight, rule-based approach intended for server-side use.
// For production-grade needs, consider replacing with a comprehensive scheme.

const ARABIC_TO_LATIN_MAP: Record<string, string> = {
    // Consonants
    "ء": "'", "ا": "a", "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "h",
    "خ": "kh", "د": "d", "ذ": "dh", "ر": "r", "ز": "z", "س": "s", "ش": "sh",
    "ص": "s", "ض": "d", "ط": "t", "ظ": "z", "ع": "'", "غ": "gh", "ف": "f",
    "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n", "ه": "h", "و": "w",
    "ي": "y",
    // Variants / additional letters
    "أ": "a", "إ": "i", "آ": "aa", "ى": "a", "ؤ": "'", "ئ": "'",
    "ة": "h",
    // Tatweel
    "ـ": "",
    // Numerals (Arabic-Indic)
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

const DIACRITICS = /[\u064B-\u0652\u0670]/g; // tanween, fatha/damma/kasra, sukun, maddah, etc.

export function transliterateArabicToLatin(input: string): string {
    if (!input) return "";
    const stripped = input.replace(DIACRITICS, "");
    let result = "";
    for (const ch of stripped) {
        result += ARABIC_TO_LATIN_MAP[ch] ?? ch;
    }
    // Normalize spaces
    return result.replace(/\s+/g, " ").trim();
}

export function transliterateArray(lines: string[]): string[] {
    return lines.map(transliterateArabicToLatin);
}

export default transliterateArabicToLatin;



