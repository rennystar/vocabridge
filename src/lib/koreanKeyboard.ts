const INITIAL_KEYS = [
  "r",
  "R",
  "s",
  "e",
  "E",
  "f",
  "a",
  "q",
  "Q",
  "t",
  "T",
  "d",
  "w",
  "W",
  "c",
  "z",
  "x",
  "v",
  "g",
];

const VOWEL_KEYS = [
  "k",
  "o",
  "i",
  "O",
  "j",
  "p",
  "u",
  "P",
  "h",
  "hk",
  "ho",
  "hl",
  "y",
  "n",
  "nj",
  "np",
  "nl",
  "b",
  "m",
  "ml",
  "l",
];

const FINAL_KEYS = [
  "",
  "r",
  "R",
  "rt",
  "s",
  "sw",
  "sg",
  "e",
  "f",
  "fr",
  "fa",
  "fq",
  "ft",
  "fx",
  "fv",
  "fg",
  "a",
  "q",
  "qt",
  "t",
  "T",
  "d",
  "w",
  "c",
  "z",
  "x",
  "v",
  "g",
];

const JAMO_KEYS: Record<string, string> = {
  ㄱ: "r",
  ㄲ: "R",
  ㄳ: "rt",
  ㄴ: "s",
  ㄵ: "sw",
  ㄶ: "sg",
  ㄷ: "e",
  ㄸ: "E",
  ㄹ: "f",
  ㄺ: "fr",
  ㄻ: "fa",
  ㄼ: "fq",
  ㄽ: "ft",
  ㄾ: "fx",
  ㄿ: "fv",
  ㅀ: "fg",
  ㅁ: "a",
  ㅂ: "q",
  ㅃ: "Q",
  ㅄ: "qt",
  ㅅ: "t",
  ㅆ: "T",
  ㅇ: "d",
  ㅈ: "w",
  ㅉ: "W",
  ㅊ: "c",
  ㅋ: "z",
  ㅌ: "x",
  ㅍ: "v",
  ㅎ: "g",
  ㅏ: "k",
  ㅐ: "o",
  ㅑ: "i",
  ㅒ: "O",
  ㅓ: "j",
  ㅔ: "p",
  ㅕ: "u",
  ㅖ: "P",
  ㅗ: "h",
  ㅘ: "hk",
  ㅙ: "ho",
  ㅚ: "hl",
  ㅛ: "y",
  ㅜ: "n",
  ㅝ: "nj",
  ㅞ: "np",
  ㅟ: "nl",
  ㅠ: "b",
  ㅡ: "m",
  ㅢ: "ml",
  ㅣ: "l",
};

const HANGUL_SYLLABLE_START = 0xac00;
const HANGUL_SYLLABLE_END = 0xd7a3;
const VOWEL_COUNT = 21;
const FINAL_COUNT = 28;

export function convertHangulToQwerty(input: string): string {
  let converted = "";

  for (const char of input) {
    converted += convertHangulCharToQwerty(char);
  }

  return converted;
}

function convertHangulCharToQwerty(char: string): string {
  if (JAMO_KEYS[char]) return JAMO_KEYS[char];

  const codePoint = char.codePointAt(0);
  if (
    codePoint === undefined ||
    codePoint < HANGUL_SYLLABLE_START ||
    codePoint > HANGUL_SYLLABLE_END
  ) {
    return char;
  }

  const offset = codePoint - HANGUL_SYLLABLE_START;
  const initialIndex = Math.floor(offset / (VOWEL_COUNT * FINAL_COUNT));
  const vowelIndex = Math.floor((offset % (VOWEL_COUNT * FINAL_COUNT)) / FINAL_COUNT);
  const finalIndex = offset % FINAL_COUNT;

  return `${INITIAL_KEYS[initialIndex]}${VOWEL_KEYS[vowelIndex]}${FINAL_KEYS[finalIndex]}`;
}
